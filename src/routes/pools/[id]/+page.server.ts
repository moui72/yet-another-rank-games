import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { getOwnedPool, getOwnedCollection, AccessDeniedError } from '$lib/server/ownership';
import {
	listPoolGames,
	addPoolGames,
	removePoolGame,
	findMatchingGameIds
} from '$lib/server/repositories/pools';
import { listCollectionsByUser } from '$lib/server/repositories/collections';
import { createList, listListsByPool } from '$lib/server/repositories/lists';
import { buildListFilter } from '$lib/domain/listForm';
import { parseListFilter } from '$lib/domain/listFilter';
import { addGameFromSearch, type FetchThing } from '$lib/server/addFromSearch';
import { fetchThingXml } from '$lib/server/bgg/client';
import { parseThingXml } from '$lib/server/bgg/parse';
import { getUserById, setShowCoverArt } from '$lib/server/repositories/users';

function str(v: FormDataEntryValue | null): string | undefined {
	return typeof v === 'string' ? v : undefined;
}

async function requirePool(userId: string, poolId: string) {
	try {
		return await getOwnedPool(db, userId, poolId);
	} catch (e) {
		if (e instanceof AccessDeniedError) error(404, 'Pool not found');
		throw e;
	}
}

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) error(401, 'Not authenticated');
	const pool = await requirePool(locals.user.id, params.id);
	const [games, collections, lists, user] = await Promise.all([
		listPoolGames(db, params.id),
		listCollectionsByUser(db, locals.user.id),
		listListsByPool(db, params.id),
		getUserById(db, locals.user.id)
	]);
	return { pool, games, collections, lists, showCoverArt: user?.showCoverArt ?? true };
};

export const actions: Actions = {
	addByFilter: async ({ locals, params, request }) => {
		if (!locals.user) error(401, 'Not authenticated');
		await requirePool(locals.user.id, params.id);

		const form = await request.formData();
		const collectionId = str(form.get('collectionId')) ?? '';
		if (!collectionId) return fail(400, { error: 'Pick a collection to filter from.' });
		try {
			await getOwnedCollection(db, locals.user.id, collectionId);
		} catch (e) {
			if (e instanceof AccessDeniedError) return fail(404, { error: 'Collection not found.' });
			throw e;
		}

		const raw = buildListFilter({
			mechanicsInclude: str(form.get('mechanicsInclude')),
			weightMin: str(form.get('weightMin')),
			weightMax: str(form.get('weightMax')),
			playerCount: str(form.get('playerCount')),
			playingTimeMax: str(form.get('playingTimeMax')),
			ownedOnly: form.get('ownedOnly') === 'on',
			expansions: str(form.get('expansions'))
		});
		let filter;
		try {
			filter = parseListFilter(raw);
		} catch {
			return fail(400, { error: 'One or more filter values are invalid.' });
		}

		const ids = await findMatchingGameIds(db, collectionId, filter);
		const added = await addPoolGames(db, params.id, ids);
		return { added, matched: ids.length };
	},

	addFromSearch: async ({ locals, params, request }) => {
		if (!locals.user) error(401, 'Not authenticated');
		await requirePool(locals.user.id, params.id);
		const form = await request.formData();
		const bggId = Number(str(form.get('bggId')));
		const name = (str(form.get('name')) ?? '').trim();
		if (!Number.isFinite(bggId) || bggId <= 0 || !name) {
			return fail(400, { error: 'A valid game is required.' });
		}
		const yearRaw = Number(str(form.get('yearPublished')));
		const pick = { bggId, name, yearPublished: Number.isFinite(yearRaw) ? yearRaw : null };
		// Enrich the pick via the BGG `thing` endpoint, then upsert + attach.
		const fetchThing: FetchThing = async (id) =>
			parseThingXml((await fetchThingXml([id])).xml)[0] ?? null;
		const { added } = await addGameFromSearch(db, params.id, pick, fetchThing);
		return { searchAdded: true, added };
	},

	removeGame: async ({ locals, params, request }) => {
		if (!locals.user) error(401, 'Not authenticated');
		await requirePool(locals.user.id, params.id);
		const form = await request.formData();
		const gameId = Number(str(form.get('gameId')));
		if (Number.isFinite(gameId)) await removePoolGame(db, params.id, gameId);
		return { removed: true };
	},

	toggleCoverArt: async ({ locals, request }) => {
		if (!locals.user) error(401, 'Not authenticated');
		const form = await request.formData();
		const showCoverArt = str(form.get('showCoverArt')) === 'true';
		await setShowCoverArt(db, locals.user.id, showCoverArt);
		return { coverArtToggled: true, showCoverArt };
	},

	createList: async ({ locals, params, request }) => {
		if (!locals.user) error(401, 'Not authenticated');
		await requirePool(locals.user.id, params.id);
		const form = await request.formData();
		const name = (str(form.get('name')) ?? '').trim();
		if (!name) return fail(400, { error: 'A list name is required.' });
		// The user picks a ranking mode at creation and it's fixed for the life
		// of the list (the same rows under a different derivation would silently
		// reorder it — datamodel.md). Only the two creatable modes are accepted;
		// default to pairwise. (T015 hardens this into a shared validator so an
		// unknown mode can't reach the repository.)
		const rawMethod = str(form.get('rankingMethod'));
		const rankingMethod: 'pairwise' | 'efficient' = rawMethod === 'efficient' ? 'efficient' : 'pairwise';
		await createList(db, {
			poolId: params.id,
			userId: locals.user.id,
			name,
			description: str(form.get('description')) || null,
			rankingMethod
		});
		return { listCreated: true };
	}
};
