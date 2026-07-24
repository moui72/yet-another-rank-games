import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { db, sql } from '../db';
import { createList, listListsByPool, setListShared, getSharedListByToken } from './lists';
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
		await createList(db, { poolId, userId, name: 'B', rankingMethod: 'efficient' });
		expect(await listListsByPool(db, poolId)).toHaveLength(2);
	});
});

// public-list-sharing (T002): lazy share_token generation on first enable,
// stable on repeat enable, retained on disable.
describe('setListShared (T002)', () => {
	it('generates a share token the first time sharing is enabled', async () => {
		const { userId, poolId } = await makePool();
		const list = await createList(db, { poolId, userId, name: 'Shareable', rankingMethod: 'pairwise' });
		expect(list.isShared).toBe(false);
		expect(list.shareToken).toBeNull();

		const shared = await setListShared(db, list.id, true);
		expect(shared.isShared).toBe(true);
		expect(shared.shareToken).toBeTruthy();
	});

	it('does not change the token on a second enable', async () => {
		const { userId, poolId } = await makePool();
		const list = await createList(db, { poolId, userId, name: 'Shareable', rankingMethod: 'pairwise' });
		const first = await setListShared(db, list.id, true);
		const second = await setListShared(db, list.id, true);
		expect(second.shareToken).toBe(first.shareToken);
	});

	it('keeps the token when sharing is disabled', async () => {
		const { userId, poolId } = await makePool();
		const list = await createList(db, { poolId, userId, name: 'Shareable', rankingMethod: 'pairwise' });
		const shared = await setListShared(db, list.id, true);
		const disabled = await setListShared(db, list.id, false);
		expect(disabled.isShared).toBe(false);
		expect(disabled.shareToken).toBe(shared.shareToken);
	});

	it('finds a shared list by its token but not when unshared or unknown', async () => {
		const { userId, poolId } = await makePool();
		const list = await createList(db, { poolId, userId, name: 'Shareable', rankingMethod: 'pairwise' });
		const shared = await setListShared(db, list.id, true);

		const found = await getSharedListByToken(db, shared.shareToken as string);
		expect(found?.id).toBe(list.id);

		expect(await getSharedListByToken(db, '00000000-0000-0000-0000-000000000000')).toBeUndefined();

		const disabled = await setListShared(db, list.id, false);
		expect(await getSharedListByToken(db, disabled.shareToken as string)).toBeUndefined();
	});
});
