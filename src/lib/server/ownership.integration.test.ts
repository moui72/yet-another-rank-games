import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { db, sql } from './db';
import { AccessDeniedError, getOwnedCollection, getOwnedList, getOwnedPool } from './ownership';
import { createUser } from './repositories/users';
import { createCollection } from './repositories/collections';
import { createPool } from './repositories/pools';

async function makeUser(): Promise<string> {
	const [row] = await sql<{ id: string }[]>`
		insert into auth.users (id) values (gen_random_uuid()) returning id`;
	await createUser(db, { id: row.id });
	return row.id;
}

async function makeList(userId: string): Promise<string> {
	const pool = await createPool(db, { userId, name: 'Pool' });
	const row = await db
		.insertInto('lists')
		.values({ poolId: pool.id, userId, name: 'Top 10', rankingMethod: 'pairwise' })
		.returning('id')
		.executeTakeFirstOrThrow();
	return row.id;
}

beforeEach(async () => {
	await sql`truncate table games restart identity cascade`;
	await sql`delete from auth.users`;
});
afterAll(async () => {
	await db.destroy();
});

describe('ownership enforcement (RLS off)', () => {
	it('lets the owner read their collection but denies another user', async () => {
		const owner = await makeUser();
		const other = await makeUser();
		const collection = await createCollection(db, { userId: owner, bggUsername: 'tyler' });

		await expect(getOwnedCollection(db, owner, collection.id)).resolves.toMatchObject({
			id: collection.id
		});
		await expect(getOwnedCollection(db, other, collection.id)).rejects.toBeInstanceOf(
			AccessDeniedError
		);
	});

	it('lets the owner read their list but denies another user', async () => {
		const owner = await makeUser();
		const other = await makeUser();
		const listId = await makeList(owner);

		await expect(getOwnedList(db, owner, listId)).resolves.toMatchObject({ id: listId });
		await expect(getOwnedList(db, other, listId)).rejects.toBeInstanceOf(AccessDeniedError);
	});

	it('lets the owner read their pool but denies another user', async () => {
		const owner = await makeUser();
		const other = await makeUser();
		const pool = await createPool(db, { userId: owner, name: 'Co-op' });

		await expect(getOwnedPool(db, owner, pool.id)).resolves.toMatchObject({ id: pool.id });
		await expect(getOwnedPool(db, other, pool.id)).rejects.toBeInstanceOf(AccessDeniedError);
	});

	it('denies access to a nonexistent resource', async () => {
		const user = await makeUser();
		await expect(
			getOwnedCollection(db, user, '00000000-0000-0000-0000-000000000000')
		).rejects.toBeInstanceOf(AccessDeniedError);
	});
});
