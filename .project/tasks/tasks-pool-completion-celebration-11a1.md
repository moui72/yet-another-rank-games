---
plan: plan-pool-completion-celebration-2026-07-14-0bde.md
generated: 2026-07-14
status: completed
---

# Tasks

## Phase 1: Derived completion signal

- [x] T001 [artifacts: ui] Add `remainingPairs` to `pairwiseState`
  (`src/lib/domain/ranking.ts`) — count of unseen pairs among `activeIds`,
  factored from the same pair-enumeration `selectNextPair` uses (no
  duplicated logic). Expose `isFullyOrdered` on `PairwiseSession`
  (`src/lib/pairwiseSession.svelte.ts`) as `remainingPairs === 0`. Write a
  test first: a session with all active pairs judged reports
  `isFullyOrdered = true`; one with any unseen active pair reports `false`;
  excluded games' unseen pairs don't count. Confirm it fails, then
  implement.

## Phase 2: Confetti animation

- [x] T002 [artifacts: constitution] Check for an existing, well-maintained
  confetti library (e.g. `canvas-confetti`) per Principle IX before writing
  any custom animation code; add it as a dependency once confirmed
  appropriate (lightweight, no heavy runtime cost, TypeScript-friendly or
  has types available).
- [x] T003 [artifacts: ui] In `PairwiseRanker.svelte`, fire the confetti
  animation once on the false→true transition of `session.isFullyOrdered`
  (track the previous value; only fire when it flips from false to true —
  never on initial mount if already complete from a prior session, and
  never repeatedly while it stays true). Write a test first covering the
  transition-only firing logic, confirm it fails, then implement.

## Phase 3: Hide/reappear comparison controls

- [x] T004 [artifacts: ui] Guard the comparison controls (choose
  left/right, undo) in `PairwiseRanker.svelte` with
  `!session.isFullyOrdered`, so they hide once fully ordered and reappear
  automatically when the active set changes (game added, un-excluded, or
  the pool otherwise grows to create a new unseen pair) — no explicit
  "unhide" mechanism needed since `isFullyOrdered` is fully derived. Write
  a test first (controls hidden when complete; visible again after
  excluding/un-excluding a game changes the active set), confirm it fails,
  then implement.

## Phase 4: Artifact clarification

- [x] T005 [artifacts: ui] Verify the `ui.md` wording already applied this
  session (coverage signal scoped to active games, completion celebration
  description) matches what T001–T004 actually ship; adjust the artifact
  text only if implementation reveals a discrepancy (e.g. a different
  library name than anticipated) — do not re-litigate the design.
