import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { db, sql } from './db';
import {
	recomputeListEntries,
	recordComparisonAndRecompute,
	setPoolGameExcludedAndRecompute
} from './ranking';
import { createPool, addPoolGames, removePoolGame } from './repositories/pools';
import { createList } from './repositories/lists';
import { listComparisons } from './repositories/comparisons';
import { listListEntries } from './repositories/listEntries';
import { upsertGame } from './repositories/games';
import type { BggThing } from './bgg/types';

function thing(bggId: number, name: string): BggThing {
	return {
		bggId,
		name,
		yearPublished: null,
		weight: null,
		minPlayers: null,
		maxPlayers: null,
		playingTime: null,
		thumbnailUrl: null,
		mechanics: [],
		categories: [],
		isExpansion: false
	};
}

async function setup() {
	const [row] = await sql<{ id: string }[]>`
		insert into auth.users (id) values (gen_random_uuid()) returning id`;
	const userId = row.id;
	const a = (await upsertGame(db, thing(1, 'A'))).id;
	const b = (await upsertGame(db, thing(2, 'B'))).id;
	const c = (await upsertGame(db, thing(3, 'C'))).id;
	const pool = await createPool(db, { userId, name: 'P' });
	await addPoolGames(db, pool.id, [a, b, c]);
	const list = await createList(db, { poolId: pool.id, userId, name: 'L', rankingMethod: 'pairwise' });
	return { userId, poolId: pool.id, listId: list.id, a, b, c };
}

beforeEach(async () => {
	await sql`truncate table games restart identity cascade`;
	await sql`delete from auth.users`;
});
afterAll(async () => {
	await db.destroy();
});

describe('recomputeListEntries', () => {
	it('orders the snapshot from the comparison log (A>B>C)', async () => {
		const { listId, a, b, c } = await setup();
		// A beats everyone, B beats C.
		await recordComparisonAndRecompute(db, { listId, gameA: a, gameB: b, winnerId: a });
		await recordComparisonAndRecompute(db, { listId, gameA: a, gameB: c, winnerId: a });
		await recordComparisonAndRecompute(db, { listId, gameA: b, gameB: c, winnerId: b });

		const entries = await listListEntries(db, listId);
		expect(entries.map((e) => e.gameId)).toEqual([a, b, c]);
		expect(entries.map((e) => e.position)).toEqual([1, 2, 3]);
		expect(await listComparisons(db, listId)).toHaveLength(3);
	});

	it('is idempotent — recomputing again yields the same snapshot (resume)', async () => {
		const { listId, a, b, c } = await setup();
		await recordComparisonAndRecompute(db, { listId, gameA: a, gameB: b, winnerId: a });
		await recordComparisonAndRecompute(db, { listId, gameA: b, gameB: c, winnerId: b });
		const first = (await listListEntries(db, listId)).map((e) => e.gameId);

		await recomputeListEntries(db, listId);
		const second = (await listListEntries(db, listId)).map((e) => e.gameId);
		expect(second).toEqual(first);
	});

	it('ignores comparisons for a game removed from the pool', async () => {
		const { listId, poolId, a, b, c } = await setup();
		await recordComparisonAndRecompute(db, { listId, gameA: a, gameB: b, winnerId: a });
		await recordComparisonAndRecompute(db, { listId, gameA: a, gameB: c, winnerId: a });

		await removePoolGame(db, poolId, c);
		await recomputeListEntries(db, listId);

		const entries = await listListEntries(db, listId);
		expect(entries.map((e) => e.gameId)).toEqual([a, b]);
		expect(entries).toHaveLength(2);
	});

	it('excludes a manually-excluded game from the snapshot but keeps its comparisons in the rating math (T014)', async () => {
		const { listId, poolId, a, b, c } = await setup();
		await recordComparisonAndRecompute(db, { listId, gameA: a, gameB: b, winnerId: a });
		await recordComparisonAndRecompute(db, { listId, gameA: b, gameB: c, winnerId: b });

		await setPoolGameExcludedAndRecompute(db, listId, poolId, a, true);

		const entries = await listListEntries(db, listId);
		// a is excluded from the snapshot, but b/c ordering still reflects a's
		// historical win over b (rating math uses all in-pool comparisons).
		expect(entries.map((e) => e.gameId)).toEqual([b, c]);

		// Un-excluding restores it to the snapshot.
		await setPoolGameExcludedAndRecompute(db, listId, poolId, a, false);
		const restored = await listListEntries(db, listId);
		expect(restored.map((e) => e.gameId)).toContain(a);
	});
});
