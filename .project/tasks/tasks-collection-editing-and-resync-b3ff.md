---
plan: plan-collection-editing-and-resync-2026-07-14-d0af.md
generated: 2026-07-14
status: completed
---

# Tasks

## Phase 1: Data model migration

- [x] T001 [artifacts: datamodel] Write a migration adding: `Collection`
  unique `(user_id, bgg_username)`; `CollectionItem.source` enum
  (`bgg_import`/`local_add`, backfilled `bgg_import` for existing rows);
  `CollectionItem.status` enum (`active`/`removed`/`pending_delete`,
  backfilled `active`); `CollectionItem.removed_at` nullable timestamptz;
  new `CollectionItemDuplicate` table (`collection_item_id`,
  `candidate_game_id`, `status` enum `pending`/`confirmed_same`/`rejected_distinct`,
  `created_at`). Write a migration test first verifying the unique constraint
  rejects a duplicate `(user_id, bgg_username)` insert and that backfilled
  rows land in the expected default state, then implement the migration to
  pass it (Principle I).

## Phase 2: Collection edit backend

- [x] T002 [artifacts: datamodel] [parallel] Add a soft-delete endpoint/action:
  sets `CollectionItem.status = removed`, `removed_at = now()`. Write a test
  first: an active item becomes `removed` and is excluded from the default
  active-item query; then implement.
- [x] T003 [artifacts: datamodel] [parallel] Add an undo endpoint/action:
  `removed`/`pending_delete` → `active`, clears `removed_at`. Write a test
  first: undo restores an item to the active list; then implement.
- [x] T004 [artifacts: datamodel] [parallel] Add a confirm-hard-delete
  endpoint/action, only valid from `pending_delete`: physically deletes the
  `CollectionItem` row. Write a test first: a `pending_delete` item can be
  confirmed and is gone; an `active` or `removed` item cannot be
  hard-deleted directly; then implement.
- [x] T005 [artifacts: datamodel] Extend the collection add flow to reuse
  `bgg-game-search-import` and stamp new rows `source = local_add`. Write a
  test first: an item added this way has `source = local_add` and a real
  `game_id`; then implement.

## Phase 3: Re-pull / resync reconciliation

- [x] T006 [artifacts: datamodel, infrastructure] Implement resync
  reconciliation: on re-pull, for each currently-`removed` `CollectionItem`
  whose `bgg_id` is absent from the freshly-pulled set, flip it to
  `pending_delete`. Write a test first: a removed item missing from a
  simulated re-pull becomes `pending_delete`; a removed item still present
  in the pull stays `removed` (BGG re-adding it doesn't silently un-remove
  it); then implement.
- [x] T007 [artifacts: datamodel] Implement the fuzzy-title match: for each
  `local_add` item, compare its title against newly-pulled games not already
  linked by `bgg_id`; on a match, create a `CollectionItemDuplicate` row
  (`status: pending`). Heuristic itself stays simple/placeholder per the
  `[OPEN]` in `datamodel.md` — exact-match-insensitive plus a basic
  edit-distance threshold is sufficient for v1. Write a test first: a
  `local_add` item with a near-identical title to a pulled game produces a
  pending duplicate; an unrelated title does not; then implement.
- [x] T008 [artifacts: datamodel] Implement confirm-merge and reject-distinct
  for a `CollectionItemDuplicate`: confirm repoints the confirming user's own
  `PoolGame`/`Comparison` rows referencing the `local_add` item's `game_id`
  to `candidate_game_id`, then deletes the now-redundant `CollectionItem`;
  reject sets `status = rejected_distinct` and leaves both items untouched.
  Write a test first: confirm updates this user's `PoolGame` rows only (a
  second user's `PoolGame` referencing the same `game_id` is unaffected);
  reject leaves both `CollectionItem` rows intact; then implement.

## Phase 4: Collection management UI

- [x] T009 [artifacts: ui] [parallel] Build the Collection management view:
  active items list + collapsible Removed section (`removed`/`pending_delete`
  items), each Removed item showing an undo control and, for
  `pending_delete` items, a confirm-hard-delete control.
- [x] T010 [artifacts: ui] [parallel] Wire the add-to-collection flow through
  the existing BGG search-import UI (reuse, don't duplicate, per Principle IX).
- [x] T011 [artifacts: ui] Wire a re-pull/resync action that triggers T006–T007
  and, when it produces any `CollectionItemDuplicate` rows, surfaces the
  possible-duplicates review step (confirm-merge / reject-distinct per T008).

## Phase 5: Pairwise ranking view — unranked/ranked split (feedback F001–F003)

- [x] T012 [artifacts: datamodel] Add `PoolGame.excluded_from_ranking`
  boolean (default `false`) via migration — lets a game be manually pulled
  out of a list's active ranking without losing its `Comparison` history
  (distinct from having zero comparisons). Write a migration/model test
  first, then implement. [feedback: F002]
- [x] T013 [artifacts: ui] Split the pairwise ranking view into a **Ranked**
  section (pool games with ≥1 `Comparison` in this list and
  `excluded_from_ranking = false`) and a collapsible **Unranked** section
  (everything else); a game starts in Unranked until its first comparison.
  Write a test first covering the ranked/unranked split logic, then
  implement. [feedback: F002]
- [x] T014 [artifacts: ui] Change the ranked-section "x" to set
  `excluded_from_ranking = true` (moves the game to Unranked, keeps its
  `PoolGame`/`Comparison` rows intact) instead of deleting it from the pool.
  Write a test first, then implement. [feedback: F001]
- [x] T015 [artifacts: ui] Add a visually-distinct "trash" control to the
  Unranked section that hard-deletes the `PoolGame` row (removes the game
  from the list's pool entirely — affects every list built from that pool).
  Write a test first, then implement. [feedback: F003]
