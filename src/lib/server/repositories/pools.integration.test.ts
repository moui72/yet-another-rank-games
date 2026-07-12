import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { db, sql } from '../db';
import {
	createPool,
	listPoolsByUser,
	addPoolGames,
	listPoolGames,
	removePoolGame,
	findMatchingGameIds
} from './pools';
import { createCollection } from './collections';
import { upsertGame } from './games';
import { upsertCollectionItem } from './collectionItems';
import type { BggThing } from '../bgg/types';

function thing(bggId: number, name: string, over: Partial<BggThing>): BggThing {
	return {
		bggId,
		name,
		yearPublished: 2000,
		weight: null,
		minPlayers: null,
		maxPlayers: null,
		playingTime: null,
		thumbnailUrl: null,
		mechanics: [],
		categories: [],
		isExpansion: false,
		...over
	};
}

async function setup() {
	const [row] = await sql<{ id: string }[]>`
		insert into auth.users (id) values (gen_random_uuid()) returning id`;
	const userId = row.id;
	const collection = await createCollection(db, { userId, bggUsername: 'tyler' });

	const catan = await upsertGame(db, thing(13, 'Catan', { mechanics: ['Trading', 'Dice Rolling'], weight: 2.3, minPlayers: 3, maxPlayers: 4 }));
	const pandemic = await upsertGame(db, thing(30549, 'Pandemic', { mechanics: ['Cooperative Game'], weight: 2.4, minPlayers: 2, maxPlayers: 4 }));
	const gloom = await upsertGame(db, thing(174430, 'Gloomhaven', { mechanics: ['Cooperative Game'], weight: 3.9, minPlayers: 1, maxPlayers: 4 }));

	await upsertCollectionItem(db, { collectionId: collection.id, gameId: catan.id, owned: true });
	await upsertCollectionItem(db, { collectionId: collection.id, gameId: pandemic.id, owned: true });
	await upsertCollectionItem(db, { collectionId: collection.id, gameId: gloom.id, owned: false });

	return { userId, collectionId: collection.id, ids: { catan: catan.id, pandemic: pandemic.id, gloom: gloom.id } };
}

beforeEach(async () => {
	await sql`truncate table games restart identity cascade`;
	await sql`delete from auth.users`;
});
afterAll(async () => {
	await db.destroy();
});

describe('findMatchingGameIds', () => {
	it('matches a mechanic (include)', async () => {
		const { collectionId, ids } = await setup();
		const matched = await findMatchingGameIds(db, collectionId, {
			mechanics: { include: ['Cooperative Game'], exclude: [] }
		});
		expect(new Set(matched)).toEqual(new Set([ids.pandemic, ids.gloom]));
	});

	it('matches a weight range', async () => {
		const { collectionId, ids } = await setup();
		expect(await findMatchingGameIds(db, collectionId, { weight: { min: 3 } })).toEqual([ids.gloom]);
	});

	it('matches player-count support', async () => {
		const { collectionId, ids } = await setup();
		expect(await findMatchingGameIds(db, collectionId, { playerCount: { supports: 1 } })).toEqual([
			ids.gloom
		]);
	});

	it('applies owned-only against collection items', async () => {
		const { collectionId, ids } = await setup();
		const matched = await findMatchingGameIds(db, collectionId, {
			ownedOnly: true,
			mechanics: { include: ['Cooperative Game'], exclude: [] }
		});
		expect(matched).toEqual([ids.pandemic]);
	});

	it('excludes a mechanic', async () => {
		const { collectionId, ids } = await setup();
		const matched = await findMatchingGameIds(db, collectionId, {
			mechanics: { include: [], exclude: ['Cooperative Game'] }
		});
		expect(matched).toEqual([ids.catan]);
	});

	it('filters expansions in and out', async () => {
		const { collectionId, ids } = await setup();
		const seafarers = await upsertGame(db, thing(926, 'Catan: Seafarers', { isExpansion: true }));
		await upsertCollectionItem(db, { collectionId, gameId: seafarers.id, owned: true });

		const baseOnly = await findMatchingGameIds(db, collectionId, { expansions: 'exclude' });
		expect(new Set(baseOnly)).toEqual(new Set([ids.catan, ids.pandemic, ids.gloom]));

		const expansionsOnly = await findMatchingGameIds(db, collectionId, { expansions: 'only' });
		expect(expansionsOnly).toEqual([seafarers.id]);
	});
});

describe('pool repository', () => {
	it('creates a pool, adds/lists/removes games idempotently', async () => {
		const { userId, ids } = await setup();
		const pool = await createPool(db, { userId, name: 'Co-op' });
		expect(await listPoolsByUser(db, userId)).toHaveLength(1);

		const added = await addPoolGames(db, pool.id, [ids.pandemic, ids.gloom]);
		expect(added).toBe(2);
		// idempotent — re-adding one changes nothing
		expect(await addPoolGames(db, pool.id, [ids.pandemic])).toBe(0);

		const games = await listPoolGames(db, pool.id);
		expect(games.map((g) => g.id).sort()).toEqual([ids.pandemic, ids.gloom].sort());

		await removePoolGame(db, pool.id, ids.gloom);
		expect(await listPoolGames(db, pool.id)).toHaveLength(1);
	});
});
