---
status: approved
branch: pool-completion-celebration
created: 2026-07-14
features: [pool-completion-celebration]
surfaced-defects: []
---

# Plan: Pool completion celebration

## Goal

When every pair among a list's currently-active games has been judged at
least once, celebrate with a one-time confetti animation and hide the
comparison controls until the active game set changes again.

## Scope

**In scope:**
- A derived "fully ordered" signal on `PairwiseSession`, scoped to
  currently-active (non-excluded) games — reusing the existing
  seen/unseen-pair logic, not a new completion algorithm.
- A one-time confetti animation on the false→true transition into that
  state (not re-triggered on every render while already complete, and not
  re-triggered by an unrelated page reload of an already-complete session).
- Hiding the comparison controls (choose left/right, undo) while fully
  ordered; they reappear automatically the moment the active set changes in
  a way that creates a new unseen pair.
- `ui.md`'s existing coverage-signal text clarified to explicitly scope
  `M` to active (non-excluded) games.

**Out of scope:**
- Any change to the ranking math, matchup selection, or rating model —
  this is purely a UI reaction to an existing derived signal.
- A literal score-tie detection algorithm (rejected — see Technical
  Approach; `N == M` pair coverage is the defined completion signal).
- Persisting "has been celebrated" anywhere — it's session-local UI state,
  not data (no new `datamodel.md` field).

## Technical Approach

`PairwiseSession` (`src/lib/pairwiseSession.svelte.ts`) already derives
`ranked`/`unranked`/`comparedKeys` from the log via `pairwiseState()`
(`src/lib/domain/ranking.ts`), which already computes `activeIds` (excluding
manually-excluded games) for matchup selection. `pairwiseState` gains a pure
`remainingPairs` calculation over `activeIds` (count of unseen pairs among
active games — the same pair-enumeration `selectNextPair` already does,
factored out so it isn't duplicated per Principle IX/XIII). `PairwiseSession`
exposes `isFullyOrdered = remainingPairs === 0` as a derived getter — no new
state field, fully recomputed from `gameIds`/`log`/`excludedIds` like
everything else in the session (Principle XII).

The confetti animation itself uses an existing, well-known library
(`canvas-confetti` — check npm for current best practice per Principle IX
rather than hand-rolling a particle system) fired via a `$effect` that
compares the current `isFullyOrdered` value against its previous render to
fire only on the false→true transition, so re-rendering an
already-celebrated, still-complete session doesn't replay the animation.

`PairwiseRanker.svelte`'s comparison controls (currently rendered whenever
`session.currentPair` exists — always true with ≥2 active games, since
`selectNextPair` falls back to repeats rather than returning null) gain an
additional `!session.isFullyOrdered` guard. Because `isFullyOrdered` is
derived from the same reactive inputs as everything else in the session, it
recomputes automatically when the active set changes (a game added,
un-excluded, or trashed) — no extra wiring needed to "unhide."

## Phase Breakdown

### Phase 1 — Derived completion signal
- [ ] T001 [artifacts: ui] Add `remainingPairs` to `pairwiseState`
  (`src/lib/domain/ranking.ts`) — count of unseen pairs among `activeIds`,
  factored from the same pair-enumeration `selectNextPair` uses (no
  duplicated logic). Expose `isFullyOrdered` on `PairwiseSession`
  (`src/lib/pairwiseSession.svelte.ts`) as `remainingPairs === 0`. Write a
  test first: a session with all active pairs judged reports
  `isFullyOrdered = true`; one with any unseen active pair reports `false`;
  excluded games' unseen pairs don't count. Confirm it fails, then
  implement. [feature: pool-completion-celebration]

### Phase 2 — Confetti animation
- [ ] T002 [artifacts: constitution] Check for an existing, well-maintained
  confetti library (e.g. `canvas-confetti`) per Principle IX before writing
  any custom animation code; add it as a dependency once confirmed
  appropriate (lightweight, no heavy runtime cost, TypeScript-friendly or
  has types available).
- [ ] T003 [artifacts: ui] In `PairwiseRanker.svelte`, fire the confetti
  animation once on the false→true transition of `session.isFullyOrdered`
  (track the previous value; only fire when it flips from false to true —
  never on initial mount if already complete from a prior session, and
  never repeatedly while it stays true). Write a test first covering the
  transition-only firing logic, confirm it fails, then implement.

### Phase 3 — Hide/reappear comparison controls
- [ ] T004 [artifacts: ui] Guard the comparison controls (choose
  left/right, undo) in `PairwiseRanker.svelte` with
  `!session.isFullyOrdered`, so they hide once fully ordered and reappear
  automatically when the active set changes (game added, un-excluded, or
  the pool otherwise grows to create a new unseen pair) — no explicit
  "unhide" mechanism needed since `isFullyOrdered` is fully derived. Write
  a test first (controls hidden when complete; visible again after
  excluding/un-excluding a game changes the active set), confirm it fails,
  then implement.

### Phase 4 — Artifact clarification
- [ ] T005 [artifacts: ui] Verify the `ui.md` wording already applied this
  session (coverage signal scoped to active games, completion celebration
  description) matches what T001–T004 actually ship; adjust the artifact
  text only if implementation reveals a discrepancy (e.g. a different
  library name than anticipated) — do not re-litigate the design.

## Complexity Tracking

| Deviation | Justification |
|---|---|
| New `remainingPairs`/`isFullyOrdered` derived signal, factored from `selectNextPair`'s existing pair enumeration | Avoids duplicating the pair-enumeration logic (Principle IX/XIII) rather than writing a second, separate "are we done" calculation that could drift from the matchup selector's own definition of "unseen pair." |
| `N == M` pair-coverage as the completion definition, not a stricter confidence/sigma threshold | Considered and rejected (see the earlier design decision): no tunable threshold exists anywhere else in the ranking model, and introducing one here would be the first, with no precedent to calibrate against (Principle VII/YAGNI). |

## Open Questions

- Confirm `canvas-confetti` (or an equivalent) is still the right choice at
  implementation time per T002's Principle IX check — not pre-decided here.
- None regarding the completion semantics themselves — resolved during this
  planning pass (N==M over active games; celebration is derived, not
  persisted; reappearance is automatic via the derived signal, not a
  special-cased "removal" event).

## Production Annotation Summary

- No new production shortcuts introduced by this plan.
