import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { getOwnedList, AccessDeniedError } from '$lib/server/ownership';
import { listPoolGames } from '$lib/server/repositories/pools';
import { listComparisons } from '$lib/server/repositories/comparisons';
import { listListEntries } from '$lib/server/repositories/listEntries';
import type { Choice } from '$lib/domain/ranking';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) error(401, 'Not authenticated');
	let list;
	try {
		list = await getOwnedList(db, locals.user.id, params.id);
	} catch (e) {
		if (e instanceof AccessDeniedError) error(404, 'List not found');
		throw e;
	}

	const games = await listPoolGames(db, list.poolId);

	if (list.rankingMethod === 'manual') {
		// Order pool games by their saved position (unsaved ones at the end).
		const entries = await listListEntries(db, list.id);
		const posOf = new Map(entries.map((e) => [e.gameId, e.position]));
		const ordered = [...games].sort(
			(a, b) => (posOf.get(a.id) ?? Infinity) - (posOf.get(b.id) ?? Infinity)
		);
		return { list, mode: 'manual' as const, games: ordered.map((g) => ({ id: g.id, name: g.name })) };
	}

	// Pairwise: resume by replaying persisted comparisons into the choice log.
	const comparisons = await listComparisons(db, list.id);
	const log: Choice[] = comparisons.map((c) => ({
		winnerId: c.winnerId,
		loserId: c.winnerId === c.gameA ? c.gameB : c.gameA
	}));
	return {
		list,
		mode: 'pairwise' as const,
		games: games.map((g) => ({ id: g.id, name: g.name, excludedFromRanking: g.excludedFromRanking })),
		log
	};
};
