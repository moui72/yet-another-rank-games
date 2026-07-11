import postgres from 'postgres';
import { loadServerConfig } from './config';

/**
 * The single Postgres connection for the server (constitution Principle XV:
 * entry points wire this dependency; modules import it rather than each opening
 * their own connection). Access is direct SQL — the Supabase Data API is
 * disabled (infrastructure.md) — so authorization is enforced in application
 * code (RLS off).
 *
 * A typed query builder (Kysely/Drizzle) is layered on top in Phase 1; this
 * module owns only the raw connection.
 */
export const sql = postgres(loadServerConfig().databaseUrl);
