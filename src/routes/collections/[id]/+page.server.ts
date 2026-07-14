import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { getOwnedCollection, AccessDeniedError } from '$lib/server/ownership';
import {
	listActiveItemsByCollection,
	softDeleteCollectionItem,
	undoCollectionItemRemoval,
	confirmHardDeleteCollectionItem,
	addLocalCollectionItem
} from '$lib/server/repositories/collectionItems';
import { resolveGameFromSearch, type FetchThing } from '$lib/server/addFromSearch';
import { fetchThingXml } from '$lib/server/bgg/client';
import { parseThingXml } from '$lib/server/bgg/parse';

function str(v: FormDataEntryValue | null): string | undefined {
	return typeof v === 'string' ? v : undefined;
}

async function requireCollection(userId: string, collectionId: string) {
	try {
		return await getOwnedCollection(db, userId, collectionId);
	} catch (e) {
		if (e instanceof AccessDeniedError) error(404, 'Collection not found');
		throw e;
	}
}

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) error(401, 'Not authenticated');
	const collection = await requireCollection(locals.user.id, params.id);
	const items = await listActiveItemsByCollection(db, params.id);
	return { collection, gameCount: items.length };
};

export const actions: Actions = {
	/** T002: soft-delete an active item (undoable). */
	removeItem: async ({ locals, params, request }) => {
		if (!locals.user) error(401, 'Not authenticated');
		await requireCollection(locals.user.id, params.id);
		const form = await request.formData();
		const itemId = str(form.get('itemId')) ?? '';
		if (!itemId) return fail(400, { error: 'Missing item.' });
		const removed = await softDeleteCollectionItem(db, itemId);
		return { removed: !!removed };
	},

	/** T003: undo a soft-delete or a pending hard-delete, back to active. */
	undoRemove: async ({ locals, params, request }) => {
		if (!locals.user) error(401, 'Not authenticated');
		await requireCollection(locals.user.id, params.id);
		const form = await request.formData();
		const itemId = str(form.get('itemId')) ?? '';
		if (!itemId) return fail(400, { error: 'Missing item.' });
		const restored = await undoCollectionItemRemoval(db, itemId);
		return { restored: !!restored };
	},

	/** T004: confirm-hard-delete, only valid from pending_delete. */
	confirmDelete: async ({ locals, params, request }) => {
		if (!locals.user) error(401, 'Not authenticated');
		await requireCollection(locals.user.id, params.id);
		const form = await request.formData();
		const itemId = str(form.get('itemId')) ?? '';
		if (!itemId) return fail(400, { error: 'Missing item.' });
		const deleted = await confirmHardDeleteCollectionItem(db, itemId);
		return { deleted };
	},

	/**
	 * T005: add a game to the collection via the same BGG search-import flow
	 * as the pool builder (reuse, not duplicate — Principle IX); stamps the
	 * new row `source = local_add`.
	 */
	addFromSearch: async ({ locals, params, request }) => {
		if (!locals.user) error(401, 'Not authenticated');
		const collection = await requireCollection(locals.user.id, params.id);
		const form = await request.formData();
		const bggId = Number(str(form.get('bggId')));
		const name = (str(form.get('name')) ?? '').trim();
		if (!Number.isFinite(bggId) || bggId <= 0 || !name) {
			return fail(400, { error: 'A valid game is required.' });
		}
		const yearRaw = Number(str(form.get('yearPublished')));
		const pick = { bggId, name, yearPublished: Number.isFinite(yearRaw) ? yearRaw : null };
		const fetchThing: FetchThing = async (id) =>
			parseThingXml((await fetchThingXml([id])).xml)[0] ?? null;
		const game = await resolveGameFromSearch(db, pick, fetchThing);
		const item = await addLocalCollectionItem(db, { collectionId: collection.id, gameId: game.id });
		return { searchAdded: true, itemId: item.id };
	}
};
