---
status: approved
branch: manual-pairwise-ranking-adjust
created: 2026-07-15
features: [manual-pairwise-ranking-adjust]
surfaced-defects: []
---

# Plan: Manual pairwise ranking adjustment

## Goal

Let a user nudge a game up or down one position in the Ranked section,
implemented as a synthetic comparison against the neighbor it swaps past —
working whether the ranking is complete or incomplete, with no new data
model.

## Scope

**In scope:**
- Move up / move down controls per row in the Ranked section of the
  pairwise ranking view.
- Each move emits exactly one synthetic `Comparison` (the moved game beats
  the neighbor it swapped with) through the existing `choose()` path — no
  new entity, field, or authored-position mechanism.
- Works at any coverage level (complete or incomplete ranking) — no
  post-completion restriction.

**Out of scope:**
- Multi-position drag-and-drop (rejected per the design decision this
  session — move-up/down is simpler, accessible by construction, and
  resolves the "how many synthetic comparisons per multi-position move"
  ambiguity by not having multi-position moves in v1).
- Any change to the ranking math, matchup selection, or rating model
  itself — a move is just another comparison the existing engine absorbs.
- Undo for a move specifically — the existing session-level undo
  (`PairwiseSession.undo()`, which pops the most recent log entry) already
  covers it, since a move's synthetic comparison is a normal log entry.

## Technical Approach

`PairwiseSession.choose(winnerId, loserId)` (`src/lib/pairwiseSession.svelte.ts`)
already appends a `{winnerId, loserId}` entry to the log that the whole
derived state (ratings, order, `isFullyOrdered`) recomputes from
(Principle XII). A move is exactly that: moving game X up one position in
`session.ranked` means X now beats its former neighbor above it — so
"move up" calls `session.choose(x, neighborAbove)` and "move down" calls
`session.choose(neighborBelow, x)`. No new method is strictly required on
`PairwiseSession`, but a small `moveUp(gameId)`/`moveDown(gameId)` pair is
added for readability at the call site (reads `session.ranked` to find the
neighbor, then delegates to the existing `choose()`), keeping the "the log
is the only source of truth" invariant intact — nothing new is stored,
computed, or reconciled.

The UI adds move-up/move-down icon buttons next to each Ranked row in
`PairwiseRanker.svelte`, alongside the existing exclude ("✕") button —
keyboard-operable and screen-reader-labeled the same way the exclude button
already is, so no new accessibility pattern is introduced (Principle VI).
The top row's "move up" and the bottom row's "move down" are disabled
(no-op, nothing to swap with).

## Phase Breakdown

### Phase 1 — Move logic
- [ ] T001 [artifacts: ui] Add `moveUp(gameId)`/`moveDown(gameId)` to
  `PairwiseSession` (`src/lib/pairwiseSession.svelte.ts`): each looks up
  `gameId`'s neighbor in `session.ranked` and calls the existing `choose()`
  with the swap's winner/loser (moving up: `gameId` beats the neighbor
  above it; moving down: the neighbor below beats `gameId`). No-op at the
  top/bottom edge respectively. Write a test first: moving a game up swaps
  its position with its immediate neighbor and the swap is reflected in
  `session.ranked` on the next read; moving the top game up (or the bottom
  game down) is a no-op; confirm it fails, then implement. [feature:
  manual-pairwise-ranking-adjust]

### Phase 2 — UI controls
- [ ] T002 [artifacts: ui] Add move-up/move-down buttons per row in the
  Ranked section (`src/lib/components/PairwiseRanker.svelte`), alongside
  the existing exclude ("✕") button — same keyboard-operable,
  aria-labeled pattern. Disable move-up on the first row and move-down on
  the last row. Write a test first (e2e: clicking move-down on a row swaps
  it with the row below; the disabled edge buttons don't act), confirm it
  fails, then implement.

### Phase 3 — Artifact clarification
- [ ] T003 [artifacts: ui] Verify `ui.md`'s "Manual reordering" wording
  (move up/down, one synthetic comparison per move) matches what T001–T002
  actually ship; adjust the artifact text only if implementation reveals a
  discrepancy — do not re-litigate the design.

## Complexity Tracking

| Deviation | Justification |
|---|---|
| New `moveUp`/`moveDown` methods that are thin wrappers over the existing `choose()` | Not strictly required (callers could compute the neighbor and call `choose()` directly), but named methods make the call site's intent legible and keep the neighbor-lookup logic in one place rather than duplicated between the up and down buttons. |
| Move-up/move-down instead of drag-and-drop | Considered and rejected in favor of the simpler control: drag-and-drop needs a keyboard-accessible fallback anyway (Principle VI), so buttons would be built regardless; choosing them as the *only* mechanism avoids a second interaction pattern, a possible new dependency, and the unresolved "how many comparisons per multi-position drag" question from research (Principle VII/YAGNI). |

## Open Questions

- None outstanding — the research's open question (synthetic-comparison
  count for a multi-position move) is resolved by scope: v1 only supports
  single-step adjacent moves, so it's always exactly one comparison.

## Production Annotation Summary

- No new production shortcuts introduced by this plan.
