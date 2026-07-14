import type { Kysely } from 'kysely';
import type { Database } from '../schema';
import type { CollectionItem } from '$lib/types/entities';

/**
 * Insert or update the item for a (collection, game) pair — an import re-runs
 * over the same collection, so this is idempotent on the unique key.
 */
export function upsertCollectionItem(
	db: Kysely<Database>,
	input: {
		collectionId: string;
		gameId: number;
		owned: boolean;
		userRating?: number | null;
		numPlays?: number | null;
	}
): Promise<CollectionItem> {
	return db
		.insertInto('collectionItems')
		.values({
			collectionId: input.collectionId,
			gameId: input.gameId,
			owned: input.owned,
			userRating: input.userRating ?? null,
			numPlays: input.numPlays ?? null
		})
		.onConflict((oc) =>
			oc.columns(['collectionId', 'gameId']).doUpdateSet({
				owned: input.owned,
				userRating: input.userRating ?? null,
				numPlays: input.numPlays ?? null
			})
		)
		.returningAll()
		.executeTakeFirstOrThrow();
}

export function listItemsByCollection(
	db: Kysely<Database>,
	collectionId: string
): Promise<CollectionItem[]> {
	return db
		.selectFrom('collectionItems')
		.selectAll()
		.where('collectionId', '=', collectionId)
		.execute();
}

/**
 * The default collection view: active items only (T002) — a curation layer
 * upstream of every pool built from this collection (ui.md), so a removed
 * item stops being offered here without being physically deleted.
 */
export function listActiveItemsByCollection(
	db: Kysely<Database>,
	collectionId: string
): Promise<CollectionItem[]> {
	return db
		.selectFrom('collectionItems')
		.selectAll()
		.where('collectionId', '=', collectionId)
		.where('status', '=', 'active')
		.execute();
}

/** The collapsible "Removed" view: `removed`/`pending_delete` items. */
export function listRemovedItemsByCollection(
	db: Kysely<Database>,
	collectionId: string
): Promise<CollectionItem[]> {
	return db
		.selectFrom('collectionItems')
		.selectAll()
		.where('collectionId', '=', collectionId)
		.where('status', 'in', ['removed', 'pending_delete'])
		.execute();
}

/**
 * Soft-delete an active item (T002): `status -> removed`, stamps `removedAt`.
 * A no-op (returns undefined) if the item isn't currently `active`.
 */
export function softDeleteCollectionItem(
	db: Kysely<Database>,
	id: string
): Promise<CollectionItem | undefined> {
	return db
		.updateTable('collectionItems')
		.set({ status: 'removed', removedAt: new Date().toISOString() })
		.where('id', '=', id)
		.where('status', '=', 'active')
		.returningAll()
		.executeTakeFirst();
}

/**
 * Undo a soft-delete or a pending hard-delete (T003): `removed`/
 * `pending_delete -> active`, clears `removedAt`. A no-op if already `active`.
 */
export function undoCollectionItemRemoval(
	db: Kysely<Database>,
	id: string
): Promise<CollectionItem | undefined> {
	return db
		.updateTable('collectionItems')
		.set({ status: 'active', removedAt: null })
		.where('id', '=', id)
		.where('status', 'in', ['removed', 'pending_delete'])
		.returningAll()
		.executeTakeFirst();
}

/**
 * Confirm-hard-delete (T004): only valid from `pending_delete`. Returns
 * `true` if a row was deleted, `false` if the item wasn't `pending_delete`
 * (an `active`/`removed` item can't be hard-deleted directly).
 */
export async function confirmHardDeleteCollectionItem(
	db: Kysely<Database>,
	id: string
): Promise<boolean> {
	const result = await db
		.deleteFrom('collectionItems')
		.where('id', '=', id)
		.where('status', '=', 'pending_delete')
		.executeTakeFirst();
	return Number(result.numDeletedRows ?? 0) > 0;
}

/**
 * The `removed` items in a collection, with the game's `bggId` (T006) — the
 * resync reconciliation needs `bggId` to compare against the freshly-pulled
 * BGG membership set.
 */
export function listRemovedItemsWithBggId(
	db: Kysely<Database>,
	collectionId: string
): Promise<{ id: string; bggId: number }[]> {
	return db
		.selectFrom('collectionItems as ci')
		.innerJoin('games as g', 'g.id', 'ci.gameId')
		.where('ci.collectionId', '=', collectionId)
		.where('ci.status', '=', 'removed')
		.select(['ci.id as id', 'g.bggId as bggId'])
		.execute();
}

/**
 * Flip `removed -> pending_delete` for the given items (T006): a re-pull
 * confirmed they're no longer in the source collection. A no-op for ids not
 * currently `removed`.
 */
export async function markItemsPendingDelete(db: Kysely<Database>, ids: string[]): Promise<void> {
	if (ids.length === 0) return;
	await db
		.updateTable('collectionItems')
		.set({ status: 'pending_delete' })
		.where('id', 'in', ids)
		.where('status', '=', 'removed')
		.execute();
}

/**
 * Active `local_add` items in a collection, with their game's title (T007) —
 * the resync fuzzy-match compares this title against newly-pulled games.
 */
export function listActiveLocalAddItemsWithTitle(
	db: Kysely<Database>,
	collectionId: string
): Promise<{ id: string; gameId: number; title: string }[]> {
	return db
		.selectFrom('collectionItems as ci')
		.innerJoin('games as g', 'g.id', 'ci.gameId')
		.where('ci.collectionId', '=', collectionId)
		.where('ci.status', '=', 'active')
		.where('ci.source', '=', 'local_add')
		.select(['ci.id as id', 'ci.gameId as gameId', 'g.name as title'])
		.execute();
}

/**
 * Record a possible duplicate (T007), skipping if a `pending` row already
 * exists for this exact (item, candidate) pair — a re-pull is idempotent, so
 * it shouldn't pile up repeat rows for the same still-unresolved match.
 */
export async function upsertPendingDuplicate(
	db: Kysely<Database>,
	input: { collectionItemId: string; candidateGameId: number }
): Promise<void> {
	const existing = await db
		.selectFrom('collectionItemDuplicates')
		.select('id')
		.where('collectionItemId', '=', input.collectionItemId)
		.where('candidateGameId', '=', input.candidateGameId)
		.where('status', '=', 'pending')
		.executeTakeFirst();
	if (existing) return;
	await db
		.insertInto('collectionItemDuplicates')
		.values({ collectionItemId: input.collectionItemId, candidateGameId: input.candidateGameId })
		.execute();
}

/**
 * Add a locally-added item (T005): reuses `bgg-game-search-import` upstream
 * (the caller upserts the `Game` row), then stamps `source = local_add` so a
 * later re-pull knows to fuzzy-match it rather than treat it as BGG-owned.
 */
export function addLocalCollectionItem(
	db: Kysely<Database>,
	input: { collectionId: string; gameId: number }
): Promise<CollectionItem> {
	return db
		.insertInto('collectionItems')
		.values({
			collectionId: input.collectionId,
			gameId: input.gameId,
			owned: true,
			source: 'local_add'
		})
		.onConflict((oc) => oc.columns(['collectionId', 'gameId']).doUpdateSet({ owned: true }))
		.returningAll()
		.executeTakeFirstOrThrow();
}
