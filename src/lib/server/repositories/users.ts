import type { Kysely } from 'kysely';
import type { Database } from '../schema';
import type { User } from '$lib/types/entities';

/**
 * Ensure the app-level user row exists (and set its bgg username). Idempotent —
 * the `on_auth_user_created` trigger already provisions the row on sign-up, so
 * this upserts rather than assuming it's absent.
 */
export function createUser(
	db: Kysely<Database>,
	input: { id: string; bggUsername?: string | null }
): Promise<User> {
	return db
		.insertInto('users')
		.values({ id: input.id, bggUsername: input.bggUsername ?? null })
		.onConflict((oc) => oc.column('id').doUpdateSet({ bggUsername: input.bggUsername ?? null }))
		.returningAll()
		.executeTakeFirstOrThrow();
}

export function getUserById(db: Kysely<Database>, id: string): Promise<User | undefined> {
	return db.selectFrom('users').selectAll().where('id', '=', id).executeTakeFirst();
}

export function setUserBggUsername(
	db: Kysely<Database>,
	id: string,
	bggUsername: string | null
): Promise<User> {
	return db
		.updateTable('users')
		.set({ bggUsername })
		.where('id', '=', id)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Persist the "Show cover art" preference (bgg-cover-art-and-card-view,
 * T006/T008) — one field, surfaced by an inline toggle in both the pool
 * builder and the pairwise ranking view.
 */
export function setShowCoverArt(
	db: Kysely<Database>,
	id: string,
	showCoverArt: boolean
): Promise<User> {
	return db
		.updateTable('users')
		.set({ showCoverArt })
		.where('id', '=', id)
		.returningAll()
		.executeTakeFirstOrThrow();
}
