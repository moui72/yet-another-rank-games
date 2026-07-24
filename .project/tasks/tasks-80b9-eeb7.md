---
plan: plan-80b9-2026-07-24-fac9.md
generated: 2026-07-24
status: in-progress
---

# Tasks

## Phase 1: Clipboard error handling

- [ ] T001 [artifacts: ui] Write a failing test for `copyShareLink` in `src/routes/lists/[id]/+page.svelte` (feedback F001): mock `navigator.clipboard.writeText` to reject, invoke `copyShareLink`, and assert the UI shows a visible failure state (not silence) rather than throwing unhandled or no-oping.
- [ ] T002 [artifacts: ui] Wrap `copyShareLink`'s `navigator.clipboard.writeText` call in a try/catch; on rejection, set a failure-state flag/message the template renders (reusing the existing copy-status UI slot used for the success "Copied!" case) so the user sees the write failed. Make T001's test pass.

## Phase 2: E2e clipboard permissions

- [ ] T003 [parallel] In `e2e/sharing.spec.ts`, add `context.grantPermissions(['clipboard-read', 'clipboard-write'])` to the browser context setup before the copy-link test runs, so the "Copied!" assertion is exercised against a context that can actually perform the clipboard write (feedback F002) rather than one where the write may silently fail. Confirm the test still passes with permissions granted (this is a test-hardening change, not a behavior change, so no separate red/green cycle is required — verify by running the updated spec).
