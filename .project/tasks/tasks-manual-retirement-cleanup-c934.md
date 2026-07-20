---
plan: plan-manual-retirement-cleanup-2026-07-20-890a.md
generated: 2026-07-20
status: in-progress
---

# Tasks

## Phase 1: Delete the authored-write endpoint

- [x] T001 [defect: effeeb6d] Delete `src/routes/api/lists/[id]/reorder/+server.ts` and remove its now-empty `reorder/` route directory. This is the retired ManualRanker persist path — a reachable `POST /api/lists/{id}/reorder` that writes authored `ListEntry` positions from a client `gameIds` array, violating datamodel's "ListEntry is never authored" invariant and constitution Principle VIII. Do NOT touch `replaceListEntries` in `src/lib/server/repositories/listEntries.ts` — it stays; its real callers are `src/lib/server/ranking.ts:51,71` (the recompute path). After deleting, confirm no dangling import of the endpoint anywhere, then run lint + typecheck + full unit/integration suite and confirm green. `e2e/ranking.spec.ts` must still pass — its only "reorder" reference is a test name for the pairwise move-up/down feature, which uses `/compare`, not this endpoint.

## Phase 2: Correct stale artifact wordings

- [x] T002 [artifacts: datamodel] [defect: eeff61e9] [parallel] Fix the `ListEntry.score` note in `datamodel.md` (~line 269). It currently reads "nullable; ... null for **manual lists**". `manual` no longer exists: `score` is null for **efficient** lists and populated with the conservative rating for **pairwise** lists (`src/lib/server/ranking.ts:54,69`). Reword to describe the two current modes accurately. No version bump (datamodel is unversioned); stamp `last_updated` to today.
- [ ] T003 [artifacts: constitution] [defect: 32c46184] Fix Principle VI wording in `constitution.md` (~line 178). It still says "The deprecated drag-to-order view stays inside this gate for as long as its render path remains reachable for pre-deprecation lists" — but that render path is gone: `src/routes/lists/[id]/+page.server.ts` branches only on `'efficient'` else pairwise, and migration `20260720010000` dropped `manual` from the DB constraint. Reword so Principle VI's AA gate names only the two live modes' interactions (pairwise flow, move-up/down, and the efficient view's dnd/keyboard overrides). This and T004 are ONE constitution amendment: apply both, then do a single PATCH version bump with a Sync Impact Report entry naming both corrections, and stamp `last_updated`. (Coordinate with T004 — do not bump twice.)
- [ ] T004 [artifacts: constitution] [defect: a4eccafc] Fix the Project Scope line in `constitution.md` (~line 108) in the SAME amendment as T003. It reads "Manual drag-to-order was evaluated and retired (no list in either environment ever used it, so **no migration was needed**)". A schema/constraint migration `20260720010000` WAS written and applied; only a *data* migration was unnecessary (zero rows). Reword to "no data migration was needed" (or equivalent). Fold this correction into T003's single PATCH bump + Sync Impact Report rather than bumping the version again.
