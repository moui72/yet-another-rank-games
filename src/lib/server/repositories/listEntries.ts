import type { Kysely } from 'kysely';
import type { Database } from '../schema';
import type { ListEntry } from '$lib/types/entities';

/** Replace a list's ordering snapshot atomically (full recompute). */
export async function replaceListEntries(
	db: Kysely<Database>,
	listId: string,
	entries: { gameId: number; position: number; score: number | null }[]
): Promise<void> {
	await db.transaction().execute(async (tx) => {
		await tx.deleteFrom('listEntries').where('listId', '=', listId).execute();
		if (entries.length > 0) {
			await tx
				.insertInto('listEntries')
				.values(entries.map((e) => ({ listId, gameId: e.gameId, position: e.position, score: e.score })))
				.execute();
		}
	});
}

export function listListEntries(db: Kysely<Database>, listId: string): Promise<ListEntry[]> {
	return db
		.selectFrom('listEntries')
		.selectAll()
		.where('listId', '=', listId)
		.orderBy('position', 'asc')
		.execute();
}
