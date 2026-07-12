import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import postgres from 'postgres';

async function signUp(page: Page): Promise<string> {
	await page.goto('/login');
	await page.getByRole('button', { name: 'Create one' }).click();
	await page.getByLabel('Email').fill(`man${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`);
	await page.getByLabel('Password').fill('password123');
	await page.getByRole('button', { name: 'Sign up' }).click();
	await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
	return (await (await page.request.get('/api/me')).json()).userId as string;
}

async function seedManualList(userId: string): Promise<{ listId: string; ids: number[] }> {
	const sql = postgres(process.env.DATABASE_URL as string);
	const base = 800000 + Math.floor(Math.random() * 90000);
	try {
		const games = await sql<{ id: number }[]>`
			insert into games (bgg_id, name)
			values (${base + 1}, 'One'), (${base + 2}, 'Two'), (${base + 3}, 'Three')
			returning id`;
		const [pool] = await sql<{ id: string }[]>`
			insert into pools (user_id, name) values (${userId}, 'M pool') returning id`;
		for (const g of games) {
			await sql`insert into pool_games (pool_id, game_id) values (${pool.id}, ${g.id})`;
		}
		const [list] = await sql<{ id: string }[]>`
			insert into lists (pool_id, user_id, name, ranking_method)
			values (${pool.id}, ${userId}, 'Manual list', 'manual') returning id`;
		return { listId: list.id, ids: games.map((g) => g.id) };
	} finally {
		await sql.end();
	}
}

test('manual list: drag-to-order view renders, reorder persists — with axe', async ({ page }) => {
	const userId = await signUp(page);
	const { listId, ids } = await seedManualList(userId);

	await page.goto(`/lists/${listId}`);
	await expect(page.getByRole('heading', { name: 'Drag to order' })).toBeVisible();
	await expect(page.getByRole('listitem').filter({ hasText: 'One' })).toBeVisible();

	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
		.analyze();
	expect(results.violations).toEqual([]);

	// Persist a reversed order (what a drag ultimately POSTs), then reload.
	const res = await page.request.post(`/api/lists/${listId}/reorder`, {
		data: { gameIds: [ids[2], ids[1], ids[0]] }
	});
	expect(res.ok()).toBeTruthy();

	await page.reload();
	// First item is now "Three".
	const first = page.getByRole('listitem').first();
	await expect(first).toContainText('Three');
});
