# yet-another-rank-games — Project Status

_Updated: 2026-07-14 (pool-completion-celebration planned + tasked). Keep this current as artifacts are refined and open questions are resolved._

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

- **0 backlogged** · 0 planned · **1 tasked** (`pool-completion-celebration` — confetti animation and hiding comparison controls once a pool becomes fully deterministically ordered; plan approved, tasks ready) · 5 implemented (`bgg-geeklist-export`, `bgg-game-search-import`, `custom-domain-mapping`, `collection-editing-and-resync`, `bgg-cover-art-and-card-view`) — see `.project/features/`. All previously-backlogged features are now in flight or shipped.

## Plans & Tasks

- `plan-pool-completion-celebration-2026-07-14-0bde.md` — approved; `tasks-pool-completion-celebration-11a1.md` **ready, 0/5**. Covers a derived `isFullyOrdered` signal (scoped to active/non-excluded games), a one-time confetti animation on completion (checking for an existing library per Principle IX before writing custom code), hiding/auto-reappearing comparison controls, and an artifact-clarification pass. No `datamodel.md` changes — purely derived UI state. Not yet implemented — run `/ardd-implement` when ready to start.
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
- ui.md — stale ⚠️ (run `/ardd-diagram ui`) — new completion-celebration behavior (no new nodes/flow, but worth a refresh pass after this ships)

## Code-vs-Artifact Defects

No defects — last checked 2026-07-14 (after `bgg-cover-art-and-card-view` shipped). This plan's artifact changes are plan-only so far, not yet implemented.

## In Flight

Nothing in flight.

## Recommended Next Step

`pool-completion-celebration` now has an approved plan and a ready tasks file (`tasks-pool-completion-celebration-11a1.md`, 0/5) — run `/ardd-implement` to start executing it. This is the last backlogged feature — once it ships, the feature register will be fully caught up (0 backlogged, 0 planned, 0 tasked, 6 implemented). Lower priority: `ui.md`'s diagram is stale (a cosmetic gap — the graph nodes/flow don't actually change for this feature, so low urgency), the public-sharing open question has no urgency, and the ARDD tool itself has an update available (`/ardd-update`).
