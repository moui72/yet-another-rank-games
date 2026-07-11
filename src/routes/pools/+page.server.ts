import { error, fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { createPool, listPoolsByUser } from '$lib/server/repositories/pools';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) error(401, 'Not authenticated');
	return { pools: await listPoolsByUser(db, locals.user.id) };
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		if (!locals.user) error(401, 'Not authenticated');
		const form = await request.formData();
		const name = (form.get('name') as string | null)?.trim() ?? '';
		if (!name) return fail(400, { error: 'A pool name is required.' });
		const pool = await createPool(db, {
			userId: locals.user.id,
			name,
			description: (form.get('description') as string | null) || null
		});
		redirect(303, resolve('/pools/[id]', { id: pool.id }));
	}
};
