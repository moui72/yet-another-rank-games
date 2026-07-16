import type { Kysely } from 'kysely';
import type { Database } from '../schema';
import type { Comparison } from '$lib/types/entities';

/**
 * Record one pairwise judgment (the source of truth for a list's order).
 * Pairs are stored canonically ordered (lower game id in `gameA`) and the
 * insert upserts on `(listId, gameA, gameB)` — re-judging a pair already
 * seen in this list overwrites the existing row (`winnerId`, `createdAt`)
 * instead of inserting a duplicate, so a double-submit can't silently
 * double-weight a judgment in the rating update (ardd-audit 2026-07-15).
 */
export function recordComparison(
	db: Kysely<Database>,
	input: { listId: string; gameA: number; gameB: number; winnerId: number }
): Promise<Comparison> {
	const [gameA, gameB] =
		input.gameA < input.gameB ? [input.gameA, input.gameB] : [input.gameB, input.gameA];
	return db
		.insertInto('comparisons')
		.values({
			listId: input.listId,
			gameA,
			gameB,
			winnerId: input.winnerId
		})
		.onConflict((oc) =>
			oc
				.columns(['listId', 'gameA', 'gameB'])
				.doUpdateSet({ winnerId: input.winnerId, createdAt: new Date().toISOString() })
		)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/** Delete the most recent comparison for a list (undo). */
export async function deleteLastComparison(db: Kysely<Database>, listId: string): Promise<void> {
	const last = await db
		.selectFrom('comparisons')
		.select('id')
		.where('listId', '=', listId)
		.orderBy('createdAt', 'desc')
		.orderBy('id', 'desc')
		.limit(1)
		.executeTakeFirst();
	if (last) await db.deleteFrom('comparisons').where('id', '=', last.id).execute();
}

/** A list's comparisons in replay order (oldest first). */
export function listComparisons(db: Kysely<Database>, listId: string): Promise<Comparison[]> {
	return db
		.selectFrom('comparisons')
		.selectAll()
		.where('listId', '=', listId)
		.orderBy('createdAt', 'asc')
		.orderBy('id', 'asc')
		.execute();
}
