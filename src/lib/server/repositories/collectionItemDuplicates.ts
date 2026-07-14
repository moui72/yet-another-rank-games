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
