# yet-another-rank-games — Project Status

_Updated: 2026-07-23 — `/ardd-status` full re-check after `tasks-inline-help-and-move-fix-d5db.md` completed (9/9) via a delegated worktree subagent and merged fast-forward into local `main`; the worktree was reaped. The `in-app-help-and-info-text` feature flipped `tasked` → `implemented`. `tasks-public-list-sharing-761a.md` is now the only `ready` tasks file — no other `ready` file remains to pair it against, so the Work Queue below is a single entry with no shared-artifact/shared-feature comparisons this pass. `datamodel.md` and `infrastructure.md` remain stale from an earlier session; `ui.md` is current. No defects, no orphaned completion flips, no in-flight worktrees._

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

None found. `datamodel.md`'s `List.is_shared`/`share_token` fields still match `ui.md`'s public-sharing description and `infrastructure.md`'s `/share/[token]` route section. The new inline-help/move-fix work (InfoPopover, moveOutcome domain logic, canonical-replay resync) is consistent with `ui.md`'s "Help & info text" section and the pairwise "advisory, WYSIWYG across reloads" note it was written against. No `[artifacts: ...]` mismatches.

## Within-Artifact Issues

None found — no unresolved `[OPEN: ...]` markers in any artifact.

## Constitution Compliance

None. No shortcut lacking a production annotation was found; the F001 fix is documented in the plan as removing a latent correctness gap rather than adding a new shortcut.

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-diagram datamodel`)
- infrastructure.md — stale ⚠️ (run `/ardd-diagram infrastructure`)
- ui.md — current ✅

## Code-vs-Artifact Defects

- 0 known defects — `DEFECTS.md` all-clear, last verified 2026-07-20. Run `/ardd-defects` again after the next substantive code change (the merged inline-help/move-fix work hasn't been re-verified against `DEFECTS.md` yet).

## Feedback

- 2 open — `feedback-move-up-down-reverts-on-reload-2fd0.md` (F001, `status: planned`) and `feedback-unranked-collapsible-pool-games-d07e.md` (`status: planned`).
  - **Note on F001**: the just-merged `tasks-inline-help-and-move-fix-d5db.md` (Phase 1, T001–T003 + T009) implements exactly the fix this feedback describes — canonical-replay resync in `PairwiseRanker` plus a surprising-result toast — and the plan (`plan-inline-help-and-move-fix-2026-07-21-683a.md`) explicitly names `feedback-move-up-down-reverts-on-reload-2fd0.md` as the F001 source it resolves. The feedback file itself, however, still reads `status: planned` with an empty `plan:` field — it was never stamped with the plan that picked it up. This looks addressed in substance but the feedback file's own bookkeeping is stale. `/ardd-status` does not write feedback files; updating it is `/ardd-feedback`'s or `/ardd-plan`'s call on a future pass.

## Feature Backlog

- 0 backlogged · 0 planned · **1 tasked** (`public-list-sharing`) · 9 implemented · 1 subsumed (`revisit-ranking-modes`) — see `.project/features/`.

## Documented but Untracked

- **Tiering** (`ranking_method = 'tier'`) — described in stable artifacts (constitution scope; `datamodel` enum) but has no register entry and no implementation. Flagged as a deliberate, undesigned deferral, not an oversight. Surface it with `/ardd-backlog --from-artifacts` only if/when it's actually wanted as planned work.

## Orphaned Completion Flips

None found. Ran `completion-flip-check.sh` against all 10 `status: completed` tasks files (including `tasks-inline-help-and-move-fix-d5db.md`) — no printed slugs; the register already correctly shows `in-app-help-and-info-text` as `implemented`.

## Work Queue

- `tasks-public-list-sharing-761a.md` — **ready, 0/6**, plan `plan-public-list-sharing-2026-07-23-810c.md`, feature `public-list-sharing`. No other `ready` tasks file exists to compare against (`tasks-inline-help-and-move-fix-d5db.md` completed and dropped out of the ready set this pass), and no in-flight worktree claims it.
- `tasks-foundation-cd84.md` remains `in-progress` (41/46) — Phase 6 deliberately superseded, no worktree claims it, not part of the ready-file comparison above.

## In Flight

Nothing in flight — no other worktrees (the `inline-help-and-move-fix` worktree was reaped after its fast-forward merge), no reapable branches, no draft PRs.

## Deployment

`efficient-ordering-mode` (both migrations) is live on **staging and production** — production `ranking_method` CHECK verified `pairwise/efficient/tier`. The `manual`-retirement cleanup (endpoint deletion) is on staging; **not yet promoted to production** (a `promote-to-production` workflow_dispatch, gated on environment approval). Status unchanged this pass — the inline-help/move-fix merge was app code, not a migration.

## Local Changes Not Yet Pushed

Local `main` is **ahead of `origin/main` by 14 commits, 0 behind** — working tree clean. The 14 unpushed commits span the public-list-sharing planning/register work plus the full inline-help-and-move-fix implementation (T001–T009), ending with the completion flip (`df83852`) and the feature-register flip to `implemented` (`19644e0`). Nothing is queued to reconcile from `origin/main` this pass (no new upstream commits since the prior report's dependabot merges were pulled in).

## ArDD Update

Up to date — installed `85407e4` (per `ardd-update-check.sh`: `up-to-date`).

## Summary

0 issues found this pass, aside from the F001 feedback-bookkeeping staleness noted above (advisory only, not a blocker). Safe to /plan: yes. Recommended next step: **`/ardd-implement tasks-public-list-sharing-761a.md`** — the only `ready` tasks file, with an approved plan and generated task list, ready to execute standalone (no shared-artifact/shared-feature contention now that the help/move-fix track has landed).

Also pending (plain, not skill invocations): regenerate the `datamodel` and `infrastructure` diagrams (`/ardd-diagram datamodel`, `/ardd-diagram infrastructure`); push the 14 unpushed local commits to `origin/main`.
