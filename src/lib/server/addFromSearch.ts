import type { Kysely } from 'kysely';
import type { Database } from './schema';
import type { BggThing } from './bgg/types';
import { upsertGame } from './repositories/games';
import { addPoolGames } from './repositories/pools';

/** Fetch full BGG `thing` details for a single id (null when unavailable). */
export type FetchThing = (bggId: number) => Promise<BggThing | null>;

/**
 * Import a BGG game picked from search into the shared catalogue and attach it
 * to a pool. Same upsert-by-`bgg_id` path as collection import: fetch the
 * `thing`, `upsertGame` (stamping `lastFetchedAt`), then `addPoolGames`. So a
 * pool can include any BGG game, not just ones already in some collection.
 * Returns the catalogue game id and how many pool rows were newly added
 * (0 when the game was already in the pool).
 */
export async function addGameFromSearch(
	db: Kysely<Database>,
	poolId: string,
	bggId: number,
	fetchThing: FetchThing
): Promise<{ gameId: number; added: number }> {
	const thing = await fetchThing(bggId);
	if (!thing) throw new Error(`BGG game ${bggId} not found`);
	const game = await upsertGame(db, thing);
	const added = await addPoolGames(db, poolId, [game.id]);
	return { gameId: game.id, added };
}
