import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { getOwnedList, AccessDeniedError } from '$lib/server/ownership';
import { recordOverrideAndRecompute } from '$lib/server/ranking';

/**
 * Persist a manual override (drag-to-order, move up/down, or move-to-position-N)
 * for an efficient list as a batch of constraint edges, then refresh its
 * ordering snapshot (T018). The body is `{ edges: [{ winnerId, loserId }] }`.
 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) error(401, 'Not authenticated');
	try {
		await getOwnedList(db, locals.user.id, params.id);
	} catch (e) {
		if (e instanceof AccessDeniedError) error(404, 'List not found');
		throw e;
	}

	const body = await request.json().catch(() => ({}));
	const rawEdges: unknown = body?.edges;
	if (!Array.isArray(rawEdges)) error(400, 'Invalid override');
	const edges = rawEdges.map((e) => ({ winnerId: Number(e?.winnerId), loserId: Number(e?.loserId) }));
	if (
		edges.some(
			(e) => !Number.isFinite(e.winnerId) || !Number.isFinite(e.loserId) || e.winnerId === e.loserId
		)
	) {
		error(400, 'Invalid override');
	}

	await recordOverrideAndRecompute(db, params.id, edges);
	return json({ ok: true });
};
