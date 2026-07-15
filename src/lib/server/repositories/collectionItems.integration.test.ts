import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { db, sql } from '../db';
import { createCollection } from './collections';
import { upsertGame } from './games';
import {
	upsertCollectionItem,
	listActiveItemsByCollection,
	listRemovedItemsByCollection,
	softDeleteCollectionItem,
	undoCollectionItemRemoval,
	confirmHardDeleteCollectionItem,
	addLocalCollectionItem
} from './collectionItems';
import type { BggThing } from '../bgg/types';

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

async function setup() {
	const [row] = await sql<{ id: string }[]>`
		insert into auth.users (id) values (gen_random_uuid()) returning id`;
	const userId = row.id;
	const collection = await createCollection(db, { userId, bggUsername: 'tyler' });
	const game = await upsertGame(db, thing(1, 'Catan'));
	return { userId, collectionId: collection.id, gameId: game.id };
}

beforeEach(async () => {
	await sql`truncate table games restart identity cascade`;
	await sql`delete from auth.users`;
});
afterAll(async () => {
	await db.destroy();
});

describe('T002 soft-delete', () => {
	it('sets status=removed, removedAt=now(), and excludes it from the active-item query', async () => {
		const { collectionId, gameId } = await setup();
		const item = await upsertCollectionItem(db, { collectionId, gameId, owned: true });

		const removed = await softDeleteCollectionItem(db, item.id);
		expect(removed?.status).toBe('removed');
		expect(removed?.removedAt).not.toBeNull();

		const active = await listActiveItemsByCollection(db, collectionId);
		expect(active.map((i) => i.id)).not.toContain(item.id);
	});
});

describe('T003 undo', () => {
	it('restores a removed item to active and clears removedAt', async () => {
		const { collectionId, gameId } = await setup();
		const item = await upsertCollectionItem(db, { collectionId, gameId, owned: true });
		await softDeleteCollectionItem(db, item.id);

		const restored = await undoCollectionItemRemoval(db, item.id);
		expect(restored?.status).toBe('active');
		expect(restored?.removedAt).toBeNull();

		const active = await listActiveItemsByCollection(db, collectionId);
		expect(active.map((i) => i.id)).toContain(item.id);
	});

	it('restores a pending_delete item to active', async () => {
		const { collectionId, gameId } = await setup();
		const item = await upsertCollectionItem(db, { collectionId, gameId, owned: true });
		await softDeleteCollectionItem(db, item.id);
		await sql`update collection_items set status = 'pending_delete' where id = ${item.id}`;

		const restored = await undoCollectionItemRemoval(db, item.id);
		expect(restored?.status).toBe('active');
	});
});

describe('T004 confirm hard-delete', () => {
	it('deletes a pending_delete item', async () => {
		const { collectionId, gameId } = await setup();
		const item = await upsertCollectionItem(db, { collectionId, gameId, owned: true });
		await softDeleteCollectionItem(db, item.id);
		await sql`update collection_items set status = 'pending_delete' where id = ${item.id}`;

		const deleted = await confirmHardDeleteCollectionItem(db, item.id);
		expect(deleted).toBe(true);
		const remaining = await listRemovedItemsByCollection(db, collectionId);
		expect(remaining.map((i) => i.id)).not.toContain(item.id);
	});

	it('refuses to hard-delete an active item', async () => {
		const { collectionId, gameId } = await setup();
		const item = await upsertCollectionItem(db, { collectionId, gameId, owned: true });

		const deleted = await confirmHardDeleteCollectionItem(db, item.id);
		expect(deleted).toBe(false);
		const active = await listActiveItemsByCollection(db, collectionId);
		expect(active.map((i) => i.id)).toContain(item.id);
	});

	it('refuses to hard-delete a merely-removed item', async () => {
		const { collectionId, gameId } = await setup();
		const item = await upsertCollectionItem(db, { collectionId, gameId, owned: true });
		await softDeleteCollectionItem(db, item.id);

		const deleted = await confirmHardDeleteCollectionItem(db, item.id);
		expect(deleted).toBe(false);
		const removed = await listRemovedItemsByCollection(db, collectionId);
		expect(removed.map((i) => i.id)).toContain(item.id);
	});
});

describe('T005 local add', () => {
	it('adds an item with source=local_add and a real gameId', async () => {
		const { collectionId, gameId } = await setup();
		const item = await addLocalCollectionItem(db, { collectionId, gameId });
		expect(item.source).toBe('local_add');
		expect(item.gameId).toBe(gameId);
		expect(item.status).toBe('active');
	});
});
