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

- `plan-foundation-2026-07-10.md` — **approved**; `tasks-foundation-cd84.md` **in-progress, 41/46** (only Phase 6 deploy T035–T039 remains, GCP-blocked).
- `plan-bgg-geeklist-and-search-2026-07-12.md` — **approved**; `tasks-bgg-geeklist-and-search-2299.md` **completed, 7/7**. Merged to `main`.

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-render datamodel`)
- infrastructure.md — unrendered ⚠️ (run `/ardd-render infrastructure`)
- ui.md — unrendered ⚠️ (run `/ardd-render ui`)

## Code-vs-Artifact Defects

Last verified 2026-07-12, **before** the GeekList/search implementation landed — no defects then. The new features (`export.ts` `toBbcode`, the BGG `search` client, `/api/games/search`, `addFromSearch`, the pool-builder search UI) were built from the artifacts but haven't been re-verified. Run `/ardd-verify` to cover them.

## In Flight

- Nothing — the delegated worktree merged (fast-forward) and was removed. `main` is at `8f4f43e` (all commits signed). **Local only: `main` is ahead of `origin` and unpushed.**

## Recommended Next Step

Push `main` to `origin` (7-task feature work + planning, all signed and unpushed). Then either run `/ardd-verify` to baseline the new code, or the only remaining foundation work is Phase 6 deploy (T035–T039), which stays GCP-blocked.
