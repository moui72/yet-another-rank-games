import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { db, sql } from '../db';
import { runImport, type ImportDeps } from './importJob';
import { createUser } from '../repositories/users';
import { createCollection } from '../repositories/collections';
import { listItemsByCollection } from '../repositories/collectionItems';
import type { BggCollectionItem, BggThing } from '../bgg/types';

async function makeUserAndCollection(): Promise<{ userId: string; collectionId: string }> {
	const [row] = await sql<{ id: string }[]>`
		insert into auth.users (id) values (gen_random_uuid()) returning id`;
	await createUser(db, { id: row.id });
	const c = await createCollection(db, { userId: row.id, bggUsername: 'tyler' });
	return { userId: row.id, collectionId: c.id };
}

const CATAN_ITEM: BggCollectionItem = { bggId: 13, name: 'Catan', owned: true, userRating: 9, numPlays: 5 };
const CARC_ITEM: BggCollectionItem = { bggId: 822, name: 'Carcassonne', owned: false, userRating: null, numPlays: 0 };

const CATAN_THING: BggThing = {
	bggId: 13, name: 'Catan', yearPublished: 1995, weight: 2.3, minPlayers: 3, maxPlayers: 4,
	playingTime: 120, thumbnailUrl: 'x.jpg', mechanics: ['Trading'], categories: ['Economic']
};
const CARC_THING: BggThing = {
	bggId: 822, name: 'Carcassonne', yearPublished: 2000, weight: 1.9, minPlayers: 2, maxPlayers: 5,
	playingTime: 45, thumbnailUrl: 'y.jpg', mechanics: ['Tile Placement'], categories: ['Medieval']
};

function deps(items: BggCollectionItem[], things: BggThing[]): ImportDeps {
	return {
		db,
		fetchCollection: async () => items,
		fetchThings: async (ids) => things.filter((t) => ids.includes(t.bggId))
	};
}

async function gameCount(): Promise<number> {
	const [r] = await sql<{ n: number }[]>`select count(*)::int as n from games`;
	return r.n;
}

beforeEach(async () => {
	await sql`truncate table games restart identity cascade`;
	await sql`delete from auth.users`;
});
afterAll(async () => {
	await db.destroy();
});

describe('runImport', () => {
	it('upserts games and collection items and stamps the sync', async () => {
		const { collectionId } = await makeUserAndCollection();
		const result = await runImport(deps([CATAN_ITEM, CARC_ITEM], [CATAN_THING, CARC_THING]), {
			collectionId,
			username: 'tyler'
		});

		expect(result).toEqual({ gameCount: 2, itemCount: 2 });
		expect(await gameCount()).toBe(2);

		const items = await listItemsByCollection(db, collectionId);
		expect(items).toHaveLength(2);
		const catan = items.find((i) => i.userRating === 9);
		expect(catan?.owned).toBe(true);

		const [{ weight }] = await sql<{ weight: number }[]>`select weight from games where bgg_id = 13`;
		expect(Number(weight)).toBe(2.3);

		const [{ last_synced_at }] = await sql<{ last_synced_at: string | null }[]>`
			select last_synced_at from collections where id = ${collectionId}`;
		expect(last_synced_at).not.toBeNull();
	});

	it('is idempotent — re-import does not duplicate games or items', async () => {
		const { collectionId } = await makeUserAndCollection();
		const d = deps([CATAN_ITEM, CARC_ITEM], [CATAN_THING, CARC_THING]);
		await runImport(d, { collectionId, username: 'tyler' });
		await runImport(d, { collectionId, username: 'tyler' });

		expect(await gameCount()).toBe(2);
		expect(await listItemsByCollection(db, collectionId)).toHaveLength(2);
	});

	it('shares one games row across two users’ collections', async () => {
		const a = await makeUserAndCollection();
		const b = await makeUserAndCollection();
		await runImport(deps([CATAN_ITEM], [CATAN_THING]), { collectionId: a.collectionId, username: 'a' });
		await runImport(deps([CATAN_ITEM], [CATAN_THING]), { collectionId: b.collectionId, username: 'b' });

		expect(await gameCount()).toBe(1);
		expect(await listItemsByCollection(db, a.collectionId)).toHaveLength(1);
		expect(await listItemsByCollection(db, b.collectionId)).toHaveLength(1);
	});

	it('creates a minimal game when thing details are missing (partial data)', async () => {
		const { collectionId } = await makeUserAndCollection();
		const result = await runImport(deps([CATAN_ITEM], []), { collectionId, username: 'tyler' });
		expect(result.gameCount).toBe(1);
		const [{ name, weight }] = await sql<{ name: string; weight: number | null }[]>`
			select name, weight from games where bgg_id = 13`;
		expect(name).toBe('Catan');
		expect(weight).toBeNull();
	});
});
