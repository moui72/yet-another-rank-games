---
name: datamodel
status: stable
last_updated: 2026-07-10
diagram_status: unrendered
---

# Data Model

## Overview

Canonical, relational schema (PostgreSQL on Supabase). The source of truth for
game facts is Board Game Geek, imported and cached locally (see
`infrastructure.md`); the source of truth for *rankings* is the user's own
pairwise/manual judgments captured here. Games are stored **once, globally**
(keyed by BGG id) and referenced by many users' collections, rather than
duplicated per user.

A user has one or more **collections** (imported from BGG). A collection feeds
many **lists**, each a filtered, ordered subset. A list's order is produced by
**comparisons** (pairwise judgments) and/or manual reordering.

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
| last_fetched_at | timestamptz | when BGG data was last pulled |

### Collection

A user's imported BGG collection.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| user_id | uuid | → User |
| bgg_username | string | the BGG account imported from |
| last_synced_at | timestamptz | last successful import; nullable until first import |
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

### List

A named, filtered, ordered subset of a collection.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| collection_id | uuid | → Collection |
| user_id | uuid | → User (denormalized for ownership checks) |
| name | string | e.g. "Top 10 Co-op" |
| description | string | nullable |
| filter | jsonb | criteria selecting games from the collection; schema below |
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
| game_a_id | bigint | → Game |
| game_b_id | bigint | → Game |
| winner_id | bigint | → Game (game_a_id or game_b_id) |
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

## List filter schema

`List.filter` is a jsonb object: a **conjunction (AND)** of optional, typed
predicates over a game's fields. An omitted key means "no constraint on that
dimension," so `{}` selects the whole collection. Version 1:

```jsonc
{
  "mechanics":      { "include": ["Cooperative Game"], "exclude": [] },
  "categories":     { "include": [], "exclude": [] },
  "weight":         { "min": 3.0, "max": 5.0 },      // BGG average weight
  "player_count":   { "supports": 4 },                // min_players <= 4 <= max_players
  "playing_time":   { "min": null, "max": 60 },       // minutes
  "year_published": { "min": null, "max": null },
  "owned_only":     true                              // restrict to CollectionItem.owned
}
```

- `mechanics`/`categories`: `include` requires the game to have all listed
  values (or, if that proves too strict in use, any — a tuning decision left to
  implementation); `exclude` removes games having any listed value.
- Range predicates (`weight`, `playing_time`, `year_published`) accept `min`
  and/or `max`, either nullable = open-ended on that side.
- `player_count.supports = N` keeps games whose `[min_players, max_players]`
  range includes N.
- The list's displayed size (e.g. "top 10") is a presentation concern, not a
  filter predicate — the filter selects the candidate set; the ranking picks the
  order.

The stored `filter` is validated against a shared typed schema (Principle II,
XIII) on write, so an unknown or malformed key is rejected rather than silently
ignored.

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
- `List.collection_id` and `List.user_id` — listing a user's/collection's lists.

## Production Annotations

- **Ownership enforced in app code (RLS off)**: `List.user_id` is denormalized
  so the app/worker can enforce per-user ownership without extra joins. Row-Level
  Security is deliberately off (see `infrastructure.md`), so there is no
  database-level backstop — a hardened production posture would enable RLS as
  defense-in-depth.
- **No soft-delete / audit history**: entities are hard-deleted and comparison
  history is not versioned beyond `created_at` — a production system handling
  valuable user data might add soft-deletes and an audit trail.
