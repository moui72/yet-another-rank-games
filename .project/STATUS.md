# yet-another-rank-games — Project Status

_Updated: 2026-07-11. Keep this current as artifacts are refined and open questions are resolved._

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | stable ✅ | — |
| design.md | draft ⚠️ | — (no `[OPEN:]`; draft pending a stabilizing pass) |
| ui.md | draft ⚠️ | 2 |

## Open Questions

**ui**
- Adding a game not yet in the catalogue (BGG-search import) — deferred; tracked as feature `bgg-game-search-import`.
- Public sharing model — whether a list can be exposed as a read-only shared view.

## Feature Backlog

- 2 backlogged · 0 planned · 0 tasked · 0 implemented — see `.project/features/`.
  - `bgg-geeklist-export` — export a finished ranking as a BGG GeekList (BBCode) body. Plan with `/ardd-plan bgg-geeklist-export`.
  - `bgg-game-search-import` — import a game not yet in the catalogue by BGG search. Plan with `/ardd-plan bgg-game-search-import`.

## Plans & Tasks

- `plan-foundation-2026-07-10.md` — **approved**.
- `tasks-foundation-cd84.md` — **in-progress, 41/46**. Phases 0–5 complete; only Phase 6 (deploy, T035–T039) remains — all blocked on GCP credentials (Cloud Run, Cloud Tasks, billing budget, prod secrets).

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-render datamodel`)
- infrastructure.md — unrendered ⚠️ (run `/ardd-render infrastructure`)
- ui.md — unrendered ⚠️ (run `/ardd-render ui`)

## Code-vs-Artifact Defects

`DEFECTS.md` lists 1 cosmetic defect (last checked 2026-07-11), but its fix has since landed — `ui.md`'s pool-builder view now documents the expansions filter. Run `/ardd-verify` to re-baseline and drop the stale entry.

## In Flight

- Nothing in a sibling worktree or draft PR. Work proceeds inline on `main` (solo mode); `main` is pushed to `origin` and in sync.

## Recommended Next Step

Phase 6 deploy tasks (T035–T039) are the only remaining foundation work and are all blocked on GCP credentials. Meanwhile: plan a backlog feature — `/ardd-plan bgg-geeklist-export` — or run `/ardd-verify` to re-baseline defects (the one cosmetic entry is now fixed).
