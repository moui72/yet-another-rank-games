import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { db, sql } from '../db';
import { recordComparison, recordComparisons, listComparisons } from './comparisons';
import { createPool, addPoolGames } from './pools';
import { createList } from './lists';
import { upsertGame } from './games';
import type { BggThing } from '../bgg/types';

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
		imageUrl: null,
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
	const pool = await createPool(db, { userId, name: 'P' });
	await addPoolGames(db, pool.id, [a, b]);
	const list = await createList(db, { poolId: pool.id, userId, name: 'L', rankingMethod: 'pairwise' });
	return { listId: list.id, a, b };
}

beforeEach(async () => {
	await sql`truncate table games restart identity cascade`;
	await sql`delete from auth.users`;
});
afterAll(async () => {
	await db.destroy();
});

describe('recordComparison (ardd-audit 2026-07-15: no double-weighting on re-judge)', () => {
	it('stores game_a/game_b canonically ordered regardless of call order', async () => {
		const { listId, a, b } = await setup();
		// b has the higher game id; pass it as gameA to check canonicalization.
		const row = await recordComparison(db, { listId, gameA: b, gameB: a, winnerId: b });
		expect(row.gameA).toBe(a);
		expect(row.gameB).toBe(b);
		expect(row.winnerId).toBe(b);
	});

	it('upserts rather than duplicating when the same pair is judged again', async () => {
		const { listId, a, b } = await setup();
		await recordComparison(db, { listId, gameA: a, gameB: b, winnerId: a });
		await recordComparison(db, { listId, gameA: a, gameB: b, winnerId: a });
		const rows = await listComparisons(db, listId);
		expect(rows).toHaveLength(1);
	});

	it('overwrites the winner when the pair is re-judged the other way', async () => {
		const { listId, a, b } = await setup();
		await recordComparison(db, { listId, gameA: a, gameB: b, winnerId: a });
		await recordComparison(db, { listId, gameA: b, gameB: a, winnerId: b });
		const rows = await listComparisons(db, listId);
		expect(rows).toHaveLength(1);
		expect(rows[0].winnerId).toBe(b);
	});
});

describe('recordComparisons (T013: batched k-edge upsert)', () => {
	it('inserts k canonically-ordered rows in one statement', async () => {
		const { listId, a, b } = await setup();
		const c = (await upsertGame(db, thing(3, 'C'))).id;
		const rows = await recordComparisons(db, {
			listId,
			edges: [
				{ winnerId: b, loserId: a }, // b higher id, passed winner-first
				{ winnerId: a, loserId: c }
			]
		});
		expect(rows).toHaveLength(2);
		const all = await listComparisons(db, listId);
		expect(all).toHaveLength(2);
		// Canonicalised: lower game id in gameA regardless of winner side.
		for (const r of all) expect(r.gameA).toBeLessThan(r.gameB);
	});

	it('cannot diverge from recordComparison — a batched re-judge upserts, not duplicates', async () => {
		const { listId, a, b } = await setup();
		await recordComparison(db, { listId, gameA: a, gameB: b, winnerId: a });
		// Batched write re-judges the same pair the other way.
		await recordComparisons(db, { listId, edges: [{ winnerId: b, loserId: a }] });
		const all = await listComparisons(db, listId);
		expect(all).toHaveLength(1);
		expect(all[0].winnerId).toBe(b);
	});

	it('is a no-op for an empty edge list', async () => {
		const { listId } = await setup();
		const rows = await recordComparisons(db, { listId, edges: [] });
		expect(rows).toEqual([]);
		expect(await listComparisons(db, listId)).toHaveLength(0);
	});
});
