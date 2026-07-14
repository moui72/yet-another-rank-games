import type { Kysely } from 'kysely';
import type { Database } from '../schema';
import type { CollectionItemDuplicate } from '$lib/types/entities';

/** A pending duplicate, scoped to the confirming user's own collection. */
export function getPendingDuplicateForUser(
	db: Kysely<Database>,
	userId: string,
	duplicateId: string
): Promise<
	(CollectionItemDuplicate & { collectionItemGameId: number }) | undefined
> {
	return db
		.selectFrom('collectionItemDuplicates as d')
		.innerJoin('collectionItems as ci', 'ci.id', 'd.collectionItemId')
		.innerJoin('collections as c', 'c.id', 'ci.collectionId')
		.where('d.id', '=', duplicateId)
		.where('d.status', '=', 'pending')
		.where('c.userId', '=', userId)
		.select([
			'd.id as id',
			'd.collectionItemId as collectionItemId',
			'd.candidateGameId as candidateGameId',
			'd.status as status',
			'd.createdAt as createdAt',
			'ci.gameId as collectionItemGameId'
		])
		.executeTakeFirst();
}

/** A pending duplicate for display in the possible-duplicates review step (T011). */
export interface PendingDuplicateView {
	id: string;
	itemTitle: string;
	candidateGameId: number;
	candidateTitle: string;
}

/** Pending duplicates for a collection, with both games' titles for review. */
export function listPendingDuplicatesForCollection(
	db: Kysely<Database>,
	collectionId: string
): Promise<PendingDuplicateView[]> {
	return db
		.selectFrom('collectionItemDuplicates as d')
		.innerJoin('collectionItems as ci', 'ci.id', 'd.collectionItemId')
		.innerJoin('games as item_game', 'item_game.id', 'ci.gameId')
		.innerJoin('games as candidate_game', 'candidate_game.id', 'd.candidateGameId')
		.where('ci.collectionId', '=', collectionId)
		.where('d.status', '=', 'pending')
		.select([
			'd.id as id',
			'item_game.name as itemTitle',
			'd.candidateGameId as candidateGameId',
			'candidate_game.name as candidateTitle'
		])
		.execute();
}

/** Reject a pending duplicate as distinct: leaves both items untouched. */
export function rejectDuplicate(
	db: Kysely<Database>,
	duplicateId: string
): Promise<CollectionItemDuplicate | undefined> {
	return db
		.updateTable('collectionItemDuplicates')
		.set({ status: 'rejected_distinct' })
		.where('id', '=', duplicateId)
		.where('status', '=', 'pending')
		.returningAll()
		.executeTakeFirst();
}

/** Mark a duplicate confirmed (the merge itself is orchestrated elsewhere). */
export function markDuplicateConfirmed(db: Kysely<Database>, duplicateId: string): Promise<void> {
	return db
		.updateTable('collectionItemDuplicates')
		.set({ status: 'confirmed_same' })
		.where('id', '=', duplicateId)
		.execute()
		.then(() => undefined);
}
