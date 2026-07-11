import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { listCollectionsByUser } from '$lib/server/repositories/collections';

/** The signed-in user's collections with their import status (for polling). */
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, 'Not authenticated');
	return json({ collections: await listCollectionsByUser(db, locals.user.id) });
};
