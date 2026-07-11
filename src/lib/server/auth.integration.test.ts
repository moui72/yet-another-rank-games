import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { getUserFromToken } from './auth';

// Sign a fresh user up + in against the local auth server, returning the
// access token. Email confirmation is disabled in local dev, so sign-up yields
// an active session immediately.
async function signUpAndSignIn(): Promise<{ email: string; token: string }> {
	const anon = createClient(
		process.env.PUBLIC_SUPABASE_URL as string,
		process.env.PUBLIC_SUPABASE_ANON_KEY as string
	);
	const email = `t${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`;
	const password = 'password123';
	await anon.auth.signUp({ email, password });
	const { data, error } = await anon.auth.signInWithPassword({ email, password });
	if (error || !data.session) throw error ?? new Error('no session');
	return { email, token: data.session.access_token };
}

describe('getUserFromToken (JWT validation)', () => {
	it('resolves a valid access token to the authenticated user', async () => {
		const { email, token } = await signUpAndSignIn();
		const user = await getUserFromToken(token);
		expect(user).not.toBeNull();
		expect(user?.email).toBe(email);
	});

	it('returns null for an invalid token (anonymous / tampered)', async () => {
		expect(await getUserFromToken('not-a-real-token')).toBeNull();
	});
});
