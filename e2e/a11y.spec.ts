import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Constitution Principle VI: the app is held to WCAG 2.1 AA as a release gate.
// This smoke test asserts zero axe-detectable AA violations on the landing
// page; per-feature views add their own axe assertions as they ship.
test('landing page has no WCAG 2.1 A/AA violations', async ({ page }) => {
	await page.goto('/');
	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
		.analyze();
	expect(results.violations).toEqual([]);
});
