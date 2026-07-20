---
status: approved
branch: efficient-ordering-mode
created: 2026-07-20
features: [efficient-ordering-mode]
surfaced-defects: []
---

# Plan: Efficient Ordering Mode

## Goal

Add a second ranking mode that reaches a confident total ordering in roughly a
quarter of the comparisons the primary mode needs, and honours a manual
drag-and-drop reorder exactly rather than approximately — and retire the dead
`manual` mode in the same pass.

## Scope

**In scope**

- A `ranking_method = 'efficient'` mode: constraint-graph derivation over the
  existing `Comparison` rows, resumable binary-insertion comparison selection,
  and override affordances that write authoritative constraint edges.
- Mode selection at list creation, fixed for the life of the list.
- Three override affordances in the new view: drag-and-drop, move up/down, and
  "move to position N" for keyboard parity on long moves.
- Retirement of the `manual` mode: enum value, `ManualRanker.svelte`, and the
  `mode === 'manual'` branches. Verified safe — zero rows in either environment
  as of 2026-07-20.
- A batched write endpoint for the k-edge upsert a long drag produces.

**Out of scope**

- Any change to the primary pairwise mode's algorithm, selector, or view. Its
  novelty-preferring selection stays exactly as it is (constitution v2.2.0
  Principle III scopes novelty to the primary mode; this plan does not touch
  it).
- The `moveUp`/`moveDown` session-vs-replay defect in the *pairwise* mode
  (`feedback-move-up-down-reverts-on-reload-2fd0.md`). This plan does not fix
  it — see Open Questions for why the two interact.
- Tiering (`ranking_method = 'tier'`), still deferred and untracked.
- Switching an existing list between modes.

## Technical Approach

The design is settled by
`.project/plans/research-efficient-durable-secondary-ranking-mode-2026-07-20-d22b.md`
(option D), which falsified the cheaper hypothesis by simulation. The two
requirements — efficiency and override durability — turn out to point at the
same design, and both are served by storage that already exists.

**No schema change beyond the enum.** The `Comparison` table's unique
`(list_id, game_a, game_b)` upsert already makes the current row for a pair the
current judgment about that pair. That latest-write-wins behaviour *is* the
recency mechanism the durability requirement needs — an override replaces a
prior judgment rather than being averaged against it. No new tables, no
weighting column, no authored-position field.

**Derivation** is a pure function from edge set to order: topological sort,
openskill rating as tie-breaker for incomparable games, cycles broken by
dropping the oldest edge until acyclic. The rating survives as a prior, not an
authority. At n ≤ 100 an O(n²) pass per recompute is free.

**Selection** is resumable binary insertion — place one game at a time by
binary-searching it into the current derived order, consulting the edge set
before asking so known pairs are used silently. No sort state is persisted,
which is what makes it resumable; the 2026-07-10 research rejected merge sort
precisely because persisting a merge frontier is resume-fragile.

**Overrides** map to k pair upserts (one per crossed game) in a single batched
write. Because derivation respects constraints, the drop lands exactly where
dropped.

Everything in the first three phases is a pure function over the existing log —
unit-testable without a database, which suits Principle I (test-first).

## Phase Breakdown

### Phase 1 — Derivation core (no UI, no DB)

Pure functions in `src/lib/domain/`, TDD throughout. Delivers a testable
ordering engine.

- Constraint-edge model derived from the existing `Choice`/`Comparison` log.
- Topological sort with openskill tie-break for incomparable games.
- Deterministic cycle-breaking (drop-oldest-edge until acyclic).
- Property test: on any acyclic state, applying any single override and
  re-deriving honours that override exactly. This is the mode's central
  promise, so it gets a property test, not an example test.

*Depends on:* nothing.

### Phase 2 — Selection policy

- Resumable binary-insertion selector: choose the next unplaced game, binary
  search its position, skip probes already answered by the edge set.
- Best-first insertion order seeded from `CollectionItem.user_rating` where
  available, falling back to pool order for unrated games.
- Test that comparison counts land near ⌈log₂(n!)⌉ at representative sizes, and
  that interrupting and resuming costs at most ~log₂n repeated asks.

*Depends on:* Phase 1.

### Phase 3 — Override mapping

- Map a drop across k positions to k constraint edges; move up/down as the k=1
  case; "move to position N" as the same mapping from a numeric input.
- Batched upsert path so one drag is one request.
- Tests that a long drag against contradicting evidence still lands exactly.

*Depends on:* Phase 1.

### Phase 4 — Persistence & mode plumbing

- Migration adding `efficient` to the `ranking_method` enum.
- Repository support for the batched edge write.
- Mode selection in the list-creation form and server action; mode fixed
  thereafter.

*Depends on:* Phase 3 (batch shape), Phase 2 (what the server must serve).

### Phase 5 — Efficient ranking view

- `EfficientRanker.svelte`: comparison prompt, insertion-progress indicator
  ("Placing *Brass* — question 3 of 6", "14 of 40 placed"), always-visible
  reorderable ranked list.
- Drag-and-drop via `svelte-dnd-action`, move up/down, and move-to-position-N.
- axe accessibility scan covering the keyboard override paths specifically —
  the AA gate rests on them being genuinely usable, not merely present.

*Depends on:* Phase 4.

### Phase 6 — Retire `manual`

- Migration dropping `manual` from the enum (safe: zero rows, re-verify at
  execution time rather than trusting this plan's snapshot).
- Delete `ManualRanker.svelte` and the `mode === 'manual'` branches in
  `+page.server.ts` / `+page.svelte`.
- Keep `svelte-dnd-action` — Phase 5 now depends on it.

*Depends on:* Phase 5 (do not delete the only dnd usage before its replacement
exists).

## Complexity Tracking

| Deviation | Why justified |
|---|---|
| A second ordering derivation alongside the rating model | Principle VII (YAGNI) asks that complexity be justified, not avoided. The research measured that no single derivation satisfies both requirements: rating models are noise-tolerant *by* discounting individual answers, which is exactly what makes an override non-authoritative. Two modes with different derivations over one log is the smaller complexity than one derivation that satisfies neither well. |
| Cycle-breaking heuristic | Per-pair edges carry no transitivity guarantee, so cycles are reachable through ordinary use. Drop-oldest is the minimum deterministic rule consistent with the recency contract; the alternative (rejecting a contradicting judgment) would break the durability promise. |
| Keeping `svelte-dnd-action` | Was slated for deletion with `manual`; now load-bearing for the new mode's primary override affordance. Retained deliberately, recorded in `design.md`. |

## Open Questions

- **The pairwise `moveUp` defect and this plan interact, and the order matters.**
  `feedback-move-up-down-reverts-on-reload-2fd0.md` records that a pairwise-mode
  nudge can silently revert on reload, because an override needs repeat
  comparisons to flip a rating but the upsert persists one row per pair. This
  plan does *not* fix it — under the constraint derivation the bug cannot occur,
  so the fix for the pairwise mode is a separate decision (patch the rating
  path, or accept that nudges there are advisory). Deciding that before Phase 5
  would avoid shipping two views whose override semantics differ in ways users
  will notice. **The defect is also still unreproduced against a running app.**
- **Cycle-breaking needs a written spec before Phase 1 ends** — "drop the oldest
  edge" is underspecified when several edges share a timestamp. Needs a total
  order (e.g. tie-break on row id).
- **`ListEntry` write frequency in the new mode.** The derivation is cheap
  enough to recompute on read at n ≤ 100; whether the snapshot is still written
  per comparison, or only on demand, is unresolved. Affects export paths that
  read `ListEntry` directly.
- **Cold-start seeding coverage.** Best-first insertion assumes `user_rating`
  is present often enough to help. Unmeasured — if most pool games are unrated,
  seeding degenerates to pool order and the phase's value drops.

## Production Annotation Summary

- `datamodel.md` — the retired `manual` mode and the (now removed)
  dual-source-of-truth hazard on `ListEntry`.
- `design.md` — `svelte-dnd-action` retained deliberately; the component library
  is still lean and `EfficientRanker` will ship without a Storybook story
  initially, consistent with the existing annotation.
- `ui.md` — public sharing model remains open and untouched by this plan.
