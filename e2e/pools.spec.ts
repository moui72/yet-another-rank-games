import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import postgres from 'postgres';

async function axeClean(page: Page) {
	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
		.analyze();
	expect(results.violations).toEqual([]);
}

async function signUp(page: Page): Promise<string> {
	await page.goto('/login');
	await page.getByRole('button', { name: 'Create one' }).click();
	await page.getByLabel('Email').fill(`poolcard${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`);
	await page.getByLabel('Password').fill('password123');
	await page.getByRole('button', { name: 'Sign up' }).click();
	await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
	const me = await (await page.request.get('/api/me')).json();
	return me.userId as string;
}

/** Seed a pool with one game carrying cover art, owned by `userId`. */
async function seedPoolWithCoverArt(userId: string): Promise<string> {
	const sql = postgres(process.env.DATABASE_URL as string);
	const bggId = 900000 + Math.floor(Math.random() * 90000);
	try {
		const [game] = await sql<{ id: number }[]>`
			insert into games (bgg_id, name, weight, min_players, max_players, thumbnail_url, image_url)
			values (${bggId}, 'Cover Art Game', 3.2, 2, 4, 'https://example.com/thumb.jpg', 'https://example.com/full.jpg')
			returning id`;
		const [pool] = await sql<{ id: string }[]>`
			insert into pools (user_id, name) values (${userId}, 'Card view pool') returning id`;
		await sql`insert into pool_games (pool_id, game_id) values (${pool.id}, ${game.id})`;
		return pool.id;
	} finally {
		await sql.end();
	}
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

// bgg-cover-art-and-card-view (T005/T006): card-view grid toggle showing
// cover art, weight, and player count; list view stays the default.
test('pool builder: card view shows cover art, name, weight, player count (with axe)', async ({
	page
}) => {
	const userId = await signUp(page);
	const poolId = await seedPoolWithCoverArt(userId);

	await page.goto(`/pools/${poolId}`);
	await page.waitForLoadState('networkidle');
	await expect(page.getByRole('heading', { name: 'Card view pool' })).toBeVisible();

	// List view is the default.
	await expect(page.getByRole('list', { name: 'Games (card view)' })).toHaveCount(0);
	await expect(page.getByText('Cover Art Game')).toBeVisible();

	await page.getByRole('button', { name: 'Cards' }).click();
	const cardList = page.getByRole('list', { name: 'Games (card view)' });
	await expect(cardList).toBeVisible();
	await expect(cardList).toContainText('Cover Art Game');
	await expect(cardList).toContainText('weight 3.2');
	await expect(cardList).toContainText('2–4 players');
	await expect(cardList.locator('img')).toHaveAttribute('src', 'https://example.com/full.jpg');

	await axeClean(page);
});

// bgg-cover-art-and-card-view (T006): the "Show cover art" toggle persists to
// User.show_cover_art and, when off, no image requests are made.
test('pool builder: "Show cover art" toggle persists and suppresses image requests', async ({
	page
}) => {
	const userId = await signUp(page);
	const poolId = await seedPoolWithCoverArt(userId);

	await page.goto(`/pools/${poolId}`);
	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: 'Cards' }).click();

	const toggle = page.getByLabel('Show cover art');
	await expect(toggle).toBeChecked();

	const imageRequests: string[] = [];
	page.on('request', (req) => {
		if (req.url().includes('example.com')) imageRequests.push(req.url());
	});

	await Promise.all([
		page.waitForResponse((r) => r.url().includes('?/toggleCoverArt')),
		toggle.uncheck()
	]);
	await expect(page.getByRole('list', { name: 'Games (card view)' }).locator('img')).toHaveCount(0);
	expect(imageRequests).toEqual([]);

	// Persists across reload.
	await page.reload();
	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: 'Cards' }).click();
	await expect(page.getByLabel('Show cover art')).not.toBeChecked();
	await expect(page.getByRole('list', { name: 'Games (card view)' }).locator('img')).toHaveCount(0);
});
