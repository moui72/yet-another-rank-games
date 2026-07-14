import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { getOwnedList, AccessDeniedError } from '$lib/server/ownership';
import { setPoolGameExcludedAndRecompute } from '$lib/server/ranking';

/**
 * T014: set/clear a pool game's ranking exclusion while viewing a list —
 * moves it between the Ranked and Unranked sections without touching its
 * `PoolGame`/`Comparison` rows (unlike `/drop`, which hard-deletes).
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
	const excluded = Boolean(body?.excluded);
	if (!Number.isFinite(gameId)) error(400, 'Invalid game');

	await setPoolGameExcludedAndRecompute(db, params.id, list.poolId, gameId, excluded);
	return json({ ok: true });
};
