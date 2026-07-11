import { sql, type Kysely } from 'kysely';
import type { Database } from '../schema';
import type { Pool, Game, ListFilter } from '$lib/types/entities';

export function createPool(
	db: Kysely<Database>,
	input: { userId: string; name: string; description?: string | null }
): Promise<Pool> {
	return db
		.insertInto('pools')
		.values({ userId: input.userId, name: input.name, description: input.description ?? null })
		.returningAll()
		.executeTakeFirstOrThrow();
}

export function listPoolsByUser(db: Kysely<Database>, userId: string): Promise<Pool[]> {
	return db
		.selectFrom('pools')
		.selectAll()
		.where('userId', '=', userId)
		.orderBy('createdAt', 'asc')
		.execute();
}

/** The games currently in a pool, with their catalogue details. */
export function listPoolGames(db: Kysely<Database>, poolId: string): Promise<Game[]> {
	return db
		.selectFrom('poolGames as pg')
		.innerJoin('games as g', 'g.id', 'pg.gameId')
		.where('pg.poolId', '=', poolId)
		.orderBy('g.name', 'asc')
		.selectAll('g')
		.execute();
}

/** Add games to a pool, ignoring ones already present. Returns the count added. */
export async function addPoolGames(
	db: Kysely<Database>,
	poolId: string,
	gameIds: number[]
): Promise<number> {
	if (gameIds.length === 0) return 0;
	const result = await db
		.insertInto('poolGames')
		.values(gameIds.map((gameId) => ({ poolId, gameId })))
		.onConflict((oc) => oc.columns(['poolId', 'gameId']).doNothing())
		.executeTakeFirst();
	return Number(result.numInsertedOrUpdatedRows ?? 0);
}

export async function removePoolGame(
	db: Kysely<Database>,
	poolId: string,
	gameId: number
): Promise<void> {
	await db.deleteFrom('poolGames').where('poolId', '=', poolId).where('gameId', '=', gameId).execute();
}

/**
 * Find the ids of games in a collection that match a filter — the bulk-add
 * query for the pool builder. A conjunction of the present predicates
 * (datamodel.md "Pool filter"). Array predicates use Postgres array operators.
 */
export async function findMatchingGameIds(
	db: Kysely<Database>,
	collectionId: string,
	filter: ListFilter
): Promise<number[]> {
	let q = db
		.selectFrom('collectionItems as ci')
		.innerJoin('games as g', 'g.id', 'ci.gameId')
		.where('ci.collectionId', '=', collectionId)
		.select('g.id as id');

	if (filter.ownedOnly) q = q.where('ci.owned', '=', true);

	if (filter.mechanics?.include?.length) {
		q = q.where(sql<boolean>`g.mechanics @> ${filter.mechanics.include}::text[]`);
	}
	if (filter.mechanics?.exclude?.length) {
		q = q.where(sql<boolean>`not (g.mechanics && ${filter.mechanics.exclude}::text[])`);
	}
	if (filter.categories?.include?.length) {
		q = q.where(sql<boolean>`g.categories @> ${filter.categories.include}::text[]`);
	}
	if (filter.categories?.exclude?.length) {
		q = q.where(sql<boolean>`not (g.categories && ${filter.categories.exclude}::text[])`);
	}
	if (filter.weight?.min != null) q = q.where('g.weight', '>=', filter.weight.min);
	if (filter.weight?.max != null) q = q.where('g.weight', '<=', filter.weight.max);
	if (filter.playingTime?.min != null) q = q.where('g.playingTime', '>=', filter.playingTime.min);
	if (filter.playingTime?.max != null) q = q.where('g.playingTime', '<=', filter.playingTime.max);
	if (filter.yearPublished?.min != null) q = q.where('g.yearPublished', '>=', filter.yearPublished.min);
	if (filter.yearPublished?.max != null) q = q.where('g.yearPublished', '<=', filter.yearPublished.max);
	if (filter.playerCount) {
		const n = filter.playerCount.supports;
		q = q.where('g.minPlayers', '<=', n).where('g.maxPlayers', '>=', n);
	}

	const rows = await q.execute();
	return rows.map((r) => r.id);
}
