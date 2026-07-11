import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function axeClean(page: Page) {
	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
		.analyze();
	expect(results.violations).toEqual([]);
}

async function signUpAndImport(page: Page) {
	await page.goto('/login');
	await page.getByRole('button', { name: 'Create one' }).click();
	await page.getByLabel('Email').fill(`pool${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`);
	await page.getByLabel('Password').fill('password123');
	await page.getByRole('button', { name: 'Sign up' }).click();
	await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
	// Import so the pool filter has a source collection.
	await page.getByLabel('BoardGameGeek username').fill('sometester');
	await page.getByRole('button', { name: 'Import collection' }).click();
	await expect(page.getByRole('listitem').filter({ hasText: 'sometester' })).toContainText(
		/Collection imported|Import failed/,
		{ timeout: 25000 }
	);
}

test('build a pool and create a list from it (with axe)', async ({ page }) => {
	await signUpAndImport(page);

	await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Pools' }).click();
	await expect(page.getByRole('heading', { name: 'Pools', exact: true })).toBeVisible();
	await axeClean(page);

	await page.getByLabel('Pool name').fill('Co-op games');
	await page.getByRole('button', { name: 'Create pool' }).click();

	// Redirected to the pool builder.
	await expect(page.getByRole('heading', { name: 'Co-op games' })).toBeVisible();
	await axeClean(page);

	// Add-by-filter runs (empty collection → 0 matches, but the action works).
	await page.getByRole('button', { name: 'Add matching games' }).click();
	await expect(page.getByRole('status')).toContainText('Added');

	// Create a list from the pool.
	await page.getByLabel('List name').fill('Top co-op');
	await page.getByRole('button', { name: 'Create list' }).click();
	await expect(page.getByRole('listitem').filter({ hasText: 'Top co-op' })).toContainText(
		'In progress'
	);
});
