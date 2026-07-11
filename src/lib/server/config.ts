/**
 * Server-only runtime configuration.
 *
 * Read from `process.env` (portable across the SvelteKit server and the
 * standalone import worker — see infrastructure.md). Kept as a pure function of
 * its input so it can be unit-tested with a fabricated environment.
 */

/**
 * Database connection: either a full URL (local dev / tooling convenience) or
 * discrete components. Components keep only the password as a secret — the host,
 * port, user, and database name are non-sensitive — so production stores just
 * `DB_PASSWORD` in Secret Manager and passes the rest as plain env vars.
 */
export type DatabaseConfig =
	| { url: string }
	| { host: string; port: number; user: string; password: string; database: string; ssl: boolean };

export interface ServerConfig {
	database: DatabaseConfig;
	/** Supabase secret key (server-only, bypasses RLS) for admin operations. */
	secretKey?: string;
	/** How long a cached game stays fresh before re-fetch. Default 30 days. */
	gameCacheTtlDays: number;
}

function loadDatabaseConfig(env: Record<string, string | undefined>): DatabaseConfig {
	if (env.DATABASE_URL) return { url: env.DATABASE_URL };

	const required = { DB_HOST: env.DB_HOST, DB_USER: env.DB_USER, DB_NAME: env.DB_NAME, DB_PASSWORD: env.DB_PASSWORD };
	const missing = Object.entries(required)
		.filter(([, v]) => !v)
		.map(([k]) => k);
	if (missing.length > 0) {
		throw new Error(`Missing database config: set DATABASE_URL, or all of ${missing.join(', ')}`);
	}

	return {
		host: required.DB_HOST as string,
		user: required.DB_USER as string,
		database: required.DB_NAME as string,
		password: required.DB_PASSWORD as string,
		port: env.DB_PORT ? Number(env.DB_PORT) : 5432,
		// Component mode targets a remote DB (prod), so require TLS unless the
		// operator explicitly opts out.
		ssl: env.DB_SSL !== 'false'
	};
}

export function loadServerConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
	return {
		database: loadDatabaseConfig(env),
		secretKey: env.SUPABASE_SECRET_KEY || undefined,
		gameCacheTtlDays: env.GAME_CACHE_TTL_DAYS ? Number(env.GAME_CACHE_TTL_DAYS) : 30
	};
}
