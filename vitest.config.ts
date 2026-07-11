import { defineConfig } from 'vitest/config';

// Standalone config for pure unit tests — deliberately does not load the
// SvelteKit Vite plugin, which expects app context that node-level domain
// tests don't need. Component/e2e coverage is handled separately (Playwright).
export default defineConfig({
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
				// Thin connection/client constructors that require a live service —
				// exercised by integration/e2e, not unit tests.
				'src/lib/server/db.ts',
				// DB-touching repositories are covered by integration tests
				// (npm run test:integration), not the unit suite.
				'src/lib/server/repositories/**'
			]
		}
	}
});
