import type { Kysely } from 'kysely';
import type { Database } from '../schema';
import type { List, ListFilter, RankingMethod } from '$lib/types/entities';

export function createList(
	db: Kysely<Database>,
	input: {
		collectionId: string;
		userId: string;
		name: string;
		description?: string | null;
		filter: ListFilter;
		rankingMethod: RankingMethod;
	}
): Promise<List> {
	return db
		.insertInto('lists')
		.values({
			collectionId: input.collectionId,
			userId: input.userId,
			name: input.name,
			description: input.description ?? null,
			filter: input.filter,
			rankingMethod: input.rankingMethod
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

export function listListsByCollection(
	db: Kysely<Database>,
	collectionId: string
): Promise<List[]> {
	return db
		.selectFrom('lists')
		.selectAll()
		.where('collectionId', '=', collectionId)
		.orderBy('createdAt', 'asc')
		.execute();
}
