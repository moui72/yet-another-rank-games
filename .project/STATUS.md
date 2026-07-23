# yet-another-rank-games — Project Status

_Updated: 2026-07-23 — `/ardd-status` full re-check after a frontmatter correction: `infrastructure.md`'s `diagram_status` was flipped from `current` to `stale` (content was already stale from the prior `/ardd-plan public-list-sharing` run, which added the public `/share/[token]` route section — only the frontmatter flag had lagged) and `last_updated` restamped to 2026-07-23. No body content changed. `datamodel.md` remains stale from that same run. `ui.md` is current. No other state changed this pass: same two `ready` tasks files, same `shared-artifact` (`ui`) overlap between them, no in-flight worktrees, no defects, no orphaned completion flips._

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ (v2.2.1) | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | stable ✅ | — |
| design.md | stable ✅ | — |
| ui.md | stable ✅ | — |

## Open Questions

None found across artifacts.

## Cross-Artifact Issues

None found. `datamodel.md`'s `List.is_shared`/`share_token` fields match `ui.md`'s public-sharing description (non-revocable, live, view-only) and `infrastructure.md`'s public unauthenticated `/share/[token]` route section — all three agree on the same mechanism. No `[artifacts: ...]` mismatches.

## Within-Artifact Issues

None found in this pass — no unresolved `[OPEN: ...]` markers in any artifact.

## Constitution Compliance

None. The unauthenticated public route is a deliberate, disclosed decision (`ui.md`'s Production Annotations / non-revocable-in-v1 note carried forward); no shortcut lacking annotation was found.

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-diagram datamodel`) — `is_shared`/`share_token` fields on `List` not yet reflected in the rendered ER diagram
- infrastructure.md — stale ⚠️ (run `/ardd-diagram infrastructure`) — frontmatter now correctly reflects that the public unauthenticated `/share/[token]` route (a distinct trust boundary — no auth check) added in the prior pass isn't yet in the rendered README diagram. (Previously this file's `diagram_status` still read `current` despite the content change; that mismatch is the correction this run applies — no further action needed on the frontmatter itself, just the regeneration.)
- ui.md — current ✅ (already refreshed in a prior `/ardd-diagram` run)

## Code-vs-Artifact Defects

- 0 known defects — `DEFECTS.md` all-clear, last verified 2026-07-20. Run `/ardd-defects` again after the next substantive code change.

## Feedback

- 2 open — `feedback-move-up-down-reverts-on-reload-2fd0.md` (F001, `status: planned`, bound to `plan-inline-help-and-move-fix`) and `feedback-unranked-collapsible-pool-games-d07e.md` (`status: planned`). Both already folded into an existing plan; no new plan action needed for them.

## Feature Backlog

- 0 backlogged · 0 planned · **2 tasked** (`in-app-help-and-info-text`, `public-list-sharing`) · 8 implemented · 1 subsumed (`revisit-ranking-modes`) — see `.project/features/`.

## Documented but Untracked

- **Tiering** (`ranking_method = 'tier'`) — described in stable artifacts (constitution scope; `datamodel` enum) but has no register entry and no implementation. Flagged as a deliberate, undesigned deferral, not an oversight. Surface it with `/ardd-backlog --from-artifacts` only if/when it's actually wanted as planned work.

## Work Queue

- `tasks-inline-help-and-move-fix-d5db.md` — **ready, 0/9**, plan `plan-inline-help-and-move-fix-2026-07-21-683a.md`, feature `in-app-help-and-info-text` + feedback F001:
  - vs `tasks-public-list-sharing-761a.md`: **shared-artifact** (`ui`) — both touch `ui.md`-scoped work; no shared feature slug. `independent` would be the wrong read here — coordinate before merging both, since `ui.md` is a shared edit surface even without a feature overlap. (Re-verified this pass via `parallel-matrix.sh` — same verdict as the prior run.)
- `tasks-public-list-sharing-761a.md` — **ready, 0/6**, plan `plan-public-list-sharing-2026-07-23-810c.md`, feature `public-list-sharing`:
  - vs `tasks-inline-help-and-move-fix-d5db.md`: shared-artifact (`ui`) — see above.
- `tasks-foundation-cd84.md` remains `in-progress` (41/46) — Phase 6 deliberately superseded, no worktree claims it, not part of the ready-file pairwise comparison above.

## In Flight

Nothing in flight — no worktrees, no reapable branches, no draft PRs.

## Deployment

`efficient-ordering-mode` (both migrations) is live on **staging and production** — production `ranking_method` CHECK verified `pairwise/efficient/tier`. The `manual`-retirement cleanup (endpoint deletion) is on staging; **not yet promoted to production** (a `promote-to-production` workflow_dispatch, gated on environment approval).

## Local Changes Not Yet Pushed

Local `main` has **diverged** from `origin/main`: 1 commit ahead, 4 behind.
- Ahead: `5864709` "docs: decide public list sharing model, refresh ui diagram" (local, unpushed).
- Behind: `9da4cf2` and `9c80718` (dependabot merge commits for `@tailwindcss/vite` 4.3.2→4.3.3 and `actions/checkout` 4→7), landed on `origin/main` but not yet pulled locally.

Working tree, on top of that: modified `.project/STATUS.md`, `.project/artifacts/datamodel.md`, `.project/artifacts/infrastructure.md` (this run's frontmatter correction), `.project/features/public-list-sharing.md` (register flip to `tasked`), plus untracked `.project/plans/plan-public-list-sharing-2026-07-23-810c.md` and `.project/tasks/tasks-public-list-sharing-761a.md`.

A pull/merge (or rebase) of `origin/main`'s 2 dependabot commits is needed before pushing the local commit and these working-tree changes — no reported CI/build failures are implied by this, just an ordinary unsynced-branch state.

## ArDD Update

Up to date — installed `85407e4` (per `ardd-update-check.sh`: `up-to-date`).

## Summary

0 issues found (this pass's only action item was the `infrastructure.md` frontmatter correction, now applied). Safe to /plan: yes. Recommended next step: **`/ardd-implement tasks-public-list-sharing-761a.md`** — the freshest tasked work with an approved plan and generated task list, ready to execute. (`tasks-inline-help-and-move-fix-d5db.md` remains `ready`, 9 tasks, as an alternate/parallel track — but note the `shared-artifact` (`ui`) overlap with the sharing tasks above before running both concurrently in separate worktrees.)

Also pending (plain, not skill invocations): regenerate the `datamodel` and `infrastructure` diagrams (`/ardd-diagram datamodel`, `/ardd-diagram infrastructure`); reconcile local `main` with `origin/main` (pull the 2 dependabot commits, then push the local commit) before or alongside pushing the uncommitted artifact/tasks/plan/register changes from this and the prior session.
