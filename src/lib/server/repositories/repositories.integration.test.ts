import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { db, sql } from '../db';
import { createUser, getUserById, setUserBggUsername } from './users';
import {
	createCollection,
	getCollectionById,
	listCollectionsByUser,
	markCollectionSynced
} from './collections';
import { upsertCollectionItem, listItemsByCollection } from './collectionItems';

// Create an auth user (only `id` is required) and return its id.
async function makeAuthUser(): Promise<string> {
	const [row] = await sql<{ id: string }[]>`
		insert into auth.users (id) values (gen_random_uuid()) returning id`;
	return row.id;
}

async function makeGame(bggId: number): Promise<number> {
	const g = await db
		.insertInto('games')
		.values({ bggId, name: `Game ${bggId}` })
		.returning('id')
		.executeTakeFirstOrThrow();
	return g.id;
}

beforeEach(async () => {
	await sql`truncate table games restart identity cascade`;
	await sql`delete from auth.users`;
});
afterAll(async () => {
	await db.destroy();
});

describe('user repository', () => {
	it('creates and reads a user', async () => {
		const id = await makeAuthUser();
		const created = await createUser(db, { id, bggUsername: 'tyler' });
		expect(created.id).toBe(id);
		expect(created.bggUsername).toBe('tyler');
		const fetched = await getUserById(db, id);
		expect(fetched?.bggUsername).toBe('tyler');
	});

	it('returns undefined for a missing user', async () => {
		expect(await getUserById(db, '00000000-0000-0000-0000-000000000000')).toBeUndefined();
	});

	it('updates the bgg username', async () => {
		const id = await makeAuthUser();
		await createUser(db, { id });
		const updated = await setUserBggUsername(db, id, 'newname');
		expect(updated.bggUsername).toBe('newname');
	});
});

describe('collection repository', () => {
	it('creates, lists, and stamps a sync', async () => {
		const userId = await makeAuthUser();
		await createUser(db, { id: userId });
		const c = await createCollection(db, { userId, bggUsername: 'tyler' });
		expect(c.userId).toBe(userId);
		expect(c.lastSyncedAt).toBeNull();

		const list = await listCollectionsByUser(db, userId);
		expect(list).toHaveLength(1);

		const stamped = await markCollectionSynced(db, c.id, '2026-07-10T00:00:00.000Z');
		expect(stamped.lastSyncedAt).not.toBeNull();
		expect((await getCollectionById(db, c.id))?.lastSyncedAt).not.toBeNull();
	});
});

describe('collection item repository', () => {
	it('upserts idempotently on (collection, game)', async () => {
		const userId = await makeAuthUser();
		await createUser(db, { id: userId });
		const c = await createCollection(db, { userId, bggUsername: 'tyler' });
		const gameId = await makeGame(174430);

		await upsertCollectionItem(db, { collectionId: c.id, gameId, owned: true, userRating: 9 });
		await upsertCollectionItem(db, { collectionId: c.id, gameId, owned: false, userRating: 8 });

		const items = await listItemsByCollection(db, c.id);
		expect(items).toHaveLength(1);
		expect(items[0].owned).toBe(false);
		expect(items[0].userRating).toBe(8);
	});
});
