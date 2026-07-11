import type { Kysely } from 'kysely';
import type { Database } from '../schema';
import type { Comparison } from '$lib/types/entities';

/** Record one pairwise judgment (the source of truth for a list's order). */
export function recordComparison(
	db: Kysely<Database>,
	input: { listId: string; gameA: number; gameB: number; winnerId: number }
): Promise<Comparison> {
	return db
		.insertInto('comparisons')
		.values({
			listId: input.listId,
			gameA: input.gameA,
			gameB: input.gameB,
			winnerId: input.winnerId
		})
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
