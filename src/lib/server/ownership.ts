import type { Kysely } from 'kysely';
import type { Database } from './schema';
import type { Collection, List, Pool } from '$lib/types/entities';

/**
 * Thrown when a user tries to access a resource they don't own. Because RLS is
 * off (infrastructure.md), every query for a user-owned resource is scoped by
 * the requesting user's id, so a non-owner simply finds nothing — which we
 * surface as an explicit access-denied rather than a silent "not found".
 */
export class AccessDeniedError extends Error {
	constructor(resource: string) {
		super(`Access denied to ${resource}`);
		this.name = 'AccessDeniedError';
	}
}

/** Fetch a collection only if it belongs to `userId`; otherwise throw. */
export async function getOwnedCollection(
	db: Kysely<Database>,
	userId: string,
	collectionId: string
): Promise<Collection> {
	const row = await db
		.selectFrom('collections')
		.selectAll()
		.where('id', '=', collectionId)
		.where('userId', '=', userId)
		.executeTakeFirst();
	if (!row) throw new AccessDeniedError('collection');
	return row;
}

/** Fetch a pool only if it belongs to `userId`; otherwise throw. */
export async function getOwnedPool(
	db: Kysely<Database>,
	userId: string,
	poolId: string
): Promise<Pool> {
	const row = await db
		.selectFrom('pools')
		.selectAll()
		.where('id', '=', poolId)
		.where('userId', '=', userId)
		.executeTakeFirst();
	if (!row) throw new AccessDeniedError('pool');
	return row;
}

/** Fetch a list only if it belongs to `userId`; otherwise throw. */
export async function getOwnedList(
	db: Kysely<Database>,
	userId: string,
	listId: string
): Promise<List> {
	const row = await db
		.selectFrom('lists')
		.selectAll()
		.where('id', '=', listId)
		.where('userId', '=', userId)
		.executeTakeFirst();
	if (!row) throw new AccessDeniedError('list');
	return row;
}
