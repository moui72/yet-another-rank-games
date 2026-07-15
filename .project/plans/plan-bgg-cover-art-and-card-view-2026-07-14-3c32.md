---
status: approved
branch: bgg-cover-art-and-card-view
created: 2026-07-14
features: [bgg-cover-art-and-card-view]
surfaced-defects: []
---

# Plan: BGG cover art & card view

## Goal

Show BGG cover art in a new pool card view and in pairwise comparison cards,
with a persisted no-images preference for users minimizing network usage.

## Scope

**In scope:**
- `Game.image_url` (BGG's full-size `<image>`) alongside the existing
  `thumbnail_url`.
- `User.show_cover_art` preference (default `true`).
- Pool builder card view (grid, toggle against the existing list view).
- Pairwise comparison cards showing cover art.
- A single inline "Show cover art" toggle, present wherever images appear,
  persisting to `User.show_cover_art` — no separate settings page.

**Out of scope:**
- Card-view grid layout/breakpoint specifics (`[OPEN]` in `ui.md`, a
  presentation detail for implementation).
- A dedicated user settings/profile page (deliberately not built — the
  toggle lives inline per the applied artifact changes).
- Backfilling `image_url` for games imported before this ships (existing
  rows just have `image_url = null` until next re-enrichment via the
  existing TTL cache-refresh path in `infrastructure.md` — no special
  migration-time backfill job).

## Technical Approach

`parseThingXml` (`src/lib/server/bgg/parse.ts`) already parses `<thumbnail>`;
it gains a parallel `<image>` extraction into `imageUrl`, following the exact
same null-safety pattern as the existing `thumbnailUrl` line. The fallback
chain (`image_url` → `thumbnail_url` → placeholder) is a single shared helper
so the pool card view and the pairwise view don't duplicate it (constitution
Principle IX/XIII). `User.show_cover_art` is a plain boolean column read on
each relevant page load and updated via one small form action — no new store
or session state needed (Principle XII: this is persisted user state, not
runtime ranking state, so it doesn't belong in the pairwise reactive store).

## Phase Breakdown

### Phase 1 — Data model migration
- [ ] T001 [artifacts: datamodel] Write a migration adding `games.image_url`
  (nullable text) and `users.show_cover_art` (boolean, not null, default
  `true`). Write a migration test verifying both columns exist with the
  correct defaults and that existing rows backfill `show_cover_art = true`.

### Phase 2 — BGG cover art ingestion
- [ ] T002 [artifacts: datamodel, infrastructure] Extend `parseThingXml`
  (`src/lib/server/bgg/parse.ts`) to extract `<image>` into `imageUrl`,
  mirroring the existing `thumbnailUrl` extraction exactly (null-safe,
  trimmed). Update `BggThing` (`src/lib/server/bgg/types.ts`) and the `Game`
  entity type (`src/lib/types/entities.ts`) with `imageUrl`/`image_url`.
  Write a test first (extend `parse.test.ts`'s existing thumbnail fixture
  with an `<image>` sibling), then implement.
- [ ] T003 [artifacts: datamodel] Wire `imageUrl` through the existing
  `thing`-enrichment upsert path (wherever `thumbnailUrl` is written today)
  so newly-imported/enriched games get `image_url` populated. Write a test
  first, then implement.

### Phase 3 — Shared image-fallback helper
- [ ] T004 [artifacts: ui] Add a small shared helper/component resolving a
  game's display image: `image_url` → `thumbnail_url` → placeholder — used
  by both the card view (T005) and the pairwise view (T006), avoiding
  duplicating the fallback chain (Principle IX/XIII). Write a test first for
  the fallback logic, then implement.

### Phase 4 — Pool builder card view
- [ ] T005 [artifacts: ui] [parallel] Add a card-view grid to the pool
  builder as a toggle alongside the existing list view (list stays default):
  each card shows cover art (via T004's helper), name, weight, and player
  count. Write a test first covering the toggle and card rendering, then
  implement.
- [ ] T006 [artifacts: ui] [parallel] Add the "Show cover art" toggle to the
  pool builder view, persisting to `User.show_cover_art` via a form action;
  when off, the card view falls back to a compact text-only layout and no
  image requests are made. Write a test first, then implement.

### Phase 5 — Pairwise comparison cards
- [ ] T007 [artifacts: ui] Show cover art on pairwise comparison cards (via
  T004's helper), respecting `User.show_cover_art`. Write a test first, then
  implement.
- [ ] T008 [artifacts: ui] Add the same "Show cover art" toggle to the
  pairwise ranking view (same persisted field as T006 — one preference,
  surfaced in both places). Write a test first, then implement.

## Complexity Tracking

| Deviation | Justification |
|---|---|
| Shared image-fallback helper (T004) introduced before either consuming view exists | Two call sites (card view, pairwise view) need the identical `image_url → thumbnail_url → placeholder` chain from day one — extracting it now avoids the exact duplication Principle IX/XIII warns against, rather than writing it twice and refactoring later. |
| No settings page | Considered and rejected: only one preference exists (`show_cover_art`) and no settings page exists yet; building one now would be speculative infrastructure for a single toggle (Principle VII/YAGNI). The toggle lives inline instead. |

## Open Questions

- Card-view grid layout/breakpoints — left as an implementation detail per
  `ui.md`'s `[OPEN: ...]`.
- Whether existing (pre-feature) games should be proactively re-enriched to
  backfill `image_url`, vs. waiting for the natural TTL refresh
  (`infrastructure.md`'s freshness model) — resolved as scope: no special
  backfill job (see Scope), so older games simply lack cover art in the card
  view (falling back to `thumbnail_url` if present, else placeholder) until
  next natural refresh. Revisit if this feels stale in practice.

## Production Annotation Summary

- No new production shortcuts introduced by this plan.
