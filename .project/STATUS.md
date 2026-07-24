# yet-another-rank-games — Project Status

_Updated: 2026-07-24 — `/ardd-status` full re-check after `/ardd-feedback` logged
`feedback-public-list-sharing-clipboard-2f0e.md` (`status: open`), covering two
bugs found inspecting the merged `public-list-sharing` implementation: F001
(`copyShareLink` has no try/catch around `navigator.clipboard.writeText`, so a
rejected clipboard write silently no-ops with no user feedback) and F002
(`e2e/sharing.spec.ts`'s copy-link test doesn't grant Playwright clipboard
permissions, so it may be a false-positive pass rather than a real regression
check). This is the 3rd open-or-planned feedback file; 1 is `open` (this new
one) and 2 remain `planned` from earlier sessions, unchanged this pass. No
`ready` tasks file exists (`tasks-foundation-cd84.md` remains `in-progress`,
41/46). No in-flight worktrees. `datamodel.md` and `infrastructure.md` remain
stale; `ui.md` is current. Local `main` unchanged at 9 commits ahead of
`origin/main`, 0 behind._

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

None found. The new feedback file's two bugs are implementation-level (missing
error handling in a `.svelte` component; a Playwright test gap) and don't
imply any artifact needs to change — `ui.md`'s public-sharing description
doesn't specify clipboard-failure UX or test-harness permissions, so nothing
in it is contradicted. No `[artifacts: ...]` mismatches.

## Within-Artifact Issues

None found — no unresolved `[OPEN: ...]` markers in any artifact.

## Constitution Compliance

None. Both new feedback bugs are pre-existing implementation gaps, not new
shortcuts requiring a production annotation.

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-diagram datamodel`)
- infrastructure.md — stale ⚠️ (run `/ardd-diagram infrastructure`)
- ui.md — current ✅

## Code-vs-Artifact Defects

- 0 known defects — `DEFECTS.md` all-clear, last verified 2026-07-20. Run
  `/ardd-defects` to refresh (unchanged since last pass).

## Feedback

- 1 open — `feedback-public-list-sharing-clipboard-2f0e.md` (F001 missing
  clipboard try/catch, F002 e2e clipboard-permissions gap), newly logged this
  pass. 2 more remain `status: planned` (already bound to addressing plans,
  not counted as open): `feedback-move-up-down-reverts-on-reload-2fd0.md` and
  `feedback-unranked-collapsible-pool-games-d07e.md`. 3 feedback files total.

## Feature Backlog

- 0 backlogged · 0 planned · 0 tasked · 10 implemented · 1 subsumed
  (`revisit-ranking-modes`) — see `.project/features/`.

## Documented but Untracked

- **Tiering** (`ranking_method = 'tier'`) — described in stable artifacts
  (constitution scope; `datamodel` enum) but has no register entry and no
  implementation. Flagged as a deliberate, undesigned deferral, not an
  oversight. Surface it with `/ardd-backlog --from-artifacts` only if/when
  it's actually wanted as planned work.

## Orphaned Completion Flips

None found. Ran `completion-flip-check.sh` against all `status: completed`
tasks files — no printed slugs.

## Work Queue

No `ready` tasks file exists this pass. `tasks-foundation-cd84.md` remains
`in-progress` (41/46) and is not part of the ready-file comparison.

## In Flight

Nothing in flight — no other worktrees, no reapable branches, no draft PRs.

## Deployment

`efficient-ordering-mode` (both migrations) and the `public-list-sharing`
migration (`lists.is_shared`/`lists.share_token`) remain unchanged this pass
— the latter still exists only on local `main`, not yet pushed.

## Local Changes Not Yet Pushed

Local `main` is **ahead of `origin/main` by 9 commits, 0 behind** — unchanged
this pass (working tree otherwise clean aside from this `STATUS.md` update).

## ArDD Update

Up to date — installed `85407e4a` (per `ardd-update-check.sh`: `up-to-date`).

## Summary

0 issues found this pass beyond the newly logged open feedback (expected,
not a defect). Safe to /plan: yes. Recommended next step: `/ardd-plan` to
fold the newly opened `feedback-public-list-sharing-clipboard-2f0e.md`
(F001/F002) together with the two already-`planned` feedback files into the
next plan.

Also pending (plain, not skill invocations): regenerate the `datamodel` and
`infrastructure` diagrams (`/ardd-diagram datamodel`, `/ardd-diagram
infrastructure`); push the 9 unpushed local commits to `origin/main`.
