import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { env } from '$env/dynamic/public';

/**
 * Auth handle (canonical @supabase/ssr pattern).
 *
 * Creates a request-bound Supabase client backed by the request cookies, and
 * exposes `locals.safeGetSession()` which validates the JWT against the auth
 * server via `getUser()` — not just trusting the unverified cookie. Downstream
 * load functions and endpoints read `locals.user` / `locals.session`.
 */
const supabase: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});

	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) return { session: null, user: null };

		// getUser() re-validates the JWT with the auth server; getSession() alone
		// trusts the (potentially tampered) cookie.
		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		if (error) return { session: null, user: null };

		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders: (name) => name === 'content-range' || name === 'x-supabase-api-version'
	});
};

const populate: Handle = async ({ event, resolve }) => {
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	// Guard: routes under /(app) or explicitly protected can check locals.user.
	// A convenience redirect for the reserved /account area.
	if (event.url.pathname.startsWith('/account') && !user) {
		redirect(303, '/login');
	}
	return resolve(event);
};

export const handle: Handle = sequence(supabase, populate);
