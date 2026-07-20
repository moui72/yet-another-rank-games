---
name: datamodel
status: stable
last_updated: 2026-07-20
diagram_type: erDiagram
render_section: Datamodel
diagram_status: stale
---

# Data Model

## Overview

Canonical, relational schema (PostgreSQL on Supabase). The source of truth for
game facts is Board Game Geek, imported and cached locally (see
`infrastructure.md`); the source of truth for *rankings* is the user's own
pairwise/manual judgments captured here. Games are stored **once, globally**
(keyed by BGG id) and referenced by many users' collections, rather than
duplicated per user. The `Game` catalogue is refreshed on a **time-to-live**
(`Game.last_fetched_at` is the cache clock; null = never enriched, treated as
stale), while collection *membership* is refreshed on user request — see the
freshness model in `infrastructure.md`.

The hierarchy is **Collection → Pool → List**. A user has one or more
**collections** (imported from BGG — the raw owned/rated set). From those a user
builds **pools**: reusable, named, hand-curated groups of games. A pool is
populated by applying a **filter** to bulk-add matching games from a collection,
plus individual add/remove; a pool may include catalogue games beyond any
collection. Each pool then feeds one or more **lists** — a list is a *ranking*
over a pool's games, so several lists can rank the same pool differently. A
list's order is produced by **comparisons** (pairwise judgments) and/or manual
reordering.

Pools are **user-owned and collection-agnostic** (`Pool → User`), so a pool can
mix games across collections and the catalogue. The filter is a *build tool*
(the user picks a collection to filter from); it is not stored on the pool —
the pool is defined by its `PoolGame` rows, not a query. Editing a pool affects
every list built from it: ranking always operates over the pool's **current**
games and ignores comparisons that reference a game no longer in the pool.

**Order is derived, not authored** — *for the primary pairwise mode* (decided
from `.project/plans/research-pairwise-ranking-algorithm-2026-07-10.md`;
resolves the former `ListEntry` open question). This is a property of a mode,
not of the product: constitution v2.2.0 establishes that a ranking mode
declares its own priorities, and the planned `efficient-ordering-mode` will
treat authored drag-and-drop overrides as first-class latest-wins edges rather
than as approximations to be absorbed by a rating model (see
`.project/plans/research-efficient-durable-secondary-ranking-mode-2026-07-20-d22b.md`).
For a pairwise list the **`Comparison` graph is the source of truth**: per-game rating estimates `(mu, sigma)` are computed
from the comparison log via a Bradley–Terry/Weng–Lin model (`openskill`), and
the ordering is those ratings sorted by a conservative score. `ListEntry` is a
**derived snapshot** — recomputed after each comparison and persisted for fast
render/export, but always reconstructible by replaying comparisons. A pairwise
list therefore has a complete current ordering at any number of comparisons
(native stop-early/resume). The rating estimates themselves are
transient/derived and need not be a persisted table.

### Constraint-graph derivation (`efficient` mode)

The `efficient` ranking mode reads the **same `Comparison` rows** but derives
order differently, trading the primary mode's novelty-preferring matchup
selection for convergence speed and exact honouring of manual overrides
(constitution v2.2.0 Principle III; design settled by
`.project/plans/research-efficient-durable-secondary-ranking-mode-2026-07-20-d22b.md`).

- **Edges.** The existing unique `(list_id, game_a, game_b)` upsert already
  makes the current row for a pair the *current* judgment about that pair.
  That latest-write-wins behaviour **is** the recency mechanism — no weighting
  scheme is needed, because an override literally replaces the prior judgment
  rather than being averaged against it.
- **Order.** Deterministic topological sort of that edge set. Games left
  incomparable by the edges are tie-broken by their openskill rating, so the
  rating survives in this mode as a *prior*, not as the authority. Cycles are
  possible (edges are per-pair with no transitivity guarantee) and are broken
  by dropping the **oldest** edge in the cycle until acyclic — recency wins,
  matching the durability contract.
- **Selection.** Resumable binary insertion: pick the next unplaced game and
  binary-search it into the current derived order, consulting the edge set
  before asking so already-known pairs are used silently. No sort state is
  persisted, so resuming costs at most ~log₂n repeated asks. Roughly
  ⌈log₂(n!)⌉ comparisons — 237 for 50 games, about 4× fewer than the rating
  model needs to reach the same confidence.
- **Overrides.** Dropping a game across k positions upserts k rows (one per
  crossed game) in a single batched write. Because derivation respects the
  constraints, the drop lands exactly where dropped regardless of how much
  older evidence it contradicts. Move-up/move-down is the k=1 case.

`ListEntry` remains a derived snapshot in this mode — recomputed from the
constraint derivation rather than from ratings. It is never authored directly;
the `manual` mode that did author it was retired (see Production Annotations).

## Entities

### User

Backed by Supabase Auth; the app row references the auth user id.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | = Supabase Auth user id |
| bgg_username | string | default BGG username to import from (nullable) |
| show_cover_art | boolean | default `true`; the no-images preference (feature `bgg-cover-art-and-card-view`) — when `false`, card views and the pairwise comparison cards fall back to a compact text-only layout and no cover-art images are requested (the actual network-savings mechanism, not just a CSS hide) |
| created_at | timestamptz | |

### Game

One row per distinct BGG game, shared across all users.

| Field | Type | Notes |
|-------|------|-------|
| id | bigint | internal id |
| bgg_id | integer | unique; BGG's game id |
| name | string | primary name |
| year_published | integer | nullable |
| weight | numeric | BGG "average weight," ~1.0–5.0, nullable |
| min_players | integer | nullable |
| max_players | integer | nullable |
| playing_time | integer | minutes, nullable |
| thumbnail_url | string | nullable; BGG's small `<thumbnail>` image |
| image_url | string | nullable; BGG's full-size `<image>` — the cover art shown in card views and pairwise comparison cards (feature `bgg-cover-art-and-card-view`); falls back to `thumbnail_url`, then a placeholder, when absent |
| mechanics | text[] | for filtering (e.g. "Cooperative Game") |
| categories | text[] | for filtering |
| is_expansion | boolean | true for BGG `boardgameexpansion` items; drives the `expansions` pool filter |
| last_fetched_at | timestamptz | cache clock: when `thing` details were last pulled; null = minimal/never-enriched (treated as stale) |

### Collection

A user's imported BGG collection.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| user_id | uuid | → User |
| bgg_username | string | the BGG account imported from |
| last_synced_at | timestamptz | last successful import; nullable until first import |
| import_status | enum | `idle` \| `importing` \| `complete` \| `failed`; import lifecycle |
| import_error | string | failure message when `import_status = failed` (app-side dead-letter); nullable |
| created_at | timestamptz | |
| — | — | unique `(user_id, bgg_username)` — a user can't import the same BGG username twice |

### CollectionItem

Join of Collection ↔ Game, plus BGG collection-specific facts. A collection is a
**one-way sync from BGG**, but items can be edited locally (feature
`collection-editing-and-resync`); `source`/`status` track that editing layer so a
later re-pull can reconcile rather than silently overwrite local changes. This
lifecycle applies to `CollectionItem` only — `Game` rows stay global/shared and
are never soft- or hard-deleted by this feature (see Production Annotations).

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| collection_id | uuid | → Collection |
| game_id | bigint | → Game |
| owned | boolean | from BGG collection status |
| user_rating | numeric | the user's BGG rating, nullable |
| num_plays | integer | nullable |
| source | enum | `bgg_import` \| `local_add`; provenance. Only `local_add` items are candidates for the re-pull fuzzy-match reconciliation below — a `bgg_import` item is matched by `game_id`/`bgg_id` directly. `local_add` items are always added via BGG search-import (feature `bgg-game-search-import`), so they always carry a definite `game_id` — never a free-text/unlinked placeholder. |
| status | enum | `active` \| `removed` \| `pending_delete`; the local edit lifecycle. `active` is normal. `removed`: user soft-deleted it (undoable back to `active`); the item is still visible in a "Removed" view. `pending_delete`: was `removed` **and** the next re-pull confirmed it's no longer present in the source collection — the user can confirm to hard-delete the row, or undo back to `active`. |
| removed_at | timestamptz | nullable; when the item entered `removed` (for display, e.g. "removed 3 days ago") |

### CollectionItemDuplicate

Records a possible duplicate surfaced by a collection re-pull: a `local_add`
`CollectionItem` whose title fuzzy-matches a newly-pulled game under a
different `bgg_id` (e.g. a reprint/alternate edition entered as a distinct BGG
game). Confirming a match is **scoped to the confirming user only** — it
repoints that user's own `PoolGame`/`Comparison` rows that reference the
`local_add` item's game to `candidate_game_id`, and removes the now-redundant
`CollectionItem`. It never merges the shared `Game` catalogue rows themselves
and never touches any other user's data.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| collection_item_id | uuid | → CollectionItem (the `local_add` item) |
| candidate_game_id | bigint | → Game (the newly-pulled game the title matched) |
| status | enum | `pending` \| `confirmed_same` \| `rejected_distinct` |
| created_at | timestamptz | |

**Matching heuristic (v1, implemented):** case-insensitive exact match, plus
an edit-distance threshold over normalized titles (see
`src/lib/domain/duplicateMatch.ts`). No edition/subtitle-specific
normalization beyond that yet — revisit with real usage if it proves too
loose or too strict.

### Pool

A reusable, user-owned, curated group of games (the eligible set a list ranks).

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| user_id | uuid | → User |
| name | string | e.g. "Co-op games" |
| description | string | nullable |
| created_at | timestamptz | |

### PoolGame

Membership of the pool — the explicit, editable set of eligible games.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| pool_id | uuid | → Pool |
| game_id | bigint | → Game |
| excluded_from_ranking | boolean | default `false`; lets a game be manually pulled out of a list's active ranking (the pairwise view's "x") without losing its `Comparison` history — distinct from simply having zero comparisons yet (feedback F001–F003) |
| — | — | unique `(pool_id, game_id)` |

### List

A named ranking over a pool's games. Many lists can rank the same pool.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| pool_id | uuid | → Pool (the source set of games) |
| user_id | uuid | → User (denormalized for ownership checks) |
| name | string | e.g. "Top 10 Co-op" |
| description | string | nullable |
| ranking_method | enum | `pairwise` \| `efficient` \| `tier`. `pairwise` = rating-model derivation with novelty-preferring matchups (the primary, "fun" mode); `efficient` = constraint-graph derivation with binary-insertion selection and exact drag-and-drop overrides (see above). Fixed at list creation — a list does not switch modes, since the same rows under a different derivation would silently reorder it. `tier` deferred. The former `manual` value was retired (see Production Annotations). |
| status | enum | `in_progress` \| `complete` |
| created_at | timestamptz | |

### Comparison

A single pairwise judgment within a list. For a pairwise list, the set of
`Comparison` rows is the **source of truth** for the list's ordering (ratings and
`ListEntry` are derived from it); `created_at` gives the replay order and
supports undo.

**Recording a comparison is an upsert, keyed on the unordered pair** — a
double-submit (double click, network retry, replayed request) for a pair
already judged in this list overwrites the existing row's `winner_id` and
`created_at` rather than inserting a second row, so it can never silently
double-weight a judgment in the `openskill` rating update. Because `game_a`
and `game_b` don't have a fixed "first/second" meaning between two
comparisons of the same pair, `game_a`/`game_b` are stored **canonically
ordered** (lower `game_id` in `game_a`) so the same pair always upserts the
same row regardless of which game was shown on which side.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| list_id | uuid | → List |
| game_a | bigint | → Game; canonically the lower `game_id` of the pair |
| game_b | bigint | → Game; canonically the higher `game_id` of the pair |
| winner_id | bigint | → Game (game_a or game_b) |
| created_at | timestamptz | ordering/undo; updated on upsert |
| — | — | unique `(list_id, game_a, game_b)` — enforces the upsert-not-duplicate guarantee above |

### ListEntry

The list's ordering — always a **derived snapshot**, never authored, under
either mode. For a **pairwise** list it is recomputed from the `Comparison`
graph via the rating model after each comparison; for an **efficient** list it
is recomputed from the same rows via the constraint-graph derivation described
in the Overview. In both cases the comparisons are the source of truth, not
this row. (The retired `manual` mode was the one exception — it authored
positions directly; see Production Annotations.)

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| list_id | uuid | → List |
| game_id | bigint | → Game |
| position | integer | rank within the list |
| score | numeric | nullable; the conservative rating score (e.g. `mu − k·sigma`) the snapshot was sorted by. Populated for **pairwise** lists (the rating model produces it); **null for efficient** lists, whose order comes from the constraint graph rather than a per-game score |

## Pool filter (build tool)

The filter is not persisted on any entity — it is the **build tool** the pool
editor uses to bulk-add matching games from a chosen collection (games not
matching can still be added/removed by hand). It is a **conjunction (AND)** of
optional, typed predicates over a game's fields; an omitted key means "no
constraint on that dimension," so `{}` matches the whole collection. Version 1:

```jsonc
{
  "mechanics":      { "include": ["Cooperative Game"], "exclude": [] },
  "categories":     { "include": [], "exclude": [] },
  "weight":         { "min": 3.0, "max": 5.0 },      // BGG average weight
  "player_count":   { "supports": 4 },                // min_players <= 4 <= max_players
  "playing_time":   { "min": null, "max": 60 },       // minutes
  "year_published": { "min": null, "max": null },
  "owned_only":     true,                             // restrict to CollectionItem.owned
  "expansions":     "exclude"                         // "exclude" = base games only; "only" = expansions/promos only; omit = both
}
```

- `mechanics`/`categories`: `include` requires the game to have **all** listed
  values (AND semantics — decided for v1); `exclude` removes games having any
  listed value.
- Range predicates (`weight`, `playing_time`, `year_published`) accept `min`
  and/or `max`, either nullable = open-ended on that side.
- `player_count.supports = N` keeps games whose `[min_players, max_players]`
  range includes N.
- `expansions` is a tri-state over `Game.is_expansion` (true for BGG
  `boardgameexpansion` items): `"exclude"` keeps only base games, `"only"`
  keeps only expansions/promos, and omitting the key keeps both.
- The list's displayed size (e.g. "top 10") is a presentation concern, not a
  filter predicate — the filter selects the candidate set; the ranking picks the
  order.

The filter is validated against a shared typed schema (Principle II, Type-Safety
End to End; Principle XI, Code Organization Discipline's named-types rule)
before it's used to match games, so an unknown or malformed key is rejected
rather than silently ignored.

## Normalization Rules

- **BGG id is the canonical game key.** `bgg_id` is unique on `Game`; an import
  upserts by `bgg_id` so the same game shared across users is one row. A `Game`
  row may be created two ways — collection import, or **direct BGG search
  import** (feature `bgg-game-search-import`, the pool builder adding a game in
  no one's collection) — both upsert by `bgg_id` into the same shared catalogue.
- **Weight** stored as numeric on BGG's ~1.0–5.0 scale; missing → null, never 0.
- **Mechanics / categories** parsed from BGG XML into normalized string arrays;
  used for list filters.
- **Missing/partial BGG fields** are stored as null rather than fabricated
  defaults; the import tolerates BGG's occasionally malformed/partial XML.
- **Player count / playing time** stored as integers (minutes for time); null
  when BGG omits them.

## Indexes

- `Game.bgg_id` — unique (import upsert, lookups).
- `CollectionItem (collection_id, game_id)` — unique; index on `collection_id`
  for listing a collection.
- `CollectionItem.status` — filtering the active/removed/pending-delete views.
- `CollectionItemDuplicate.collection_item_id` — looking up a `local_add`
  item's pending duplicate, if any.
- `Comparison.list_id` — comparisons are read/written per list constantly by the
  ranking algorithm.
- `Comparison (list_id, game_a, game_b)` — unique; enforces the upsert-not-duplicate
  guarantee above (see the Comparison entity note on canonical pair ordering).
- `ListEntry (list_id, position)` — rendering a list in order.
- `ListEntry (list_id, game_id)` — unique; a game has at most one entry in a list's ordering.
- `Pool.user_id` — listing a user's pools.
- `PoolGame (pool_id, game_id)` — unique; index on `pool_id` for reading a pool.
- `List.pool_id` and `List.user_id` — listing a pool's / user's lists.

## Production Annotations

- **`ranking_method = 'manual'` retired**: the authored-drag-order mode was
  removed from list creation, and on 2026-07-20 a query confirmed **zero rows
  used it in either staging or production**, so its retirement needs no data
  migration — the enum value, the authored-`ListEntry` semantics, the
  `ManualRanker` component, and the `mode === 'manual'` read path are deleted
  outright. This also removes the dual-source-of-truth hazard `ListEntry`
  carried while `manual` existed: it is now always derived, under either
  remaining mode's derivation. Drag-and-drop itself is *not* retired — it
  returns in `efficient` mode, where a drop is an authoritative constraint
  rather than an authored position.
- **Ownership enforced in app code (RLS off)**: `List.user_id` is denormalized
  so the app/worker can enforce per-user ownership without extra joins. Row-Level
  Security is deliberately off (see `infrastructure.md`), so there is no
  database-level backstop — a hardened production posture would enable RLS as
  defense-in-depth.
- **Pool filter UI expected to be reworked**: the filter's `include`/`exclude`
  checkbox-style predicate shape (this document's Pool filter section) is a v1
  placeholder, not the final UX — a rework is planned, at which point the
  `include`/`exclude` semantics (currently AND for `include`) may be revisited
  alongside it.
- **No soft-delete / audit history, except `CollectionItem`**: all other
  entities are hard-deleted and comparison history is not versioned beyond
  `created_at` — a production system handling valuable user data might add
  soft-deletes and an audit trail more broadly. `CollectionItem` is the one
  deliberate exception (feature `collection-editing-and-resync`): its
  `removed`/`pending_delete` lifecycle exists specifically so a BGG re-pull can
  reconcile local edits instead of silently overwriting them, not as a general
  audit-trail policy.
