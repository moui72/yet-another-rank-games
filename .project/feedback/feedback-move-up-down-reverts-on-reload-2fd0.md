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

  **UPDATE 2026-07-21 — reproduced in-browser; causal story refined.** See
  `.project/plans/research-pairwise-manual-reorder-reload-divergence-2026-07-21-49c5.md`.
  The user-visible revert is real (a game deliberately moved to rank 1
  reverted to rank 3 on reload, and untouched games reshuffled). But the "only
  one row persists / replay sees fewer observations" story above is only half
  right: no rows are lost (12 judgments → 12 rows), and simple single-game
  pushes actually survive reload. The dominant mechanism is **replay-order
  divergence**: `listComparisons` replays in `(createdAt, id)` order, the
  rating build (`ratingsFromComparisons`) is sequential/order-dependent, and
  the upsert bumps `createdAt` on any re-judged pair — relocating it to the end
  of the replay while the live session kept it in place. The two logs re-derive
  different orders. Recommended fix: make the client rebuild its
  `PairwiseSession` from the server's canonical replayed log after move-writes
  (WYSIWYG — no schema change, keeps the move advisory). The constraint-graph
  "pinned override edge" hybrid is reserved for *if* the product decides
  pairwise moves must be authoritative — a separate, larger proposal.
  Product decision 2026-07-21: **advisory** — a pairwise move nudges, and the
  shown order must always equal what reload produces. So the fix is option 1
  (client rebuilds `PairwiseSession` from the server's canonical replayed log
  after move-writes); the constraint-graph authoritative-override hybrid is
  explicitly NOT pursued for pairwise. The next `/ardd-plan` that consumes this
  feedback should implement option 1 and document the advisory nudge semantics
  in `ui.md`.
