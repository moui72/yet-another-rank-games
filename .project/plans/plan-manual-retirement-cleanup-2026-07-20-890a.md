---
status: approved
branch: manual-retirement-cleanup
created: 2026-07-20
features: []
surfaced-defects: [effeeb6d, eeff61e9, 32c46184, a4eccafc]
---

# Plan: Manual-retirement cleanup

## Goal

Close the four code-vs-artifact defects left by the `manual`-mode retirement:
delete the one reachable endpoint that still writes authored `ListEntry`
positions, and correct three stale artifact wordings that now describe a mode
the code no longer has.

## Scope

**In scope**

- **Delete `POST /api/lists/[id]/reorder`** (defect `effeeb6d`) — the retired
  `ManualRanker`'s persist path. Removing it resolves both the datamodel
  "never authored" invariant and constitution Principle VIII in one change.
- **Three artifact wording corrections** (defects `eeff61e9`, `32c46184`,
  `a4eccafc`) — bring the artifact bodies back in line with the shipped code.

**Out of scope**

- `replaceListEntries` (`src/lib/server/repositories/listEntries.ts`) — it
  stays. The recompute path (`src/lib/server/ranking.ts:51,71`) is its real
  caller; only the endpoint's *use* of it goes.
- The still-open pairwise `moveUp`-reverts-on-reload feedback
  (`feedback-move-up-down-reverts-on-reload-2fd0.md`) — a separate concern,
  not a defect, not in this plan.
- Any behavior change to the two live ranking modes.

## Technical Approach

Straightforward removal + documentation correction; no new mechanism. The
endpoint is confirmed orphaned — no component or e2e test fetches `/reorder`
(the only `e2e/ranking.spec.ts` "reorder" reference is a test *name* for the
pairwise move-up/down feature, which uses `/compare`, not this endpoint). The
three wording defects are recorded in `DEFECTS.md` with exact locations; each
is a factual correction, not a design change. The two `constitution.md`
corrections are PATCH-level per Governance (wording fixes, no rule change), so
they carry a Sync Impact Report entry and a version bump to keep the amendment
trail honest — the datamodel note does not (no versioning on that artifact).

## Phase Breakdown

### Phase 1 — Delete the authored-write endpoint (defect effeeb6d)

- Remove `src/routes/api/lists/[id]/reorder/+server.ts` and its now-empty route
  directory. Verify no dangling imports and that `replaceListEntries` still has
  its legitimate callers in `ranking.ts`. Full suite + typecheck green;
  `e2e/ranking.spec.ts` still passes (it never called this endpoint).

*Depends on:* nothing.

### Phase 2 — Correct the stale artifact wordings

Independent of Phase 1; all three are documentation edits.

- `datamodel.md` `ListEntry.score` note (defect `eeff61e9`).
- `constitution.md` Principle VI reachable-render-path clause (defect
  `32c46184`) — PATCH bump + Sync Impact Report.
- `constitution.md` "no migration was needed" scope line (defect `a4eccafc`) —
  folded into the same PATCH bump (one amendment covers both constitution
  corrections).

*Depends on:* nothing (can run before, after, or alongside Phase 1).

## Complexity Tracking

None — this plan is a net reduction in surface area (one endpoint removed, no
mechanism added). Recorded per constitution Principle VII to make the "no
deviation" explicit rather than silent.

## Open Questions

- None. All four defects have unambiguous fixes; the only judgment already made
  (keep `replaceListEntries`, delete only the endpoint) is settled in Scope.

## Production Annotation Summary

- No new production shortcuts. This plan *removes* the last remnant of a
  retired mode rather than annotating a new gap; the manual-retirement
  Production Annotations in `datamodel.md`/`ui.md` remain accurate after it.
