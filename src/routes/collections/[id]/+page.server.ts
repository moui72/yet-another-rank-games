import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { getOwnedCollection, AccessDeniedError } from '$lib/server/ownership';
import { listItemsByCollection } from '$lib/server/repositories/collectionItems';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) error(401, 'Not authenticated');
	try {
		const collection = await getOwnedCollection(db, locals.user.id, params.id);
		const items = await listItemsByCollection(db, params.id);
		return { collection, gameCount: items.length };
	} catch (e) {
		if (e instanceof AccessDeniedError) error(404, 'Collection not found');
		throw e;
	}
};
