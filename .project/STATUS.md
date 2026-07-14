# yet-another-rank-games — Project Status

_Updated: 2026-07-14 (post-ship follow-up: diagrams refreshed, datamodel.md refined, defects re-verified). Keep this current as artifacts are refined and open questions are resolved._

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

- **2 backlogged** (`bgg-cover-art-and-card-view` — BGG cover art, a card display option, art in comparison cards, and a no-images preference; `pool-completion-celebration` — confetti animation and hiding comparison controls once a pool becomes fully deterministically ordered) · 0 planned · 0 tasked · **4 implemented** (`bgg-geeklist-export`, `bgg-game-search-import`, `custom-domain-mapping`, `collection-editing-and-resync`) — see `.project/features/`. Target a backlogged slug with `/ardd-plan <slug>` when ready to design it.

## Plans & Tasks

- `research-collection-editing-and-resync-reconciliation-2026-07-14-47f7.md` — proposal-vetting research, consumed by the plan below.
- `plan-collection-editing-and-resync-2026-07-14-d0af.md` — approved; `tasks-collection-editing-and-resync-b3ff.md` **completed, 15/15**. Merged to `main`. Delivered: collection soft-delete/undo/hard-delete lifecycle, username-keyed collection dedup, re-pull resync reconciliation, fuzzy-title duplicate detection + user-scoped confirm-merge/reject-distinct, a new Collection management view (reusing a shared `BggSearchAdd` widget with the pool builder), and the pairwise ranking view's Ranked/Unranked split (feedback F001–F003, `PoolGame.excludedFromRanking`). Full suite green: 124 unit + 63 integration (real local Postgres) + 14 e2e tests; lint/typecheck clean.
- `plan-foundation-2026-07-10.md` — approved; `tasks-foundation-cd84.md` **in-progress, 41/46**. Its remaining Phase 6 (T035–T039) is **superseded** by the multi-env-deploy plan; the file stays as the record of Phases 0–5.
- `plan-bgg-geeklist-and-search-2026-07-12.md` — approved; `tasks-bgg-geeklist-and-search-2299.md` **completed, 7/7**. Shipped + merged.
- `plan-multi-env-deploy-2026-07-12.md` — approved; `tasks-multi-env-deploy-5928.md` **completed, 8/8**. Merged to `main`.
- `plan-custom-domain-mapping-2026-07-13-53ec.md` — approved; `tasks-custom-domain-mapping-6ce2.md` **completed, 7/7**. Merged to `main`. Production's web Cloud Run service is now live at `https://yarg.ty-pe.com` (managed TLS, additive alongside the original `*.run.app` URL which still works). Supabase Auth's Site URL/redirect URLs updated and verified via a fresh signup + email confirmation; full smoke flow (pool build, BGG search-import, pairwise ranking, all four export formats) verified end-to-end against the new domain.

## Diagrams

- datamodel.md — current ✅ (regenerated: `CollectionItemDuplicate` entity, `CollectionItem.source/status/removed_at`, `PoolGame.excluded_from_ranking`)
- infrastructure.md — current ✅
- ui.md — current ✅ (regenerated: Collection import & management view, resync flow)

## Code-vs-Artifact Defects

No defects — last checked 2026-07-14. One finding from this pass (`PoolGame.excluded_from_ranking` implemented but undocumented on `PoolGame` in `datamodel.md`) was fixed immediately via `/ardd-refine datamodel`; re-verified clean afterward.

## In Flight

Nothing in flight — the collection-editing-and-resync worktree merged and was removed this run.

## Recommended Next Step

All post-ship follow-up for `collection-editing-and-resync` is done: defects checked (and the one finding fixed), both diagrams regenerated, and `datamodel.md`'s open question closed (now `stable`, no open questions). Two features remain backlogged and unplanned: `bgg-cover-art-and-card-view` and `pool-completion-celebration` — run `/ardd-plan <slug>` on either when ready to design it. Lower priority: `ui.md`'s public-sharing open question has no urgency, and the ARDD tool itself has an update available (`/ardd-update`).
