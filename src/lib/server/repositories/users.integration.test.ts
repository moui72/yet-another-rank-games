import { describe, it, expect, afterAll } from 'vitest';
import { db, sql } from '../db';
import { createUser, getUserById, setShowCoverArt } from './users';

afterAll(async () => {
	await sql.end();
});

async function makeAuthUser(): Promise<string> {
	const [row] = await sql<{ id: string }[]>`
		insert into auth.users (id) values (gen_random_uuid()) returning id`;
	return row.id;
}

// bgg-cover-art-and-card-view (T006): User.show_cover_art persists via a form
// action shared by the pool builder and pairwise ranking views.
describe('setShowCoverArt (T006)', () => {
	it('defaults a new user to showCoverArt true', async () => {
		const id = await makeAuthUser();
		const user = await createUser(db, { id });
		expect(user.showCoverArt).toBe(true);
	});

	it('persists false and reads it back', async () => {
		const id = await makeAuthUser();
		await createUser(db, { id });
		const updated = await setShowCoverArt(db, id, false);
		expect(updated.showCoverArt).toBe(false);
		const reread = await getUserById(db, id);
		expect(reread?.showCoverArt).toBe(false);
	});
});
