import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { getOwnedList, AccessDeniedError } from '$lib/server/ownership';
import { listPoolGames } from '$lib/server/repositories/pools';
import { listComparisons } from '$lib/server/repositories/comparisons';
import { getUserById, setShowCoverArt } from '$lib/server/repositories/users';
import { getUserRatingsForGames } from '$lib/server/repositories/collectionItems';
import { setListShared } from '$lib/server/repositories/lists';
import type { Choice } from '$lib/domain/ranking';
import type { Judgment } from '$lib/domain/constraintOrder';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) error(401, 'Not authenticated');
	let list;
	try {
		list = await getOwnedList(db, locals.user.id, params.id);
	} catch (e) {
		if (e instanceof AccessDeniedError) error(404, 'List not found');
		throw e;
	}

	const [games, user] = await Promise.all([
		listPoolGames(db, list.poolId),
		getUserById(db, locals.user.id)
	]);
	const showCoverArt = user?.showCoverArt ?? true;

	if (list.rankingMethod === 'efficient') {
		// Efficient: resume from the persisted comparison rows as the judgment
		// log (preserving createdAt/id so latest-wins / drop-oldest stay
		// well-defined), plus the user's BGG ratings to seed insertion order.
		const activeGames = games.filter((g) => !g.excludedFromRanking);
		const comparisons = await listComparisons(db, list.id);
		const log: Judgment[] = comparisons.map((c) => ({
			winnerId: c.winnerId,
			loserId: c.winnerId === c.gameA ? c.gameB : c.gameA,
			createdAt: c.createdAt,
			id: c.id
		}));
		const userRatings = await getUserRatingsForGames(
			db,
			locals.user.id,
			activeGames.map((g) => g.id)
		);
		return {
			list,
			mode: 'efficient' as const,
			games: activeGames.map((g) => ({
				id: g.id,
				name: g.name,
				userRating: userRatings.get(g.id) ?? null,
				imageUrl: g.imageUrl,
				thumbnailUrl: g.thumbnailUrl
			})),
			log,
			showCoverArt,
			isShared: list.isShared,
			shareToken: list.shareToken
		};
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
		games: games.map((g) => ({
			id: g.id,
			name: g.name,
			excludedFromRanking: g.excludedFromRanking,
			imageUrl: g.imageUrl,
			thumbnailUrl: g.thumbnailUrl
		})),
		log,
		showCoverArt,
		isShared: list.isShared,
		shareToken: list.shareToken
	};
};

function str(v: FormDataEntryValue | null): string | undefined {
	return typeof v === 'string' ? v : undefined;
}

export const actions: Actions = {
	toggleCoverArt: async ({ locals, request }) => {
		if (!locals.user) error(401, 'Not authenticated');
		const form = await request.formData();
		const showCoverArt = str(form.get('showCoverArt')) === 'true';
		await setShowCoverArt(db, locals.user.id, showCoverArt);
		return { coverArtToggled: true, showCoverArt };
	},

	// public-list-sharing (T004): enable/disable the read-only share link.
	// Disabling does not clear share_token (setListShared retains it), so the
	// link keeps working per the non-revocable model even after this flips.
	toggleShare: async ({ locals, params, request }) => {
		if (!locals.user) error(401, 'Not authenticated');
		try {
			await getOwnedList(db, locals.user.id, params.id);
		} catch (e) {
			if (e instanceof AccessDeniedError) error(404, 'List not found');
			throw e;
		}
		const form = await request.formData();
		const isShared = str(form.get('isShared')) === 'true';
		const updated = await setListShared(db, params.id, isShared);
		return { isShared: updated.isShared, shareToken: updated.shareToken };
	}
};
