# Defects

_Last verified: 2026-07-20_ — a point-in-time snapshot; any claim below
can be invalidated by a subsequent commit, and a stale-looking report is
expected, not a bug, until the next `/ardd-defects` run.

Surveyed all five artifacts against the code after the `efficient-ordering-mode`
merge (feature implemented + deployed to production this session). `design.md`,
`infrastructure.md`, and `ui.md` are clean. Four defects, all clustered around
the `manual`-mode retirement — the code moved past the artifacts in one spot
(a surviving endpoint) and the artifacts moved past the code in a few wording
spots.

## datamodel.md

- **Claim:** `ListEntry` is "always a **derived snapshot**, never authored, under
  either mode" (datamodel `254-261`), and the retired `manual` mode's
  "authored-`ListEntry` semantics ... [are] deleted outright" (`346-355`).
  **Actual:** `POST /api/lists/{id}/reorder` is a live, registered route with
  auth + ownership checks that writes **authored positions directly** into
  `listEntries` from a client-supplied `gameIds` array — `replaceListEntries(db,
  params.id, gameIds.map((gameId, i) => ({ gameId, position: i + 1, score: null
  })))`. It is the sole surviving remnant of the retired `manual` mode; its
  docstring still reads "Persist a manual (drag-to-order) ranking." The current
  UI never calls it (`EfficientRanker` uses the derived `/override` endpoint),
  but the route is reachable, so a caller can persist authored positions that
  survive until the next recompute — directly violating the "never authored"
  invariant.
  **Location:** `src/routes/api/lists/[id]/reorder/+server.ts:7,23-27` vs
  datamodel `254-261`, `346-355`.
  **Severity:** broken-contract. **Also violates constitution Principle VIII
  (No Dead Architecture)** — this is one endpoint, one fix (delete it), recorded
  once here. The fix resolves both the datamodel invariant and Principle VIII.

- **Claim:** `ListEntry.score` is "nullable; ... null for **manual lists**"
  (datamodel `269`).
  **Actual:** `manual` no longer exists. `score` is null for **efficient**
  lists and populated with the conservative rating for **pairwise** lists. The
  note both names a retired mode and mislabels which current mode nulls the
  score.
  **Location:** datamodel `269` vs `src/lib/server/ranking.ts:54,69`.
  **Severity:** cosmetic (artifact wording stale relative to code — fix via
  `/ardd-refine datamodel`).

## constitution.md

- **Claim:** Principle VI — "The deprecated drag-to-order view stays inside this
  gate for as long as its render path remains reachable for pre-deprecation
  lists" (constitution `178`).
  **Actual:** that render path no longer exists. `src/routes/lists/[id]/+page.server.ts:28`
  branches only on `'efficient'` else pairwise — no `manual` branch — and
  migration `20260720010000` dropped `manual` from the DB constraint. The clause
  is self-scoping ("for as long as ... reachable"), so not a hard contradiction,
  but it describes a reachable view that is fully gone.
  **Location:** constitution `178` vs `src/routes/lists/[id]/+page.server.ts:28`,
  `supabase/migrations/20260720010000_ranking_method_drop_manual.sql`.
  **Severity:** cosmetic/drift (fix via `/ardd-refine constitution`).

- **Claim:** Project Scope — "Manual drag-to-order was evaluated and retired (no
  list in either environment ever used it, so **no migration was needed**)"
  (constitution `108`).
  **Actual:** a schema migration *was* written and applied to retire it
  (`20260720010000`, drops `manual` from the CHECK constraint). No *data*
  migration was needed (zero rows), which is what the wording meant, but "no
  migration was needed" is inaccurate as written.
  **Location:** constitution `108` vs
  `supabase/migrations/20260720010000_ranking_method_drop_manual.sql`.
  **Severity:** cosmetic (fix via `/ardd-refine constitution`).
