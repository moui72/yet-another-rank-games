# yet-another-rank-games — Project Status

_Updated: 2026-07-21 — full `/ardd-status` pass. Everything internally consistent: diagrams current, defects all-clear, ArDD at v1.0.3. Two ranking modes (pairwise + efficient) live in production. Keep this current as artifacts are refined and open questions are resolved._

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
- ui.md — current ✅ (regenerated with the Efficient ranking view + mode-branch)

## Code-vs-Artifact Defects

- **0 — `DEFECTS.md` all-clear, last verified 2026-07-20.** Run `/ardd-defects` again after the next substantive code change.

## Feedback

- **1 open** (`feedback-move-up-down-reverts-on-reload-2fd0.md`) — the pairwise `moveUp`/`moveDown` adjustment can silently revert on reload (synthetic repeats collapse under the per-pair upsert). **Still unreproduced against a running app** — reproduce before planning a fix, and weigh any fix against the constraint-graph direction that would dissolve it. Will be offered by the next `/ardd-plan`.
- 1 planned (`feedback-unranked-collapsible-pool-games-d07e.md`) — already consumed, not open.

## Feature Backlog

- **1 backlogged** (`in-app-help-and-info-text`) · 0 planned · 0 tasked · **8 implemented** · **1 subsumed** (`revisit-ranking-modes`) — see `.project/features/`. Target the backlogged slug with `/ardd-plan in-app-help-and-info-text`.

## Documented but Untracked

- **Tiering** (`ranking_method = 'tier'`) — described in stable artifacts (constitution scope; `datamodel` enum) but has no register entry and no implementation. The constitution already flags it as "undesigned and untracked." It's a *deliberate* deferral, not an oversight — surface it into the register with `/ardd-backlog --from-artifacts` (or a direct `/ardd-backlog`) only if/when you actually want it tracked as planned work.

## Work Queue

No `ready` tasks files. `tasks-foundation-cd84.md` remains `in-progress` (41/46) — its remaining Phase 6 (T035–T039) is deliberately superseded by `multi-env-deploy`, not real pending work, and no worktree claims it.

## In Flight

Nothing in flight — no worktrees, no reapable branches.

## Deployment

`efficient-ordering-mode` (both migrations) is live on **staging and production** — production `ranking_method` CHECK verified `pairwise/efficient/tier`. The `manual`-retirement cleanup (endpoint deletion) is on staging; **not yet promoted to production** (a `promote-to-production` workflow_dispatch, gated on your environment approval).

## Local Changes Not Yet Pushed

Several commits sit on local `main` ahead of `origin` — the defect-cleanup batch, diagram regen, ArDD v1.0.3 update, and the README dynamic-badge swap. **The dynamic version badge won't render until pushed** (shields.io fetches `raw.githubusercontent.com`).

## Summary

0 issues. Safe to `/ardd-plan`: **yes**. Recommended next step: **push the local commits** (the README badge needs it to render, and it promotes the cleanup toward production). After that, `/ardd-plan in-app-help-and-info-text` is the one actionable backlog item; the open `moveUp` feedback needs reproduction before it's worth planning.

Standing housekeeping (optional, all surfaced by `install.sh`): narrow the `.gitignore` `.claude/` pattern to `.claude/skills/ardd-*/`; `git config merge.ours.driver true` for automatic report-file merges.
