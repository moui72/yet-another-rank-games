import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import postgres from 'postgres';

async function signUp(page: Page): Promise<string> {
	await page.goto('/login');
	await page.getByRole('button', { name: 'Create one' }).click();
	await page
		.getByLabel('Email')
		.fill(`eff${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`);
	await page.getByLabel('Password').fill('password123');
	await page.getByRole('button', { name: 'Sign up' }).click();
	await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
	return (await (await page.request.get('/api/me')).json()).userId as string;
}

/** Seed a pool + efficient list with enough comparisons that the ranked list
 * is populated and its keyboard override controls are present. */
async function seedEfficientList(userId: string): Promise<{ listId: string; ids: number[] }> {
	const sql = postgres(process.env.DATABASE_URL as string);
	const base = 700000 + Math.floor(Math.random() * 90000);
	try {
		const games = await sql<{ id: number }[]>`
			insert into games (bgg_id, name)
			values (${base + 1}, 'Alpha'), (${base + 2}, 'Beta'), (${base + 3}, 'Gamma')
			returning id`;
		const [pool] = await sql<{ id: string }[]>`
			insert into pools (user_id, name) values (${userId}, 'Eff pool') returning id`;
		for (const g of games) {
			await sql`insert into pool_games (pool_id, game_id) values (${pool.id}, ${g.id})`;
		}
		const [list] = await sql<{ id: string }[]>`
			insert into lists (pool_id, user_id, name, ranking_method)
			values (${pool.id}, ${userId}, 'Efficient list', 'efficient') returning id`;
		return { listId: list.id, ids: games.map((g) => g.id) };
	} finally {
		await sql.end();
	}
}

test('efficient view: comparison prompt and keyboard override paths pass axe', async ({ page }) => {
	const userId = await signUp(page);
	const { listId } = await seedEfficientList(userId);

	await page.goto(`/lists/${listId}`);
	// Comparison prompt is present (no comparisons yet → a matchup is offered).
	await expect(page.getByRole('heading', { name: 'Which is better?' })).toBeVisible();

	// Answer the offered matchups until the ranked list has rows with override
	// controls — the keyboard paths the AA gate rests on (T020).
	for (let i = 0; i < 5; i++) {
		const better = page.getByRole('heading', { name: 'Which is better?' });
		if (!(await better.isVisible().catch(() => false))) break;
		await page.getByRole('button', { name: /^(Alpha|Beta|Gamma)$/ }).first().click();
		await page.waitForTimeout(50);
	}

	// The ranked list surfaces the keyboard override affordances.
	await expect(page.getByRole('button', { name: /^Move .* up$/ }).first()).toBeVisible();
	await expect(page.getByRole('button', { name: /^Move .* down$/ }).first()).toBeVisible();
	await expect(page.getByRole('spinbutton', { name: /^Move .* to position$/ }).first()).toBeVisible();

	// axe over the whole efficient view, including those keyboard override paths.
	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
		.analyze();
	expect(results.violations).toEqual([]);
});
