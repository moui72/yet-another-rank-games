import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { getSupabaseEnv } from '$lib/supabaseEnv';
import type { LayoutLoad } from './$types';

/**
 * Create a request-scoped Supabase client for the browser (client-side auth
 * actions) or the server (SSR), sharing the cookies loaded server-side.
 */
export const load: LayoutLoad = async ({ data, depends, fetch }) => {
	depends('supabase:auth');

	const { url, publishableKey } = getSupabaseEnv();
	const supabase = isBrowser()
		? createBrowserClient(url, publishableKey, { global: { fetch } })
		: createServerClient(url, publishableKey, {
				global: { fetch },
				cookies: { getAll: () => data.cookies }
			});

	const {
		data: { session }
	} = await supabase.auth.getSession();
	const {
		data: { user }
	} = await supabase.auth.getUser();

	return { supabase, session, user };
};
