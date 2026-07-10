---
topic: pairwise ranking algorithm — novelty-preferring next-matchup selection with a correct, complete final ranking
date: 2026-07-10
status: complete
---

# Research: Pairwise Ranking Algorithm

## Question

How should the pairwise comparison flow select the next matchup so that it
**minimizes repeat exposure of any single game** (favoring novel pairings,
scattering in repetitions only when a comparison is genuinely needed to resolve
the order or when no novel pairing remains) while still producing a **correct,
complete ranking** of the filtered game set (realistically 10–100 games)?

Secondary: which algorithm choice implies which data-model representation —
materialized `ListEntry` as source of truth vs. order **derived on demand from
the `Comparison` graph** — and how much client state (constitution Principle
XII, single reactive store) each approach requires?

## Findings

The candidate approaches fall into two families with fundamentally different
*access patterns*, and the access pattern is exactly what the novelty
constraint is about.

### Family A — Interactive comparison sorts (merge / insertion / merge-insertion)

Classic comparison sorts adapted to ask a human for each comparison.
Merge-insertion sort (Ford–Johnson) is the **comparison-count-optimal** choice,
close to the information-theoretic lower bound of ~log₂(n!) comparisons
(≈ 22 for n=10, ≈ 525 for n=100). Interactive/adaptive variants
("Surprise-Guided MergeSort" and similar) prioritize the most ambiguous
comparisons within that structure.

- **Novelty: bad — this is the disqualifier.** A merge step repeatedly pits one
  "pivot"/front-of-run element against successive candidates; insertion sort
  hammers the element being inserted against many others in a row. The access
  pattern *inherently reuses the same game many times consecutively* — the
  precise experience the UX wants to avoid. You cannot make merge sort
  novelty-preferring without breaking the algorithm that gives it its optimality.
- **Partial / resume: fragile.** The comparison log alone does not tell you
  *where in the recursion/merge frontier* you are. Resuming requires persisting
  the algorithm's internal state (call stack, merge pointers) or deterministically
  replaying every comparison. Any change to the filtered set (a re-import adds a
  game) invalidates that state.
- **Inconsistency / intransitivity: intolerant.** Comparison sorts assume a
  consistent total order. One contradictory human judgment ("A>B" now, "B>A"
  later) can corrupt the result or loop; there is no probabilistic cushion.
- **Data model implication:** order and sort-progress must be **materialized and
  persisted explicitly** (`ListEntry` + internal state); the `Comparison` graph
  is not sufficient to reconstruct position.

### Family B — Rating models with active, uncertainty-driven pair selection

Each comparison updates per-game skill estimates; the ranking is simply the
games sorted by rating. Options: Elo (simplest), Glicko-2 (rating + deviation +
volatility), and Bradley–Terry / Weng–Lin (`openskill`) / TrueSkill. Pair
selection is a *separate, free* policy layer: because any pair may be compared
next, the selector can be biased toward **novel** and **informative** pairs.

- **Novelty: excellent, and it's a first-class knob.** The next-pair policy is
  decoupled from correctness, so the UX rule maps directly onto it: prefer pairs
  not yet compared; among unseen pairs prefer the most *informative* (closest
  ratings and/or highest combined uncertainty → highest expected information
  gain); allow a **repeat** only when no novel pair remains, or to break a
  persistent local ambiguity the ratings can't resolve. This is exactly the
  spec in `ui.md`.
- **Partial / resume: native.** Ratings always yield a current best-guess total
  order, at *any* number of comparisons. Stop after 3 or 300 — there is always a
  complete ranking whose confidence simply improves with more data. Resuming =
  replay the `Comparison` log to rehydrate ratings (order-independent for
  batch/Bradley–Terry fits; near-enough for online Elo/Glicko). Adding a game
  after re-import is trivial: it enters with default rating + max uncertainty and
  the selector naturally prioritizes it.
- **Inconsistency / intransitivity: tolerant by construction.** These are
  probabilistic models; contradictory judgments lower confidence rather than
  corrupt the order. Cycles (A>B>C>A) resolve to a sensible rating ordering.
- **Comparison count:** more variable than Ford–Johnson for a *fully confident*
  total order (can exceed n log n if you demand high confidence on every
  adjacent pair), but this is the wrong metric here: the user stops when the
  order is "good enough," and the top of the list (what themed lists like "top
  10" care about) stabilizes early. Active selection concentrates effort where
  it changes the ranking.
- **Data model implication:** the `Comparison` graph is the **source of truth**;
  `ListEntry` is a **derived snapshot/cache** recomputed from ratings after each
  comparison (or on demand). This directly resolves the `datamodel.md` open
  question in favor of "derived."

### Hybrid note — Swiss / tournament pairing

Swiss pairing explicitly avoids rematches and pairs similar-strength players
each round — its design goal *is* novelty. Layering a Swiss-style round
structure over a Bradley–Terry/Elo rating (pair unseen, close-rated opponents
each "round") is a natural way to make the novelty policy feel fair and
structured, and gives a clean progress unit ("round 3 of ~6"). It's an
enhancement to Family B's selection policy, not a separate ranking engine.

### Available TypeScript libraries (Principle IX — don't hand-roll the math)

- **`openskill`** — MIT-licensed, **patent-free** Weng–Lin implementation
  (Bradley–Terry / Plackett–Luce / Thurstone-Mosteller models), TypeScript
  types, actively maintained, fast. Exposes per-item `mu` (skill) and `sigma`
  (uncertainty) — `sigma` is exactly the signal an active pair-selector needs.
  **Commercial-use-safe.** Best fit.
- **`glicko2.ts`** — fully-typed Glicko-2 (rating + RD + volatility). Solid
  alternative; RD gives the uncertainty signal. Glicko assumes "rating periods"
  of several games, a slightly less natural fit for one-comparison-at-a-time
  online updates than openskill.
- **`ts-trueskill`** — good implementation but **TrueSkill's license permits
  only non-commercial / Xbox use**. Given this project may monetize, **reject on
  licensing grounds.**
- Interactive merge-sort: no dominant maintained npm library; would be
  hand-rolled (another strike against Family A).

The *rating math* comes from a library; the **pair-selection policy** (the
novelty logic) is the small piece we write, and it's a pure function over
current ratings + the set of already-compared pairs — easy to unit-test
(constitution Principle I) and to hold in one reactive store.

### Client state (Principle XII)

Family B's store is small and fully derivable: the `Comparison` list (source of
truth), a derived `Map<gameId, {mu, sigma}>`, and the current candidate pair.
Everything is recomputable from the comparison log — ideal for a single Svelte 5
runes store and for serialize/resume. Family A would need to hold recursion/merge
state, which is awkward to model reactively and to persist.

## Recommendation

Adopt **Family B: a Bradley–Terry / Weng–Lin rating model via `openskill`, with
an active, novelty-biased next-pair selector.**

1. **Ranking engine:** `openskill` (patent-free, TypeScript, commercial-safe).
   Each `Comparison` (winner/loser) updates the two games' `(mu, sigma)`.
   Ranking = games sorted by a conservative score (e.g. `mu − k·sigma`).
2. **Next-pair policy (the part we write):**
   - Restrict to pairs **not yet compared** in this list.
   - Among those, pick the most **informative** — closest ratings and/or highest
     combined `sigma` (highest expected information gain).
   - Permit a **repeat** comparison only when no unseen pair remains, or to
     resolve a persistent adjacent ambiguity the ratings cannot settle.
   - Optionally structure selection as **Swiss-style rounds** so novelty feels
     fair and progress is legible.
3. **Data model:** make the **`Comparison` graph the source of truth**;
   **`ListEntry` becomes a derived snapshot** recomputed after each comparison
   (persisted for fast render/export, but always reconstructible by replaying
   comparisons). This resolves the `datamodel.md` open question as "derived."
4. **UX:** always show a complete current ranking; expose a **confidence /
   coverage** progress signal (driven by aggregate `sigma` and/or unseen-pair
   count) so the user knows when it's "done enough" and can **stop early** at any
   point — satisfying `ui.md`'s "incomplete ranking is valid and persisted."
5. **Cold-start optimization:** seed initial ratings from the BGG
   `user_rating`/`num_plays` already on `CollectionItem`, so early comparisons
   refine a sensible order rather than starting from scratch — cutting the
   comparisons needed for a satisfying result.

Rationale: the novelty constraint is really a constraint on the *access
pattern*, and only Family B decouples pair selection from the ranking math so
that novelty can be a free policy knob. It is simultaneously the most tolerant
of inconsistent human judgment, the most natural for stop-anytime/resume, the
lightest on reactive state, and the one that cleanly resolves the coupled
data-model question — all while letting a maintained library carry the
statistics.

## Rejected Alternatives

- **Interactive merge / merge-insertion (Ford–Johnson) sort:** comparison-count
  optimal, but its access pattern inherently reuses the same game repeatedly —
  the exact opposite of the UX goal — and it is fragile to resume and intolerant
  of contradictory judgments. Optimal for the wrong objective (raw comparison
  count), when novelty, robustness, and resumability dominate here.
- **`ts-trueskill` / Microsoft TrueSkill:** technically strong, but licensing is
  restricted to non-commercial/Xbox use; unacceptable for a possibly-monetized
  product. `openskill` is the patent-free equivalent.
- **Plain Elo (hand-tuned):** workable but exposes no per-item uncertainty out of
  the box, so active/novelty pair selection and a confidence signal would be
  hand-rolled. Glicko-2/openskill give uncertainty for free.
- **Full round-robin (compare every pair once):** guarantees novelty and
  correctness but is O(n²) — ~4,950 comparisons for 100 games — far beyond a
  "fun, low-friction" budget. Active selection is round-robin's point exactly:
  skip the comparisons that don't change the ranking.

## Open Questions

- **Pair-selection scoring function:** exact formula weighting rating-closeness
  vs. combined uncertainty vs. novelty, and any Swiss-round structure. Needs a
  small experiment / tuning pass.
- **Definition of "done":** confidence threshold on aggregate `sigma`, a
  coverage target (fraction of informative pairs seen), a fixed comparison
  budget, or purely user-driven stop — and how to communicate it.
- **Acceptable comparison budget for 100 games** to still feel "fun" — informs
  how aggressively to prune and whether to cap list size for pairwise (vs. steer
  large sets toward drag-to-order or tiering).
- **Cold-start seeding policy:** how much to trust BGG `user_rating`/`num_plays`
  as initial ratings vs. starting neutral.
- **Intransitive-cycle display:** how to present the (rare) case where user
  judgments contain cycles, given ratings will still produce a linear order.
- **Update timing:** online per-comparison updates vs. periodic batch
  Bradley–Terry refit on replay — affects exact reproducibility of a resumed
  session.

These are refinements to the chosen approach, not a re-opening of the family
choice.
