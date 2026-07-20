# yet-another-rank-games — Project Status

_Updated: 2026-07-20 (ArDD updated v0.10.2 → v1.0.2; full cross-artifact analyze run. The manual/drag-to-order deprecation recorded in `ui.md` has not propagated to `constitution.md`, `design.md`, or `datamodel.md` — this is the one substantive issue outstanding.) Keep this current as artifacts are refined and open questions are resolved._

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

  **Open:** whether any `ranking_method = 'manual'` rows actually exist in staging/production is still unverified — the DB query was blocked by the permission classifier. If the count is zero everywhere, retiring this properly is just a code deletion; if not, it needs a data migration first. Either way it is deferred to `revisit-ranking-modes`.
- **[GAP] `List.status = 'complete'` is displayed but unproducible.** `datamodel.md:186` defines the enum; `ui.md:101` displays it. No artifact defines the transition, and `ui.md:123-134` makes completion *derived* UI state with no new persisted field. Code confirms nothing ever writes `'complete'` to a list row. Either define the writer or drop the value and derive it.
- **[MINOR] Import status vocabulary differs.** `datamodel.md:99` enum is `idle|importing|complete|failed`; `ui.md:31` describes "queued → fetching → processing → done". Almost certainly presentation labels over the enum (`src/lib/domain/importView.ts` maps them) — wants one clarifying sentence, not a fix.

Clean sub-checks: every field `ui.md` displays or branches on exists in `datamodel.md`; storage decisions in `datamodel.md` and `infrastructure.md` agree (Postgres-on-Supabase, RLS off with app-code ownership, Kysely/`postgres.js`, CLI SQL migrations); all cross-referenced endpoints are defined by their owning artifact.

## Constitution Compliance

- ✅ **[RESOLVED 2026-07-20] Governance violation.** Scope and Principle VI described drag-to-order inaccurately after its deprecation, without rationale, Sync Impact Report, or version bump. Amended through **v2.1.1**, each step with all three. Also corrected a stale `/ardd-critique` → `/ardd-audit` reference in Development Workflow item 3.
- Note: the v2.1.0 → v2.1.1 step is itself a worked example of Principle VIII applied to the governing document — v2.1.0 was written from an artifact's claim rather than from the code, and verification against the code reversed it.
- Not a violation: retaining `ManualRanker`/`svelte-dnd-action` in the tree is properly disclosed under `ui.md`'s Production Annotations per Development Workflow rule 3. The gap is that `design.md:84,95` repeats the components as current *without* such an annotation.
- Shortcut annotation coverage otherwise clean (RLS-off, single-region, free tier, no-soft-delete, lean component library, sharing model). Principle IV cost ceilings clean — every autoscaling/retry surface has a stated cap.

## Feature Backlog

- **2 backlogged** (`revisit-ranking-modes`, `in-app-help-and-info-text`) · 0 planned · 0 tasked · **7 implemented** (`bgg-geeklist-export`, `bgg-game-search-import`, `custom-domain-mapping`, `collection-editing-and-resync`, `bgg-cover-art-and-card-view`, `pool-completion-celebration`, `manual-pairwise-ranking-adjust`) — see `.project/features/`. Target either with `/ardd-plan <slug>` when ready to design it; no work in flight.

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

- 1 file at `status: planned` (`feedback-unranked-collapsible-pool-games-d07e.md`) — already consumed by a plan, not open.

## In Flight

Nothing in flight. (Stale local branch `worktree-agent-adf423a6f0eb76edc` has no worktree attached and can be deleted.)

## Housekeeping

- `.gitignore:26` blanket-ignores `.claude/`, which also blocks `.claude/settings.json`, `.claude/agents/`, `.claude/commands/`, and any hand-written skill. Nothing is currently lost (no such files exist); narrow to `.claude/skills/ardd-*/` preventively.
- README ArDD version badge reads `v0.10.2`; installed is now `v1.0.2`.
- `.project/.gitattributes` marks generated reports `merge=ours` but this clone has no driver: `git config merge.ours.driver true`.

## Recommended Next Step

Artifacts are internally consistent again and `/ardd-plan` is unblocked. Two things worth doing before planning new work:

1. **Confirm whether any `ranking_method = 'manual'` rows exist** in staging (`ujaxenitxmnmxcqkoddy`) and production (`tmncunthbcfdaolqswcq`). This determines whether retiring the drag view is a code deletion or needs a data migration, and whether the drag interaction currently sits inside the live AA release gate. Everything else about this deprecation is now recorded accurately; only this fact is missing.
2. **`/ardd-defects`** — the last run was 2026-07-16 and predates all of today's artifact changes. Given that a documented claim ("not user-reachable") turned out to contradict the code, a fresh code-vs-artifact pass is worth more than usual.

Then `/ardd-plan revisit-ranking-modes`, which is where the actual retirement of manual ranking belongs.
