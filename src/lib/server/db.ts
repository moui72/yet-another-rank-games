import postgres from 'postgres';
import { Kysely, CamelCasePlugin } from 'kysely';
import { PostgresJSDialect } from 'kysely-postgres-js';
import { loadServerConfig } from './config';
import type { Database } from './schema';

/**
 * The single Postgres connection + typed query builder for the server
 * (constitution Principle XV: entry points wire this dependency; modules import
 * it rather than each opening their own). Access is direct SQL via Kysely — the
 * Supabase Data API is disabled (infrastructure.md) — so authorization is
 * enforced in application code (RLS off).
 */

// Parse int8 and numeric as JS numbers (our ids/weights/scores are well within
// safe-integer range) so results match the `number` fields in $lib/types.
const numberParsers = {
	int8: { to: 20, from: [20], serialize: (x: number) => String(x), parse: (x: string) => Number(x) },
	numeric: { to: 1700, from: [1700], serialize: (x: number) => String(x), parse: (x: string) => Number(x) }
};

const database = loadServerConfig().database;
export const sql =
	'url' in database
		? postgres(database.url, { types: numberParsers })
		: postgres({
				host: database.host,
				port: database.port,
				user: database.user,
				password: database.password,
				database: database.database,
				ssl: database.ssl ? 'require' : false,
				types: numberParsers
			});

export const db = new Kysely<Database>({
	dialect: new PostgresJSDialect({ postgres: sql }),
	plugins: [new CamelCasePlugin()]
});
