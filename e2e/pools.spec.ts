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

test('search BGG and add a game to a pool (with axe)', async ({ page }) => {
	await signUpAndImport(page);

	await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Pools' }).click();
	await page.getByLabel('Pool name').fill('Search pool');
	await page.getByRole('button', { name: 'Create pool' }).click();
	await expect(page.getByRole('heading', { name: 'Search pool' })).toBeVisible();

	// Mock the BGG search endpoint so results are deterministic.
	await page.route('**/api/games/search?q=*', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify([
				{ bggId: 174430, name: 'Gloomhaven', yearPublished: 2017 },
				{ bggId: 291457, name: 'Gloomhaven: Jaws of the Lion', yearPublished: 2020 }
			])
		});
	});

	// Idle → search → results.
	await page.getByLabel('Game name').fill('gloomhaven');
	await page.getByRole('button', { name: 'Search', exact: true }).click();
	const resultsList = page.getByRole('list', { name: 'Search results' });
	await expect(resultsList.getByText('Gloomhaven', { exact: false }).first()).toBeVisible();

	// Axe with results shown (BGG's `thing` is unreachable in test, so the add
	// falls back to a minimal game from the search pick — deterministic).
	await axeClean(page);

	// Add the first result — it lands in "Games in this pool".
	await page.getByRole('button', { name: 'Add Gloomhaven to pool' }).click();
	const poolGames = page.getByRole('heading', { name: /Games in this pool/ });
	await expect(poolGames).toContainText('(1)');
	await expect(page.getByText('Added 1 game from search')).toBeVisible();
	await axeClean(page);
});
