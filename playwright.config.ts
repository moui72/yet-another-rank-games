import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

// E2E / accessibility tests run against the production build via `preview`,
// so the a11y gate checks what actually ships.
export default defineConfig({
	testDir: 'e2e',
	// These tests share one preview server + one local Supabase (auth + DB), so
	// run them serially to avoid auth rate-limit / session / DB races.
	fullyParallel: false,
	workers: 1,
	reporter: 'list',
	use: {
		baseURL: 'http://localhost:4173'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
