---
plan: plan-public-list-sharing-2026-07-23-810c.md
generated: 2026-07-23
status: in-progress
---

# Tasks

## Phase 1: Data model

- [x] T001 [artifacts: datamodel] Write a migration adding `is_shared` (bool, default `false`) and `share_token` (nullable uuid) columns to the `List` table, per `datamodel.md`. Write a failing test first asserting the migration applies cleanly and both columns exist with the correct defaults/nullability, then make it pass (Principle I, Principle X).

## Phase 2: Public read route

- [x] T002 [artifacts: infrastructure, datamodel] [parallel] Add server-side logic to lazily generate `List.share_token` (once, on first transition of `is_shared` to `true`) and persist it — never regenerate an existing token. Write a failing test first covering: first enable generates a token; a second enable (already shared) does not change the existing token; disabling does not clear the token (Principle I).
- [x] T003 [artifacts: infrastructure, ui] Add the unauthenticated `GET /share/[token]` SvelteKit route: look up a `List` by `share_token` with no auth/session check, and render it read-only via the same rendering path the authenticated List result view uses (no new snapshot/cache layer). Return 404 (not a distinct "unauthorized" response) when no list matches, or when the matching list has `is_shared = false`, so a wrong/disabled token is indistinguishable from a nonexistent one. Write a failing test first covering: valid shared token renders the list; unknown token 404s; token belonging to a not-currently-shared list 404s; the rendered order reflects the list's live current ranking (Principle I).

## Phase 3: Sharing UI

- [x] T004 [artifacts: ui] [parallel] Add an enable/disable share toggle and a copy-link affordance to the List result & export view, wired to `is_shared` and displaying the `/share/[token]` URL once enabled. Write a failing test first covering: toggling on shows a copyable link; toggling off keeps the link functional per the non-revocable model but updates the UI's own displayed state accordingly (Principle I).
- [ ] T005 [artifacts: ui] [parallel] Add an `InfoPopover` help blurb (per the existing Help & info text pattern) next to the share toggle explaining: sharing is private by default, a shared link keeps working even after the toggle is turned off, and the shared view always reflects the list's current live ranking.

## Phase 4: Accessibility & polish

- [ ] T006 [artifacts: ui] Run a WCAG 2.1 AA pass (Principle VI) on the share toggle, copy-link control, and the public `/share/[token]` view: automated axe checks plus manual contrast and keyboard/screen-reader operability checks. Fix any failures found.
