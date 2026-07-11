import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('login page has no WCAG 2.1 A/AA violations', async ({ page }) => {
	await page.goto('/login');
	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
		.analyze();
	expect(results.violations).toEqual([]);
});

test('a new user can sign up and is then signed in', async ({ page }) => {
	await page.goto('/login');
	await page.getByRole('button', { name: 'Create one' }).click();

	const email = `e2e${Date.now()}@example.com`;
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill('password123');
	await page.getByRole('button', { name: 'Sign up' }).click();

	// Confirmations are off in local dev, so sign-up yields an active session.
	await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
	await expect(page.getByText(email)).toBeVisible();

	// And signing out returns to the signed-out state.
	await page.getByRole('button', { name: 'Sign out' }).click();
	await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
});

test('sign in with a wrong password shows an error', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Email').fill('nobody@example.com');
	await page.getByLabel('Password').fill('wrongpassword');
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page.getByRole('alert')).toBeVisible();
});
