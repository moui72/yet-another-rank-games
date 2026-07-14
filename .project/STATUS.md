# yet-another-rank-games — Project Status

_Updated: 2026-07-14 (collection-editing-and-resync planned + tasked). Keep this current as artifacts are refined and open questions are resolved._

ARDD update available: installed `7c5dcd0`, latest release `v0.10.0` — run `/ardd-update`.

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | — |
| datamodel.md | draft ⚠️ | 1 |
| infrastructure.md | stable ✅ | — |
| design.md | stable ✅ | — |
| ui.md | draft ⚠️ | 1 |

## Open Questions

**datamodel**
- Title-matching heuristic for the collection-resync "might be" duplicate detection (similarity threshold, edition/subtitle normalization) — explicitly deferred, to be tuned during implementation (task T007 of `tasks-collection-editing-and-resync-b3ff.md`).

**ui**
- Public sharing model — whether a list can be exposed as a read-only shared view (deferred product decision).

## Feature Backlog

- **2 backlogged** (`bgg-cover-art-and-card-view` — BGG cover art, a card display option, art in comparison cards, and a no-images preference; `pool-completion-celebration` — confetti animation and hiding comparison controls once a pool becomes fully deterministically ordered) · 0 planned · **1 tasked** (`collection-editing-and-resync` — view/edit an imported collection, re-pull to resync, and reconcile local edits against BGG via soft-delete + fuzzy-match "might be" relations; plan approved, tasks ready) · 3 implemented (`bgg-geeklist-export`, `bgg-game-search-import`, `custom-domain-mapping`) — see `.project/features/`. Target a backlogged slug with `/ardd-plan <slug>` when ready to design it.

## Plans & Tasks

- `research-collection-editing-and-resync-reconciliation-2026-07-14-47f7.md` — proposal-vetting research, consumed by the plan below.
- `plan-collection-editing-and-resync-2026-07-14-d0af.md` — **approved**; `tasks-collection-editing-and-resync-b3ff.md` **ready, 0/15**. Covers the collection editing/resync feature (5 phases) plus feedback F001–F003 (Phase 5, pairwise ranking view's unranked/ranked split). Not yet implemented — run `/ardd-implement` when ready to start.
- `plan-foundation-2026-07-10.md` — approved; `tasks-foundation-cd84.md` **in-progress, 41/46**. Its remaining Phase 6 (T035–T039) is **superseded** by the multi-env-deploy plan; the file stays as the record of Phases 0–5.
- `plan-bgg-geeklist-and-search-2026-07-12.md` — approved; `tasks-bgg-geeklist-and-search-2299.md` **completed, 7/7**. Shipped + merged.
- `plan-multi-env-deploy-2026-07-12.md` — approved; `tasks-multi-env-deploy-5928.md` **completed, 8/8**. Merged to `main`.
- `plan-custom-domain-mapping-2026-07-13-53ec.md` — approved; `tasks-custom-domain-mapping-6ce2.md` **completed, 7/7**. Merged to `main`. Production's web Cloud Run service is now live at `https://yarg.ty-pe.com` (managed TLS, additive alongside the original `*.run.app` URL which still works). Supabase Auth's Site URL/redirect URLs updated and verified via a fresh signup + email confirmation; full smoke flow (pool build, BGG search-import, pairwise ranking, all four export formats) verified end-to-end against the new domain.

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-diagram datamodel`) — new `CollectionItemDuplicate` entity and `CollectionItem` field additions from this plan
- infrastructure.md — current ✅
- ui.md — stale ⚠️ (run `/ardd-diagram ui`) — new Collection editing & resync section from this plan

## Code-vs-Artifact Defects

No defects — last checked 2026-07-12. Run `/ardd-defects` to refresh (artifacts have changed significantly since — the collection-editing-and-resync schema/UI additions are plan-only so far, not yet implemented, so no drift is expected until `/ardd-implement` runs).

## In Flight

Nothing in flight — all worktrees from this session have been merged and removed.

## Recommended Next Step

`collection-editing-and-resync` now has an approved plan and a ready tasks file (`tasks-collection-editing-and-resync-b3ff.md`, 0/15) — run `/ardd-implement` to start executing it. Two other features remain backlogged and unplanned: `bgg-cover-art-and-card-view` and `pool-completion-celebration` — run `/ardd-plan <slug>` on either when ready to design it. Lower-priority: the `ui.md` open question (public sharing model) is a deferred product decision with no urgency, the new `datamodel.md` open question (title-matching heuristic) is intentionally deferred to T007's implementation, both `datamodel.md` and `ui.md` diagrams are now stale (`/ardd-diagram <name>` to refresh), and the ARDD tool itself has an update available (`/ardd-update`).
