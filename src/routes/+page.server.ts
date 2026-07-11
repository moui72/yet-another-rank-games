import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { listCollectionsByUser } from '$lib/server/repositories/collections';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return { collections: [] };
	return { collections: await listCollectionsByUser(db, locals.user.id) };
};
