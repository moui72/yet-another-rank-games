import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import postgres from 'postgres';

// T008 (feature `in-app-help-and-info-text`): every InfoPopover trigger is
// keyboard-operable (open on Enter/Space via the native button, Esc closes
// and returns focus) and labelled, and the views carrying them have zero
// WCAG 2.1 AA violations with a popover open.
async function axeClean(page: Page) {
	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
		.analyze();
	expect(results.violations).toEqual([]);
}

async function signUp(page: Page): Promise<string> {
	await page.goto('/login');
	await page.getByRole('button', { name: 'Create one' }).click();
	await page.getByLabel('Email').fill(`infopop${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`);
	await page.getByLabel('Password').fill('password123');
	await page.getByRole('button', { name: 'Sign up' }).click();
	await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
	const me = await (await page.request.get('/api/me')).json();
	return me.userId as string;
}

/** Seed a pool + pairwise list with two games, for the pools and list pages. */
async function seedPoolAndList(userId: string): Promise<{ poolId: string; listId: string }> {
	const sql = postgres(process.env.DATABASE_URL as string);
	const base = 900000 + Math.floor(Math.random() * 90000);
	try {
		const games = await sql<{ id: number }[]>`
			insert into games (bgg_id, name)
			values (${base + 1}, 'Popover Alpha'), (${base + 2}, 'Popover Beta')
			returning id`;
		const [pool] = await sql<{ id: string }[]>`
			insert into pools (user_id, name) values (${userId}, 'InfoPopover pool') returning id`;
		for (const g of games) {
			await sql`insert into pool_games (pool_id, game_id) values (${pool.id}, ${g.id})`;
		}
		const [list] = await sql<{ id: string }[]>`
			insert into lists (pool_id, user_id, name, ranking_method)
			values (${pool.id}, ${userId}, 'InfoPopover list', 'pairwise') returning id`;
		return { poolId: pool.id, listId: list.id };
	} finally {
		await sql.end();
	}
}

test('pool builder: InfoPopover triggers are keyboard-operable and labelled, zero AA violations', async ({
	page
}) => {
	const userId = await signUp(page);
	const { poolId } = await seedPoolAndList(userId);
	await page.goto(`/pools/${poolId}`);

	const hierarchyTrigger = page.getByRole('button', { name: 'About collections, pools, and lists' }).first();
	await expect(hierarchyTrigger).toHaveAttribute('aria-expanded', 'false');

	// Keyboard: Tab to the trigger, Enter to open.
	await hierarchyTrigger.focus();
	await page.keyboard.press('Enter');
	await expect(hierarchyTrigger).toHaveAttribute('aria-expanded', 'true');
	await expect(page.getByText(/A collection is your imported BGG set/)).toBeVisible();

	await axeClean(page);

	// Esc closes and returns focus to the trigger.
	await page.keyboard.press('Escape');
	await expect(hierarchyTrigger).toHaveAttribute('aria-expanded', 'false');
	await expect(hierarchyTrigger).toBeFocused();

	const filterTrigger = page.getByRole('button', { name: 'About filter matching' });
	await filterTrigger.focus();
	await page.keyboard.press(' ');
	await expect(filterTrigger).toHaveAttribute('aria-expanded', 'true');
	await expect(page.getByText(/combine with AND/)).toBeVisible();
});

test('pairwise ranking view: InfoPopover triggers are keyboard-operable, zero AA violations', async ({ page }) => {
	const userId = await signUp(page);
	const { listId } = await seedPoolAndList(userId);
	await page.goto(`/lists/${listId}`);

	const pairwiseTrigger = page.getByRole('button', { name: 'About pairwise ranking' });
	await pairwiseTrigger.focus();
	await page.keyboard.press('Enter');
	await expect(pairwiseTrigger).toHaveAttribute('aria-expanded', 'true');
	await expect(page.getByText(/full order is inferred/)).toBeVisible();

	await axeClean(page);

	await page.keyboard.press('Escape');
	await expect(pairwiseTrigger).toBeFocused();

	// Move-controls blurb, in the Ranked section (visible once at least one
	// comparison exists — judge the only pair first).
	await page.getByRole('button', { name: 'Popover Alpha' }).click();
	const moveControlsTrigger = page.getByRole('button', { name: 'About the move up/down controls' });
	await moveControlsTrigger.focus();
	await page.keyboard.press('Enter');
	await expect(moveControlsTrigger).toHaveAttribute('aria-expanded', 'true');
	await expect(page.getByText(/recorded as one more comparison/)).toBeVisible();

	await axeClean(page);
});

test('list export view: InfoPopover trigger is keyboard-operable, zero AA violations', async ({ page }) => {
	const userId = await signUp(page);
	const { listId } = await seedPoolAndList(userId);
	await page.goto(`/lists/${listId}`);

	const exportTrigger = page.getByRole('button', { name: 'About export formats' });
	await exportTrigger.focus();
	await page.keyboard.press('Enter');
	await expect(exportTrigger).toHaveAttribute('aria-expanded', 'true');
	await expect(page.getByText(/paste into a new GeekList/)).toBeVisible();

	await axeClean(page);

	await page.keyboard.press('Escape');
	await expect(exportTrigger).toBeFocused();
});
