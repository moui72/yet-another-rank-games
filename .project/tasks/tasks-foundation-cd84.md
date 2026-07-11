---
plan: plan-foundation-2026-07-10.md
generated: 2026-07-10
status: in-progress
---

# Tasks

## Phase 0: Scaffolding & quality gates

- [x] T001 [artifacts: constitution] Initialize a SvelteKit project with TypeScript, Svelte 5 (runes) and `adapter-node`. Commit the baseline app; confirm `dev` and `build` run. Add a placeholder `/` route.
- [x] T002 [artifacts: constitution] Configure Vitest with coverage reporting. Add one trivial domain util written test-first (red→green) to establish the TDD loop and a coverage baseline number.
- [x] T003 [artifacts: constitution] [parallel] Configure ESLint + `svelte-check`/`tsc` with `lint` and `check` npm scripts; make them pass on the current tree. No `any`/untyped seams (Principle II).
- [x] T004 [artifacts: constitution, ui] [parallel] Add Playwright + `@axe-core/playwright`; write a WCAG 2.1 AA smoke test asserting zero axe violations on `/`.
- [x] T005 [artifacts: constitution] Add a pre-commit hook (e.g. Husky/lefthook) running lint → type-check → tests in that order; document the emergency-bypass policy from the constitution.
- [x] T006 [artifacts: constitution] GitHub Actions CI mirroring the pre-commit hook (lint, type-check, tests) on push/PR, plus a **coverage ratchet** step that fails when overall coverage drops below the stored baseline and updates the baseline upward.
- [x] T007 [artifacts: constitution] Establish the module/directory structure so entry files only wire dependencies (Principle XV) and shared types have one home (Principle XIII). Document it briefly in the repo README.

## Phase 1: Data layer & auth

- [x] T008 [artifacts: infrastructure, datamodel] Provision a Supabase project; add env/config loading and a single DB connection/client module (constructed at the entry, imported elsewhere — Principle XV). No secrets committed.
- [x] T009 [artifacts: datamodel] Write the initial migration creating `User`, `Game`, `Collection`, `CollectionItem`, `List`, `Comparison`, `ListEntry` and all indexes in `datamodel.md`. Test: migration applies to a clean database and the resulting schema (columns, unique `Game.bgg_id`, FKs) matches expectations.
- [x] T010 [artifacts: datamodel] [parallel] Define shared, exported TypeScript types for every entity as the single source of truth (Principle XIII), reused by the data layer and UI.
- [x] T011 [artifacts: datamodel] Typed data-access layer for `User`/`Collection`/`CollectionItem` CRUD, written test-first, using the shared types.
- [x] T012 [artifacts: datamodel] [parallel] Implement and test the `List.filter` schema validator (the v1 jsonb predicate schema): valid filters pass; unknown or malformed keys are rejected on write.
- [x] T013 [artifacts: infrastructure] Supabase Auth integration: email + OAuth sign-in/up/out, with JWT validation in SvelteKit `hooks.server`. Test authenticated vs. anonymous request handling.
- [x] T014 [artifacts: infrastructure, datamodel] App-code per-user ownership enforcement helper (RLS is off). Test-first: a user can read/write only their own `Collection`/`List`; cross-user access is denied.

## Phase 2: BGG import pipeline (worker)

- [x] T015 [artifacts: infrastructure] **[spike]** Evaluate candidate BGG SDK/wrapper libraries vs. a raw `xmlapi2` + typed-parser baseline (typed? maintained? handles `202`?). Timeboxed; produce a recorded decision and run `/ardd-refine infrastructure` to resolve the open question. No test requirement (decision task); raw parser is the fallback.
- [x] T016 [artifacts: infrastructure, datamodel] Implement the BGG client per the spike decision: fetch a collection and game details, parse XML into the shared typed models, tolerate partial/malformed XML. Test-first against saved fixture XML (including a `202` body and a missing-fields case).
- [x] T017 [artifacts: infrastructure] `202` poll-retry with backoff and **bounded** max attempts + rate-limit handling. Test-first: resolves once BGG returns data; hits a terminal give-up state (not an infinite loop) when `202` persists past the cap.
- [x] T018 [artifacts: infrastructure] Worker Cloud Run service skeleton consuming **Cloud Tasks**, plus a web endpoint that enqueues an import job. Test the enqueue→invoke handoff with a stubbed queue.
- [x] T019 [artifacts: infrastructure, datamodel] Import handler: upsert `Game` globally by `bgg_id`, upsert `CollectionItem` rows, stamp `Collection.last_synced_at`. Test-first: idempotent re-import doesn't duplicate games; shared games are one row across users.
- [x] T020 [artifacts: infrastructure] Dead-letter path + terminal failure state, with structured log events on success/failure carrying identifiers (Principle X). Test: a permanently-failing import lands in dead-letter and is queryable, not retried forever.

## Phase 3: Collection & list management UI

- [x] T021 [artifacts: ui, infrastructure] Auth UI (sign in/up/out) wired to Supabase Auth. Test the flow; WCAG 2.1 AA (axe + keyboard).
- [x] T022 [artifacts: ui, infrastructure] Collection import view: trigger/re-import, **live progress** (queued → fetching → processing → done), plus error and dead-letter states. Test each state renders from import status.
- [x] T023 [artifacts: ui, datamodel] List-creation form with a filter builder over the v1 filter schema (mechanics/categories/weight/player-count/time/owned). Client + server validation; test invalid filters are rejected.
- [x] T024 [artifacts: ui, datamodel] [parallel] List listing view showing each list's status, with loading/empty/error states (empty = no collection, or no games match a filter). Test.
- [x] T025 [artifacts: ui] WCAG 2.1 AA audit pass (axe + keyboard + screen-reader) across all Phase 3 views; fix findings. Gate before Phase 4.

## Phase 4: Ranking engine + pairwise UI

- [ ] T026 [artifacts: datamodel, ui] Integrate `openskill`: a pure function applying one `Comparison` (winner/loser) to update the two games' `(mu, sigma)`, and a pure function deriving the ordering by conservative score (`mu − k·sigma`). Unit-tested; no persistence yet.
- [ ] T027 [artifacts: datamodel] Persist `Comparison` rows as the source of truth and recompute the `ListEntry` snapshot after each comparison. Test-first: replaying the comparison log rehydrates the same ranking (stop-and-resume correctness).
- [ ] T028 [artifacts: ui] Novelty-biased next-pair selector as a pure function over current ratings + already-compared pairs. Unit-test: prefers unseen informative pairs; permits a repeat only when no unseen pair remains or to break a persistent ambiguity; handles exhaustion.
- [ ] T029 [artifacts: ui] Single Svelte 5 runes store (Principle XII) holding the comparison log (source of truth), derived `Map<gameId,{mu,sigma}>`, and the current candidate pair — fully recomputable from the log. Test serialize/resume.
- [ ] T030 [artifacts: ui] Pairwise view: keyboard-operable choose left/right + undo, a confidence/coverage progress signal, stop-early/resume, and cold-start seeding from `CollectionItem.user_rating`/`num_plays`. Test interactions; WCAG 2.1 AA.
- [ ] T031 [artifacts: ui] Settle the `ui.md` tuning open questions with real interaction data — pair-selection scoring formula, the "done" definition/signal, large-set comparison budget (and any pairwise list-size cap), and intransitive-cycle display — and record them via `/ardd-refine ui`.

## Phase 5: Manual drag-to-order + export

- [ ] T032 [artifacts: ui, datamodel] `svelte-dnd-action` drag-to-order that authors `ListEntry` directly for a manual list (overriding/seeding pairwise). Must be keyboard-accessible. Test reordering persists.
- [ ] T033 [artifacts: ui] [parallel] Export generators for Markdown, CSV (rank, game, bgg_id, score), and JSON (full structured list). Unit-test each format against a known list.
- [ ] T034 [artifacts: ui] Export UI + download wiring; WCAG 2.1 AA pass on Phase 5 interactions.

## Phase 6: Deployment & cost guardrails

- [ ] T035 [artifacts: infrastructure] Containerize the web (`adapter-node`) and worker as separate images; local container smoke test of both.
- [ ] T036 [artifacts: infrastructure] Deploy both to Cloud Run: web `min-instances=1`, **`max-instances` caps on both services** (Principle IV), deliberate request concurrency.
- [ ] T037 [artifacts: infrastructure] [parallel] Cloud Tasks production queue config: bounded retry count + dead-letter target aligned with the worker's give-up state.
- [ ] T038 [artifacts: infrastructure] [parallel] GCP **billing budget + alerts** and low quota caps as a kill-switch; verify an alert fires against a low test threshold.
- [ ] T039 [artifacts: infrastructure] Production config/secrets management (no secrets in the image); end-to-end smoke on Cloud Run: import → rank → export against the deployed stack.
