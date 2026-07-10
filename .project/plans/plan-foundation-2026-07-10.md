---
status: approved
branch: main
created: 2026-07-10
features: []
surfaced-defects: []
---

# Plan: Foundation — BGG collection ranking MVP

## Goal

Deliver a working multi-user web app where a signed-in user imports a BGG
collection, creates filtered lists, ranks each via pairwise comparison (with a
manual drag-to-order override), and exports the result — deployed cost-safely on
GCP.

## Scope

**In:** project + tooling scaffolding with the constitution's gates wired in;
Postgres schema via migrations; Supabase Auth; the BGG import pipeline
(Cloud Tasks + worker); collection/list management UI; the `openskill` ranking
engine + novelty-biased pairwise UI; manual drag-to-order; Markdown/CSV/JSON
export; Cloud Run deployment with cost guardrails.

**Out (deferred):** tiering (S/A/B buckets); public/shareable read-only links;
monetization/paid tiers; multi-region/DR hardening. These are noted in the
artifacts and revisited later, not built here.

## Technical Approach

Per the artifacts (not repeated here): SvelteKit + `adapter-node`, TypeScript
end-to-end, Svelte 5 runes for a single reactive store per runtime; Supabase
Postgres + Auth with **RLS off** (ownership enforced in app code); GCP Cloud Run
for the web app and a separate worker service; **Cloud Tasks** driving the BGG
`xmlapi2` import (`202` poll-retry, bounded retries + dead-letter); ranking via a
Bradley–Terry/Weng–Lin model (`openskill`) with the `Comparison` graph as source
of truth and `ListEntry` as a derived snapshot. TDD throughout (red→green);
WCAG 2.1 AA as a per-feature gate; coverage enforced as a never-decrease ratchet.

## Phase Breakdown

Each phase ends at a testable, demonstrable increment. Phases are ordered by
dependency; UI phases depend on the data + import phases beneath them.

### Phase 0 — Scaffolding & quality gates
- Initialize SvelteKit + TypeScript + Svelte 5 project; `adapter-node`.
- Wire tooling: ESLint, `svelte-check`/`tsc`, Vitest (+ coverage), Playwright with
  axe for WCAG AA checks.
- Pre-commit hook: lint → type-check → tests (constitution). GitHub Actions CI
  mirroring it, with the **coverage ratchet** as a merge gate.
- Establish module structure so entry files only wire dependencies (Principle XV);
  shared named types location (Principle XIII).
- *Increment:* a passing CI pipeline on a trivial tested module + a11y smoke test.

### Phase 1 — Data layer & auth
- Supabase project; **migrations** for `User`, `Game`, `Collection`,
  `CollectionItem`, `List`, `Comparison`, `ListEntry` + indexes (`datamodel.md`).
- Typed data-access layer with shared named types; validate `List.filter` against
  the shared filter schema on write.
- Supabase Auth: sign-in/up, JWT validation in SvelteKit `hooks`, app-code
  per-user ownership enforcement (RLS off).
- *Increment:* an authenticated user can create/read their own empty collection;
  cross-user access is denied (tested).

### Phase 2 — BGG import pipeline (worker)
- **[spike]** Resolve the open BGG-access question: evaluate candidate BGG
  SDK(s) vs. a raw `xmlapi2` + typed parser baseline (typed? maintained? handles
  `202`?); timeboxed, produces a recorded decision (→ `/ardd-refine
  infrastructure`). Raw parser is the fallback.
- Worker service on Cloud Run consuming **Cloud Tasks**; BGG import: `202`
  poll-retry, rate-limit handling, partial-XML tolerance, **bounded retries +
  dead-letter** (Principle IV).
- Import upserts `Game` globally by `bgg_id` and `CollectionItem` rows; stamps
  `Collection.last_synced_at`. Structured logging (Principle X).
- *Increment:* enqueue an import for a real BGG username → collection populated;
  a permanently-failing import lands in dead-letter, not an infinite loop.

### Phase 3 — Collection & list management UI
- Auth UI; collection import view with **live progress** + error/dead-letter
  states; explicit re-import.
- List creation (name, description, **filter** per schema); list listing with
  status.
- WCAG 2.1 AA pass on these views.
- *Increment:* user imports a collection through the UI and creates a filtered
  list, keyboard-only and screen-reader-checked.

### Phase 4 — Ranking engine + pairwise UI
- `openskill` integration: each `Comparison` updates `(mu, sigma)`; derive order
  by conservative score; recompute `ListEntry` snapshot after each comparison.
- **Novelty-biased next-pair selector** (the policy layer) as a pure,
  unit-tested function over ratings + already-compared pairs.
- Pairwise view: keyboard-operable choose/undo, confidence/coverage progress,
  stop-early/resume; cold-start seeding from BGG `user_rating`/`num_plays`.
- Resolves the `ui.md` tuning opens in-phase: pair-selection scoring, "done"
  definition, large-set budget, intransitive-cycle display.
- *Increment:* rank a list end-to-end via pairwise; stop and resume with the
  order preserved; contradictory judgments don't corrupt it.

### Phase 5 — Manual drag-to-order + export
- `svelte-dnd-action` drag-to-order (keyboard-accessible), authoring `ListEntry`
  directly for manual lists.
- Export: **Markdown, CSV, JSON** (`ui.md`).
- WCAG 2.1 AA pass on drag interactions.
- *Increment:* reorder a ranked list by hand and export it in all three formats.

### Phase 6 — Deployment & cost guardrails
- Containerize web + worker; deploy to Cloud Run: web `min-instances=1`,
  **`max-instances` caps** on both; Cloud Tasks queue configured with bounded
  retries + dead-letter.
- **GCP billing budget + alerts**; low quota caps as a kill-switch (Principle IV).
- Production config/secrets.
- *Increment:* the app runs on Cloud Run end-to-end with a verified budget alert
  and no unbounded autoscale path.

## Complexity Tracking

| Deviation | Justification |
|---|---|
| Separate worker service (not inline request handling) | BGG's async `202`/slow API and rate limits make inline import infeasible; a queue+worker is the simplest correct design (`infrastructure.md`). |
| Derived order recomputed from the `Comparison` graph | Chosen over a hand-maintained order to get correctness + native resume; the recompute is bounded and cheap at list scale (research doc). |

## Open Questions

- BGG access (SDK vs. raw) — resolved by the Phase 2 spike, not before.
- `ui.md` tuning items (pair-selection scoring, "done" definition, large-set
  comparison budget / list-size cap, intransitive-cycle display) — settled during
  Phase 4 with real interaction data.
- Public sharing model — deferred, out of this plan's scope.

## Production Annotation Summary

To annotate at their point of use during implementation (per constitution):
- **RLS off, authorization in app code only** — no DB-level backstop
  (`infrastructure.md`, `datamodel.md`).
- **Single-region, hobby-scale deploy** — minimal redundancy (`infrastructure.md`).
- **Supabase free tier** — relies on free-tier limits/managed backups
  (`infrastructure.md`).
- **Public sharing unspecified** — if links ship later, needs a privacy model
  (`ui.md`).
