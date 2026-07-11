import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { getOwnedList, AccessDeniedError } from '$lib/server/ownership';
import { undoLastComparisonAndRecompute } from '$lib/server/ranking';

/** Undo the most recent comparison for a list and refresh its snapshot. */
export const POST: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) error(401, 'Not authenticated');
	try {
		await getOwnedList(db, locals.user.id, params.id);
	} catch (e) {
		if (e instanceof AccessDeniedError) error(404, 'List not found');
		throw e;
	}
	await undoLastComparisonAndRecompute(db, params.id);
	return json({ ok: true });
};
