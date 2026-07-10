import { defineConfig, devices } from '@playwright/test';

// E2E / accessibility tests run against the production build via `preview`,
// so the a11y gate checks what actually ships.
export default defineConfig({
	testDir: 'e2e',
	fullyParallel: true,
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
