# yet-another-rank-games — Project Status

_Updated: 2026-07-14 (bgg-cover-art-and-card-view planned + tasked). Keep this current as artifacts are refined and open questions are resolved._

ARDD update available: installed `7c5dcd0`, latest release `v0.10.0` — run `/ardd-update`.

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | stable ✅ | — |
| design.md | stable ✅ | — |
| ui.md | draft ⚠️ | 2 |

## Open Questions

**ui**
- Public sharing model — whether a list can be exposed as a read-only shared view (deferred product decision).
- Card-view grid layout/breakpoints for the new cover-art card view (feature `bgg-cover-art-and-card-view`) — left as an implementation detail.

## Feature Backlog

- **1 backlogged** (`pool-completion-celebration` — confetti animation and hiding comparison controls once a pool becomes fully deterministically ordered) · 0 planned · **1 tasked** (`bgg-cover-art-and-card-view` — BGG cover art, a card display option, art in comparison cards, and a no-images preference; plan approved, tasks ready) · 4 implemented (`bgg-geeklist-export`, `bgg-game-search-import`, `custom-domain-mapping`, `collection-editing-and-resync`) — see `.project/features/`. Target `pool-completion-celebration` with `/ardd-plan pool-completion-celebration` when ready to design it.

## Plans & Tasks

- `plan-bgg-cover-art-and-card-view-2026-07-14-3c32.md` — approved; `tasks-bgg-cover-art-and-card-view-6090.md` **ready, 0/8**. Covers `Game.image_url`/`User.show_cover_art`, BGG `<image>` ingestion, a shared image-fallback helper, the pool builder card view, and pairwise comparison-card cover art. Not yet implemented — run `/ardd-implement` when ready to start.
- `research-collection-editing-and-resync-reconciliation-2026-07-14-47f7.md` — proposal-vetting research, consumed by the plan below.
- `plan-collection-editing-and-resync-2026-07-14-d0af.md` — approved; `tasks-collection-editing-and-resync-b3ff.md` **completed, 15/15**. Merged to `main`.
- `plan-foundation-2026-07-10.md` — approved; `tasks-foundation-cd84.md` **in-progress, 41/46**. Its remaining Phase 6 (T035–T039) is **superseded** by the multi-env-deploy plan; the file stays as the record of Phases 0–5.
- `plan-bgg-geeklist-and-search-2026-07-12.md` — approved; `tasks-bgg-geeklist-and-search-2299.md` **completed, 7/7**. Shipped + merged.
- `plan-multi-env-deploy-2026-07-12.md` — approved; `tasks-multi-env-deploy-5928.md` **completed, 8/8**. Merged to `main`.
- `plan-custom-domain-mapping-2026-07-13-53ec.md` — approved; `tasks-custom-domain-mapping-6ce2.md` **completed, 7/7**. Merged to `main`. Production's web Cloud Run service is live at `https://yarg.ty-pe.com`.

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-diagram datamodel`) — new `Game.image_url` and `User.show_cover_art` fields
- infrastructure.md — current ✅
- ui.md — stale ⚠️ (run `/ardd-diagram ui`) — new card-view flow

## Code-vs-Artifact Defects

No defects — last checked 2026-07-14. This plan's artifact changes are plan-only so far, not yet implemented, so no drift is expected until `/ardd-implement` runs.

## In Flight

Nothing in flight.

## Recommended Next Step

`bgg-cover-art-and-card-view` now has an approved plan and a ready tasks file (`tasks-bgg-cover-art-and-card-view-6090.md`, 0/8) — run `/ardd-implement` to start executing it. One feature remains backlogged and unplanned: `pool-completion-celebration` — run `/ardd-plan pool-completion-celebration` when ready. Lower priority: both `datamodel.md` and `ui.md` diagrams are stale (`/ardd-diagram <name>` to refresh — likely worth doing after this feature ships, alongside the next `/ardd-defects` pass, same as the last feature), the `ui.md` public-sharing question has no urgency, and the ARDD tool itself has an update available (`/ardd-update`).
