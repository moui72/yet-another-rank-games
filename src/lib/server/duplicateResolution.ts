import type { Kysely } from 'kysely';
import type { Database } from './schema';
import {
	getPendingDuplicateForUser,
	rejectDuplicate,
	markDuplicateConfirmed
} from './repositories/collectionItemDuplicates';

/**
 * Confirm a possible duplicate (T008, datamodel.md `CollectionItemDuplicate`):
 * repoints the **confirming user's own** `PoolGame`/`Comparison` rows that
 * reference the `local_add` item's game to the candidate game, then deletes
 * the now-redundant `CollectionItem`. Scoped to this user only — never
 * touches another user's pools/lists, and never merges the shared `Game`
 * catalogue rows themselves. Returns `false` (no-op) if the duplicate isn't a
 * pending row owned by this user.
 */
export async function confirmDuplicateMerge(
	db: Kysely<Database>,
	userId: string,
	duplicateId: string
): Promise<boolean> {
	const dup = await getPendingDuplicateForUser(db, userId, duplicateId);
	if (!dup) return false;

	const oldGameId = dup.collectionItemGameId;
	const candidateGameId = dup.candidateGameId;

	const pools = await db.selectFrom('pools').select('id').where('userId', '=', userId).execute();
	const poolIds = pools.map((p) => p.id);
	if (poolIds.length > 0) {
		const affected = await db
			.selectFrom('poolGames')
			.selectAll()
			.where('poolId', 'in', poolIds)
			.where('gameId', '=', oldGameId)
			.execute();
		for (const pg of affected) {
			const existing = await db
				.selectFrom('poolGames')
				.select('id')
				.where('poolId', '=', pg.poolId)
				.where('gameId', '=', candidateGameId)
				.executeTakeFirst();
			if (existing) {
				// The pool already has the candidate game — drop the redundant row
				// rather than violate the (poolId, gameId) uniqueness.
				await db.deleteFrom('poolGames').where('id', '=', pg.id).execute();
			} else {
				await db.updateTable('poolGames').set({ gameId: candidateGameId }).where('id', '=', pg.id).execute();
			}
		}
	}

	const lists = await db.selectFrom('lists').select('id').where('userId', '=', userId).execute();
	const listIds = lists.map((l) => l.id);
	if (listIds.length > 0) {
		const comparisons = await db
			.selectFrom('comparisons')
			.selectAll()
			.where('listId', 'in', listIds)
			.where((eb) =>
				eb.or([eb('gameA', '=', oldGameId), eb('gameB', '=', oldGameId), eb('winnerId', '=', oldGameId)])
			)
			.execute();
		for (const c of comparisons) {
			const gameA = c.gameA === oldGameId ? candidateGameId : c.gameA;
			const gameB = c.gameB === oldGameId ? candidateGameId : c.gameB;
			const winnerId = c.winnerId === oldGameId ? candidateGameId : c.winnerId;
			if (gameA === gameB) {
				// Repointing would make this comparison a self-comparison (the user
				// had already compared the local add against the same candidate) —
				// it's no longer meaningful, so drop it rather than violate the
				// game_a <> game_b check constraint.
				await db.deleteFrom('comparisons').where('id', '=', c.id).execute();
			} else {
				await db
					.updateTable('comparisons')
					.set({ gameA, gameB, winnerId })
					.where('id', '=', c.id)
					.execute();
			}
		}
	}

	await markDuplicateConfirmed(db, dup.id);
	await db.deleteFrom('collectionItems').where('id', '=', dup.collectionItemId).execute();
	return true;
}

/** Reject a possible duplicate as distinct: leaves both items untouched. */
export async function rejectDuplicateMerge(
	db: Kysely<Database>,
	userId: string,
	duplicateId: string
): Promise<boolean> {
	const dup = await getPendingDuplicateForUser(db, userId, duplicateId);
	if (!dup) return false;
	const rejected = await rejectDuplicate(db, duplicateId);
	return !!rejected;
}
