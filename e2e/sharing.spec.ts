import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import postgres from 'postgres';

// T006 (feature `public-list-sharing`): WCAG 2.1 AA pass on the share toggle,
// copy-link control, and the public /share/[token] view — automated axe
// checks plus keyboard operability.
async function axeClean(page: Page) {
	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
		.analyze();
	expect(results.violations).toEqual([]);
}

async function signUp(page: Page): Promise<string> {
	await page.goto('/login');
	await page.getByRole('button', { name: 'Create one' }).click();
	await page
		.getByLabel('Email')
		.fill(`sharing${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`);
	await page.getByLabel('Password').fill('password123');
	await page.getByRole('button', { name: 'Sign up' }).click();
	await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
	const me = await (await page.request.get('/api/me')).json();
	return me.userId as string;
}

async function seedPoolAndList(userId: string): Promise<{ listId: string }> {
	const sql = postgres(process.env.DATABASE_URL as string);
	const base = 910000 + Math.floor(Math.random() * 90000);
	try {
		const games = await sql<{ id: number }[]>`
			insert into games (bgg_id, name)
			values (${base + 1}, 'Sharing Alpha'), (${base + 2}, 'Sharing Beta')
			returning id`;
		const [pool] = await sql<{ id: string }[]>`
			insert into pools (user_id, name) values (${userId}, 'Sharing pool') returning id`;
		for (const g of games) {
			await sql`insert into pool_games (pool_id, game_id) values (${pool.id}, ${g.id})`;
		}
		const [list] = await sql<{ id: string }[]>`
			insert into lists (pool_id, user_id, name, ranking_method)
			values (${pool.id}, ${userId}, 'Sharing list', 'pairwise') returning id`;
		return { listId: list.id };
	} finally {
		await sql.end();
	}
}

test('share toggle and copy-link: keyboard-operable, labelled, zero AA violations', async ({
	page
}) => {
	const userId = await signUp(page);
	const { listId } = await seedPoolAndList(userId);
	await page.goto(`/lists/${listId}`);

	const shareInfoTrigger = page.getByRole('button', { name: 'About sharing' });
	await shareInfoTrigger.focus();
	await page.keyboard.press('Enter');
	await expect(shareInfoTrigger).toHaveAttribute('aria-expanded', 'true');
	await expect(page.getByText(/private by default/)).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(shareInfoTrigger).toBeFocused();

	await axeClean(page);

	const shareCheckbox = page.getByLabel('Share a read-only link');
	await shareCheckbox.focus();
	await page.keyboard.press(' ');
	await expect(shareCheckbox).toBeChecked();

	const shareLinkInput = page.getByLabel('Share link');
	await expect(shareLinkInput).toBeVisible();
	const shareUrl = await shareLinkInput.inputValue();
	expect(shareUrl).toContain('/share/');

	const copyButton = page.getByRole('button', { name: 'Copy link' });
	await copyButton.focus();
	await page.keyboard.press('Enter');
	await expect(page.getByRole('button', { name: 'Copied!' })).toBeVisible();

	await axeClean(page);

	// Toggling off keeps the link visible/functional but reflects the UI's own
	// updated displayed state (per the non-revocable sharing model).
	await shareCheckbox.focus();
	await page.keyboard.press(' ');
	await expect(shareCheckbox).not.toBeChecked();
	await expect(shareLinkInput).toHaveValue(shareUrl);

	await axeClean(page);
});

test('public /share/[token] view: readable, zero AA violations', async ({ page }) => {
	const userId = await signUp(page);
	const { listId } = await seedPoolAndList(userId);
	await page.goto(`/lists/${listId}`);

	await page.getByLabel('Share a read-only link').check();
	const shareUrl = await page.getByLabel('Share link').inputValue();

	// Fresh, unauthenticated context — no session/cookies.
	const context = await page.context().browser()?.newContext();
	if (!context) throw new Error('could not open a fresh browser context');
	const anonPage = await context.newPage();
	await anonPage.goto(shareUrl);
	await expect(anonPage.getByRole('heading', { name: 'Sharing list' })).toBeVisible();
	await expect(anonPage.getByText('Sharing Alpha')).toBeVisible();
	await expect(anonPage.getByText('Sharing Beta')).toBeVisible();

	const results = await new AxeBuilder({ page: anonPage })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
		.analyze();
	expect(results.violations).toEqual([]);

	await context.close();
});

// F001: copyShareLink previously had no error handling around
// navigator.clipboard.writeText, so a rejected write silently no-op'd.
// Force a rejection and assert the UI surfaces a visible failure state
// instead of staying silent.
test('copy-link failure: rejected clipboard write shows a visible failure state', async ({
	page
}) => {
	const userId = await signUp(page);
	const { listId } = await seedPoolAndList(userId);

	// Installed before the app's own scripts run, independent of the other
	// tests' grantPermissions setup — this context's clipboard always rejects.
	await page.addInitScript(() => {
		navigator.clipboard.writeText = () => Promise.reject(new Error('denied'));
	});

	await page.goto(`/lists/${listId}`);
	await page.waitForLoadState('networkidle');

	await page.getByLabel('Share a read-only link').check();
	await expect(page.getByLabel('Share link')).toBeVisible();

	const copyButton = page.getByRole('button', { name: 'Copy link' });
	await copyButton.click();
	await expect(page.getByRole('button', { name: 'Copy failed' })).toBeVisible();
	await expect(page.getByText('Failed to copy share link').first()).toBeVisible();
});

test('unknown share token 404s', async ({ page }) => {
	const res = await page.goto('/share/00000000-0000-0000-0000-000000000000');
	expect(res?.status()).toBe(404);
});
