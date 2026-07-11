import 'dotenv/config';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Integration tests that require a live local Supabase Postgres (DATABASE_URL).
// Run via `npm run test:integration`, which resets the local DB first. Kept out
// of the unit suite and its coverage ratchet.
export default defineConfig({
	resolve: { alias: { $lib: resolve('src/lib') } },
	test: {
		include: ['src/**/*.integration.test.ts'],
		environment: 'node',
		// Schema/DB tests share one database; don't run them in parallel.
		fileParallelism: false
	}
});
