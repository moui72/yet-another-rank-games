import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { importQueue } from '$lib/server/jobs/queue';
import { createCollection, listCollectionsByUser } from '$lib/server/repositories/collections';

/**
 * Request an import (or refresh) of a BGG collection for the signed-in user.
 * Ensures a Collection exists for (user, username), then enqueues an import
 * job. Returns 202 with the collection id.
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) error(401, 'Not authenticated');

	const body = await request.json().catch(() => ({}));
	const username = typeof body?.username === 'string' ? body.username.trim() : '';
	if (!username) error(400, 'A BGG username is required');

	const existing = (await listCollectionsByUser(db, locals.user.id)).find(
		(c) => c.bggUsername === username
	);
	const collection =
		existing ?? (await createCollection(db, { userId: locals.user.id, bggUsername: username }));

	await importQueue.enqueue({
		collectionId: collection.id,
		username,
		ownedOnly: Boolean(body?.ownedOnly)
	});

	return json({ collectionId: collection.id, status: 'queued' }, { status: 202 });
};
