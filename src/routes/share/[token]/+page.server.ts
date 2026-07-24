import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { getSharedListByToken } from '$lib/server/repositories/lists';
import { listRankedEntries } from '$lib/server/repositories/listEntries';

/**
 * The one unauthenticated read route in the app (feature `public-list-sharing`,
 * `infrastructure.md`): no session/auth check. Looks up a list by its share
 * token and returns 404 — not a distinct "unauthorized" response — when no
 * list matches, or when the matching list is not currently shared, so a
 * wrong/disabled token is indistinguishable from a nonexistent one.
 * `getSharedListByToken` already scopes to `isShared = true`, so both cases
 * collapse to the same `undefined` here. Reuses `listRankedEntries` — the
 * same derived-snapshot read path the authenticated list view exports from —
 * so the shared view always reflects the list's live current ranking, with
 * no separate snapshot/cache layer.
 */
export const load: PageServerLoad = async ({ params }) => {
	const list = await getSharedListByToken(db, params.token);
	if (!list) error(404, 'List not found');

	const entries = await listRankedEntries(db, list.id);
	return { listName: list.name, entries };
};
