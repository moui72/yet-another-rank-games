import { defineConfig } from 'vitest/config';

// Standalone config for pure unit tests — deliberately does not load the
// SvelteKit Vite plugin, which expects app context that node-level domain
// tests don't need. Component/e2e coverage is handled separately (Playwright).
export default defineConfig({
	test: {
		include: ['src/**/*.{test,spec}.ts'],
		environment: 'node',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json-summary', 'json'],
			reportsDirectory: './coverage',
			// Business/domain logic only — exclude thin glue and barrels
			// (constitution: coverage is measured on meaningful logic).
			include: ['src/lib/**/*.ts'],
			exclude: ['src/lib/**/*.{test,spec}.ts', 'src/lib/index.ts']
		}
	}
});
