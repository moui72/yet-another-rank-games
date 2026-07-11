import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { getOwnedCollection, AccessDeniedError } from '$lib/server/ownership';
import { createList, listListsByCollection } from '$lib/server/repositories/lists';
import { buildListFilter } from '$lib/domain/listForm';
import { parseListFilter } from '$lib/domain/listFilter';

function str(v: FormDataEntryValue | null): string | undefined {
	return typeof v === 'string' ? v : undefined;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) error(401, 'Not authenticated');
	try {
		const collection = await getOwnedCollection(db, locals.user.id, params.id);
		const lists = await listListsByCollection(db, params.id);
		return { collection, lists };
	} catch (e) {
		if (e instanceof AccessDeniedError) error(404, 'Collection not found');
		throw e;
	}
};

export const actions: Actions = {
	create: async ({ locals, params, request }) => {
		if (!locals.user) error(401, 'Not authenticated');
		try {
			await getOwnedCollection(db, locals.user.id, params.id);
		} catch (e) {
			if (e instanceof AccessDeniedError) error(404, 'Collection not found');
			throw e;
		}

		const form = await request.formData();
		const name = (str(form.get('name')) ?? '').trim();
		const rankingMethod = str(form.get('rankingMethod')) ?? 'pairwise';

		if (!name) return fail(400, { error: 'A list name is required.' });
		if (rankingMethod !== 'pairwise' && rankingMethod !== 'manual') {
			return fail(400, { error: 'Invalid ranking method.' });
		}

		const rawFilter = buildListFilter({
			mechanicsInclude: str(form.get('mechanicsInclude')),
			weightMin: str(form.get('weightMin')),
			weightMax: str(form.get('weightMax')),
			playerCount: str(form.get('playerCount')),
			playingTimeMax: str(form.get('playingTimeMax')),
			ownedOnly: form.get('ownedOnly') === 'on'
		});

		let filter;
		try {
			filter = parseListFilter(rawFilter);
		} catch {
			return fail(400, { error: 'One or more filter values are invalid.' });
		}

		await createList(db, {
			collectionId: params.id,
			userId: locals.user.id,
			name,
			description: str(form.get('description')) || null,
			filter,
			rankingMethod
		});
		return { success: true };
	}
};
