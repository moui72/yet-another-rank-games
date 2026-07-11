import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function signUp(page: Page): Promise<void> {
	await page.goto('/login');
	await page.getByRole('button', { name: 'Create one' }).click();
	await page.getByLabel('Email').fill(`imp${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`);
	await page.getByLabel('Password').fill('password123');
	await page.getByRole('button', { name: 'Sign up' }).click();
	await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
}

test('collection view (signed in) has no WCAG 2.1 A/AA violations', async ({ page }) => {
	await signUp(page);
	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
		.analyze();
	expect(results.violations).toEqual([]);
});

test('triggering an import creates a collection that reaches a terminal state', async ({ page }) => {
	await signUp(page);
	await page.getByLabel('BoardGameGeek username').fill('sometester');
	await page.getByRole('button', { name: 'Import collection' }).click();

	// The collection appears and, via polling, resolves to a terminal state —
	// either imported or failed depending on what BGG returns (bounded by the
	// client fetch timeout, so it never hangs). The per-state rendering itself
	// is unit-tested (describeImport) and the dead-letter path is
	// integration-tested (executeImportJob).
	const item = page.getByRole('listitem').filter({ hasText: 'sometester' });
	await expect(item).toContainText(/Collection imported|Import failed/, { timeout: 25000 });
});
