import type { Kysely } from 'kysely';
import type { Database } from '../schema';
import type { Game } from '$lib/types/entities';
import type { BggThing } from '../bgg/types';

/** Upsert the shared, global game row for a BGG id (idempotent on bgg_id). */
export function upsertGame(db: Kysely<Database>, t: BggThing): Promise<Game> {
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
		lastFetchedAt: new Date().toISOString()
	};
	return db
		.insertInto('games')
		.values({ bggId: t.bggId, ...fields })
		.onConflict((oc) => oc.column('bggId').doUpdateSet(fields))
		.returningAll()
		.executeTakeFirstOrThrow();
}
