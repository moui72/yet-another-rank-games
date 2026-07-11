import { env } from '$env/dynamic/public';

/**
 * The public Supabase config, validated so callers get `string` (not
 * `string | undefined`). Read from `$env/dynamic/public` at runtime, so it's
 * portable across environments where the vars may or may not be known at
 * type-check time (e.g. CI without a local `.env`).
 */
export function getSupabaseEnv(): { url: string; publishableKey: string } {
	const url = env.PUBLIC_SUPABASE_URL;
	const publishableKey = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	if (!url || !publishableKey) {
		throw new Error('Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY');
	}
	return { url, publishableKey };
}
