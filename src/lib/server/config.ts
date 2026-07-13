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

/**
 * Cloud Tasks *enqueuer* wiring (infrastructure.md "Worker invocation
 * contract"): what the web service needs to create an HTTP task targeting the
 * worker. Only the web service gets these — the worker's own Cloud Run URL is
 * Terraform-computed from the worker resource, so wiring it into the worker's
 * *own* env would be a dependency cycle. Present only when deployed.
 */
export interface CloudTasksQueueConfig {
	projectId: string;
	location: string;
	queueName: string;
	/** Base URL of the worker Cloud Run service. */
	workerUrl: string;
}

/**
 * Cloud Tasks *verifier* wiring: what `/tasks/import` needs to check the
 * signing identity of the OIDC token Cloud Tasks attaches. The audience half
 * of the check is verified against the incoming request's own origin (no env
 * var needed — avoids the same self-reference problem as above). Set on both
 * services, though only the worker actually checks it.
 */
export interface CloudTasksAuthConfig {
	/** Expected signing identity of the OIDC token Cloud Tasks attaches. */
	invokerServiceAccountEmail: string;
}

export interface ServerConfig {
	database: DatabaseConfig;
	/** Supabase secret key (server-only, bypasses RLS) for admin operations. */
	secretKey?: string;
	/** How long a cached game stays fresh before re-fetch. Default 30 days. */
	gameCacheTtlDays: number;
	cloudTasksQueue?: CloudTasksQueueConfig;
	cloudTasksAuth?: CloudTasksAuthConfig;
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

/**
 * All four vars are set together by Terraform (on the web service only), or
 * none of them (local dev, or the worker service) — a partial set is a
 * misconfiguration, not a valid "off" state, so it throws rather than
 * silently falling back to the local queue.
 */
function loadCloudTasksQueueConfig(
	env: Record<string, string | undefined>
): CloudTasksQueueConfig | undefined {
	const required = {
		GCP_PROJECT_ID: env.GCP_PROJECT_ID,
		GCP_LOCATION: env.GCP_LOCATION,
		CLOUD_TASKS_QUEUE: env.CLOUD_TASKS_QUEUE,
		WORKER_URL: env.WORKER_URL
	};
	const present = Object.values(required).filter(Boolean).length;
	if (present === 0) return undefined;
	const missing = Object.entries(required)
		.filter(([, v]) => !v)
		.map(([k]) => k);
	if (missing.length > 0) {
		throw new Error(`Partial Cloud Tasks queue config: missing ${missing.join(', ')}`);
	}
	return {
		projectId: required.GCP_PROJECT_ID as string,
		location: required.GCP_LOCATION as string,
		queueName: required.CLOUD_TASKS_QUEUE as string,
		workerUrl: required.WORKER_URL as string
	};
}

function loadCloudTasksAuthConfig(
	env: Record<string, string | undefined>
): CloudTasksAuthConfig | undefined {
	if (!env.TASKS_INVOKER_SA_EMAIL) return undefined;
	return { invokerServiceAccountEmail: env.TASKS_INVOKER_SA_EMAIL };
}

export function loadServerConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
	return {
		database: loadDatabaseConfig(env),
		secretKey: env.SUPABASE_SECRET_KEY || undefined,
		gameCacheTtlDays: env.GAME_CACHE_TTL_DAYS ? Number(env.GAME_CACHE_TTL_DAYS) : 30,
		cloudTasksQueue: loadCloudTasksQueueConfig(env),
		cloudTasksAuth: loadCloudTasksAuthConfig(env)
	};
}
