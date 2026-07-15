---
topic: manual-pairwise-ranking-adjust (proposal vetting)
date: 2026-07-14
status: complete
---

# Research: Manual Pairwise Ranking Adjustment

## Question

Is the backlogged `manual-pairwise-ranking-adjust` idea (let a user manually
adjust relative rankings within a pairwise-sorted list, ideally even while
comparisons are incomplete) sound against `datamodel.md`'s decided model —
"order is derived, not authored" for pairwise lists — or does it require
reversing that decision, and does it need to be restricted to only after
the ranking completes?

## Findings

**The decided model, precisely.** `datamodel.md`: for a pairwise list, the
`Comparison` graph is the **source of truth**; `ListEntry` is a **derived
snapshot**, recomputed after each comparison and always reconstructible by
replaying the log. `PairwiseSession`/`pairwiseState()`
(`src/lib/pairwiseSession.svelte.ts`, `src/lib/domain/ranking.ts`) already
implement this exactly: ratings are `ratingsFromComparisons(log)`, order is
`rankGames(ids, ratings)`. Nothing about position is ever authored directly
for a pairwise list — a `manual` list is the one place `ListEntry` **is**
authored directly (`ranking_method: manual`), and that's a structurally
separate mode.

**Lens: Semantics — what does "manually adjust" actually mean?** Two
materially different designs are hiding under the same one-sentence
request:

1. **Synthetic comparisons.** A drag-to-reorder gesture (move game A above
   game B) is translated into one or more `Comparison` rows (`A beats B`,
   and — for a multi-position drag — `A beats` each game it's dragged past)
   written to the log exactly like a real pairwise judgment. The derived
   order then just reflects it, the same way it reflects any comparison.
2. **Authored position override.** A new field (e.g. `ListEntry.manual_position`
   or a pin flag) that pins a game's displayed position independent of its
   rating, requiring the render path to reconcile "derived score order" vs.
   "pinned positions" every time either changes.

**Lens: Simplicity / Standardness / DRYness — (1) is strictly simpler and
reuses everything.** Option 1 requires **zero new data model** — no new
column, no new table, no new artifact decision to make. It's implemented
entirely as a UI gesture that calls the existing `choose(winnerId, loserId)`
path already used by the pairwise buttons (`PairwiseSession.choose`,
`src/lib/pairwiseSession.svelte.ts`). It doesn't reverse "order is derived,
not authored" — it's the most literal possible embodiment of that decision:
manual intent becomes a comparison, and the existing engine absorbs it. Option
2 is architecturally identical to what the `manual` ranking method already
does (an authored `ListEntry`) — building it as a bolt-on to *pairwise* lists
would duplicate that mechanism under a different name (Principle IX)
and reverse the "derived, not authored" decision outright for a second time
in the same list, with two authorities (score vs. pin) that can disagree.

**Lens: Failure modes / Robustness — does option 1 handle "mid-ranking"
without a special case?** Yes, and this is the key finding for the
"restrict to only after completion" fallback the request offered: nothing
about writing a comparison to the log requires the ranking to be complete —
every existing pairwise-ranking behavior already works at any coverage
level (`ui.md`: "a complete current ranking at any number of comparisons").
A drag-to-reorder gesture mid-ranking is just... another comparison, and the
system already tolerates contradictory judgments by lowering confidence
rather than corrupting order (`ui.md`, Ranking engine section). So the
"maybe only at the end" fallback in the original request turns out to be
unnecessary — the *simpler* design (synthetic comparisons) is also the one
that works fine incomplete, with no extra effort to support that case.
Option 2 (position override), by contrast, would have to explicitly define
what happens when a *new* real comparison contradicts a *pinned* position —
a genuine hard case that has no natural answer, which is part of why it's
rejected below.

**Lens: Proportionality — how many synthetic comparisons per drag?** A
single-position swap (A and B trade places) is unambiguous: one comparison
(`A beats B`). A drag across several positions (A moves from rank 8 to rank
2) is genuinely underspecified — emit one comparison against every game it's
dragged past, or just the new adjacent neighbor(s)? This is a real
implementation-time decision (affects how strongly/quickly the rating model
snaps to the new position) but doesn't change the overall design — it's a
parameter of "how many synthetic comparisons," not a different mechanism.
Left as an open question for planning, not a blocker.

**Reversed/extended decisions, named:** none. Recommended design (synthetic
comparisons) doesn't reverse `datamodel.md`'s "order is derived, not
authored" decision — it's an application of it. No new entity, field, or
`ListEntry`-authoring exception needed for pairwise lists.

## Recommendation

**`/ardd-plan manual-pairwise-ranking-adjust`** — worth doing, and well
enough understood to plan directly (already backlogged; no need to
re-log). Fold these findings into that planning pass: (1) implement as
drag-to-reorder emitting synthetic `Comparison` rows through the existing
`choose()` path, **not** a new authored-position field; (2) this works
identically whether the ranking is complete or incomplete, so the
"restrict to end" fallback in the original request is unnecessary — say so
explicitly in the plan so it isn't re-litigated; (3) resolve, during
planning (not blocking backlog→plan), how many synthetic comparisons a
multi-position drag emits — against every game crossed, or just the new
neighbor(s).

## Rejected Alternatives

**Authored position override** (a pinned/manual position field layered on
top of the derived order) — rejected. It duplicates the mechanism the
`manual` ranking method already provides, reverses "order is derived, not
authored" for pairwise lists specifically, and has no natural resolution for
what happens when a subsequent real comparison contradicts a pinned
position. The synthetic-comparison design achieves the same user-visible
outcome (drag a game to where you want it) without any of these costs.

## Open Questions

- How many synthetic comparisons should a multi-position drag emit — one
  against the new immediate neighbor(s), or one against every game crossed?
  Affects how quickly/strongly the rating model reflects the new position;
  not a blocker to planning, a tuning decision like the existing
  pair-selection scoring formula.
- UI affordance: `PairwiseRanker.svelte`'s Ranked section is currently a
  static best-first list (no drag interaction yet) — this feature adds the
  first drag-to-reorder surface in the app; worth confirming during
  planning whether it reuses any existing drag primitive already used
  elsewhere (none currently exists in the codebase, per a quick check —
  this would be new UI infrastructure, not a reuse).
