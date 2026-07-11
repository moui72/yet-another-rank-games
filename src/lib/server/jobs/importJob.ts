import type { Kysely } from 'kysely';
import type { Database } from '../schema';
import type { ImportJob } from './types';
import type { BggCollectionItem, BggThing } from '../bgg/types';
import { upsertGame } from '../repositories/games';
import { upsertCollectionItem } from '../repositories/collectionItems';
import {
	markCollectionSynced,
	markCollectionImporting,
	markCollectionFailed
} from '../repositories/collections';
import { fetchCollectionWithRetry } from '../bgg/collection';
import { fetchCollectionXml, fetchThingXml } from '../bgg/client';
import { parseThingXml } from '../bgg/parse';
import { logEvent, logError } from '../log';

/** Injected dependencies so the import is testable with a mocked BGG client. */
export interface ImportDeps {
	db: Kysely<Database>;
	fetchCollection: (username: string, opts: { ownedOnly?: boolean }) => Promise<BggCollectionItem[]>;
	fetchThings: (ids: number[]) => Promise<BggThing[]>;
}

/** Fall back to a minimal game when BGG thing details are unavailable. */
function minimalThing(bggId: number, name: string): BggThing {
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
		categories: []
	};
}

/**
 * Import a BGG collection into `job.collectionId`: fetch the collection, fetch
 * game details, upsert the globally-shared game rows (by bgg_id) and this
 * collection's items, then stamp the sync. Idempotent — re-running updates in
 * place rather than duplicating.
 */
export async function runImport(
	deps: ImportDeps,
	job: ImportJob
): Promise<{ gameCount: number; itemCount: number }> {
	const items = await deps.fetchCollection(job.username, { ownedOnly: job.ownedOnly });
	const bggIds = [...new Set(items.map((i) => i.bggId))];
	const things = bggIds.length ? await deps.fetchThings(bggIds) : [];
	const thingByBggId = new Map(things.map((t) => [t.bggId, t]));

	const gameIdByBggId = new Map<number, number>();
	for (const item of items) {
		if (gameIdByBggId.has(item.bggId)) continue;
		const thing = thingByBggId.get(item.bggId) ?? minimalThing(item.bggId, item.name);
		const game = await upsertGame(deps.db, thing);
		gameIdByBggId.set(item.bggId, game.id);
	}

	for (const item of items) {
		const gameId = gameIdByBggId.get(item.bggId);
		if (gameId === undefined) continue;
		await upsertCollectionItem(deps.db, {
			collectionId: job.collectionId,
			gameId,
			owned: item.owned,
			userRating: item.userRating,
			numPlays: item.numPlays
		});
	}

	await markCollectionSynced(deps.db, job.collectionId);
	return { gameCount: gameIdByBggId.size, itemCount: items.length };
}

/**
 * Run an import with lifecycle tracking and an app-side dead-letter: mark the
 * collection importing, run it, and on any terminal error record a `failed`
 * status + error on the collection (queryable) and log it — without rethrowing.
 * The bounded retry already happened inside `fetchCollectionWithRetry`, so a
 * failure here is terminal, not something to loop on. In production, Cloud
 * Tasks' own dead-letter queue backs this up (infrastructure.md).
 */
export async function executeImportJob(deps: ImportDeps, job: ImportJob): Promise<void> {
	await markCollectionImporting(deps.db, job.collectionId);
	logEvent('import.start', { collectionId: job.collectionId, username: job.username });
	try {
		const result = await runImport(deps, job);
		logEvent('import.done', { collectionId: job.collectionId, ...result });
	} catch (e) {
		const error = e instanceof Error ? e.message : String(e);
		await markCollectionFailed(deps.db, job.collectionId, error);
		logError('import.failed', { collectionId: job.collectionId, error });
	}
}

/** Queue entry point: wires the real BGG client (with poll-retry) + db. */
export async function processImportJob(job: ImportJob): Promise<void> {
	const { db } = await import('../db');
	const deps: ImportDeps = {
		db,
		fetchCollection: (username, opts) => fetchCollectionWithRetry(fetchCollectionXml, username, opts),
		fetchThings: async (ids) => parseThingXml((await fetchThingXml(ids)).xml)
	};
	await executeImportJob(deps, job);
}
