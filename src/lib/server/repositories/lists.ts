import { randomUUID } from 'node:crypto';
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

/**
 * Enable or disable public sharing for a list (feature `public-list-sharing`).
 * `shareToken` is generated lazily — only the first time `isShared` transitions
 * to `true` — and is never regenerated or cleared afterward: disabling sharing
 * flips `isShared` back to false but leaves the token in place, since a link
 * already handed out keeps working (non-revocable in v1; see `ui.md`).
 */
export async function setListShared(
	db: Kysely<Database>,
	listId: string,
	isShared: boolean
): Promise<List> {
	if (isShared) {
		const current = await db
			.selectFrom('lists')
			.select(['shareToken'])
			.where('id', '=', listId)
			.executeTakeFirstOrThrow();
		return db
			.updateTable('lists')
			.set({ isShared: true, shareToken: current.shareToken ?? randomUUID() })
			.where('id', '=', listId)
			.returningAll()
			.executeTakeFirstOrThrow();
	}
	return db
		.updateTable('lists')
		.set({ isShared: false })
		.where('id', '=', listId)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Look up a list by its public share token — only when currently shared.
 * A wrong token and a right-but-now-unshared token both resolve to
 * `undefined`, so callers (the `/share/[token]` route) return the same 404
 * for both, per `infrastructure.md`'s "possession of the token" model.
 */
export function getSharedListByToken(
	db: Kysely<Database>,
	shareToken: string
): Promise<List | undefined> {
	return db
		.selectFrom('lists')
		.selectAll()
		.where('shareToken', '=', shareToken)
		.where('isShared', '=', true)
		.executeTakeFirst();
}
