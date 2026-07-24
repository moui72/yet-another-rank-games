import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { getOwnedList, AccessDeniedError } from '$lib/server/ownership';
import { recordComparisonAndRecompute } from '$lib/server/ranking';
import { listComparisons } from '$lib/server/repositories/comparisons';
import type { Choice } from '$lib/domain/ranking';

/** Record a pairwise choice for a list and refresh its ordering snapshot. */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) error(401, 'Not authenticated');
	try {
		await getOwnedList(db, locals.user.id, params.id);
	} catch (e) {
		if (e instanceof AccessDeniedError) error(404, 'List not found');
		throw e;
	}

	const body = await request.json().catch(() => ({}));
	const gameA = Number(body?.gameA);
	const gameB = Number(body?.gameB);
	const winnerId = Number(body?.winnerId);
	if (
		![gameA, gameB, winnerId].every(Number.isFinite) ||
		gameA === gameB ||
		(winnerId !== gameA && winnerId !== gameB)
	) {
		error(400, 'Invalid comparison');
	}

	await recordComparisonAndRecompute(db, { listId: params.id, gameA, gameB, winnerId });

	// Return the canonical replayed log (T002, F001) — the same shape
	// +page.server.ts's load already builds from a fresh page load's
	// `listComparisons` — so the client can resync its session to it instead
	// of trusting its own append-only log (T003).
	const comparisons = await listComparisons(db, params.id);
	const log: Choice[] = comparisons.map((c) => ({
		winnerId: c.winnerId,
		loserId: c.winnerId === c.gameA ? c.gameB : c.gameA
	}));

	return json({ ok: true, log });
};
