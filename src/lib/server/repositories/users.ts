import type { Kysely } from 'kysely';
import type { Database } from '../schema';
import type { User } from '$lib/types/entities';

/** Create the app-level user row for an existing Supabase Auth user. */
export function createUser(
	db: Kysely<Database>,
	input: { id: string; bggUsername?: string | null }
): Promise<User> {
	return db
		.insertInto('users')
		.values({ id: input.id, bggUsername: input.bggUsername ?? null })
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
