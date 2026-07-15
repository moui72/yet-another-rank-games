---
plan: plan-bgg-cover-art-and-card-view-2026-07-14-3c32.md
generated: 2026-07-14
status: in-progress
---

# Tasks

## Phase 1: Data model migration

- [x] T001 [artifacts: datamodel] Write a migration adding `games.image_url`
  (nullable text) and `users.show_cover_art` (boolean, not null, default
  `true`). Write a migration test first verifying both columns exist with
  the correct defaults and that existing rows backfill `show_cover_art =
  true`, then implement the migration to pass it (Principle I).

## Phase 2: BGG cover art ingestion

- [x] T002 [artifacts: datamodel, infrastructure] Extend `parseThingXml`
  (`src/lib/server/bgg/parse.ts`) to extract `<image>` into `imageUrl`,
  mirroring the existing `thumbnailUrl` extraction exactly (null-safe,
  trimmed). Update `BggThing` (`src/lib/server/bgg/types.ts`) and the `Game`
  entity type (`src/lib/types/entities.ts`) with `imageUrl`/`image_url`.
  Write a test first (extend `parse.test.ts`'s existing thumbnail fixture
  with an `<image>` sibling), confirm it fails, then implement.
- [x] T003 [artifacts: datamodel] Wire `imageUrl` through the existing
  `thing`-enrichment upsert path (wherever `thumbnailUrl` is written today)
  so newly-imported/enriched games get `image_url` populated. Write a test
  first, confirm it fails, then implement.

## Phase 3: Shared image-fallback helper

- [x] T004 [artifacts: ui] Add a small shared helper/component resolving a
  game's display image: `image_url` → `thumbnail_url` → placeholder — used
  by both the card view (T005) and the pairwise view (T007), avoiding
  duplicating the fallback chain (Principle IX/XIII). Write a test first for
  the fallback logic, confirm it fails, then implement.

## Phase 4: Pool builder card view

- [x] T005 [artifacts: ui] [parallel] Add a card-view grid to the pool
  builder as a toggle alongside the existing list view (list stays default):
  each card shows cover art (via T004's helper), name, weight, and player
  count. Write a test first covering the toggle and card rendering, confirm
  it fails, then implement.
- [x] T006 [artifacts: ui] [parallel] Add the "Show cover art" toggle to the
  pool builder view, persisting to `User.show_cover_art` via a form action;
  when off, the card view falls back to a compact text-only layout and no
  image requests are made. Write a test first, confirm it fails, then
  implement.

## Phase 5: Pairwise comparison cards

- [x] T007 [artifacts: ui] Show cover art on pairwise comparison cards (via
  T004's helper), respecting `User.show_cover_art`. Write a test first,
  confirm it fails, then implement.
- [x] T008 [artifacts: ui] Add the same "Show cover art" toggle to the
  pairwise ranking view (same persisted field as T006 — one preference,
  surfaced in both places). Write a test first, confirm it fails, then
  implement.
