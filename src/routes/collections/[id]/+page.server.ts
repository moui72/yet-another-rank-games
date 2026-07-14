import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { getOwnedCollection, AccessDeniedError } from '$lib/server/ownership';
import {
	listActiveItemsWithGame,
	listRemovedItemsWithGame,
	softDeleteCollectionItem,
	undoCollectionItemRemoval,
	confirmHardDeleteCollectionItem,
	addLocalCollectionItem
} from '$lib/server/repositories/collectionItems';
import { listPendingDuplicatesForCollection } from '$lib/server/repositories/collectionItemDuplicates';
import { resolveGameFromSearch, type FetchThing } from '$lib/server/addFromSearch';
import { fetchThingXml } from '$lib/server/bgg/client';
import { parseThingXml } from '$lib/server/bgg/parse';
import { getImportQueue } from '$lib/server/jobs/queue';
import { confirmDuplicateMerge, rejectDuplicateMerge } from '$lib/server/duplicateResolution';

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
	const [activeItems, removedItems, duplicates] = await Promise.all([
		listActiveItemsWithGame(db, params.id),
		listRemovedItemsWithGame(db, params.id),
		listPendingDuplicatesForCollection(db, params.id)
	]);
	return {
		collection,
		gameCount: activeItems.length,
		activeItems,
		removedItems,
		duplicates
	};
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
	 * T005/T010: add a game to the collection via the same BGG search-import
	 * flow as the pool builder (reuse, not duplicate — Principle IX); stamps
	 * the new row `source = local_add`.
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
	},

	/**
	 * T011: re-pull/resync — re-importing the same username re-pulls into this
	 * existing Collection (ui.md), so this reuses the same enqueue path as the
	 * initial import (`/api/import`). The worker's `runImport` does the actual
	 * reconciliation (T006 pending_delete flips, T007 fuzzy-duplicate detection).
	 */
	resync: async ({ locals, params }) => {
		if (!locals.user) error(401, 'Not authenticated');
		const collection = await requireCollection(locals.user.id, params.id);
		await getImportQueue().enqueue({
			collectionId: collection.id,
			username: collection.bggUsername
		});
		return { resyncQueued: true };
	},

	/** T011/T008: confirm a possible duplicate — repoints this user's own pool/list references. */
	confirmDuplicate: async ({ locals, params, request }) => {
		if (!locals.user) error(401, 'Not authenticated');
		await requireCollection(locals.user.id, params.id);
		const form = await request.formData();
		const duplicateId = str(form.get('duplicateId')) ?? '';
		if (!duplicateId) return fail(400, { error: 'Missing duplicate.' });
		const merged = await confirmDuplicateMerge(db, locals.user.id, duplicateId);
		return { duplicateResolved: merged };
	},

	/** T011/T008: reject a possible duplicate as distinct — leaves both items untouched. */
	rejectDuplicate: async ({ locals, params, request }) => {
		if (!locals.user) error(401, 'Not authenticated');
		await requireCollection(locals.user.id, params.id);
		const form = await request.formData();
		const duplicateId = str(form.get('duplicateId')) ?? '';
		if (!duplicateId) return fail(400, { error: 'Missing duplicate.' });
		const rejected = await rejectDuplicateMerge(db, locals.user.id, duplicateId);
		return { duplicateResolved: rejected };
	}
};
