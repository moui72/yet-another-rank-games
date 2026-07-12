# yet-another-rank-games — Project Status

_Updated: 2026-07-12. Keep this current as artifacts are refined and open questions are resolved._

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
- Public sharing model — whether a list can be exposed as a read-only shared view (deferred product decision, separate from the export formats).

## Feature Backlog

- 0 backlogged · 0 planned · 0 tasked · **2 implemented** — see `.project/features/`.
  - `bgg-geeklist-export` — implemented (GeekList/BBCode export).
  - `bgg-game-search-import` — implemented (add any BGG game to a pool via search).

## Plans & Tasks

- `plan-foundation-2026-07-10.md` — **approved**; `tasks-foundation-cd84.md` **in-progress, 41/46**. The remaining Phase 6 deploy tasks (T035–T039) were written for a *single* deploy target and are now **out of date** — `infrastructure.md` defines local / staging / production with a promote-based release flow. Phase 6 needs **re-planning** (new `/ardd-plan`) to cover both hosted environments + the "Promote to production" workflow + GitHub Environments. Still GCP-blocked either way.
- `plan-bgg-geeklist-and-search-2026-07-12.md` — **approved**; `tasks-bgg-geeklist-and-search-2299.md` **completed, 7/7**. Merged to `main`.
- `plan-multi-env-deploy-2026-07-12.md` — **draft** (the re-planned Phase 6). Covers local/staging/production deploy + the promote release flow; **blocked** on GCP + two Supabase projects + GitHub Environments (see the plan's Prerequisites). Task it with `/ardd-plan --from plan-multi-env-deploy-2026-07-12.md` once prerequisites are in hand. Its Phase 1 (containerize + local smoke) is **not** GCP-blocked.

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-render datamodel`)
- infrastructure.md — unrendered ⚠️ (run `/ardd-render infrastructure`)
- ui.md — unrendered ⚠️ (run `/ardd-render ui`)

## Code-vs-Artifact Defects

Last verified 2026-07-12, **before** the GeekList/search implementation landed — no defects then. The new features (`export.ts` `toBbcode`, the BGG `search` client, `/api/games/search`, `addFromSearch`, the pool-builder search UI) were built from the artifacts but haven't been re-verified. Run `/ardd-verify` to cover them.

## In Flight

- No worktrees or draft PRs. `main` is pushed and in sync with `origin` through the GeekList/search merge. **Uncommitted:** this run's `infrastructure.md` refine (three-environment release flow) + this STATUS update.

## Recommended Next Step

Prepare the GCP-phase prerequisites (GCP project + billing/budget, two Supabase projects, GitHub Environments — see `plan-multi-env-deploy`'s Prerequisites). Phase 1 (containerize + local smoke test) is unblocked and can be tasked/implemented now via `/ardd-plan --from plan-multi-env-deploy-2026-07-12.md`. Also uncommitted: the draft plan + this STATUS update.
