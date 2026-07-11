import { createClient, type User } from '@supabase/supabase-js';

/**
 * Admin Supabase client (secret key) for server-side token validation and
 * privileged operations. Reads from `process.env` so it works in both the
 * SvelteKit server and the standalone worker. The secret key bypasses RLS and
 * must never be exposed to the client or committed.
 */
function adminClient() {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SECRET_KEY;
	if (!url || !key) {
		throw new Error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
	}
	return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Validate an access token against the auth server; null if invalid/expired. */
export async function getUserFromToken(token: string): Promise<User | null> {
	const { data, error } = await adminClient().auth.getUser(token);
	return error ? null : data.user;
}
