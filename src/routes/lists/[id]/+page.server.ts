import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { getOwnedList, AccessDeniedError } from '$lib/server/ownership';
import { listPoolGames } from '$lib/server/repositories/pools';
import { listComparisons } from '$lib/server/repositories/comparisons';
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
	const comparisons = await listComparisons(db, list.id);
	// Resume: replay the persisted comparisons into the session's choice log.
	const log: Choice[] = comparisons.map((c) => ({
		winnerId: c.winnerId,
		loserId: c.winnerId === c.gameA ? c.gameB : c.gameA
	}));

	return { list, games: games.map((g) => ({ id: g.id, name: g.name })), log };
};
