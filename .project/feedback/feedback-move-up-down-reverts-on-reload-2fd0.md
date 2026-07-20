---
status: open
created: 2026-07-20
plan:
---

# Feedback

## Bug

- [ ] F001 A move-up/move-down adjustment can appear to work in-session and
  then partially or fully revert after a reload. `PairwiseSession.moveUp`
  (`src/lib/pairwiseSession.svelte.ts:85`) emits one synthetic `Comparison`
  per move through `choose()`, but an override that contradicts several
  earlier judgments needs 3–4 repeat comparisons against the same pair before
  the openskill rating actually flips. Those repeats do not survive:
  `recordComparison` (`src/lib/server/repositories/comparisons.ts:27-30`)
  upserts on the unique `(list_id, game_a, game_b)` with
  `doUpdateSet({ winnerId, createdAt })`, so **only one row per pair ever
  persists**. The live session holds N comparisons; the reload replay sees 1.
  The two orderings therefore diverge, and the user's deliberate reordering
  silently undoes itself.

  Timing suggests a regression rather than an original oversight: the unique
  constraint was added 2026-07-15 by migration
  `20260715220000_comparisons_canonical_unique.sql` (itself a defect fix for
  duplicate comparison rows), and `manual-pairwise-ranking-adjust` shipped the
  same day. The constraint is correct on its own terms — the interaction with
  repeat-emitting synthetic comparisons is what breaks.

  Found while researching the efficient-ordering mode; see
  `.project/plans/research-efficient-durable-secondary-ranking-mode-2026-07-20-d22b.md`,
  which measured the divergence. Note that research recommends a
  constraint-graph model where latest-wins pair edges are honored exactly —
  adopting it for the *primary* mode would dissolve this bug rather than
  patch it, so the fix should be weighed against that direction rather than
  chosen in isolation. A narrower fix (weight/recency on the rating update,
  or allowing repeat rows) is possible but re-opens the duplicate-row defect
  the constraint was added to close.

  Not yet reproduced against a running app — identified by reading the code
  and by the research simulation. Worth confirming manually before fixing.
  [artifacts: datamodel, ui]
