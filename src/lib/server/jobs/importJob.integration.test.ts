import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { db, sql } from '../db';
import { runImport, executeImportJob, type ImportDeps } from './importJob';
import { BggQueuedTimeoutError } from '../bgg/collection';
import { createUser } from '../repositories/users';
import { createCollection } from '../repositories/collections';
import {
	listItemsByCollection,
	softDeleteCollectionItem,
	addLocalCollectionItem
} from '../repositories/collectionItems';
import { upsertGame } from '../repositories/games';
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
	playingTime: 120, thumbnailUrl: 'x.jpg', mechanics: ['Trading'], categories: ['Economic'], isExpansion: false
};
const CARC_THING: BggThing = {
	bggId: 822, name: 'Carcassonne', yearPublished: 2000, weight: 1.9, minPlayers: 2, maxPlayers: 5,
	playingTime: 45, thumbnailUrl: 'y.jpg', mechanics: ['Tile Placement'], categories: ['Medieval'], isExpansion: false
};

function deps(items: BggCollectionItem[], things: BggThing[]): ImportDeps {
	return {
		db,
		fetchCollection: async () => items,
		fetchThings: vi.fn(async (ids: number[]) => things.filter((t) => ids.includes(t.bggId)))
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

		expect(result).toEqual({ gameCount: 2, itemCount: 2, fetchedCount: 2 });
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

	it('reuses fresh catalogue games on re-import — no second thing fetch', async () => {
		const { collectionId } = await makeUserAndCollection();
		const d = deps([CATAN_ITEM, CARC_ITEM], [CATAN_THING, CARC_THING]);
		const first = await runImport(d, { collectionId, username: 'tyler' });
		expect(first.fetchedCount).toBe(2);

		const second = await runImport(d, { collectionId, username: 'tyler' });
		expect(second).toMatchObject({ gameCount: 2, itemCount: 2, fetchedCount: 0 });
		// fetchThings was called once (first import), not again.
		expect(d.fetchThings).toHaveBeenCalledTimes(1);
	});

	it('re-fetches stale games when the TTL has passed (ttlDays 0)', async () => {
		const { collectionId } = await makeUserAndCollection();
		const d = deps([CATAN_ITEM], [CATAN_THING]);
		await runImport(d, { collectionId, username: 'tyler' }, { ttlDays: 0 });
		const second = await runImport(d, { collectionId, username: 'tyler' }, { ttlDays: 0 });
		expect(second.fetchedCount).toBe(1);
		expect(d.fetchThings).toHaveBeenCalledTimes(2);
	});

	it('shares one games row across two users’ collections and skips the second fetch', async () => {
		const a = await makeUserAndCollection();
		const b = await makeUserAndCollection();
		await runImport(deps([CATAN_ITEM], [CATAN_THING]), { collectionId: a.collectionId, username: 'a' });
		const bDeps = deps([CATAN_ITEM], [CATAN_THING]);
		const bResult = await runImport(bDeps, { collectionId: b.collectionId, username: 'b' });

		expect(await gameCount()).toBe(1);
		expect(bResult.fetchedCount).toBe(0);
		expect(bDeps.fetchThings).toHaveBeenCalledTimes(0);
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

describe('runImport resync reconciliation (T006)', () => {
	it('flips a removed item to pending_delete when its bggId is absent from the re-pull', async () => {
		const { collectionId } = await makeUserAndCollection();
		await runImport(deps([CATAN_ITEM, CARC_ITEM], [CATAN_THING, CARC_THING]), {
			collectionId,
			username: 'tyler'
		});
		const items = await listItemsByCollection(db, collectionId);
		const catanItem = items.find((i) => i.userRating === 9)!;
		await softDeleteCollectionItem(db, catanItem.id);

		// Re-pull with only Carcassonne present — Catan is gone from BGG.
		await runImport(deps([CARC_ITEM], [CARC_THING]), { collectionId, username: 'tyler' });

		const after = await listItemsByCollection(db, collectionId);
		const catanAfter = after.find((i) => i.id === catanItem.id)!;
		expect(catanAfter.status).toBe('pending_delete');
	});

	it('leaves a removed item that is still present in the re-pull as removed (not un-removed)', async () => {
		const { collectionId } = await makeUserAndCollection();
		await runImport(deps([CATAN_ITEM, CARC_ITEM], [CATAN_THING, CARC_THING]), {
			collectionId,
			username: 'tyler'
		});
		const items = await listItemsByCollection(db, collectionId);
		const catanItem = items.find((i) => i.userRating === 9)!;
		await softDeleteCollectionItem(db, catanItem.id);

		// Re-pull with Catan still present — BGG re-adding it shouldn't un-remove it.
		await runImport(deps([CATAN_ITEM, CARC_ITEM], [CATAN_THING, CARC_THING]), {
			collectionId,
			username: 'tyler'
		});

		const after = await listItemsByCollection(db, collectionId);
		const catanAfter = after.find((i) => i.id === catanItem.id)!;
		expect(catanAfter.status).toBe('removed');
	});
});

describe('runImport fuzzy-title duplicate detection (T007)', () => {
	async function pendingDuplicatesFor(collectionItemId: string) {
		return sql<{ candidate_game_id: number; status: string }[]>`
			select candidate_game_id, status from collection_item_duplicates
			where collection_item_id = ${collectionItemId}`;
	}

	it('flags a local_add item whose title fuzzy-matches a newly-pulled game', async () => {
		const { collectionId } = await makeUserAndCollection();
		// A local add for a reprint edition, entered under its own bggId.
		const reprint = await upsertGame(db, {
			bggId: 90013,
			name: 'Catan',
			yearPublished: 2015,
			weight: null,
			minPlayers: null,
			maxPlayers: null,
			playingTime: null,
			thumbnailUrl: null,
			mechanics: [],
			categories: [],
			isExpansion: false
		});
		const localItem = await addLocalCollectionItem(db, { collectionId, gameId: reprint.id });

		// Re-pull brings in the original Catan under a different bggId (13).
		await runImport(deps([CATAN_ITEM], [CATAN_THING]), { collectionId, username: 'tyler' });

		const dups = await pendingDuplicatesFor(localItem.id);
		expect(dups).toHaveLength(1);
		expect(dups[0].status).toBe('pending');
	});

	it('does not flag an unrelated local_add title', async () => {
		const { collectionId } = await makeUserAndCollection();
		const unrelated = await upsertGame(db, {
			bggId: 90014,
			name: 'Some Totally Different Game',
			yearPublished: 2015,
			weight: null,
			minPlayers: null,
			maxPlayers: null,
			playingTime: null,
			thumbnailUrl: null,
			mechanics: [],
			categories: [],
			isExpansion: false
		});
		const localItem = await addLocalCollectionItem(db, { collectionId, gameId: unrelated.id });

		await runImport(deps([CATAN_ITEM], [CATAN_THING]), { collectionId, username: 'tyler' });

		expect(await pendingDuplicatesFor(localItem.id)).toHaveLength(0);
	});
});

describe('executeImportJob (lifecycle + dead-letter)', () => {
	async function statusOf(collectionId: string) {
		const [row] = await sql<{ import_status: string; import_error: string | null }[]>`
			select import_status, import_error from collections where id = ${collectionId}`;
		return row;
	}

	it('marks the collection complete on success', async () => {
		const { collectionId } = await makeUserAndCollection();
		await executeImportJob(deps([CATAN_ITEM], [CATAN_THING]), { collectionId, username: 'tyler' });
		const s = await statusOf(collectionId);
		expect(s.import_status).toBe('complete');
		expect(s.import_error).toBeNull();
	});

	it('records a failed (dead-letter) state on terminal failure without throwing', async () => {
		const { collectionId } = await makeUserAndCollection();
		const failing: ImportDeps = {
			db,
			fetchCollection: async () => {
				throw new BggQueuedTimeoutError(10);
			},
			fetchThings: async () => []
		};
		await expect(
			executeImportJob(failing, { collectionId, username: 'tyler' })
		).resolves.toBeUndefined();
		const s = await statusOf(collectionId);
		expect(s.import_status).toBe('failed');
		expect(s.import_error).toContain('queued');
	});
});
