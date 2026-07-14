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

test('collection detail links to pools', async ({ page }) => {
	await signUp(page);
	await page.getByLabel('BoardGameGeek username').fill('sometester');
	await page.getByRole('button', { name: 'Import collection' }).click();
	await expect(page.getByRole('listitem').filter({ hasText: 'sometester' })).toContainText(
		/Collection imported|Import failed/,
		{ timeout: 25000 }
	);
	await page.getByRole('link', { name: 'sometester' }).click();
	await expect(page.getByRole('heading', { name: /collection/i })).toBeVisible();
	await expect(page.getByRole('link', { name: 'pool' })).toBeVisible();
});

test('add a game via BGG search, then remove and undo it (T009/T010, with axe)', async ({ page }) => {
	await signUp(page);
	await page.getByLabel('BoardGameGeek username').fill('sometester');
	await page.getByRole('button', { name: 'Import collection' }).click();
	await expect(page.getByRole('listitem').filter({ hasText: 'sometester' })).toContainText(
		/Collection imported|Import failed/,
		{ timeout: 25000 }
	);
	await page.getByRole('link', { name: 'sometester' }).click();
	await expect(page.getByRole('heading', { name: /collection/i })).toBeVisible();

	await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
		.analyze()
		.then((r) => expect(r.violations).toEqual([]));

	// Mock BGG search so the add-a-game flow (reused from the pool builder) is deterministic.
	await page.route('**/api/games/search?q=*', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify([{ bggId: 174430, name: 'Gloomhaven', yearPublished: 2017 }])
		});
	});
	await page.getByLabel('Game name').fill('gloomhaven');
	await page.getByRole('button', { name: 'Search', exact: true }).click();
	await expect(page.getByRole('list', { name: 'Search results' })).toContainText('Gloomhaven');
	await page.getByRole('button', { name: 'Add Gloomhaven to collection' }).click();

	const gamesHeading = page.getByRole('heading', { name: /^Games \(/ });
	await expect(gamesHeading).toContainText('(1)');
	await expect(page.getByText('Gloomhaven', { exact: false }).first()).toBeVisible();

	// Remove it — it disappears from the active list, and shows in the
	// collapsible Removed section with an undo control.
	await page.getByRole('button', { name: 'Remove Gloomhaven' }).click();
	await expect(gamesHeading).toContainText('(0)');
	await page.getByRole('button', { name: /^Removed \(/ }).click();
	const removedSection = page.locator('#removed-section');
	await expect(removedSection).toContainText('Gloomhaven');

	// Undo restores it to the active list.
	await removedSection.getByRole('button', { name: 'Undo' }).click();
	await expect(gamesHeading).toContainText('(1)');
});

test('re-pull queues a resync (T011, with axe)', async ({ page }) => {
	await signUp(page);
	await page.getByLabel('BoardGameGeek username').fill('sometester');
	await page.getByRole('button', { name: 'Import collection' }).click();
	await expect(page.getByRole('listitem').filter({ hasText: 'sometester' })).toContainText(
		/Collection imported|Import failed/,
		{ timeout: 25000 }
	);
	await page.getByRole('link', { name: 'sometester' }).click();

	await page.getByRole('button', { name: 'Re-pull collection' }).click();
	await expect(page.getByRole('status')).toContainText('Re-pull queued');
	await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
		.analyze()
		.then((r) => expect(r.violations).toEqual([]));
});
