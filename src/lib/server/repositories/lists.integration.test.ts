import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { db, sql } from '../db';
import { createList, listListsByPool } from './lists';
import { createPool } from './pools';

async function makePool(): Promise<{ userId: string; poolId: string }> {
	const [row] = await sql<{ id: string }[]>`
		insert into auth.users (id) values (gen_random_uuid()) returning id`;
	const pool = await createPool(db, { userId: row.id, name: 'Co-op' });
	return { userId: row.id, poolId: pool.id };
}

beforeEach(async () => {
	await sql`delete from auth.users`;
});
afterAll(async () => {
	await db.destroy();
});

describe('list repository', () => {
	it('creates a list from a pool and lists them', async () => {
		const { userId, poolId } = await makePool();
		const created = await createList(db, {
			poolId,
			userId,
			name: 'Top co-op',
			rankingMethod: 'pairwise'
		});
		expect(created.poolId).toBe(poolId);
		expect(created.status).toBe('in_progress');

		const lists = await listListsByPool(db, poolId);
		expect(lists).toHaveLength(1);
		expect(lists[0].name).toBe('Top co-op');
	});

	it('lets one pool feed several lists', async () => {
		const { userId, poolId } = await makePool();
		await createList(db, { poolId, userId, name: 'A', rankingMethod: 'pairwise' });
		await createList(db, { poolId, userId, name: 'B', rankingMethod: 'manual' });
		expect(await listListsByPool(db, poolId)).toHaveLength(2);
	});
});
