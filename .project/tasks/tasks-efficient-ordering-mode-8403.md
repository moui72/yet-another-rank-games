---
plan: plan-efficient-ordering-mode-2026-07-20-5a1c.md
generated: 2026-07-20
status: in-progress
---

# Tasks

## Phase 1: Derivation core

- [x] T001 [artifacts: datamodel] Write the cycle-breaking spec as a doc comment in a new `src/lib/domain/constraintOrder.ts` before implementing: edges are latest-wins per unordered pair; cycles are broken by dropping the oldest edge until acyclic; "oldest" is `created_at` ascending, tie-broken by comparison row id ascending so the rule is a total order and therefore deterministic. This resolves the plan's open question and every later task depends on the rule being pinned down.
- [x] T002 [artifacts: datamodel] Test-first: build the constraint-edge model in `src/lib/domain/constraintOrder.ts` — derive the latest-wins edge set from a `Choice[]` log (the same shape `ranking.ts` already consumes). Failing tests first covering: single edge, a pair judged twice (later wins), and disjoint pairs.
- [x] T003 [artifacts: datamodel] Test-first: implement topological sort over the edge set, with games left incomparable by the edges ordered by their openskill rating (reuse `ratingsFromComparisons` and `conservativeScore` from `ranking.ts`/`score.ts` — the rating is a tie-breaker here, never the authority). Tests: fully-constrained chain, fully-incomparable set falls back to rating order, mixed case.
- [x] T004 [artifacts: datamodel] Test-first: implement cycle detection and the drop-oldest-edge breaking rule specified in T001. Tests must include a 3-cycle and a case where two edges share a `created_at`, asserting the row-id tie-break makes the outcome deterministic rather than arbitrary.
- [x] T005 [artifacts: datamodel] Property test for the mode's central promise: for a randomly generated acyclic edge set and a random single override, re-deriving the order places the moved game at exactly the overridden position. Use enough generated cases to be meaningful; this is the guarantee the whole mode rests on, so an example-based test is not sufficient here.

## Phase 2: Selection policy

- [x] T006 [artifacts: datamodel] Test-first: implement the resumable binary-insertion selector in `src/lib/domain/insertionSelect.ts` — given the derived order and the edge set, return the next pair to ask, binary-searching the game currently being placed. A probe whose answer is already implied by the edge set (directly or transitively) must be consumed silently rather than asked.
- [x] T007 [artifacts: datamodel] [parallel] Test-first: implement best-first insertion ordering — seed the sequence of games to place from `CollectionItem.user_rating` descending where present, falling back to pool order for unrated games. Test the all-unrated case explicitly; it degrades to pool order and must not error.
- [x] T008 Test that comparison counts land near the information-theoretic floor: simulate a noiseless user over the selector at n = 10, 25, 50 and assert the count is within a reasonable margin of ceil(log2(n!)) (research measured 25 / 94 / 237). Assert a bound, not an exact number — this is a regression guard against the selector silently degenerating, not a benchmark.
- [x] T009 Test resumability: interrupt a partially-complete insertion, re-derive from the persisted edge set alone, and assert the selector resumes with at most ~log2(n) repeated asks and no persisted sort state of any kind.

## Phase 3: Override mapping

- [x] T010 [artifacts: datamodel] Test-first: implement override-to-edges mapping in `src/lib/domain/overrideEdges.ts` — moving a game across k positions produces k edges, one against each crossed game, in the direction of the move. Move up/down is the k=1 case and must produce exactly one edge.
- [x] T011 Test that a long move against heavily contradicting evidence still lands exactly: build a fully round-robined 10-game order, move rank 9 to rank 2, and assert the re-derived order places it at rank 2 — not rank 8 or rank 3, which is what the rating-model approach produced in the research simulation. This test is the regression guard for the whole design choice.

## Phase 4: Persistence & mode plumbing

- [x] T012 [artifacts: datamodel] Add a Supabase migration adding `efficient` to the `ranking_method` enum. Do not drop `manual` here — that is T021, after its only consumer is replaced.
- [x] T013 [artifacts: datamodel] Test-first: add a batched edge-write repository function in `src/lib/server/repositories/comparisons.ts` that upserts k comparison rows in a single statement, reusing the existing canonical-ordering and `onConflict` logic so a batched write and a single `recordComparison` cannot diverge in behaviour. Integration test against local Postgres.
- [x] T014 [artifacts: ui, datamodel] Add ranking-mode selection to the list-creation form (`src/routes/pools/[id]/+page.svelte` and `+page.server.ts`): Pairwise or Efficient, one line of plain-language explanation each (no algorithm names), and a note that the choice is permanent. Server action must persist the chosen mode; default stays `pairwise`.
- [x] T015 [artifacts: ui] Test-first: extend `src/lib/domain/listForm.ts` validation to accept the new mode value and reject anything outside the enum, so an unknown mode cannot reach the repository.

## Phase 5: Efficient ranking view

- [x] T016 [artifacts: ui, datamodel] Create `src/lib/components/EfficientRanker.svelte`: comparison prompt reusing the pairwise view's card layout and `show_cover_art` preference, wired to the T006 selector. Keyboard-operable choice and undo, matching the existing pairwise view.
- [x] T017 [artifacts: ui] Add the insertion-progress indicator to `EfficientRanker`: "Placing <game> — question N of M" plus overall "N of M games placed". The plan is explicit that this repetition is surfaced rather than hidden — without the framing the mode's deliberate re-asking of one game reads as a bug.
- [x] T018 [artifacts: ui, design] Add the three override affordances to `EfficientRanker`, all routed through the T010 mapping and the T013 batched write: drag-and-drop via `svelte-dnd-action`, per-row move up/down, and a per-row "move to position N" numeric input. The ranked list is always visible and always reorderable, not gated behind completion.
- [x] T019 [artifacts: ui] Wire the efficient mode into `src/routes/lists/[id]/+page.server.ts` and `+page.svelte`: load the edge set and derived order for `rankingMethod === 'efficient'` and render `EfficientRanker`. Leave the `manual` branch alone for now — T022 removes it.
- [x] T020 [artifacts: ui] Add an axe accessibility scan for the efficient view covering the keyboard override paths specifically (move up/down and move-to-position-N), not just the comparison prompt. Principle VI's AA gate rests on those paths being genuinely operable, since the drag gesture itself is pointer-only.

## Phase 6: Retire manual

- [x] T021 [artifacts: datamodel] Re-verify zero `ranking_method = 'manual'` rows in both staging and production before touching anything — do not trust this plan's 2026-07-20 snapshot. If any row exists, stop and report rather than proceeding; the retirement assumed an empty set and needs a data migration otherwise. On zero, add a migration dropping `manual` from the enum.
- [x] T022 [artifacts: ui, design] Delete `src/lib/components/ManualRanker.svelte` and the `mode === 'manual'` branches in `src/routes/lists/[id]/+page.server.ts` and `+page.svelte`, plus the `manual` case in `src/lib/domain/listView.ts`. Keep `svelte-dnd-action` — T018 now depends on it.
- [ ] T023 Remove `manual` from the `RankingMethod` type in `src/lib/types/entities.ts` and fix the resulting type errors. Full suite plus typecheck must be green; this task is complete only when nothing references the retired value.
