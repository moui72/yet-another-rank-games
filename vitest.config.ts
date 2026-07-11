import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Standalone config for pure unit tests — deliberately does not load the
// SvelteKit Vite plugin, which expects app context that node-level domain
// tests don't need. Component/e2e coverage is handled separately (Playwright).
export default defineConfig({
	resolve: { alias: { $lib: resolve('src/lib') } },
	test: {
		include: ['src/**/*.{test,spec}.ts'],
		// Integration tests need a live local Supabase DB — run separately
		// (npm run test:integration), not in the unit suite / pre-commit / CI-unit.
		exclude: ['src/**/*.integration.test.ts', 'node_modules/**'],
		environment: 'node',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json-summary', 'json'],
			reportsDirectory: './coverage',
			// Business/domain logic only — exclude thin glue and barrels
			// (constitution: coverage is measured on meaningful logic).
			include: ['src/lib/**/*.ts'],
			exclude: [
				'src/lib/**/*.{test,spec}.ts',
				'src/lib/index.ts',
				// Uses the $env virtual module — not importable in unit tests;
				// exercised via SSR/e2e.
				'src/lib/supabaseEnv.ts',
				// Thin connection/client constructors that require a live service —
				// exercised by integration/e2e, not unit tests.
				'src/lib/server/db.ts',
				// Auth admin client — integration-tested against local GoTrue.
				'src/lib/server/auth.ts',
				// Ownership guards — DB-scoped, integration-tested.
				'src/lib/server/ownership.ts',
				// Ranking recompute service — DB-orchestration, integration-tested.
				'src/lib/server/ranking.ts',
				// BGG HTTP client — thin fetch IO, exercised live/in the worker.
				'src/lib/server/bgg/client.ts',
				// Job processor + queue wiring — IO/composition, integration-tested.
				'src/lib/server/jobs/importJob.ts',
				'src/lib/server/jobs/queue.ts',
				// DB-touching repositories are covered by integration tests
				// (npm run test:integration), not the unit suite.
				'src/lib/server/repositories/**'
			]
		}
	}
});
