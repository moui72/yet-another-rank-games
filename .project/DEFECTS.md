# Defects

_Last verified: 2026-07-16_

No defects found — artifacts match the codebase as of this run.

Notes from this pass:

- The 3 defects found in the prior run (all "audit decision documented ahead
  of code") are now fixed:
  - `ListEntry.tier` is dropped from the schema (migration
    `20260715220100_list_entries_drop_tier.sql`) and from `schema.ts` /
    `entities.ts`.
  - `Comparison (list_id, game_a, game_b)` now has a unique constraint with
    canonical pair ordering (migration
    `20260715220000_comparisons_canonical_unique.sql`), and
    `recordComparison` canonicalizes `gameA`/`gameB` and upserts
    (`onConflict().doUpdateSet(...)`) instead of inserting a duplicate.
    Verified with a new integration test
    (`comparisons.integration.test.ts`, 3/3 passing).
  - The list-creation form (`/pools/[id]/+page.svelte` and
    `+page.server.ts`) no longer offers `manual` as a ranking method —
    pairwise only, per `ui.md`.
  - Full suite green: 132 unit + 72 integration tests, lint clean, 0
    typecheck errors across 1237 files.
