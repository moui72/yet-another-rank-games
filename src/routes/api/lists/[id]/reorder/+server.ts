import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { getOwnedList, AccessDeniedError } from '$lib/server/ownership';
import { replaceListEntries } from '$lib/server/repositories/listEntries';

/** Persist a manual (drag-to-order) ranking as the list's ordering snapshot. */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) error(401, 'Not authenticated');
	try {
		await getOwnedList(db, locals.user.id, params.id);
	} catch (e) {
		if (e instanceof AccessDeniedError) error(404, 'List not found');
		throw e;
	}

	const body = await request.json().catch(() => ({}));
	const gameIds: number[] | null = Array.isArray(body?.gameIds)
		? body.gameIds.map(Number).filter((n: number) => Number.isFinite(n))
		: null;
	if (!gameIds) error(400, 'Invalid order');

	await replaceListEntries(
		db,
		params.id,
		gameIds.map((gameId, i) => ({ gameId, position: i + 1, score: null }))
	);
	return json({ ok: true });
};
