import type { Kysely } from 'kysely';
import type { Database } from '../schema';
import type { CollectionItem } from '$lib/types/entities';

/**
 * Insert or update the item for a (collection, game) pair — an import re-runs
 * over the same collection, so this is idempotent on the unique key.
 */
export function upsertCollectionItem(
	db: Kysely<Database>,
	input: {
		collectionId: string;
		gameId: number;
		owned: boolean;
		userRating?: number | null;
		numPlays?: number | null;
	}
): Promise<CollectionItem> {
	return db
		.insertInto('collectionItems')
		.values({
			collectionId: input.collectionId,
			gameId: input.gameId,
			owned: input.owned,
			userRating: input.userRating ?? null,
			numPlays: input.numPlays ?? null
		})
		.onConflict((oc) =>
			oc.columns(['collectionId', 'gameId']).doUpdateSet({
				owned: input.owned,
				userRating: input.userRating ?? null,
				numPlays: input.numPlays ?? null
			})
		)
		.returningAll()
		.executeTakeFirstOrThrow();
}

export function listItemsByCollection(
	db: Kysely<Database>,
	collectionId: string
): Promise<CollectionItem[]> {
	return db
		.selectFrom('collectionItems')
		.selectAll()
		.where('collectionId', '=', collectionId)
		.execute();
}
