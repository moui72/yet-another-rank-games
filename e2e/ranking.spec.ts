import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import postgres from 'postgres';

async function signUp(page: Page): Promise<string> {
	await page.goto('/login');
	await page.getByRole('button', { name: 'Create one' }).click();
	await page.getByLabel('Email').fill(`rank${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`);
	await page.getByLabel('Password').fill('password123');
	await page.getByRole('button', { name: 'Sign up' }).click();
	await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
	const me = await (await page.request.get('/api/me')).json();
	return me.userId as string;
}

/** Seed a catalogue + pool + list for a user (imports are empty without a BGG token). */
async function seedList(userId: string): Promise<string> {
	const sql = postgres(process.env.DATABASE_URL as string);
	const base = 900000 + Math.floor(Math.random() * 90000);
	try {
		const games = await sql<{ id: number }[]>`
			insert into games (bgg_id, name)
			values (${base + 1}, 'Alpha'), (${base + 2}, 'Beta'), (${base + 3}, 'Gamma')
			returning id`;
		const [pool] = await sql<{ id: string }[]>`
			insert into pools (user_id, name) values (${userId}, 'E2E pool') returning id`;
		for (const g of games) {
			await sql`insert into pool_games (pool_id, game_id) values (${pool.id}, ${g.id})`;
		}
		const [list] = await sql<{ id: string }[]>`
			insert into lists (pool_id, user_id, name, ranking_method)
			values (${pool.id}, ${userId}, 'E2E ranking', 'pairwise') returning id`;
		return list.id;
	} finally {
		await sql.end();
	}
}

test('pairwise ranking: choose, keyboard, undo, resume — with axe', async ({ page }) => {
	const userId = await signUp(page);
	const listId = await seedList(userId);

	await page.goto(`/lists/${listId}`);
	await expect(page.getByRole('heading', { name: 'E2E ranking' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Which is better?' })).toBeVisible();

	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
		.analyze();
	expect(results.violations).toEqual([]);

	const status = page.getByRole('status');

	// First matchup is Alpha vs Beta (name order). Choose one.
	await page.getByRole('button', { name: 'Alpha', exact: true }).click();
	await expect(status).toContainText('1 of 3');

	// Keyboard choice.
	await page.keyboard.press('1');
	await expect(status).toContainText('2 of 3');

	// Undo goes back.
	await page.getByRole('button', { name: 'Undo' }).click();
	await expect(status).toContainText('1 of 3');

	// The ranking lists all three games.
	const ranking = page.getByRole('list').filter({ hasText: 'Gamma' });
	await expect(ranking).toContainText('Alpha');

	// Drop a game from the pool while ranking — it leaves the ranking, and the
	// removal persists (wait for the drop request before reloading).
	await Promise.all([
		page.waitForResponse((r) => r.url().includes('/drop') && r.request().method() === 'POST'),
		page.getByRole('button', { name: 'Drop Gamma from this list' }).click()
	]);
	await expect(page.getByRole('listitem').filter({ hasText: 'Gamma' })).toHaveCount(0);

	// Resume: reload rebuilds the session from persisted comparisons + pool.
	await page.reload();
	await expect(page.getByRole('status')).toBeVisible();
	await expect(page.getByRole('listitem').filter({ hasText: 'Gamma' })).toHaveCount(0);

	// Export in all three formats.
	await expect(page.getByRole('link', { name: 'Markdown' })).toBeVisible();
	const md = await (await page.request.get(`/api/lists/${listId}/export?format=md`)).text();
	expect(md).toContain('# E2E ranking');
	const csv = await (await page.request.get(`/api/lists/${listId}/export?format=csv`)).text();
	expect(csv).toContain('rank,game,bgg_id,score');
	const json = await (await page.request.get(`/api/lists/${listId}/export?format=json`)).json();
	expect(json.list).toBe('E2E ranking');
	expect(Array.isArray(json.entries)).toBe(true);

	// GeekList (BBCode) export control: visible, hinted, and downloads a
	// text/plain body of bare [thing] entries.
	await expect(page.getByRole('link', { name: 'GeekList' })).toBeVisible();
	await expect(page.getByText('paste into a new GeekList on BGG', { exact: false })).toBeVisible();
	const bbcodeResp = await page.request.get(`/api/lists/${listId}/export?format=bbcode`);
	expect(bbcodeResp.headers()['content-type']).toContain('text/plain');
	expect(await bbcodeResp.text()).toMatch(/^\[thing=\d+\]\[\/thing\]/);
});
