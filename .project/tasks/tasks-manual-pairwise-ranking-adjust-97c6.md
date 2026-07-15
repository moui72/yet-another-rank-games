---
plan: plan-manual-pairwise-ranking-adjust-2026-07-15-3db7.md
generated: 2026-07-15
status: ready
---

# Tasks

## Phase 1: Move logic

- [ ] T001 [artifacts: ui] Add `moveUp(gameId)`/`moveDown(gameId)` to
  `PairwiseSession` (`src/lib/pairwiseSession.svelte.ts`): each looks up
  `gameId`'s neighbor in `session.ranked` and calls the existing `choose()`
  with the swap's winner/loser (moving up: `gameId` beats the neighbor
  above it; moving down: the neighbor below beats `gameId`). No-op at the
  top/bottom edge respectively. Write a test first: moving a game up swaps
  its position with its immediate neighbor and the swap is reflected in
  `session.ranked` on the next read; moving the top game up (or the bottom
  game down) is a no-op; confirm it fails, then implement.

## Phase 2: UI controls

- [ ] T002 [artifacts: ui] Add move-up/move-down buttons per row in the
  Ranked section (`src/lib/components/PairwiseRanker.svelte`), alongside
  the existing exclude ("✕") button — same keyboard-operable,
  aria-labeled pattern. Disable move-up on the first row and move-down on
  the last row. Write a test first (e2e: clicking move-down on a row swaps
  it with the row below; the disabled edge buttons don't act), confirm it
  fails, then implement.

## Phase 3: Artifact clarification

- [ ] T003 [artifacts: ui] Verify `ui.md`'s "Manual reordering" wording
  (move up/down, one synthetic comparison per move) matches what T001–T002
  actually ship; adjust the artifact text only if implementation reveals a
  discrepancy — do not re-litigate the design.
