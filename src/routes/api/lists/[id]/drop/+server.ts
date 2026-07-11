import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { getOwnedList, AccessDeniedError } from '$lib/server/ownership';
import { removePoolGame } from '$lib/server/repositories/pools';
import { recomputeListEntries } from '$lib/server/ranking';

/**
 * Drop a game from this list's pool while ranking, then refresh the snapshot.
 * (Pools feed many lists, so this affects every list built from the pool.)
 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) error(401, 'Not authenticated');
	let list;
	try {
		list = await getOwnedList(db, locals.user.id, params.id);
	} catch (e) {
		if (e instanceof AccessDeniedError) error(404, 'List not found');
		throw e;
	}

	const body = await request.json().catch(() => ({}));
	const gameId = Number(body?.gameId);
	if (!Number.isFinite(gameId)) error(400, 'Invalid game');

	await removePoolGame(db, list.poolId, gameId);
	await recomputeListEntries(db, params.id);
	return json({ ok: true });
};
