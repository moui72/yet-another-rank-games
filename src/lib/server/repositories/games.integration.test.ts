import { describe, it, expect, afterAll } from 'vitest';
import { db, sql } from '../db';
import { upsertGame } from './games';
import type { BggThing } from '../bgg/types';

function thing(bggId: number, name: string, over: Partial<BggThing> = {}): BggThing {
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
		isExpansion: false,
		...over
	};
}

afterAll(async () => {
	await sql.end();
});

// bgg-cover-art-and-card-view (T003): imageUrl flows through the same
// thing-enrichment upsert path as thumbnailUrl, so newly-imported/enriched
// games get games.image_url populated.
describe('upsertGame image_url (T003)', () => {
	it('persists imageUrl on insert', async () => {
		const game = await upsertGame(db, thing(910001, 'Cover Art Game', { imageUrl: 'full.jpg' }));
		expect(game.imageUrl).toBe('full.jpg');
	});

	it('updates imageUrl on conflict (re-enrichment)', async () => {
		await upsertGame(db, thing(910002, 'Re-enriched Game', { imageUrl: null }));
		const updated = await upsertGame(
			db,
			thing(910002, 'Re-enriched Game', { imageUrl: 'newly-fetched.jpg' })
		);
		expect(updated.imageUrl).toBe('newly-fetched.jpg');
	});
});
