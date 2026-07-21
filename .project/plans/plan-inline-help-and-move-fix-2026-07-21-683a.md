---
status: approved
branch: inline-help-and-move-fix
created: 2026-07-21
features: [in-app-help-and-info-text]
surfaced-defects: []
---

# Plan: Inline contextual help + pairwise move reload-durability (F001)

## Goal

Deliver inline contextual help across the confusing views and fix the pairwise manual-move reload divergence so the order shown after a move always equals the order a reload produces.

## Scope

**In scope**

- **F001 fix** (feedback `feedback-move-up-down-reverts-on-reload-2fd0.md`): make the pairwise session converge to the server's canonical replayed comparison log after a move-write, so the live order and the reload order can never silently differ. Advisory semantics — a move nudges, it does not authoritatively pin.
- **`in-app-help-and-info-text`**: a reusable `InfoPopover` component and contextual help blurbs on the pool builder, list creation, pairwise view, and export view, per the `ui.md` "Help & info text" section.

**Out of scope**

- The constraint-graph "authoritative pinned override" hybrid — explicitly *not* pursued for pairwise (product decision 2026-07-21: advisory). If that ever changes it's a fresh `/ardd-research proposal:`.
- Any schema change, and any change to the `efficient` mode.
- Help as a dedicated page or first-run tour — delivery is inline popovers only.
- Tiering and the deferred public-sharing question — untouched.

## Technical Approach

Reference `ui.md` (Pairwise view "advisory, WYSIWYG across reloads" note; the "Help & info text" section). Both tracks are independent — no shared files, no ordering dependency between the F001 track and the help track.

**F001** — the root cause (confirmed by `research-pairwise-manual-reorder-reload-divergence-2026-07-21-49c5.md` and re-verified against code) is *replay-order divergence*: `listComparisons` replays in `(createdAt, id)` order, `ratingsFromComparisons` folds the log sequentially, and the upsert bumps `createdAt` on a re-judged pair — relocating it to the end of the replay while the live client session kept it in place. The two logs re-derive different orders. Fix: after a move-write, the client stops trusting its append-only local log and rebuilds `PairwiseSession` from the server's canonical replayed log. The server already recomputes `list_entries` in `recordComparisonAndRecompute`; the `/compare` endpoint returns the replayed comparison log (the same `Choice[]` shape the page load already builds), and `PairwiseRanker` reconstructs the session from it. No schema change; the move stays advisory.

**Help** — one small `InfoPopover.svelte` (a keyboard-operable, screen-reader-labelled disclosure around static copy; no new dependency), composed into the four views with the copy enumerated in `ui.md`.

## Phase Breakdown

Phase lists are plan work-items, not live checklists — progress is tracked in the linked tasks file.

### Phase 1 — F001: session/replay convergence

- Have `POST /api/lists/[id]/compare` return the canonical replayed comparison log (`listComparisons` mapped to the client `Choice[]` shape) alongside `{ ok }`.
- In `PairwiseRanker.svelte`, after a move-up/move-down write resolves, rebuild `PairwiseSession` from the returned canonical log so the displayed order equals the reload-derived order.
- Tests (TDD, Principle I): a failing test first proving the live-session-vs-replay divergence on a crafted log (the research's recipe is a ready fixture — Juliet ▲×3 / India ▼×2 over the 10-row partial prior), then the convergence fix makes session order == `deriveOrder`/replay order.

*Depends on:* nothing.

### Phase 2 — Help: `InfoPopover` component

- Create `src/lib/components/InfoPopover.svelte`: an "ⓘ" trigger revealing a short blurb; keyboard-operable (open/close/Esc), `aria`-labelled, dismissible; collapsed and expanded states only (static local content, no loading/error).
- Test its accessibility and toggle behavior (component test + axe assertion).

*Depends on:* nothing (independent of Phase 1).

### Phase 3 — Help: attach contextual blurbs to the views

- Compose `InfoPopover` into the pool builder (hierarchy + filter include/exclude/AND semantics), list creation (hierarchy), pairwise view (what pairwise does; stop-early/resume), and export view (what each format is), with the copy from `ui.md`.
- axe scan over the views confirming the added triggers are operable and labelled (Principle VI).

*Depends on:* Phase 2.

## Complexity Tracking

| Deviation | Why justified |
|---|---|
| New `InfoPopover` component | Principle VII: help recurs across four views with the same shape, so one reusable component is the simplest solution that isn't copy-paste — the extraction threshold is met on introduction. No new dependency. |
| `/compare` returns the replayed log | The alternative (a separate refetch/`invalidate` round-trip after every move) is more code and an extra request; returning the log the endpoint already has server-side is the smaller change. No schema impact. |

## Open Questions

- None blocking. Exact help copy is drafted in `ui.md` and finalized at implementation; the delivery mechanism (inline popovers) and the F001 approach (advisory convergence) are both decided.

## Production Annotation Summary

- No new production shortcuts. The F001 fix removes a latent correctness gap rather than adding one; the advisory-nudge semantics are now documented in `ui.md` rather than left implicit.
