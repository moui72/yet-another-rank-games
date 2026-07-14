---
status: approved
branch: collection-editing-and-resync
created: 2026-07-14
features: [collection-editing-and-resync]
surfaced-defects: []
---

# Plan: Collection editing & resync reconciliation

## Goal

Let a user view and edit an imported BGG collection (add/remove games) and
re-pull it on demand, with local edits tracked so a re-pull reconciles rather
than silently overwriting them — while also fixing the pairwise ranking
view's all-or-nothing removal behavior surfaced in open feedback.

## Scope

**In scope:**
- Collection management view: view active items + a collapsible Removed
  section; add (via existing BGG search-import), remove (soft-delete,
  undoable), re-pull/resync with reconciliation.
- `CollectionItem` lifecycle (`source`, `status`, `removed_at`) and the new
  `CollectionItemDuplicate` entity, per the artifact changes already applied
  to `datamodel.md`/`ui.md` this run.
- Username-keyed collection dedup (`Collection (user_id, bgg_username)`
  unique constraint).
- Possible-duplicate review UI (confirm-merge / reject-distinct), scoped to
  the confirming user's own `PoolGame`/`Comparison` references only.
- Feedback F001–F003: pairwise ranking view's "x" should move a game to a
  collapsible "unranked" section instead of deleting it; games start
  unranked and only appear ranked once they have a rating; a
  visually-distinct "trash" button in the unranked section is the only
  control that removes a game from the list's pool entirely.

**Out of scope:**
- The title-matching heuristic's actual similarity algorithm/threshold
  (left `[OPEN]` in `datamodel.md`, tunable during implementation).
- Global/catalogue-wide `Game` row merging (explicitly rejected in favor of
  a per-user-scoped merge — see research and the applied artifact changes).
- Free-text/unlinked collection items (resolved: all local adds go through
  `bgg-game-search-import` and always carry a real `bgg_id`).
- The other two backlogged features (`bgg-cover-art-and-card-view`,
  `pool-completion-celebration`) — untouched by this plan.

## Technical Approach

Builds on the `Collection`/`CollectionItem` shapes already in `datamodel.md`.
`CollectionItem.source` distinguishes BGG-sourced rows from locally-added
ones; `status` (`active`/`removed`/`pending_delete`) replaces the originally-proposed
raw `removed_at`/`deleted_at` timestamp pair with a single enum (per research
finding — self-documents legal transitions). Resync reconciliation is a
diff between the freshly-pulled BGG membership and current `CollectionItem`
rows, keyed by `bgg_id`: pulled-and-currently-`removed` → `pending_delete`;
`local_add` rows whose title fuzzy-matches a newly-pulled game (different
`bgg_id`) → a new `CollectionItemDuplicate` row for user review. Per
constitution Principle XI, the new fields/table/constraint ship as a
migration, not a hand-edit.

For the pairwise-ranking feedback (F001–F003): "ranked" vs. "unranked" is
derived from whether a pool game has at least one `Comparison` in the list
(Principle XII — order/state derived, not separately authored) plus a new
per-pool-game exclusion flag for the "x" action (a game can have comparison
history and still be manually pulled back out of the active ranking without
losing that history). The "trash" action in the unranked section is the only
path that deletes the underlying `PoolGame` row.

## Phase Breakdown

### Phase 1 — Data model migration
- [ ] T001 [artifacts: datamodel] Write a migration adding: `Collection`
  unique `(user_id, bgg_username)`; `CollectionItem.source` enum
  (`bgg_import`/`local_add`, backfilled `bgg_import` for existing rows);
  `CollectionItem.status` enum (`active`/`removed`/`pending_delete`,
  backfilled `active`); `CollectionItem.removed_at` nullable timestamptz;
  new `CollectionItemDuplicate` table (`collection_item_id`,
  `candidate_game_id`, `status` enum `pending`/`confirmed_same`/`rejected_distinct`,
  `created_at`). Write a migration test verifying the unique constraint
  rejects a duplicate `(user_id, bgg_username)` insert and that backfilled
  rows land in the expected default state.

### Phase 2 — Collection edit backend
- [ ] T002 [artifacts: datamodel] [parallel] Add a soft-delete endpoint/action:
  sets `CollectionItem.status = removed`, `removed_at = now()`. Test: an
  active item becomes `removed` and is excluded from the default active-item
  query.
- [ ] T003 [artifacts: datamodel] [parallel] Add an undo endpoint/action:
  `removed`/`pending_delete` → `active`, clears `removed_at`. Test: undo
  restores an item to the active list.
- [ ] T004 [artifacts: datamodel] [parallel] Add a confirm-hard-delete
  endpoint/action, only valid from `pending_delete`: physically deletes the
  `CollectionItem` row. Test: a `pending_delete` item can be confirmed and
  is gone; an `active` or `removed` item cannot be hard-deleted directly.
- [ ] T005 [artifacts: datamodel] Extend the collection add flow to reuse
  `bgg-game-search-import` and stamp new rows `source = local_add`. Test:
  an item added this way has `source = local_add` and a real `game_id`.

### Phase 3 — Re-pull / resync reconciliation
- [ ] T006 [artifacts: datamodel, infrastructure] Implement resync
  reconciliation: on re-pull, for each currently-`removed` `CollectionItem`
  whose `bgg_id` is absent from the freshly-pulled set, flip it to
  `pending_delete`. Test: a removed item missing from a simulated re-pull
  becomes `pending_delete`; a removed item still present in the pull stays
  `removed` (BGG re-adding it doesn't silently un-remove it).
- [ ] T007 [artifacts: datamodel] Implement the fuzzy-title match: for each
  `local_add` item, compare its title against newly-pulled games not already
  linked by `bgg_id`; on a match, create a `CollectionItemDuplicate` row
  (`status: pending`). Heuristic itself stays simple/placeholder per the
  `[OPEN]` in `datamodel.md` — exact-match-insensitive plus a basic
  edit-distance threshold is sufficient for v1. Test: a `local_add` item
  with a near-identical title to a pulled game produces a pending duplicate;
  an unrelated title does not.
- [ ] T008 [artifacts: datamodel] Implement confirm-merge and reject-distinct
  for a `CollectionItemDuplicate`: confirm repoints the confirming user's own
  `PoolGame`/`Comparison` rows referencing the `local_add` item's `game_id`
  to `candidate_game_id`, then deletes the now-redundant `CollectionItem`;
  reject sets `status = rejected_distinct` and leaves both items untouched.
  Test: confirm updates this user's `PoolGame` rows only (a second user's
  `PoolGame` referencing the same `game_id` is unaffected); reject leaves
  both `CollectionItem` rows intact.

### Phase 4 — Collection management UI
- [ ] T009 [artifacts: ui] [parallel] Build the Collection management view:
  active items list + collapsible Removed section (`removed`/`pending_delete`
  items), each Removed item showing an undo control and, for
  `pending_delete` items, a confirm-hard-delete control.
- [ ] T010 [artifacts: ui] [parallel] Wire the add-to-collection flow through
  the existing BGG search-import UI (reuse, don't duplicate, per Principle IX).
- [ ] T011 [artifacts: ui] Wire a re-pull/resync action that triggers T006–T007
  and, when it produces any `CollectionItemDuplicate` rows, surfaces the
  possible-duplicates review step (confirm-merge / reject-distinct per T008).

### Phase 5 — Pairwise ranking view: unranked/ranked split (feedback F001–F003)
- [ ] T012 [artifacts: datamodel] Add `PoolGame.excluded_from_ranking`
  boolean (default `false`) via migration — lets a game be manually pulled
  out of a list's active ranking without losing its `Comparison` history
  (distinct from having zero comparisons). [feedback: F002]
- [ ] T013 [artifacts: ui] Split the pairwise ranking view into a **Ranked**
  section (pool games with ≥1 `Comparison` in this list and
  `excluded_from_ranking = false`) and a collapsible **Unranked** section
  (everything else); a game starts in Unranked until its first comparison.
  [feedback: F002]
- [ ] T014 [artifacts: ui] Change the ranked-section "x" to set
  `excluded_from_ranking = true` (moves the game to Unranked, keeps its
  `PoolGame`/`Comparison` rows intact) instead of deleting it from the pool.
  [feedback: F001]
- [ ] T015 [artifacts: ui] Add a visually-distinct "trash" control to the
  Unranked section that hard-deletes the `PoolGame` row (removes the game
  from the list's pool entirely — affects every list built from that pool).
  [feedback: F003]

## Complexity Tracking

| Deviation | Justification |
|---|---|
| New `CollectionItemDuplicate` entity + status enum (rather than a simpler flag on `CollectionItem`) | The relation is between two distinct `Game` rows (the local add and the newly-pulled candidate), not a property of one row — a flag can't express "which game it might be." Kept minimal: no separate matching-service abstraction, just a table + a v1 heuristic. |
| `CollectionItem.status` enum instead of the originally-requested two raw timestamps | Collapses an implicit 4-state lifecycle into a self-documenting type (constitution Principle XIII) rather than duplicating that logic as an ad hoc `removed_at IS NOT NULL AND deleted_at IS NOT NULL` check at every call site. |
| New `PoolGame.excluded_from_ranking` flag (Phase 5) | Needed to distinguish "never compared" from "manually pulled out after having comparison history" — both must independently land a game in the Unranked section, but only the latter needs to survive a re-inclusion later. |

## Open Questions

- Title-matching heuristic specifics (T007) — left as a v1 placeholder
  (case-insensitive exact + basic edit distance); revisit with real usage
  per `datamodel.md`'s `[OPEN: ...]`.
- Is there a UI action to move a game *back* from Unranked to Ranked without
  it going through a new comparison (i.e. undo the "x")? Feedback didn't
  ask for one explicitly — T014 only covers x → Unranked. Recommend
  resolving during T013/T014 implementation rather than blocking planning;
  the simplest default (no explicit undo — re-inclusion happens by clearing
  `excluded_from_ranking` via the same control, toggled) is a reasonable v1.
- Whether the resync reconciliation (T006–T008) runs synchronously in the
  request or via the existing Cloud Tasks worker path (`infrastructure.md`)
  — likely the same async pattern as initial import, to be confirmed during
  implementation rather than re-litigated here.

## Production Annotation Summary

- `datamodel.md`'s "No soft-delete / audit history" annotation is narrowed
  by this plan to state the `CollectionItem` exception (already applied to
  the artifact this run) — no new shortcut introduced, an existing one
  scoped more precisely.
