import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { db, sql } from '../db';
import { createList, listListsByCollection } from './lists';
import { createCollection } from './collections';
import type { ListFilter } from '$lib/types/entities';

async function makeCollection(): Promise<string> {
	const [row] = await sql<{ id: string }[]>`
		insert into auth.users (id) values (gen_random_uuid()) returning id`;
	const c = await createCollection(db, { userId: row.id, bggUsername: 'tyler' });
	return c.id;
}

beforeEach(async () => {
	await sql`delete from auth.users`;
});
afterAll(async () => {
	await db.destroy();
});

describe('list repository', () => {
	it('creates a list and round-trips the jsonb filter', async () => {
		const collectionId = await makeCollection();
		const filter: ListFilter = {
			mechanics: { include: ['Cooperative Game'], exclude: [] },
			weight: { min: 3, max: 5 },
			ownedOnly: true
		};
		const created = await createList(db, {
			collectionId,
			userId: (await db.selectFrom('collections').select('userId').where('id', '=', collectionId).executeTakeFirstOrThrow()).userId,
			name: 'Top co-op',
			filter,
			rankingMethod: 'pairwise'
		});

		expect(created.name).toBe('Top co-op');
		expect(created.rankingMethod).toBe('pairwise');
		expect(created.status).toBe('in_progress');
		expect(created.filter).toEqual(filter);

		const lists = await listListsByCollection(db, collectionId);
		expect(lists).toHaveLength(1);
		expect(lists[0].filter).toEqual(filter);
	});

	it('defaults description to null and an empty filter', async () => {
		const collectionId = await makeCollection();
		const userId = (
			await db.selectFrom('collections').select('userId').where('id', '=', collectionId).executeTakeFirstOrThrow()
		).userId;
		const created = await createList(db, {
			collectionId,
			userId,
			name: 'Everything',
			filter: {},
			rankingMethod: 'manual'
		});
		expect(created.description).toBeNull();
		expect(created.filter).toEqual({});
	});
});
