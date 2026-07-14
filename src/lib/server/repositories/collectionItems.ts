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
