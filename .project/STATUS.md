# yet-another-rank-games — Project Status

_Updated: 2026-07-23 — `/ardd-status` full re-check after `/ardd-refine ui`: ui.md's sole open question (public sharing model) resolved — private-by-default, view-only, non-revocable, live share link — flipping ui.md to `stable`. New feature register entry `public-list-sharing` at `backlogged`. All artifacts now stable. No worktrees, no reapable branches, no orphaned completion flips. Diagram: `ui` still stale (unrelated prior Help-section edit, now compounded by this refine). Defects all-clear (last verified 2026-07-20). Keep this current as artifacts are refined and open questions are resolved._

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ (v2.2.1) | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | stable ✅ | — |
| design.md | stable ✅ | — |
| ui.md | stable ✅ | — |

## Open Questions

None. `ui.md`'s public sharing model question was resolved this pass.

## Cross-Artifact Issues

None. The new "Public sharing" section in `ui.md` is internally consistent with `constitution.md` Principle V (exportability, one-way once shared) and Principle VIII/production-annotation conventions (disclosed under `## Production Annotations` as non-revocable in v1). No new entities are implied that `datamodel.md` doesn't already support at the artifact-description level — the share-link mechanism itself is not yet schema-defined, which is expected at `backlogged` (planning will settle the data shape).

## Within-Artifact Issues

None found in this pass.

## Constitution Compliance

None. The non-revocable share-link decision is already disclosed under `ui.md`'s `## Production Annotations` heading, per Development Workflow item 3.

## Diagrams

- datamodel.md — current ✅
- infrastructure.md — current ✅
- ui.md — stale ⚠️ (run `/ardd-diagram ui`) — stale from the earlier Help & info text addition, now further out of date after the public-sharing section

## Code-vs-Artifact Defects

- **0 — `DEFECTS.md` all-clear, last verified 2026-07-20.** Run `/ardd-defects` again after the next substantive code change.

## Feedback

- 0 open. `feedback-move-up-down-reverts-on-reload-2fd0.md` (F001) — `planned`, bound to `plan-inline-help-and-move-fix`. `feedback-unranked-collapsible-pool-games-d07e.md` — `planned` earlier.

## Feature Backlog

- **1 backlogged** (`public-list-sharing`) · 0 planned · **1 tasked** (`in-app-help-and-info-text`) · **8 implemented** · **1 subsumed** (`revisit-ranking-modes`) — see `.project/features/`. Target `public-list-sharing` with `/ardd-plan public-list-sharing`.

## Documented but Untracked

- **Tiering** (`ranking_method = 'tier'`) — described in stable artifacts (constitution scope; `datamodel` enum) but has no register entry and no implementation. Flagged as a deliberate, undesigned deferral, not an oversight. Surface it with `/ardd-backlog --from-artifacts` only if/when it's actually wanted as planned work.

(Public sharing is no longer untracked — it now has its own register entry at `backlogged`.)

## Work Queue

- `tasks-inline-help-and-move-fix-d5db.md` — **ready, 0/9**, plan `plan-inline-help-and-move-fix-2026-07-21-683a.md`, feature `in-app-help-and-info-text` + feedback F001. Two independent tracks: Phase 1 (F001 fix) and Phases 2–3 (inline help) share no files. No other `ready` file to compare against, nothing in flight.
- `tasks-foundation-cd84.md` remains `in-progress` (41/46) — Phase 6 deliberately superseded, no worktree claims it.

## In Flight

Nothing in flight — no worktrees, no reapable branches.

## Deployment

`efficient-ordering-mode` (both migrations) is live on **staging and production** — production `ranking_method` CHECK verified `pairwise/efficient/tier`. The `manual`-retirement cleanup (endpoint deletion) is on staging; **not yet promoted to production** (a `promote-to-production` workflow_dispatch, gated on environment approval).

## Local Changes Not Yet Pushed

Uncommitted from this session: `.project/artifacts/ui.md` (status flip + public-sharing decision), `.project/features/public-list-sharing.md` (new), `.project/STATUS.md` (this refresh). Also still-uncommitted from the prior `/ardd-update` session: `.project/ardd-version.md`, `.project/README.md`. Local `main` is up to date with `origin/main` (a few unrelated dependabot merge commits sit on `origin/main` ahead of local history's last pull point, not this branch's own concern).

## ArDD Update

Up to date — installed `85407e4` (v1.1.0).

## Summary

0 issues found. Safe to /plan: yes. Recommended next step: **`/ardd-plan public-list-sharing`** — the newly backlogged feature is the freshest actionable item, and `ui.md`'s decision is now settled enough to plan against. (`tasks-inline-help-and-move-fix-d5db.md` remains `ready`, 9 tasks, as an alternate next step via `/ardd-implement` if preferred.)

Also pending (plain, not skill invocations): `ui.md` diagram is `stale` (`/ardd-diagram ui`); commit the uncommitted artifact/register/status changes from this session.
