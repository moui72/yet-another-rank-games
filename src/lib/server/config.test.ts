import { describe, it, expect } from 'vitest';
import { loadServerConfig } from './config';

describe('loadServerConfig', () => {
	it('reads the database URL and optional service-role key from the environment', () => {
		const config = loadServerConfig({
			DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
			SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test'
		});
		expect(config.databaseUrl).toBe('postgresql://postgres:postgres@127.0.0.1:54322/postgres');
		expect(config.serviceRoleKey).toBe('sb_secret_test');
	});

	it('leaves the service-role key undefined when it is absent', () => {
		const config = loadServerConfig({ DATABASE_URL: 'postgresql://x/y' });
		expect(config.serviceRoleKey).toBeUndefined();
	});

	it('throws when DATABASE_URL is missing', () => {
		expect(() => loadServerConfig({})).toThrow(/DATABASE_URL/);
	});

	it('throws when DATABASE_URL is empty', () => {
		expect(() => loadServerConfig({ DATABASE_URL: '' })).toThrow(/DATABASE_URL/);
	});
});
