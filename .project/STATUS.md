# yet-another-rank-games — Project Status

_Updated: 2026-07-15 (manual-pairwise-ranking-adjust implemented + merged; post-ship follow-up done). Keep this current as artifacts are refined and open questions are resolved._

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

- **0 backlogged** · 0 planned · 0 tasked · **7 implemented** (`bgg-geeklist-export`, `bgg-game-search-import`, `custom-domain-mapping`, `collection-editing-and-resync`, `bgg-cover-art-and-card-view`, `pool-completion-celebration`, `manual-pairwise-ranking-adjust`) — see `.project/features/`. The feature backlog is fully caught up; no work in flight.

## Plans & Tasks

- `research-manual-pairwise-ranking-adjustment-2026-07-14-5810.md` — proposal-vetting research, consumed by the plan below. Key finding: implement as synthetic comparisons through the existing `Comparison`/derived-order model, not an authored-position override.
- `plan-manual-pairwise-ranking-adjust-2026-07-15-3db7.md` — approved; `tasks-manual-pairwise-ranking-adjust-97c6.md` **completed, 3/3**. Merged to `main`. Delivered: `PairwiseSession.moveUp`/`moveDown` (each emitting one synthetic `Comparison` through the existing `choose()` path) and move-up/move-down buttons per Ranked row (chosen over drag-and-drop — accessible by construction, no new dependency). No `datamodel.md` changes. Full suite green: 132 unit + e2e (including a new axe accessibility scan, zero violations); lint/typecheck clean.
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
- ui.md — current ✅ (regenerated: pairwise view node now mentions move up/down)

## Code-vs-Artifact Defects

No defects — last checked 2026-07-15 (re-verified after `manual-pairwise-ranking-adjust` shipped). All new behavior matches `ui.md` exactly; no artifact edit was needed (T003 verified no discrepancy).

## In Flight

Nothing in flight — the manual-pairwise-ranking-adjust worktree merged and was removed this run.

## Recommended Next Step

The feature backlog is fully caught up (0 backlogged, 0 planned, 0 tasked, 7 implemented) and all post-ship follow-up is done (defects clean, diagram regenerated). Remaining lower-priority items: `ui.md`'s public-sharing open question has no urgency (a deferred product decision), and the ARDD tool itself has an update available (`/ardd-update`). Nothing else is queued — the next move is whatever new idea or feedback comes up.
