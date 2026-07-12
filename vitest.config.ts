import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Standalone config for pure unit tests — deliberately does not load the
// SvelteKit Vite plugin (node-level domain tests don't need app context) nor
// Storybook's browser test runner (Storybook is used for component dev/docs;
// component/e2e behavior is covered by Playwright).
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
				// Svelte runes modules — compiled/reactive, exercised via e2e.
				'src/lib/**/*.svelte.ts',
				// Uses the $env virtual module — not importable in unit tests.
				'src/lib/supabaseEnv.ts',
				// Thin connection/client constructors that require a live service.
				'src/lib/server/db.ts',
				// Auth admin client — integration-tested against local GoTrue.
				'src/lib/server/auth.ts',
				// Ownership guards — DB-scoped, integration-tested.
				'src/lib/server/ownership.ts',
				// Ranking recompute service — DB-orchestration, integration-tested.
				'src/lib/server/ranking.ts',
				// Add-from-search service — composes repos + BGG fetch, integration-tested.
				'src/lib/server/addFromSearch.ts',
				// BGG HTTP client — thin fetch IO, exercised live/in the worker.
				'src/lib/server/bgg/client.ts',
				// Job processor + queue wiring — IO/composition, integration-tested.
				'src/lib/server/jobs/importJob.ts',
				'src/lib/server/jobs/queue.ts',
				// DB-touching repositories are covered by integration tests.
				'src/lib/server/repositories/**'
			]
		}
	}
});
