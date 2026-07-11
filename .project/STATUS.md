# yet-another-rank-games — Project Status

_Updated: 2026-07-10. Keep this current as artifacts are refined and open questions are resolved._

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | draft ⚠️ | 1 (BGG spike) |
| ui.md | draft ⚠️ | 5 (tuning) |

## Open Questions

**infrastructure**
- BGG access: raw `xmlapi2` + own typed parser vs. an existing SDK — deferred to the Phase 2 spike (T015).

**ui** (tuning-level; resolved during Phase 4 / deferred)
- Pair-selection scoring; "done" definition; large-set budget; intransitive-cycle display; public sharing model.

## Feature Backlog

- 1 backlogged · 0 planned · 0 tasked · 0 implemented — see `.project/features/`.
  - `bgg-geeklist-export` — export a finished ranking as a BGG GeekList (BBCode) body. Plan with `/ardd-plan bgg-geeklist-export`.

## Plans & Tasks

- `plan-foundation-2026-07-10.md` — **approved**.
- `tasks-foundation-cd84.md` — **in-progress, 14/39** (Phase 0 + Phase 1 complete; Phase 2 next).

## Diagrams

- datamodel.md — unrendered (run `/ardd-render datamodel`)
- infrastructure.md — unrendered (run `/ardd-render infrastructure`)
- ui.md — unrendered (run `/ardd-render ui`)

## Code-vs-Artifact Defects

Never checked — run `/ardd-verify` once more of the app is built.

## In Flight

- Work is proceeding inline on `main` (solo mode): `tasks-foundation-cd84.md` at 14/39. 20 commits not yet pushed (initial GitHub push deferred to an at-machine session).

## Recommended Next Step

Continue `/ardd-implement` on `tasks-foundation-cd84.md` at **T015** (BGG-access spike), starting Phase 2. Or plan the new backlog item with `/ardd-plan bgg-geeklist-export`.
