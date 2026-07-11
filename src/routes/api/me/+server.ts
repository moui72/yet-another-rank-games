import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Minimal protected endpoint that proves the auth hook works: returns the
 * current user when the request carries a valid session, else 401. Exercised by
 * the e2e auth flow (Phase 3).
 */
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ authenticated: false }, { status: 401 });
	}
	return json({ authenticated: true, userId: locals.user.id, email: locals.user.email });
};
