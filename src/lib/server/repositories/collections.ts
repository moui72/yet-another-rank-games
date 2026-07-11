import type { Kysely } from 'kysely';
import type { Database } from '../schema';
import type { Collection } from '$lib/types/entities';

export function createCollection(
	db: Kysely<Database>,
	input: { userId: string; bggUsername: string }
): Promise<Collection> {
	return db
		.insertInto('collections')
		.values({ userId: input.userId, bggUsername: input.bggUsername })
		.returningAll()
		.executeTakeFirstOrThrow();
}

export function getCollectionById(
	db: Kysely<Database>,
	id: string
): Promise<Collection | undefined> {
	return db.selectFrom('collections').selectAll().where('id', '=', id).executeTakeFirst();
}

export function listCollectionsByUser(
	db: Kysely<Database>,
	userId: string
): Promise<Collection[]> {
	return db
		.selectFrom('collections')
		.selectAll()
		.where('userId', '=', userId)
		.orderBy('createdAt', 'asc')
		.execute();
}

/** Stamp a successful sync. Defaults to now(); pass an ISO string to override. */
export function markCollectionSynced(
	db: Kysely<Database>,
	id: string,
	syncedAt: string = new Date().toISOString()
): Promise<Collection> {
	return db
		.updateTable('collections')
		.set({ lastSyncedAt: syncedAt })
		.where('id', '=', id)
		.returningAll()
		.executeTakeFirstOrThrow();
}
