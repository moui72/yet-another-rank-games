# yet-another-rank-games — Project Status

_Updated: 2026-07-24 — `/ardd-status` full re-check after `tasks-b47a-e7b6.md`
completed via a delegated worktree subagent and merged (fast-forward, no
conflicts) back into local `main`; the worktree has been reaped (no
`b47a` branch remains). The fix — a `waitForLoadState('networkidle')` wait
added to `e2e/sharing.spec.ts`'s "public /share/[token] view" test — was
verified with a real e2e run (Docker available this pass): the original
failure was reproduced with the fix stashed, then 3 repeated passes
confirmed with it applied. `tasks-b47a-e7b6.md` is now `status: completed`
(1/1, no bound features). While verifying, a new bug was found and logged:
`feedback-seedpoolandlist-missing-list-entries-4281.md` (F001, `status:
open`) — the e2e test helper `seedPoolAndList` never inserts `list_entries`
rows, a test-fixture data-seeding gap unrelated to the hydration-race fix.
Feedback is now 1 open, 4 planned. Feature register unchanged (0
backlogged, 0 planned, 0 tasked, 10 implemented, 1 subsumed). No `ready`
tasks files remain (Work Queue empty); `tasks-foundation-cd84.md` is
`in-progress` (41/46), not ready. No in-flight worktrees. `datamodel.md`
and `infrastructure.md` remain stale; `ui.md` is current. Local `main` is
ahead of `origin/main` by 5 commits (not yet pushed)._

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

None found. The just-merged change is test-only (Playwright timing fix in
`e2e/sharing.spec.ts`) with no bound features and no artifact-level claims —
nothing in `ui.md` or `design.md` is contradicted or implicated.

## Within-Artifact Issues

None found — no unresolved `[OPEN: ...]` markers in any artifact.

## Constitution Compliance

None. The merged fix is test-only (`waitForLoadState('networkidle')`); it
introduces no product-facing shortcut and needs no production annotation.

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-diagram datamodel`)
- infrastructure.md — stale ⚠️ (run `/ardd-diagram infrastructure`)
- ui.md — current ✅

## Code-vs-Artifact Defects

- 0 known defects — `DEFECTS.md` all-clear, last verified 2026-07-20. Run
  `/ardd-defects` to refresh (unchanged this pass — the merged change was
  test-only, no product code changed).

## Feedback

- 1 open feedback file (`feedback-seedpoolandlist-missing-list-entries-4281.md`,
  F001: `seedPoolAndList` never inserts `list_entries` rows) — see
  `.project/feedback/`, will be picked up by the next `/ardd-plan`.
- 4 planned (already bound to plans, awaiting/undergoing implementation):
  `feedback-e2e-hydration-race-flake-7eda.md` (now resolved by the merged
  fix — flip to consider on next `/ardd-plan` pass),
  `feedback-move-up-down-reverts-on-reload-2fd0.md`,
  `feedback-public-list-sharing-clipboard-2f0e.md`,
  `feedback-unranked-collapsible-pool-games-d07e.md`.

## Feature Backlog

- 0 backlogged · 0 planned · 0 tasked · 10 implemented · 1 subsumed
  (`revisit-ranking-modes`) — see `.project/features/`. Unchanged this pass;
  the merged tasks file bound no features.

## Documented but Untracked

- **Tiering** (`ranking_method = 'tier'`) — described in stable artifacts
  (constitution scope; `datamodel` enum) but has no register entry and no
  implementation. Flagged as a deliberate, undesigned deferral, not an
  oversight. Surface it with `/ardd-backlog --from-artifacts` only if/when
  it's actually wanted as planned work.

## Orphaned Completion Flips

None found. Ran `completion-flip-check.sh` against all `status: completed`
tasks files (13 of them; 14 tasks files total, `tasks-foundation-cd84.md`
excluded as `in-progress`) — no printed slugs, including the newly
completed `tasks-b47a-e7b6.md`.

## Work Queue

No `ready` tasks files exist this pass — section omitted per convention.
`tasks-b47a-e7b6.md` completed and merged; no replacement `ready` file has
been generated yet. `tasks-foundation-cd84.md` remains `in-progress`
(41/46), not `ready`, so `parallel-matrix.sh` had nothing to compare.

## In Flight

Nothing in flight — `inflight-worktrees.sh` found no other worktrees,
`worktree-reap.sh --dry-run` found no reapable candidates (the b47a
worktree is already gone, reaped post-merge), and no draft PRs apply
(`workflow_mode: solo`).

## Deployment

`efficient-ordering-mode` (both migrations), the `public-list-sharing`
migration (`lists.is_shared`/`lists.share_token`) — deployment status
unchanged this pass; the merged change was e2e-test-only, nothing to
deploy.

## Local Changes Not Yet Pushed

Local `main` is ahead of `origin/main` by 5 commits (0 behind), working
tree clean:
- `1b82011` chore(delegation): auto-commit b47a plan/tasks before delegating
- `ade1971` chore: flip tasks-b47a-e7b6 to in-progress
- `8bb624f` fix(e2e): wait for hydration before checkbox in public share view test (T001)
- `c4db77d` chore: flip tasks-b47a-e7b6 to completed
- `750c2b5` feedback: log seedPoolAndList missing list_entries gap

## ArDD Update

Up to date — installed `85407e4a` (per `ardd-update-check.sh`: `up-to-date`).

## Summary

0 issues found this pass. Safe to /plan: yes. Recommended next step: push
the 5 unpushed local commits to `origin/main`, then either (a) run
`/ardd-plan` on the newly logged open feedback
(`feedback-seedpoolandlist-missing-list-entries-4281.md`, the
`seedPoolAndList` list_entries gap) since it's the only open item not yet
bound to a plan, or (b) resume `tasks-foundation-cd84.md` (41/46, already
in progress). No `ready` tasks file is queued, so there is no single
"the" next `/ardd-implement` target this pass.
