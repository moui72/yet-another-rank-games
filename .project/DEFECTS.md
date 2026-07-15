# Defects

_Last verified: 2026-07-15_

No defects found — artifacts match the codebase as of this run.

Notes from this pass:

- `ui.md`'s "Manual reordering" description (move up/move down per Ranked
  row, each emitting exactly one synthetic `Comparison` through the
  existing `choose()` path, no authored-position field) matches
  `PairwiseSession.moveUp`/`moveDown` (`src/lib/pairwiseSession.svelte.ts`)
  and the move-up/move-down buttons in
  `src/lib/components/PairwiseRanker.svelte` exactly — no new persisted
  field, edge rows correctly disable the relevant button.
- `ui.md`'s completion-celebration behavior (confetti on the false→true
  `isFullyOrdered` transition, hidden comparison controls, automatic
  reappearance on active-set change) matches
  `src/lib/pairwiseSession.svelte.ts` (`isFullyOrdered` getter) and
  `src/lib/components/PairwiseRanker.svelte` exactly. `canvas-confetti` is
  the library used, consistent with the artifact's generic description
  (it doesn't name a specific library, so no drift there either).
- `ui.md`'s coverage-signal scoping (`N of M` over active/non-excluded
  games) matches `remainingPairs`/`countUnseenPairs` in
  `src/lib/domain/ranking.ts`, which operates on `activeIds` only.
- Prior findings (`bgg-cover-art-and-card-view`, `collection-editing-and-resync`)
  remain fixed; no new drift introduced by this feature.
