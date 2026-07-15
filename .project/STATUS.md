# yet-another-rank-games — Project Status

_Updated: 2026-07-14 (bgg-cover-art-and-card-view implemented + merged; post-ship follow-up done). Keep this current as artifacts are refined and open questions are resolved._

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

- **1 backlogged** (`pool-completion-celebration` — confetti animation and hiding comparison controls once a pool becomes fully deterministically ordered) · 0 planned · 0 tasked · **5 implemented** (`bgg-geeklist-export`, `bgg-game-search-import`, `custom-domain-mapping`, `collection-editing-and-resync`, `bgg-cover-art-and-card-view`) — see `.project/features/`. Target `pool-completion-celebration` with `/ardd-plan pool-completion-celebration` when ready to design it.

## Plans & Tasks

- `plan-bgg-cover-art-and-card-view-2026-07-14-3c32.md` — approved; `tasks-bgg-cover-art-and-card-view-6090.md` **completed, 8/8**. Merged to `main`. Delivered: `Game.image_url`/`User.show_cover_art`, BGG `<image>` ingestion, a shared cover-art fallback helper (`image_url → thumbnail_url → placeholder`), a pool builder List/Cards view toggle, and cover art on pairwise comparison cards. Full suite green: 128 unit + 69 integration + 17 e2e (incl. axe a11y checks); lint/typecheck clean.
- `research-collection-editing-and-resync-reconciliation-2026-07-14-47f7.md` — proposal-vetting research, consumed by the plan below.
- `plan-collection-editing-and-resync-2026-07-14-d0af.md` — approved; `tasks-collection-editing-and-resync-b3ff.md` **completed, 15/15**. Merged to `main`.
- `plan-foundation-2026-07-10.md` — approved; `tasks-foundation-cd84.md` **in-progress, 41/46**. Its remaining Phase 6 (T035–T039) is **superseded** by the multi-env-deploy plan; the file stays as the record of Phases 0–5.
- `plan-bgg-geeklist-and-search-2026-07-12.md` — approved; `tasks-bgg-geeklist-and-search-2299.md` **completed, 7/7**. Shipped + merged.
- `plan-multi-env-deploy-2026-07-12.md` — approved; `tasks-multi-env-deploy-5928.md` **completed, 8/8**. Merged to `main`.
- `plan-custom-domain-mapping-2026-07-13-53ec.md` — approved; `tasks-custom-domain-mapping-6ce2.md` **completed, 7/7**. Merged to `main`. Production's web Cloud Run service is live at `https://yarg.ty-pe.com`.

## Diagrams

- datamodel.md — current ✅ (regenerated: `Game.image_url`, `User.show_cover_art`)
- infrastructure.md — current ✅
- ui.md — current ✅ (regenerated: card view + cover art in pool builder/pairwise flow)

## Code-vs-Artifact Defects

No defects — last checked 2026-07-14 (re-verified after `bgg-cover-art-and-card-view` shipped). All new schema/UI additions match the artifacts exactly.

## In Flight

Nothing in flight — the bgg-cover-art-and-card-view worktree merged and was removed this run.

## Recommended Next Step

All post-ship follow-up for `bgg-cover-art-and-card-view` is done: defects checked (clean), both diagrams regenerated, and `ui.md`'s card-view-layout open question resolved (implemented grid: 2/3/4 columns at base/sm/md) — `ui.md` now has only the pre-existing public-sharing question left. One feature remains backlogged and unplanned: `pool-completion-celebration` — run `/ardd-plan pool-completion-celebration` when ready. Lower priority: the `ui.md` public-sharing question has no urgency, and the ARDD tool itself has an update available (`/ardd-update`).
