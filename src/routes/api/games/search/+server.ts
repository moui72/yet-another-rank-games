import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchSearchXml } from '$lib/server/bgg/client';
import { parseSearchXml } from '$lib/server/bgg/parse';

const MAX_RESULTS = 10;

// ── Production Annotation ──────────────────────────────────────────────
// This endpoint makes a synchronous BGG `search` call on every request.
// In production the per-keystroke search should be debounced (client side)
// and/or the BGG results cached server-side, so we don't hit BGG on every
// request and stay within its rate limits.
// ───────────────────────────────────────────────────────────────────────

/**
 * Search BGG for board games by name. Auth-gated; returns up to
 * `MAX_RESULTS` typed `BggSearchResult[]` as JSON.
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) error(401, 'Not authenticated');

	const q = (url.searchParams.get('q') ?? '').trim();
	if (!q) error(400, 'Missing search query');

	const { xml } = await fetchSearchXml(q);
	const results = parseSearchXml(xml).slice(0, MAX_RESULTS);
	return json(results);
};
