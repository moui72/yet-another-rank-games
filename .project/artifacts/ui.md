---
name: ui
status: draft
last_updated: 2026-07-11
diagram_status: unrendered
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

## Collection import view

- User enters/confirms a BGG username and triggers an import.
- Import is asynchronous (Cloud Tasks + worker; see `infrastructure.md`), so
  this view shows **live progress**, not a frozen spinner: queued → fetching →
  processing → done, with a clear failure state if BGG gives up.
- Re-import is explicit and user-initiated (data is cached otherwise).

## Pool builder view

A **pool** is a reusable, curated group of games that lists rank (see
`datamodel.md`). Building a pool is the step between importing and ranking.

- Create a pool: name + optional description.
- **Bulk-add by filter:** pick a collection and apply a **filter** (mechanic —
  e.g. co-op, weight range, player count, playing time, owned-only) to add all
  matching games at once.
- **Hand-edit:** remove individual games, and add individual games from the
  catalogue (games already imported by any user). [OPEN: adding a game not yet
  in the catalogue by searching BGG is a backlog feature — needs the API token.]
- See the pool's current games and its size.
- Pools are reusable: the same pool can feed several lists.

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

Remaining refinements (do not block build; tune during implementation):
- [OPEN: exact pair-selection scoring — how to weight rating-closeness vs.
  combined uncertainty vs. novelty, and whether to impose Swiss-round structure.]
- [OPEN: concrete "done" definition — confidence threshold on aggregate `sigma`,
  a coverage target, a comparison budget, or purely user-driven — and how it's
  communicated.]
- [OPEN: acceptable comparison budget for large sets (~100 games) to still feel
  "fun" — and whether to cap pairwise list size, steering big sets toward
  drag-to-order or tiering.]
- [OPEN: how to present the rare intransitive-cycle case, given ratings still
  produce a linear order.]

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
