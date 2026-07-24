---
plan: plan-b47a-2026-07-24-76cb.md
generated: 2026-07-24
status: in-progress
---

# Tasks

## Phase 1: Hydration-race fix

- [x] T001 In `e2e/sharing.spec.ts`'s `public /share/[token] view` test, add `await page.waitForLoadState('networkidle')` immediately after `await page.goto(\`/lists/${listId}\`)` and before `await page.getByLabel('Share a read-only link').check()` (feedback F001) — mirroring the same fix already applied to the `share toggle and copy-link` test in this file. Run the test (repeat a few times if it was previously intermittent) to confirm the checkbox interaction no longer races Svelte's client hydration and the test passes reliably.
