import type { Kysely } from 'kysely';
import type { Database } from '../schema';
import type { Game } from '$lib/types/entities';
import type { BggThing } from '../bgg/types';

/**
 * Of the given BGG ids, return `bggId -> gameId` for games already in the
 * shared catalogue whose cache is still fresh (fetched within `ttlDays`). Games
 * that are missing, or whose `last_fetched_at` is null/older than the TTL, are
 * omitted — the caller re-fetches those. (A null `last_fetched_at` never
 * compares `>` the cutoff, so minimally-created games are treated as stale.)
 */
export async function findFreshGameIds(
	db: Kysely<Database>,
	bggIds: number[],
	ttlDays: number
): Promise<Map<number, number>> {
	if (bggIds.length === 0) return new Map();
	const cutoff = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000).toISOString();
	const rows = await db
		.selectFrom('games')
		.select(['id', 'bggId'])
		.where('bggId', 'in', bggIds)
		.where('lastFetchedAt', '>', cutoff)
		.execute();
	return new Map(rows.map((r) => [r.bggId, r.id]));
}

/**
 * Upsert the shared, global game row for a BGG id (idempotent on bgg_id).
 * `fetchedAt` stamps the cache clock; pass `null` for a minimal fallback game
 * (created without real `thing` details) so the TTL treats it as stale and it
 * gets enriched on a later import.
 */
export function upsertGame(
	db: Kysely<Database>,
	t: BggThing,
	fetchedAt: string | null = new Date().toISOString()
): Promise<Game> {
	const fields = {
		name: t.name,
		yearPublished: t.yearPublished,
		weight: t.weight,
		minPlayers: t.minPlayers,
		maxPlayers: t.maxPlayers,
		playingTime: t.playingTime,
		thumbnailUrl: t.thumbnailUrl,
		mechanics: t.mechanics,
		categories: t.categories,
		lastFetchedAt: fetchedAt
	};
	return db
		.insertInto('games')
		.values({ bggId: t.bggId, ...fields })
		.onConflict((oc) => oc.column('bggId').doUpdateSet(fields))
		.returningAll()
		.executeTakeFirstOrThrow();
}
