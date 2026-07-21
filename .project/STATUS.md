# yet-another-rank-games — Project Status

_Updated: 2026-07-21 — planned inline-help + F001 fix (tasks ready). Diagrams: `ui` stale after the Help edit; others current. Defects all-clear, ArDD v1.0.3. Two ranking modes (pairwise + efficient) live in production. Keep this current as artifacts are refined and open questions are resolved._

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ (v2.2.1) | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | stable ✅ | — |
| design.md | stable ✅ | — |
| ui.md | draft ⚠️ | 1 |

## Open Questions

**ui**
- Public sharing model — whether a list can be exposed as a read-only shared view (deferred product decision). Disclosed under Production Annotations, not hidden. This is the only thing keeping `ui.md` at `draft`.

## Cross-Artifact Issues

None. The `manual`-mode retirement drift (4 defects) was fixed and re-verified this session; artifacts and code agree.

## Diagrams

- datamodel.md — current ✅
- infrastructure.md — current ✅
- ui.md — stale ⚠️ (run `/ardd-diagram ui`) — Help & info text section added 2026-07-21

## Code-vs-Artifact Defects

- **0 — `DEFECTS.md` all-clear, last verified 2026-07-20.** Run `/ardd-defects` again after the next substantive code change.

## Feedback

- 0 open. `feedback-move-up-down-reverts-on-reload-2fd0.md` (F001) — reproduced in-browser, diagnosis corrected (replay-order divergence), product decision **advisory**, now `planned` and bound to `plan-inline-help-and-move-fix`. `feedback-unranked-collapsible-pool-games-d07e.md` — planned earlier.

## Feature Backlog

- 0 backlogged · 0 planned · **1 tasked** (`in-app-help-and-info-text`) · **8 implemented** · **1 subsumed** (`revisit-ranking-modes`) — see `.project/features/`.

## Documented but Untracked

- **Tiering** (`ranking_method = 'tier'`) — described in stable artifacts (constitution scope; `datamodel` enum) but has no register entry and no implementation. The constitution already flags it as "undesigned and untracked." It's a *deliberate* deferral, not an oversight — surface it into the register with `/ardd-backlog --from-artifacts` (or a direct `/ardd-backlog`) only if/when you actually want it tracked as planned work.

## Work Queue

- `tasks-inline-help-and-move-fix-d5db.md` — **ready, 0/8**, plan `plan-inline-help-and-move-fix-2026-07-21-683a.md`, feature `in-app-help-and-info-text` + feedback F001. Two independent tracks: Phase 1 (F001 fix) and Phases 2–3 (inline help) share no files. No other ready file, nothing in flight.
- `tasks-foundation-cd84.md` remains `in-progress` (41/46) — Phase 6 deliberately superseded, no worktree claims it.

## In Flight

Nothing in flight — no worktrees, no reapable branches.

## Deployment

`efficient-ordering-mode` (both migrations) is live on **staging and production** — production `ranking_method` CHECK verified `pairwise/efficient/tier`. The `manual`-retirement cleanup (endpoint deletion) is on staging; **not yet promoted to production** (a `promote-to-production` workflow_dispatch, gated on your environment approval).

## Local Changes Not Yet Pushed

Several commits sit on local `main` ahead of `origin` — the defect-cleanup batch, diagram regen, ArDD v1.0.3 update, and the README dynamic-badge swap. **The dynamic version badge won't render until pushed** (shields.io fetches `raw.githubusercontent.com`).

## Summary

0 issues. Recommended next step: **`/ardd-implement`** — `tasks-inline-help-and-move-fix-d5db.md` is ready (8 tasks: the F001 fix + the inline-help feature). The two tracks share no files, so they could also be split across separate implement runs.

Also pending (plain, not skill invocations): `ui.md` diagram is `stale` again after the Help-section edit (`/ardd-diagram ui`); several unpushed commits on local `main` (F001 research, this plan, plus the earlier badge/ArDD batch — the dynamic badge won't render until pushed); ArDD housekeeping (narrow `.gitignore` `.claude/` → `.claude/skills/ardd-*/`; `git config merge.ours.driver true`).
