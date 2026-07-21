# Defects

_Last verified: 2026-07-20_ — a point-in-time snapshot; any claim below
can be invalidated by a subsequent commit, and a stale-looking report is
expected, not a bug, until the next `/ardd-defects` run.

No defects found — artifacts match the codebase as of this run.

The four defects from the previous run (2026-07-20, all from the `manual`-mode
retirement) are all fixed and re-verified against the code:

- **`effeeb6d`** (broken-contract) — `POST /api/lists/[id]/reorder`, the
  reachable authored-`ListEntry` write path, is deleted. `replaceListEntries`
  remains, used only by the recompute path (`src/lib/server/ranking.ts:51,71`).
- **`eeff61e9`** — `datamodel.md`'s `ListEntry.score` note now matches the code:
  populated for pairwise lists, null for efficient (`ranking.ts:54,69`).
- **`32c46184`** — `constitution.md` Principle VI no longer describes a
  reachable deprecated drag-to-order render path (that path is gone); it now
  states the `efficient` mode's real AA basis (keyboard equivalents carrying
  its pointer-only drag).
- **`a4eccafc`** — `constitution.md` scope now says "no *data* migration was
  needed," accurate given the constraint migration `20260720010000`.

This re-verification was a targeted check of the four fixed sites plus a
no-new-drift pass on the two edited artifacts (`datamodel`, `constitution`);
`design.md`, `infrastructure.md`, and `ui.md` were clean in the full survey
earlier this session and were not re-changed since.
