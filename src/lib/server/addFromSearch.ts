import type { Kysely } from 'kysely';
import type { Database } from './schema';
import type { BggThing, BggSearchResult } from './bgg/types';
import { upsertGame } from './repositories/games';
import { addPoolGames } from './repositories/pools';

/** Fetch full BGG `thing` details for a single id (null when unavailable). */
export type FetchThing = (bggId: number) => Promise<BggThing | null>;

/** A minimal catalogue game from a search pick (no `thing` detail available). */
function minimalThing(pick: BggSearchResult): BggThing {
	return {
		bggId: pick.bggId,
		name: pick.name,
		yearPublished: pick.yearPublished,
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

/**
 * Import a BGG game picked from search into the shared catalogue and attach it
 * to a pool. Same upsert-by-`bgg_id` path as collection import: fetch the
 * `thing` and `upsertGame` it (stamping `lastFetchedAt`); if BGG has no detail
 * available, fall back to a minimal game from the search pick with a null
 * `lastFetchedAt` (treated as stale, so a later import enriches it) — mirroring
 * the import job. Then `addPoolGames` to attach it, so a pool can include any
 * BGG game, not just ones already in some collection. Returns the catalogue
 * game id and how many pool rows were newly added (0 if already in the pool).
 */
export async function addGameFromSearch(
	db: Kysely<Database>,
	poolId: string,
	pick: BggSearchResult,
	fetchThing: FetchThing
): Promise<{ gameId: number; added: number }> {
	const thing = await fetchThing(pick.bggId);
	const game = thing
		? await upsertGame(db, thing)
		: await upsertGame(db, minimalThing(pick), null);
	const added = await addPoolGames(db, poolId, [game.id]);
	return { gameId: game.id, added };
}
