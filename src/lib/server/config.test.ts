import { describe, it, expect } from 'vitest';
import { loadServerConfig } from './config';

describe('loadServerConfig database', () => {
	it('uses a full DATABASE_URL when present', () => {
		const { database } = loadServerConfig({
			DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
		});
		expect(database).toEqual({ url: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
	});

	it('assembles from components with the password the only secret, defaulting port and ssl', () => {
		const { database } = loadServerConfig({
			DB_HOST: 'db.example.supabase.co',
			DB_USER: 'postgres',
			DB_NAME: 'postgres',
			DB_PASSWORD: 's3cret'
		});
		expect(database).toEqual({
			host: 'db.example.supabase.co',
			user: 'postgres',
			database: 'postgres',
			password: 's3cret',
			port: 5432,
			ssl: true
		});
	});

	it('respects an explicit port and ssl=false', () => {
		const { database } = loadServerConfig({
			DB_HOST: 'localhost',
			DB_USER: 'postgres',
			DB_NAME: 'postgres',
			DB_PASSWORD: 'x',
			DB_PORT: '6543',
			DB_SSL: 'false'
		});
		expect(database).toMatchObject({ port: 6543, ssl: false });
	});

	it('throws listing the missing component vars when neither URL nor full components are set', () => {
		expect(() => loadServerConfig({ DB_HOST: 'h' })).toThrow(/DB_USER.*DB_NAME.*DB_PASSWORD/);
	});
});

describe('loadServerConfig secretKey', () => {
	it('reads the optional secret key', () => {
		expect(loadServerConfig({ DATABASE_URL: 'x', SUPABASE_SECRET_KEY: 'sb_secret_t' }).secretKey).toBe(
			'sb_secret_t'
		);
	});

	it('leaves the secret key undefined when absent', () => {
		expect(loadServerConfig({ DATABASE_URL: 'x' }).secretKey).toBeUndefined();
	});
});

describe('loadServerConfig gameCacheTtlDays', () => {
	it('defaults to 30 days', () => {
		expect(loadServerConfig({ DATABASE_URL: 'x' }).gameCacheTtlDays).toBe(30);
	});

	it('reads an override from GAME_CACHE_TTL_DAYS', () => {
		expect(loadServerConfig({ DATABASE_URL: 'x', GAME_CACHE_TTL_DAYS: '90' }).gameCacheTtlDays).toBe(90);
	});
});

describe('loadServerConfig cloudTasksQueue', () => {
	const full = {
		DATABASE_URL: 'x',
		GCP_PROJECT_ID: 'yarg-staging-zbch',
		GCP_LOCATION: 'us-east4',
		CLOUD_TASKS_QUEUE: 'yarg-import',
		WORKER_URL: 'https://yarg-worker-abc.a.run.app'
	};

	it('is undefined when none of the vars are set (local dev, or the worker service)', () => {
		expect(loadServerConfig({ DATABASE_URL: 'x' }).cloudTasksQueue).toBeUndefined();
	});

	it('assembles from all four vars when deployed', () => {
		expect(loadServerConfig(full).cloudTasksQueue).toEqual({
			projectId: 'yarg-staging-zbch',
			location: 'us-east4',
			queueName: 'yarg-import',
			workerUrl: 'https://yarg-worker-abc.a.run.app'
		});
	});

	it('throws listing the missing vars on a partial set', () => {
		const partial = { ...full, GCP_LOCATION: undefined };
		expect(() => loadServerConfig(partial)).toThrow(/GCP_LOCATION/);
	});
});

describe('loadServerConfig cloudTasksAuth', () => {
	it('is undefined when TASKS_INVOKER_SA_EMAIL is unset (local dev)', () => {
		expect(loadServerConfig({ DATABASE_URL: 'x' }).cloudTasksAuth).toBeUndefined();
	});

	it('reads the expected invoker service account email when set', () => {
		expect(
			loadServerConfig({
				DATABASE_URL: 'x',
				TASKS_INVOKER_SA_EMAIL: 'yarg-tasks-invoker@yarg-staging-zbch.iam.gserviceaccount.com'
			}).cloudTasksAuth
		).toEqual({ invokerServiceAccountEmail: 'yarg-tasks-invoker@yarg-staging-zbch.iam.gserviceaccount.com' });
	});
});
