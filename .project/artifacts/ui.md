---
name: ui
status: draft
last_updated: 2026-07-14
diagram_type: graph TD
render_section: UI
diagram_status: stale
---

# UI

## Overview

A **SvelteKit** (Svelte 5 / runes) web app, TypeScript end to end. The target
user is a board game hobbyist who tracks a collection on BGG and wants to turn
it into ranked lists. The experience is the product (constitution Principle
III): the ranking flow must feel fun, fast, and low-friction.

Core user journey: **connect a BGG account → import a collection → build a pool
(filter + hand-edit) → create a list from the pool → rank it (pairwise,
primarily) → view/export the result.**

Heavy comparison state lives in **one reactive store per runtime**
(constitution Principle XII), not threaded between components by reference.

## Collection import & management view

- User enters/confirms a BGG username and triggers an import.
- Import is asynchronous (Cloud Tasks + worker; see `infrastructure.md`), so
  this view shows **live progress**, not a frozen spinner: queued → fetching →
  processing → done, with a clear failure state if BGG gives up.
- Re-import is explicit and user-initiated (data is cached otherwise). A given
  BGG username can only be imported once per user — re-importing the same
  username **re-pulls into the existing `Collection`** (see resync below)
  rather than creating a second one.

### Collection editing & resync (feature `collection-editing-and-resync`)

Unlike the pool builder's hand-edit (which is per-pool and
collection-agnostic — see `datamodel.md`), editing here is a curation layer
**upstream** of every pool built from this collection: e.g. "I no longer own
this expansion" should stop it being offered by every pool filter over this
collection, which a per-pool edit can't express since it only affects one pool.

- **View:** active items, plus a collapsible **"Removed"** section for items
  in `removed`/`pending_delete` status.
- **Remove** an active item: soft-delete (`status → removed`). Reversible —
  the Removed section offers an **undo** back to `active`.
- **Add** an item: same BGG search-import flow as the pool builder
  (`bgg-game-search-import`) — every locally-added item always has a real
  `bgg_id`/`Game` row, never a free-text placeholder.
- **Re-pull / resync:** re-fetches the collection from BGG and reconciles:
  - A `removed` item no longer present in the pulled collection additionally
    becomes `pending_delete` — the Removed section then offers **confirm
    (hard-delete)** alongside undo.
  - A `local_add` item whose title fuzzy-matches a newly-pulled game under a
    different `bgg_id` produces a `CollectionItemDuplicate` (see
    `datamodel.md`); the resync surfaces a **possible-duplicates review**
    step: for each, **confirm merge** (repoints this user's own pool/list
    references to the pulled game and drops the local duplicate) or **reject,
    keep distinct**.

## Pool builder view

A **pool** is a reusable, curated group of games that lists rank (see
`datamodel.md`). Building a pool is the step between importing and ranking.

- Create a pool: name + optional description.
- **Bulk-add by filter:** pick a collection and apply a **filter** (mechanic —
  e.g. co-op, weight range, player count, playing time, owned-only, and an
  expansions/promos toggle — include both, base games only, or expansions
  only) to add all matching games at once. See the filter predicate list in
  `datamodel.md`.
- **Hand-edit:** remove individual games, and add individual games from the
  catalogue (games already imported by any user).
- **Search BGG to add a game not yet in the catalogue** (feature
  `bgg-game-search-import`): type a name, pick from BGG's search results, and
  the chosen game is imported into the catalogue and added to the pool — so a
  pool can include any BGG game, not just ones already in some collection. The
  search runs against BGG's `search` endpoint and enriches the pick via the
  `thing` endpoint (see `infrastructure.md`); it uses the same `BGG_API_TOKEN`.
  States: idle (prompt), searching (in progress), results list, no-results, and
  an error state if BGG is unavailable.
- See the pool's current games and its size.
- Pools are reusable: the same pool can feed several lists.

### Card view (feature `bgg-cover-art-and-card-view`)

An alternative to the pool builder's default list view — a grid of cards
showing each game's cover art (`Game.image_url`, falling back to
`thumbnail_url`, then a placeholder if neither exists) alongside name, weight,
and player count. A view-level toggle switches between list and card view; the
list view stays the default. **Grid (implemented):** 2 columns on small
screens, 3 at `sm`, 4 at `md` and up.

## List management view

- Create a list **from a pool**: choose a pool, name, optional description, and
  ranking method (pairwise / manual).
- See a pool's lists, and a user's lists, with status (in progress / complete).
- Many lists can rank the same pool differently.

## Pairwise ranking view (primary, "fun" UI)

- Shows **two games** and asks which is better; the choice records a
  `Comparison` and advances to the next matchup.
- **Novelty-preferring matchup selection** (Principle III): minimize showing
  the same game repeatedly — favor novel pairings, and only scatter in
  repetitions when the algorithm needs a comparison it can't otherwise resolve,
  or when no novel pairing remains.
- Keyboard-operable (choose left/right, undo) for speed and accessibility.
- Progress indication toward a resolved ordering; the user can stop early and
  resume later (an incomplete ranking is valid and persisted).
- **Comparison cards show cover art** (feature `bgg-cover-art-and-card-view`):
  each card displays `Game.image_url` (same fallback chain as the card view —
  `thumbnail_url`, then a placeholder) alongside the name.
- **"Show cover art" toggle**: a view-level toggle (present here and in the
  pool builder's card view — see above) that persists to
  `User.show_cover_art`; when off, no images are shown or requested anywhere
  in the app, for users minimizing network usage. There is no separate
  settings page for this — the toggle lives inline wherever images appear.
- **Completion celebration** (feature `pool-completion-celebration`): when
  every pair among the currently-active (non-excluded) games has been judged
  at least once — the coverage signal below reaching `N == M` — the view
  plays a one-time confetti animation and hides the comparison controls
  (choose left/right, undo). The controls reappear automatically the moment
  the active game set changes in a way that creates a new unseen pair (a
  game added to the pool, un-excluded back into Ranked, etc.) — this
  naturally covers "a game is removed from the ranking" changing the active
  set, without a special-cased mechanism, consistent with "order is derived,
  not authored." This is entirely derived UI state from the existing
  `Comparison` log and `PoolGame.excluded_from_ranking` — no new persisted
  field.

### Ranking engine & matchup selection (decided)

Decided from `.project/plans/research-pairwise-ranking-algorithm-2026-07-10.md`.
The novelty constraint is fundamentally a constraint on the *access pattern*, so
a **rating model** is used rather than an interactive comparison sort (merge /
merge-insertion sort is rejected: its access pattern inherently reuses the same
game repeatedly, defeating the novelty goal, and it resumes poorly and tolerates
contradictory judgments poorly).

- **Ranking math:** a Bradley–Terry / Weng–Lin rating model via the **`openskill`**
  library (patent-free, TypeScript, commercial-use-safe; TrueSkill rejected on
  licensing). Each `Comparison` updates the two games' skill estimate `(mu,
  sigma)`; the current ranking is games sorted by a conservative score
  (e.g. `mu − k·sigma`). This yields a **complete current ranking at any number
  of comparisons**, so stop-early/resume is native and contradictory judgments
  lower confidence rather than corrupting the order.
- **Matchup selection (the piece we write):** a pure policy layer over current
  ratings + the set of already-compared pairs — restrict to pairs *not yet
  compared*, then prefer the most *informative* (closest ratings and/or highest
  combined `sigma`); permit a repeat only when no unseen pair remains or to
  resolve a persistent adjacent ambiguity. Optionally structured as Swiss-style
  rounds so novelty feels fair and progress is legible.
- **Progress / "done":** the view exposes a confidence/coverage signal (driven
  by aggregate `sigma` and/or unseen-pair count) so the user sees when it's
  "good enough" and can stop at any point.
- **Cold-start:** initial ratings may be seeded from the BGG
  `user_rating`/`num_plays` on `CollectionItem` so early comparisons refine a
  sensible order rather than starting flat.
- **State (Principle XII):** the reactive store holds the `Comparison` log
  (source of truth), a derived `Map<gameId, {mu, sigma}>`, and the current
  candidate pair — everything recomputable from the log. Order is **derived from
  the `Comparison` graph** (see `datamodel.md`), not authored directly.

Tuning decisions (settled while building; revisit with real usage):
- **Pair-selection scoring:** `informativeness = sigma_a + sigma_b − |mu_a −
  mu_b|` — prefer the most uncertain, closest-rated **unseen** pair; repeat only
  when every pair has been seen; deterministic tie-break by game id. No Swiss
  round structure for v1 (the greedy informative pick suffices).
- **"Done" is user-driven** with a **coverage signal**: the view shows
  "*N of M* matchups judged" (M = all pairs **among currently-active,
  non-excluded games** — implicit before the exclusion mechanism existed,
  now stated explicitly) and a complete current ranking at every step, so
  the user stops when satisfied. No forced completion or confidence
  threshold gate in v1 — reaching `N == M` triggers the completion
  celebration above, but never blocks further (repeat) comparisons.
- **Large sets:** no hard comparison budget or list-size cap in v1 — the
  novelty-preferring selector concentrates effort on informative pairs and the
  top stabilizes early, so the user simply stops when the order looks right.
  Steering very large pools toward drag-to-order/tiering is a later enhancement.
- **Intransitive cycles** need no special UI: the rating model absorbs
  contradictory judgments into a sensible linear order (confidence just drops);
  the linear ranking is shown as-is.

## Manual drag-to-order view (override / fallback)

- The whole (filtered) list is shown and the user drags games into the order
  they want, overriding or seeding the pairwise result.
- Built on **`svelte-dnd-action`**.
- Must remain **keyboard-accessible**, not mouse-only (Principle VI).

## List result & export view

- The finished ranked list, **exportable** in portable formats (constitution
  Principle V): **Markdown** (a ranked list, easy to paste into BGG/forums),
  **CSV** (rank, game, BGG id, score — spreadsheet-friendly), and **JSON** (the
  full structured list + entries, for re-import/interop). All three ship as the
  baseline export set.
- **GeekList (BBCode)** (feature `bgg-geeklist-export`): a rank-ordered body of
  `[thing=<bggId>][/thing]` entries the user copies and pastes into a **new
  GeekList** on BGG to publish the ranking natively to the community. Like the
  others it is a pure string transform over the export data (rank, name,
  bggId), needs no BGG call, and is offered alongside Markdown/CSV/JSON. The app
  produces the list *body*; creating the GeekList itself is done by the user on
  BGG (the XML API is read-only for this).
- [OPEN: public sharing model — whether a list can be exposed as a read-only
  shareable link (and its privacy/visibility rules) is a deferred product
  decision, separate from the export formats above, which stand on their own.]

## Tiering (deferred)

Bucketing games into tiers (S/A/B/…) instead of a strict linear order is a
possible **later** feature, not in the initial scope. The data model reserves a
`tier` field for it.

## States

- **Loading**: skeleton/placeholder while collection or list data loads;
  distinct, progress-bearing state during an async BGG import.
- **Empty**: no collection imported yet (prompt to import); collection with no
  games matching a list's filter; list with no comparisons yet.
- **Error**: BGG import failed / gave up (with retry affordance); network or
  save failure during ranking (comparisons must not be silently lost).

## Production Annotations

- **Sharing model unspecified**: if list sharing ships as public links, a
  production version needs a considered privacy/visibility model rather than
  the minimal export assumed here.
