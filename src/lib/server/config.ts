/**
 * Server-only runtime configuration.
 *
 * Read from `process.env` (portable across the SvelteKit server and the
 * standalone import worker — see infrastructure.md). Kept as a pure function of
 * its input so it can be unit-tested with a fabricated environment.
 */
export interface ServerConfig {
	/** Direct Postgres connection string (the Data API is disabled). */
	databaseUrl: string;
	/** Supabase service-role/secret key for admin operations. Optional until needed. */
	serviceRoleKey?: string;
}

export function loadServerConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
	const databaseUrl = env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error('Missing required environment variable DATABASE_URL');
	}
	return {
		databaseUrl,
		serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || undefined
	};
}
