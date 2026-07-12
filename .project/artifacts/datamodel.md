---
name: datamodel
status: stable
last_updated: 2026-07-11
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

**Order is derived, not authored** (decided from
`.project/plans/research-pairwise-ranking-algorithm-2026-07-10.md`; resolves the
former `ListEntry` open question). For a pairwise list the **`Comparison` graph
is the source of truth**: per-game rating estimates `(mu, sigma)` are computed
from the comparison log via a Bradley–Terry/Weng–Lin model (`openskill`), and
the ordering is those ratings sorted by a conservative score. `ListEntry` is a
**derived snapshot** — recomputed after each comparison and persisted for fast
render/export, but always reconstructible by replaying comparisons. A pairwise
list therefore has a complete current ordering at any number of comparisons
(native stop-early/resume). For a `manual` list the user's drag order is authored
directly into `ListEntry` (there the snapshot *is* the source of truth for
order). The rating estimates themselves are transient/derived and need not be a
persisted table.

## Entities

### User

Backed by Supabase Auth; the app row references the auth user id.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | = Supabase Auth user id |
| bgg_username | string | default BGG username to import from (nullable) |
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
| thumbnail_url | string | nullable |
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

### CollectionItem

Join of Collection ↔ Game, plus BGG collection-specific facts.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| collection_id | uuid | → Collection |
| game_id | bigint | → Game |
| owned | boolean | from BGG collection status |
| user_rating | numeric | the user's BGG rating, nullable |
| num_plays | integer | nullable |

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
| ranking_method | enum | `pairwise` \| `manual` \| `tier` (tier deferred) |
| status | enum | `in_progress` \| `complete` |
| created_at | timestamptz | |

### Comparison

A single pairwise judgment within a list. For a pairwise list, the set of
`Comparison` rows is the **source of truth** for the list's ordering (ratings and
`ListEntry` are derived from it); `created_at` gives the replay order and
supports undo.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| list_id | uuid | → List |
| game_a | bigint | → Game |
| game_b | bigint | → Game |
| winner_id | bigint | → Game (game_a or game_b) |
| created_at | timestamptz | ordering/undo |

### ListEntry

The list's ordering. For a **pairwise** list this is a **derived snapshot**
recomputed from the `Comparison` graph after each comparison (source of truth is
the comparisons, not this row); for a **manual** list it is authored directly by
drag-to-order. Also carries tiers if/when tiering ships.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| list_id | uuid | → List |
| game_id | bigint | → Game |
| position | integer | rank within the list |
| score | numeric | nullable; conservative rating score (e.g. `mu − k·sigma`) the snapshot was sorted by; null for manual lists |
| tier | string | nullable; for the future tiering feature |

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

- `mechanics`/`categories`: `include` requires the game to have all listed
  values (or, if that proves too strict in use, any — a tuning decision left to
  implementation); `exclude` removes games having any listed value.
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

The filter is validated against a shared typed schema (Principle II, XIII)
before it's used to match games, so an unknown or malformed key is rejected
rather than silently ignored.

## Normalization Rules

- **BGG id is the canonical game key.** `bgg_id` is unique on `Game`; an import
  upserts by `bgg_id` so the same game shared across users is one row.
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
- `Comparison.list_id` — comparisons are read/written per list constantly by the
  ranking algorithm.
- `ListEntry (list_id, position)` — rendering a list in order.
- `Pool.user_id` — listing a user's pools.
- `PoolGame (pool_id, game_id)` — unique; index on `pool_id` for reading a pool.
- `List.pool_id` and `List.user_id` — listing a pool's / user's lists.

## Production Annotations

- **Ownership enforced in app code (RLS off)**: `List.user_id` is denormalized
  so the app/worker can enforce per-user ownership without extra joins. Row-Level
  Security is deliberately off (see `infrastructure.md`), so there is no
  database-level backstop — a hardened production posture would enable RLS as
  defense-in-depth.
- **No soft-delete / audit history**: entities are hard-deleted and comparison
  history is not versioned beyond `created_at` — a production system handling
  valuable user data might add soft-deletes and an audit trail.
