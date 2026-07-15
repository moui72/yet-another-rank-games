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

/**
 * Seed a pool + pairwise list of 3 games where one (Gamma) starts manually
 * excluded from ranking — so the *active* set is just Alpha/Beta (a single
 * pair), letting a test reach "fully ordered" in one comparison.
 */
async function seedListWithExcludedGame(userId: string): Promise<string> {
	const sql = postgres(process.env.DATABASE_URL as string);
	const base = 900000 + Math.floor(Math.random() * 90000);
	try {
		const games = await sql<{ id: number }[]>`
			insert into games (bgg_id, name)
			values (${base + 1}, 'Alpha'), (${base + 2}, 'Beta'), (${base + 3}, 'Gamma')
			returning id`;
		const [pool] = await sql<{ id: string }[]>`
			insert into pools (user_id, name) values (${userId}, 'E2E completion pool') returning id`;
		for (const g of games) {
			const excluded = g.id === games[2].id;
			await sql`insert into pool_games (pool_id, game_id, excluded_from_ranking) values (${pool.id}, ${g.id}, ${excluded})`;
		}
		const [list] = await sql<{ id: string }[]>`
			insert into lists (pool_id, user_id, name, ranking_method)
			values (${pool.id}, ${userId}, 'E2E completion ranking', 'pairwise') returning id`;
		return list.id;
	} finally {
		await sql.end();
	}
}

/** Seed a pool + pairwise list with one game carrying cover art. */
async function seedListWithCoverArt(userId: string): Promise<string> {
	const sql = postgres(process.env.DATABASE_URL as string);
	const base = 900000 + Math.floor(Math.random() * 90000);
	try {
		const games = await sql<{ id: number }[]>`
			insert into games (bgg_id, name, image_url, thumbnail_url)
			values
				(${base + 1}, 'Cover Alpha', 'https://example.com/alpha-full.jpg', 'https://example.com/alpha-thumb.jpg'),
				(${base + 2}, 'Cover Beta', null, null)
			returning id`;
		const [pool] = await sql<{ id: string }[]>`
			insert into pools (user_id, name) values (${userId}, 'E2E cover pool') returning id`;
		for (const g of games) {
			await sql`insert into pool_games (pool_id, game_id) values (${pool.id}, ${g.id})`;
		}
		const [list] = await sql<{ id: string }[]>`
			insert into lists (pool_id, user_id, name, ranking_method)
			values (${pool.id}, ${userId}, 'E2E cover ranking', 'pairwise') returning id`;
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

	// Ranked/Unranked split (T013): Alpha and Beta have a comparison between
	// them, so they're Ranked; Gamma has never been compared, so it's Unranked.
	const ranked = page.locator('#ranked-list');
	await expect(ranked).toContainText('Alpha');
	await expect(ranked).not.toContainText('Gamma');
	await page.getByRole('button', { name: /^Unranked \(/ }).click();
	const unrankedList = page.locator('#unranked-list');
	await expect(unrankedList).toContainText('Gamma');

	// Excluding a ranked game (T014) moves it to Unranked without deleting it.
	await Promise.all([
		page.waitForResponse((r) => r.url().includes('/exclude') && r.request().method() === 'POST'),
		page.getByRole('button', { name: 'Exclude Alpha from ranking' }).click()
	]);
	await expect(ranked).not.toContainText('Alpha');
	await expect(unrankedList).toContainText('Alpha');
	// Excluded (not just never-compared) games get a Restore control.
	const restoreAlpha = unrankedList.getByRole('button', { name: 'Restore Alpha to ranking' });
	await expect(restoreAlpha).toBeVisible();
	await Promise.all([
		page.waitForResponse((r) => r.url().includes('/exclude') && r.request().method() === 'POST'),
		restoreAlpha.click()
	]);
	await expect(ranked).toContainText('Alpha');

	// The trash control in Unranked hard-deletes a game from the pool entirely
	// (only reachable from Unranked) — removal persists (wait for the request).
	await Promise.all([
		page.waitForResponse((r) => r.url().includes('/drop') && r.request().method() === 'POST'),
		page.getByRole('button', { name: 'Delete Gamma from this list' }).click()
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

// bgg-cover-art-and-card-view (T007/T008): pairwise comparison cards show
// cover art (via T004's resolveCoverArt, falling back to thumbnail/placeholder),
// and the same "Show cover art" toggle (persisted field shared with the pool
// builder) suppresses image requests when off.
test('pairwise cards show cover art and the toggle suppresses image requests', async ({ page }) => {
	const userId = await signUp(page);
	const listId = await seedListWithCoverArt(userId);

	await page.goto(`/lists/${listId}`);
	await page.waitForLoadState('networkidle');
	await expect(page.getByRole('heading', { name: 'Which is better?' })).toBeVisible();

	const matchup = page.locator('section', { has: page.getByRole('heading', { name: 'Which is better?' }) });
	await expect(matchup.locator('img[alt="Cover Alpha"]')).toHaveAttribute(
		'src',
		'https://example.com/alpha-full.jpg'
	);
	// Beta has no image_url/thumbnail_url -> placeholder, not a missing <img>.
	await expect(matchup.locator('img[alt="Cover Beta"]')).toBeVisible();

	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
		.analyze();
	expect(results.violations).toEqual([]);

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
	await expect(matchup.locator('img')).toHaveCount(0);
	expect(imageRequests).toEqual([]);
});

// pool-completion-celebration (T003/T004): once every pair among the active
// (non-excluded) games is judged, a one-time confetti animation fires and the
// comparison controls hide; they reappear automatically when the active set
// changes (here, restoring the pre-excluded Gamma creates new unseen pairs).
test('pool completion celebration: confetti fires once, controls hide, and reappear on active-set change', async ({
	page
}) => {
	const userId = await signUp(page);
	const listId = await seedListWithExcludedGame(userId);

	await page.goto(`/lists/${listId}`);
	await page.waitForLoadState('networkidle'); // let hydration finish before clicking
	const heading = page.getByRole('heading', { name: 'Which is better?' });
	await expect(heading).toBeVisible();

	// Only Alpha vs Beta is active (Gamma starts excluded) — no confetti yet.
	await expect(page.locator('canvas')).toHaveCount(0);

	// Judging the only active pair completes the pool.
	await page.getByRole('button', { name: 'Alpha', exact: true }).click();

	// canvas-confetti renders a transient full-viewport <canvas> when it fires.
	await expect(page.locator('canvas')).toHaveCount(1);
	await expect(heading).not.toBeVisible();
	await expect(page.getByRole('button', { name: 'Undo' })).not.toBeVisible();

	// Resume: reload rebuilds an already-complete session — controls stay
	// hidden and confetti does not replay for the pre-existing completion.
	await page.reload();
	await expect(page.getByRole('status')).toBeVisible();
	await expect(heading).not.toBeVisible();
	await expect(page.locator('canvas')).toHaveCount(0);
	await page.waitForTimeout(300);
	await expect(page.locator('canvas')).toHaveCount(0);

	// Restoring the excluded Gamma grows the active set, creating new unseen
	// pairs — the controls reappear automatically (no manual "unhide").
	await page.getByRole('button', { name: /^Unranked \(/ }).click();
	await page.getByRole('button', { name: 'Restore Gamma to ranking' }).click();
	await expect(heading).toBeVisible();
});

// manual-pairwise-ranking-adjust (T001/T002): move-up/move-down controls per
// row in the Ranked section emit a synthetic comparison swapping the game
// with its immediate neighbor; the edge buttons (top row's move-up, bottom
// row's move-down) are disabled and don't act.
test('manual reordering: move up/down swaps neighbors, edge buttons are disabled and inert', async ({ page }) => {
	const userId = await signUp(page);
	const listId = await seedList(userId);

	await page.goto(`/lists/${listId}`);
	await page.waitForLoadState('networkidle'); // let hydration finish before clicking
	await expect(page.getByRole('heading', { name: 'Which is better?' })).toBeVisible();

	// Judge Alpha vs Beta so both land in Ranked (Gamma stays Unranked, out of the way).
	await page.getByRole('button', { name: 'Alpha', exact: true }).click();

	const ranked = page.locator('#ranked-list');
	const rankedItems = ranked.getByRole('listitem');
	await expect(rankedItems).toHaveCount(2);
	await expect(rankedItems.nth(0)).toContainText('Alpha');
	await expect(rankedItems.nth(1)).toContainText('Beta');

	// Top row's move-up is disabled and does nothing.
	const moveUpAlpha = rankedItems.nth(0).getByRole('button', { name: 'Move Alpha up' });
	await expect(moveUpAlpha).toBeDisabled();

	// Bottom row's move-down is disabled and does nothing.
	const moveDownBeta = rankedItems.nth(1).getByRole('button', { name: 'Move Beta down' });
	await expect(moveDownBeta).toBeDisabled();

	// Moving Beta up swaps it with Alpha.
	const moveUpBeta = rankedItems.nth(1).getByRole('button', { name: 'Move Beta up' });
	await Promise.all([
		page.waitForResponse((r) => r.url().includes('/compare') && r.request().method() === 'POST'),
		moveUpBeta.click()
	]);
	await expect(rankedItems.nth(0)).toContainText('Beta');
	await expect(rankedItems.nth(1)).toContainText('Alpha');

	// Moving Alpha (now at the bottom) up swaps it back with Beta.
	const moveUpAlphaAgain = rankedItems.nth(1).getByRole('button', { name: 'Move Alpha up' });
	await Promise.all([
		page.waitForResponse((r) => r.url().includes('/compare') && r.request().method() === 'POST'),
		moveUpAlphaAgain.click()
	]);
	await expect(rankedItems.nth(0)).toContainText('Alpha');
	await expect(rankedItems.nth(1)).toContainText('Beta');

	// No accessibility regressions from the new controls.
	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
		.analyze();
	expect(results.violations).toEqual([]);
});
