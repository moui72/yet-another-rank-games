# yet-another-rank-games — Project Status

_Updated: 2026-07-15 (manual-pairwise-ranking-adjust planned + tasked). Keep this current as artifacts are refined and open questions are resolved._

ARDD update available: installed `7c5dcd0`, latest release `v0.10.0` — run `/ardd-update`.

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | stable ✅ | — |
| design.md | stable ✅ | — |
| ui.md | draft ⚠️ | 1 |

## Open Questions

**ui**
- Public sharing model — whether a list can be exposed as a read-only shared view (deferred product decision).

## Feature Backlog

- **0 backlogged** · 0 planned · **1 tasked** (`manual-pairwise-ranking-adjust` — move up/down controls in the Ranked section, each emitting one synthetic comparison against the swapped neighbor; plan approved, tasks ready) · 6 implemented (`bgg-geeklist-export`, `bgg-game-search-import`, `custom-domain-mapping`, `collection-editing-and-resync`, `bgg-cover-art-and-card-view`, `pool-completion-celebration`) — see `.project/features/`.

## Plans & Tasks

- `research-manual-pairwise-ranking-adjustment-2026-07-14-5810.md` — proposal-vetting research, consumed by the plan below. Key finding: implement as synthetic comparisons through the existing `Comparison`/derived-order model, not an authored-position override — no reversal of `datamodel.md`'s "order is derived, not authored" decision.
- `plan-manual-pairwise-ranking-adjust-2026-07-15-3db7.md` — approved; `tasks-manual-pairwise-ranking-adjust-97c6.md` **ready, 0/3**. Covers `PairwiseSession.moveUp`/`moveDown` (thin wrappers over the existing `choose()`), move-up/move-down buttons in the Ranked section (chosen over drag-and-drop — accessible by construction, no new dependency), and an artifact-clarification pass. No `datamodel.md` changes. Not yet implemented — run `/ardd-implement` when ready to start.
- `plan-pool-completion-celebration-2026-07-14-0bde.md` — approved; `tasks-pool-completion-celebration-11a1.md` **completed, 5/5**. Merged to `main`.
- `plan-bgg-cover-art-and-card-view-2026-07-14-3c32.md` — approved; `tasks-bgg-cover-art-and-card-view-6090.md` **completed, 8/8**. Merged to `main`.
- `research-collection-editing-and-resync-reconciliation-2026-07-14-47f7.md` — proposal-vetting research, consumed by the plan below.
- `plan-collection-editing-and-resync-2026-07-14-d0af.md` — approved; `tasks-collection-editing-and-resync-b3ff.md` **completed, 15/15**. Merged to `main`.
- `plan-foundation-2026-07-10.md` — approved; `tasks-foundation-cd84.md` **in-progress, 41/46**. Its remaining Phase 6 (T035–T039) is **superseded** by the multi-env-deploy plan; the file stays as the record of Phases 0–5.
- `plan-bgg-geeklist-and-search-2026-07-12.md` — approved; `tasks-bgg-geeklist-and-search-2299.md` **completed, 7/7**. Shipped + merged.
- `plan-multi-env-deploy-2026-07-12.md` — approved; `tasks-multi-env-deploy-5928.md` **completed, 8/8**. Merged to `main`.
- `plan-custom-domain-mapping-2026-07-13-53ec.md` — approved; `tasks-custom-domain-mapping-6ce2.md` **completed, 7/7**. Merged to `main`. Production's web Cloud Run service is live at `https://yarg.ty-pe.com`.

## Diagrams

- datamodel.md — current ✅
- infrastructure.md — current ✅
- ui.md — stale ⚠️ (run `/ardd-diagram ui`) — new manual-reordering behavior added to the pairwise ranking view (no new nodes/flow, but worth a refresh pass after this ships, same as the completion-celebration precedent)

## Code-vs-Artifact Defects

No defects — last checked 2026-07-14 (after `pool-completion-celebration` shipped). This plan's artifact changes are plan-only so far, not yet implemented.

## In Flight

Nothing in flight.

## Recommended Next Step

`manual-pairwise-ranking-adjust` now has an approved plan and a ready tasks file (`tasks-manual-pairwise-ranking-adjust-97c6.md`, 0/3) — run `/ardd-implement` to start executing it. Lower priority: `ui.md`'s diagram is stale (cosmetic — low urgency), the public-sharing open question has no urgency, and the ARDD tool itself has an update available (`/ardd-update`).
