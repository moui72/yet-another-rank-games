# yet-another-rank-games — Project Status

_Updated: 2026-07-16 (all 3 code-vs-artifact defects repaired and verified: `list_entries.tier` dropped via migration, `Comparison (list_id, game_a, game_b)` unique constraint + canonical-order upsert added and migrated, `manual` ranking option removed from list creation. Full suite green: 132 unit + 72 integration tests, lint clean, 0 typecheck errors). Keep this current as artifacts are refined and open questions are resolved._

ARDD update available: installed `7c5dcd0`, latest release `v0.10.0` — run `/ardd-update`.

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
- Public sharing model — whether a list can be exposed as a read-only shared view (deferred product decision).

## Feature Backlog

- **1 backlogged** (`revisit-ranking-modes`) · 0 planned · 0 tasked · **7 implemented** (`bgg-geeklist-export`, `bgg-game-search-import`, `custom-domain-mapping`, `collection-editing-and-resync`, `bgg-cover-art-and-card-view`, `pool-completion-celebration`, `manual-pairwise-ranking-adjust`) — see `.project/features/`. Target `revisit-ranking-modes` with `/ardd-plan revisit-ranking-modes` when ready to design it; no work in flight.

## Plans & Tasks

- `research-manual-pairwise-ranking-adjustment-2026-07-14-5810.md` — proposal-vetting research, consumed by the plan below. Key finding: implement as synthetic comparisons through the existing `Comparison`/derived-order model, not an authored-position override.
- `plan-manual-pairwise-ranking-adjust-2026-07-15-3db7.md` — approved; `tasks-manual-pairwise-ranking-adjust-97c6.md` **completed, 3/3**. Merged to `main`. Delivered: `PairwiseSession.moveUp`/`moveDown` (each emitting one synthetic `Comparison` through the existing `choose()` path) and move-up/move-down buttons per Ranked row (chosen over drag-and-drop — accessible by construction, no new dependency). No `datamodel.md` changes. Full suite green: 132 unit + e2e (including a new axe accessibility scan, zero violations); lint/typecheck clean.
- `plan-pool-completion-celebration-2026-07-14-0bde.md` — approved; `tasks-pool-completion-celebration-11a1.md` **completed, 5/5**. Merged to `main`.
- `plan-bgg-cover-art-and-card-view-2026-07-14-3c32.md` — approved; `tasks-bgg-cover-art-and-card-view-6090.md` **completed, 8/8**. Merged to `main`.
- `research-collection-editing-and-resync-reconciliation-2026-07-14-47f7.md` — proposal-vetting research, consumed by the plan below.
- `plan-collection-editing-and-resync-2026-07-14-d0af.md` — approved; `tasks-collection-editing-and-resync-b3ff.md` **completed, 15/15**. Merged to `main`.
- `plan-foundation-2026-07-10.md` — approved; `tasks-foundation-cd84.md` **in-progress, 41/46**. Its remaining Phase 6 (T035–T039) is **superseded** by the multi-env-deploy plan; the file stays as the record of Phases 0–5.
- `plan-bgg-geeklist-and-search-2026-07-12.md` — approved; `tasks-bgg-geeklist-and-search-2299.md` **completed, 7/7**. Shipped + merged.
- `plan-multi-env-deploy-2026-07-12.md` — approved; `tasks-multi-env-deploy-5928.md` **completed, 8/8**. Merged to `main`.
- `plan-custom-domain-mapping-2026-07-13-53ec.md` — approved; `tasks-custom-domain-mapping-6ce2.md` **completed, 7/7**. Merged to `main`. Production's web Cloud Run service is live at `https://yarg.ty-pe.com`.

## Diagrams

- datamodel.md — current ✅ (regenerated: `Comparison.game_a`/`game_b` now marked `UK` for the new unique constraint)
- infrastructure.md — current ✅ (regenerated; no structural change)
- ui.md — current ✅ (regenerated: Manual drag-to-order view and its edges removed; List management view node updated to reflect pairwise-only)

No defects — last checked 2026-07-16. The 3 defects from the prior run (audit
decisions documented ahead of code) are now fixed and verified against a real
local Postgres: `ListEntry.tier` dropped (migration
`20260715220100_list_entries_drop_tier.sql`); `Comparison (list_id, game_a,
game_b)` unique constraint + canonical-order upsert added (migration
`20260715220000_comparisons_canonical_unique.sql`, `recordComparison`
updated, new integration test `comparisons.integration.test.ts` 3/3 passing);
`manual` ranking option removed from the list-creation form
(`/pools/[id]/+page.svelte`, `+page.server.ts`).

## Audit

`.project/audit.md` — all 5 findings resolved, both at the artifact level and
now in code: `ListEntry.tier` removed; `Comparison` unique constraint +
upsert added; pool filter `include` decided as AND-all (already implemented
in `pools.ts`, plus a Production Annotation flagging the filter UI for a
future rework); manual ranking method deprecated in favor of pairwise-only
(`revisit-ranking-modes` backlogged); constitution shrunk from 15 to 11
principles (v2.0.0). Nothing outstanding.

## Feedback

- 1 file at `status: planned` (`feedback-unranked-collapsible-pool-games-d07e.md`) — already consumed by a plan, not open.

## In Flight

Nothing in flight — the manual-pairwise-ranking-adjust worktree merged and was removed this run.

## Recommended Next Step

All code-vs-artifact defects are closed and the full suite is green. `revisit-ranking-modes` is backlogged and ready for `/ardd-plan revisit-ranking-modes` whenever you want to design what (if anything) replaces manual ranking. `ui.md`'s public-sharing open question has no urgency, and the ARDD tool itself has an update available (`/ardd-update`). Consider committing the pending changes (2 new migrations, `recordComparison`/`schema`/`entities` edits, list-creation UI/server changes, `comparisons.integration.test.ts`, and the `.project/` doc updates).
