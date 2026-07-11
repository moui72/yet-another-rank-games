import type { Kysely } from 'kysely';
import type { Database } from '../schema';
import type { List, RankingMethod } from '$lib/types/entities';

export function createList(
	db: Kysely<Database>,
	input: {
		poolId: string;
		userId: string;
		name: string;
		description?: string | null;
		rankingMethod: RankingMethod;
	}
): Promise<List> {
	return db
		.insertInto('lists')
		.values({
			poolId: input.poolId,
			userId: input.userId,
			name: input.name,
			description: input.description ?? null,
			rankingMethod: input.rankingMethod
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

export function listListsByPool(db: Kysely<Database>, poolId: string): Promise<List[]> {
	return db
		.selectFrom('lists')
		.selectAll()
		.where('poolId', '=', poolId)
		.orderBy('createdAt', 'asc')
		.execute();
}
