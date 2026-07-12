import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { db, sql } from './db';
import { addGameFromSearch, type FetchThing } from './addFromSearch';
import { createPool, listPoolGames } from './repositories/pools';
import type { BggThing } from './bgg/types';

function thing(bggId: number, name: string): BggThing {
	return {
		bggId,
		name,
		yearPublished: 2017,
		weight: 3.9,
		minPlayers: 1,
		maxPlayers: 4,
		playingTime: 120,
		thumbnailUrl: 'g.jpg',
		mechanics: ['Cooperative Game'],
		categories: ['Adventure'],
		isExpansion: false
	};
}

async function makeUser(): Promise<string> {
	const [row] = await sql<{ id: string }[]>`
		insert into auth.users (id) values (gen_random_uuid()) returning id`;
	return row.id;
}

beforeEach(async () => {
	await sql`truncate table games restart identity cascade`;
	await sql`delete from auth.users`;
});
afterAll(async () => {
	await db.destroy();
});

describe('addGameFromSearch', () => {
	it('lands a searched game (in no collection) in both games and the pool', async () => {
		const userId = await makeUser();
		const pool = await createPool(db, { userId, name: 'Search adds' });

		// This game is in nobody's collection — only reachable via search.
		const fetchThing: FetchThing = vi.fn(async (id) => thing(id, 'Gloomhaven'));
		const result = await addGameFromSearch(db, pool.id, 174430, fetchThing);

		expect(fetchThing).toHaveBeenCalledWith(174430);
		expect(result.added).toBe(1);

		const [gameRow] = await sql<{ name: string; last_fetched_at: string | null }[]>`
			select name, last_fetched_at from games where bgg_id = 174430`;
		expect(gameRow.name).toBe('Gloomhaven');
		expect(gameRow.last_fetched_at).not.toBeNull();

		const games = await listPoolGames(db, pool.id);
		expect(games.map((g) => g.bggId)).toEqual([174430]);
	});

	it('is idempotent — re-adding the same game adds no new pool row', async () => {
		const userId = await makeUser();
		const pool = await createPool(db, { userId, name: 'Dupes' });
		const fetchThing: FetchThing = async (id) => thing(id, 'Catan');
		await addGameFromSearch(db, pool.id, 13, fetchThing);
		const second = await addGameFromSearch(db, pool.id, 13, fetchThing);
		expect(second.added).toBe(0);
		expect(await listPoolGames(db, pool.id)).toHaveLength(1);
	});

	it('throws when BGG has no thing for the id', async () => {
		const userId = await makeUser();
		const pool = await createPool(db, { userId, name: 'Missing' });
		const fetchThing: FetchThing = async () => null;
		await expect(addGameFromSearch(db, pool.id, 999999, fetchThing)).rejects.toThrow();
	});
});
