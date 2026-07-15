import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { db, sql } from './db';
import { createCollection } from './repositories/collections';
import { upsertGame } from './repositories/games';
import { addLocalCollectionItem } from './repositories/collectionItems';
import { createPool, addPoolGames, listPoolGames } from './repositories/pools';
import { createList } from './repositories/lists';
import { recordComparison, listComparisons } from './repositories/comparisons';
import { confirmDuplicateMerge, rejectDuplicateMerge } from './duplicateResolution';
import type { BggThing } from './bgg/types';

function thing(bggId: number, name: string): BggThing {
	return {
		bggId,
		name,
		yearPublished: 2000,
		weight: null,
		minPlayers: null,
		maxPlayers: null,
		playingTime: null,
		thumbnailUrl: null,
		imageUrl: null,
		mechanics: [],
		categories: [],
		isExpansion: false
	};
}

async function makeUser(): Promise<string> {
	const [row] = await sql<{ id: string }[]>`
		insert into auth.users (id) values (gen_random_uuid()) returning id`;
	return row.id;
}

async function makePendingDuplicate(collectionItemId: string, candidateGameId: number) {
	const [row] = await sql<{ id: string }[]>`
		insert into collection_item_duplicates (collection_item_id, candidate_game_id)
		values (${collectionItemId}, ${candidateGameId}) returning id`;
	return row.id;
}

beforeEach(async () => {
	await sql`truncate table games restart identity cascade`;
	await sql`delete from auth.users`;
});
afterAll(async () => {
	await db.destroy();
});

describe('confirmDuplicateMerge (T008)', () => {
	it("repoints this user's own PoolGame rows to the candidate and deletes the local item; a second user's PoolGame is unaffected", async () => {
		const userA = await makeUser();
		const userB = await makeUser();
		const collectionA = await createCollection(db, { userId: userA, bggUsername: 'a' });

		const localGame = await upsertGame(db, thing(1, 'Catan (Local Add)'));
		const candidateGame = await upsertGame(db, thing(2, 'Catan'));

		const localItem = await addLocalCollectionItem(db, {
			collectionId: collectionA.id,
			gameId: localGame.id
		});
		const dupId = await makePendingDuplicate(localItem.id, candidateGame.id);

		const poolA = await createPool(db, { userId: userA, name: "A's pool" });
		await addPoolGames(db, poolA.id, [localGame.id]);

		const poolB = await createPool(db, { userId: userB, name: "B's pool" });
		await addPoolGames(db, poolB.id, [localGame.id]);

		const ok = await confirmDuplicateMerge(db, userA, dupId);
		expect(ok).toBe(true);

		const poolAGames = (await listPoolGames(db, poolA.id)).map((g) => g.id);
		expect(poolAGames).toEqual([candidateGame.id]);

		// Second user's pool still references the original local game — untouched.
		const poolBGames = (await listPoolGames(db, poolB.id)).map((g) => g.id);
		expect(poolBGames).toEqual([localGame.id]);

		const [row] = await sql<{ count: number }[]>`
			select count(*)::int as count from collection_items where id = ${localItem.id}`;
		expect(row.count).toBe(0);
	});

	it("repoints this user's own Comparison rows to the candidate", async () => {
		const userA = await makeUser();
		const collectionA = await createCollection(db, { userId: userA, bggUsername: 'a' });
		const localGame = await upsertGame(db, thing(1, 'Catan (Local Add)'));
		const candidateGame = await upsertGame(db, thing(2, 'Catan'));
		const otherGame = await upsertGame(db, thing(3, 'Pandemic'));

		const localItem = await addLocalCollectionItem(db, {
			collectionId: collectionA.id,
			gameId: localGame.id
		});
		const dupId = await makePendingDuplicate(localItem.id, candidateGame.id);

		const pool = await createPool(db, { userId: userA, name: 'Pool' });
		await addPoolGames(db, pool.id, [localGame.id, otherGame.id]);
		const list = await createList(db, {
			poolId: pool.id,
			userId: userA,
			name: 'List',
			rankingMethod: 'pairwise'
		});
		await recordComparison(db, {
			listId: list.id,
			gameA: localGame.id,
			gameB: otherGame.id,
			winnerId: localGame.id
		});

		await confirmDuplicateMerge(db, userA, dupId);

		const comparisons = await listComparisons(db, list.id);
		expect(comparisons).toHaveLength(1);
		expect(comparisons[0].gameA).toBe(candidateGame.id);
		expect(comparisons[0].winnerId).toBe(candidateGame.id);
	});

	it('is a no-op for a duplicate not owned by the requesting user', async () => {
		const userA = await makeUser();
		const userB = await makeUser();
		const collectionA = await createCollection(db, { userId: userA, bggUsername: 'a' });
		const localGame = await upsertGame(db, thing(1, 'Catan (Local Add)'));
		const candidateGame = await upsertGame(db, thing(2, 'Catan'));
		const localItem = await addLocalCollectionItem(db, {
			collectionId: collectionA.id,
			gameId: localGame.id
		});
		const dupId = await makePendingDuplicate(localItem.id, candidateGame.id);

		const ok = await confirmDuplicateMerge(db, userB, dupId);
		expect(ok).toBe(false);
		const [row] = await sql<{ count: number }[]>`
			select count(*)::int as count from collection_items where id = ${localItem.id}`;
		expect(row.count).toBe(1);
	});
});

describe('rejectDuplicateMerge (T008)', () => {
	it('sets status=rejected_distinct and leaves both CollectionItem rows intact', async () => {
		const userA = await makeUser();
		const collectionA = await createCollection(db, { userId: userA, bggUsername: 'a' });
		const localGame = await upsertGame(db, thing(1, 'Catan (Local Add)'));
		const candidateGame = await upsertGame(db, thing(2, 'Catan'));
		const localItem = await addLocalCollectionItem(db, {
			collectionId: collectionA.id,
			gameId: localGame.id
		});
		const dupId = await makePendingDuplicate(localItem.id, candidateGame.id);

		const ok = await rejectDuplicateMerge(db, userA, dupId);
		expect(ok).toBe(true);

		const [dupRow] = await sql<{ status: string }[]>`
			select status from collection_item_duplicates where id = ${dupId}`;
		expect(dupRow.status).toBe('rejected_distinct');

		const [itemRow] = await sql<{ count: number }[]>`
			select count(*)::int as count from collection_items where id = ${localItem.id}`;
		expect(itemRow.count).toBe(1);
	});
});
