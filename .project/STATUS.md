# yet-another-rank-games — Project Status

_Updated: 2026-07-20 (efficient-ordering-mode implemented and merged to main — 23 tasks, delegated worktree run, fast-forward merge at 776f188. Two migrations merged but NOT yet applied to hosted DBs — see Deployment below. Constitution at v2.2.0.) Keep this current as artifacts are refined and open questions are resolved._

## ⚠️ Deployment — action needed

The `efficient-ordering-mode` merge added **two migrations that are not yet applied to staging or production**:
- `20260720000000_ranking_method_add_efficient.sql` — additive, safe on existing rows.
- `20260720010000_ranking_method_drop_manual.sql` — drops `manual` from the `ranking_method` CHECK. Self-guarding (the recreate fails if any `manual` row exists); verified zero rows in both environments during T021.

As of this update, both hosted DBs are still at migration `20260715220100`. These deploy through the normal pipeline on merge/deploy — **confirm they actually applied to staging, then production, before considering the feature live.** Order matters only in that the drop must not precede the add on any single environment; since they share a deploy they apply in filename order, which is correct.

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
- Public sharing model — whether a list can be exposed as a read-only shared view (deferred product decision, `ui.md:216`). Disclosed under Production Annotations (`ui.md:238`), not hidden.

## Cross-Artifact Issues

- ✅ **[RESOLVED 2026-07-20] Manual drag-to-order deprecation now consistent across all four artifacts** — and corrected on a point every one of them had wrong.

  **The deprecation removed the creation path, not the render path.** `src/routes/lists/[id]/+page.server.ts:27` still branches on `list.rankingMethod === 'manual'` and renders the `svelte-dnd-action` view; no migration ever converted existing rows (`ranking_method` appears only in the initial schema). So any list created before the change still loads the drag view. `ui.md`'s claim that it was "not user-reachable" was wrong — *not creatable* is not *not reachable*.

  - `constitution.md` — v2.0.0 → **v2.1.1**. Scope says pairwise is sole method "for new lists"; Principle VI's AA gate explicitly **retains** drag-to-order for as long as its render path is reachable. (v2.1.0 had wrongly dropped it from the gate on the strength of ui.md's claim; v2.1.1 corrects that.)
  - `design.md` — signature-motif and shared-component lines now mark `ManualRanker` deprecated; new Production Annotation covers the live render path, the retained `svelte-dnd-action` dependency, and the AA-gate consequence.
  - `datamodel.md` — Overview and `ListEntry` sections mark `manual` deprecated-but-read; new Production Annotation records that no migration converted the rows, that `ListEntry` therefore has two sources of truth by method, and what full retirement would require.
  - `ui.md` — the inaccurate "not user-reachable" annotation corrected.

  **Measured 2026-07-20: zero `manual` rows in either environment** (production 3 lists, staging 1, all `pairwise`). So the drag view is unreachable in practice today, and retiring it needs **no data migration** — just dropping the enum value, `ManualRanker.svelte`, `svelte-dnd-action`, and the `mode === 'manual'` branches. Constitution v2.1.1's conditional wording ("gated for as long as the render path is reachable") was deliberately left in place rather than reverted: it is now satisfied vacuously, and stays correct if a manual row is ever seeded for testing. Superseded in direction anyway — `efficient-ordering-mode` brings drag-and-drop back deliberately.
- **[GAP] `List.status = 'complete'` is displayed but unproducible.** `datamodel.md:186` defines the enum; `ui.md:101` displays it. No artifact defines the transition, and `ui.md:123-134` makes completion *derived* UI state with no new persisted field. Code confirms nothing ever writes `'complete'` to a list row. Either define the writer or drop the value and derive it.
- **[MINOR] Import status vocabulary differs.** `datamodel.md:99` enum is `idle|importing|complete|failed`; `ui.md:31` describes "queued → fetching → processing → done". Almost certainly presentation labels over the enum (`src/lib/domain/importView.ts` maps them) — wants one clarifying sentence, not a fix.

Clean sub-checks: every field `ui.md` displays or branches on exists in `datamodel.md`; storage decisions in `datamodel.md` and `infrastructure.md` agree (Postgres-on-Supabase, RLS off with app-code ownership, Kysely/`postgres.js`, CLI SQL migrations); all cross-referenced endpoints are defined by their owning artifact.

## Constitution Compliance

- ✅ **[RESOLVED 2026-07-20] Governance violation.** Scope and Principle VI described drag-to-order inaccurately after its deprecation, without rationale, Sync Impact Report, or version bump. Amended through **v2.1.1**, each step with all three. Also corrected a stale `/ardd-critique` → `/ardd-audit` reference in Development Workflow item 3.
- Note: the v2.1.0 → v2.1.1 step is itself a worked example of Principle VIII applied to the governing document — v2.1.0 was written from an artifact's claim rather than from the code, and verification against the code reversed it.
- Not a violation: retaining `ManualRanker`/`svelte-dnd-action` in the tree is properly disclosed under `ui.md`'s Production Annotations per Development Workflow rule 3. The gap is that `design.md:84,95` repeats the components as current *without* such an annotation.
- Shortcut annotation coverage otherwise clean (RLS-off, single-region, free tier, no-soft-delete, lean component library, sharing model). Principle IV cost ceilings clean — every autoscaling/retry surface has a stated cap.

## Feature Backlog

- **1 backlogged** (`in-app-help-and-info-text`) · 0 planned · **1 tasked** (`efficient-ordering-mode`) · **7 implemented** · **1 subsumed** (`revisit-ranking-modes`) — see `.project/features/`.
- `revisit-ranking-modes` subsumed 2026-07-20: `efficient-ordering-mode` answers its "reworked manual/override mode" half. **Tiering is not covered by it and is now untracked** — log a fresh entry if it is ever wanted.

## Plans & Tasks

- `research-manual-pairwise-ranking-adjustment-2026-07-14-5810.md` — proposal-vetting research, consumed by the plan below. Key finding: implement as synthetic comparisons through the existing `Comparison`/derived-order model, not an authored-position override.
- `plan-manual-pairwise-ranking-adjust-2026-07-15-3db7.md` — approved; `tasks-manual-pairwise-ranking-adjust-97c6.md` **completed, 3/3**. Merged to `main`. Delivered: `PairwiseSession.moveUp`/`moveDown` (each emitting one synthetic `Comparison` through the existing `choose()` path) and move-up/move-down buttons per Ranked row (chosen over drag-and-drop — accessible by construction, no new dependency). No `datamodel.md` changes.
- `plan-pool-completion-celebration-2026-07-14-0bde.md` — approved; `tasks-pool-completion-celebration-11a1.md` **completed, 5/5**. Merged to `main`.
- `plan-bgg-cover-art-and-card-view-2026-07-14-3c32.md` — approved; `tasks-bgg-cover-art-and-card-view-6090.md` **completed, 8/8**. Merged to `main`.
- `research-collection-editing-and-resync-reconciliation-2026-07-14-47f7.md` — proposal-vetting research, consumed by the plan below.
- `plan-collection-editing-and-resync-2026-07-14-d0af.md` — approved; `tasks-collection-editing-and-resync-b3ff.md` **completed, 15/15**. Merged to `main`.
- `plan-foundation-2026-07-10.md` — approved; `tasks-foundation-cd84.md` **in-progress, 41/46**. Its remaining Phase 6 (T035–T039) is **superseded** by the multi-env-deploy plan; the file stays as the record of Phases 0–5. (Deliberate, not stalled — it will keep reading `in-progress` in tooling output. `/ardd-implement --reconcile` on it would close the discrepancy if the permanent `in-progress` ever becomes noise.)
- `plan-bgg-geeklist-and-search-2026-07-12.md` — approved; `tasks-bgg-geeklist-and-search-2299.md` **completed, 7/7**. Shipped + merged.
- `plan-multi-env-deploy-2026-07-12.md` — approved; `tasks-multi-env-deploy-5928.md` **completed, 8/8**. Merged to `main`.
- `plan-custom-domain-mapping-2026-07-13-53ec.md` — approved; `tasks-custom-domain-mapping-6ce2.md` **completed, 7/7**. Merged to `main`. Production's web Cloud Run service is live at `https://yarg.ty-pe.com`.

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-diagram datamodel`) — refined 2026-07-20, though the edits were prose/annotations only, so the rendered diagram likely has no structural change
- infrastructure.md — current ✅
- ui.md — stale ⚠️ (run `/ardd-diagram ui`) — same caveat

## Code-vs-Artifact Defects

- 0 known defects — see `DEFECTS.md`, last checked 2026-07-16. Run `/ardd-defects` to refresh; note that check predates the artifact drift recorded above.

## Audit

`.project/audit.md` — all 5 findings resolved at both the artifact and code level. Nothing outstanding.

## Feedback

- **1 open** (`feedback-move-up-down-reverts-on-reload-2fd0.md`) — will be picked up by the next `/ardd-plan`.

  **A shipped move-up/move-down adjustment can silently revert on reload.** `PairwiseSession.moveUp` emits one synthetic `Comparison` per move, but an override contradicting several earlier judgments needs 3–4 repeats against the same pair to flip the openskill rating — and `recordComparison` upserts on the unique `(list_id, game_a, game_b)`, so only one row per pair ever persists. Session holds N, replay sees 1. Likely a regression: the unique constraint (migration `20260715220000`) and `manual-pairwise-ranking-adjust` both landed 2026-07-15. **Not yet reproduced against a running app** — found by code reading plus the research simulation; confirm before fixing. Note the research recommends a direction that would dissolve this bug rather than patch it, so weigh the fix against that.
- 1 file at `status: planned` (`feedback-unranked-collapsible-pool-games-d07e.md`) — already consumed by a plan, not open.

## In Flight

Nothing in flight. (Stale local branch `worktree-agent-adf423a6f0eb76edc` has no worktree attached and can be deleted.)

## Housekeeping

- `.gitignore:26` blanket-ignores `.claude/`, which also blocks `.claude/settings.json`, `.claude/agents/`, `.claude/commands/`, and any hand-written skill. Nothing is currently lost (no such files exist); narrow to `.claude/skills/ardd-*/` preventively.
- README ArDD version badge reads `v0.10.2`; installed is now `v1.0.2`.
- `.project/.gitattributes` marks generated reports `merge=ours` but this clone has no driver: `git config merge.ours.driver true`.

## Research

- `research-efficient-durable-secondary-ranking-mode-2026-07-20-d22b.md` — chose the design for `efficient-ordering-mode`. Falsified the cheap hypothesis (reuse the rating model, swap only the selection policy) on both prongs by simulation against the repo's own `openskill@5.0.1`: the existing selector is *already* information-gain (`ranking.ts:121`) with a novelty filter on top, and removing that filter converged no better; the rating model needs ~4× the comparisons of binary insertion (n=50: ~957 vs 237). Synthetic comparisons into a rating model also honour an override only approximately. Recommends a constraint-graph mode over the existing `Comparison` table. Cites Maystre & Grossglauser 2017, Jamieson & Nowak 2011, Herbrich et al. 2006, Weng & Lin 2011, Feige et al. 1994, Braverman & Mossel 2008; simulation results are the agent's own, marked as such. Also flags an accessibility gap: move-up/move-down gives keyboard parity for short moves but not for long ones — suggests a "move to position N" input.

## Work Queue

- No ready tasks files. `tasks-efficient-ordering-mode-8403.md` reached `completed`; `tasks-foundation-cd84.md` stays `in-progress` (41/46), its remaining Phase 6 deliberately superseded by multi-env-deploy.

## Known follow-ups from the efficient-ordering-mode merge

- **Dead endpoint:** `src/routes/api/lists/[id]/reorder/+server.ts` was `ManualRanker`'s only caller (`EfficientRanker` uses `/override`). It doesn't reference the retired enum value, so it fell outside the retirement tasks and is still present — Principle VIII (No Dead Architecture) says it should go. Small `/ardd-feedback` or a direct cleanup.
- **Open feedback still unaddressed:** the pairwise `moveUp`-reverts-on-reload bug (`feedback-move-up-down-reverts-on-reload-2fd0.md`) — the new mode doesn't have it, but the *pairwise* mode still does. Unreproduced against a running app.

## Recommended Next Step

1. **Confirm the two migrations applied** to staging then production (see Deployment above) — the feature isn't actually usable until they do.
2. **`/ardd-defects`** — last run 2026-07-16, before all of this session's changes. The retirement of `manual` was written into the artifacts ahead of code across several steps; a fresh code-vs-artifact pass confirms the tree and docs now agree (they should).
3. **`/ardd-diagram datamodel` / `/ardd-diagram ui`** — both flagged `stale` after this session's edits; the enum and view changes are real diagram content this time, not just prose.

Housekeeping still pending: `.gitignore` breadth, README ArDD badge still reading v0.10.2 (installed is v1.0.2), `merge.ours.driver`.
