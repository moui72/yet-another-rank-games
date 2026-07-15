# Defects

_Last verified: 2026-07-15_

Full artifact-vs-codebase survey (all five artifacts). 3 defects found, all
cosmetic — no broken contracts.

## datamodel.md

- **Claim:** The Indexes section documents `ListEntry (list_id, position)`
  for rendering order, with no mention of any other index/constraint on
  `list_entries`.
  **Actual:** The table also carries a `unique (list_id, game_id)`
  constraint (a game can't have two entries in the same list's ordering).
  **Location:** `supabase/migrations/20260711000727_initial_schema.sql:86`
  **Severity:** cosmetic — the constraint is real and presumably
  intentional (prevents duplicate entries), just undocumented in the
  Indexes section.

## infrastructure.md

- **Claim:** "The Supabase Data API (PostgREST) is disabled" — stated as a
  blanket fact, with no per-environment qualification.
  **Actual:** Local dev's `supabase/config.toml` has `[api] enabled = true`
  — the Data API service does run locally. The practical "no public data
  surface" goal is still met, but via a different mechanism than
  "disabled": `auto_expose_new_tables` is left unset (the commented-out
  line at `config.toml:24`), which defaults to *not* auto-granting new
  `public`-schema tables to `anon`/`authenticated`/`service_role` — so
  nothing is exposed by default, without the API itself being off.
  Whether staging/production hosted Supabase projects have the Data API
  toggled off in the dashboard isn't visible from this repo (no Terraform
  resource manages it), so this finding is scoped to local only.
  **Location:** `supabase/config.toml:7-8`, `:24`
  **Severity:** cosmetic — the outcome (no public table access) matches
  intent; the mechanism described doesn't quite match what's configured
  locally.

## design.md

- **Claim:** "Shared components live in `src/lib/components/` (`Logo`,
  `ThemeToggle`, `PairwiseRanker`, `ManualRanker`)" — an enumerated list.
  **Actual:** `src/lib/components/BggSearchAdd.svelte` also exists (added
  during `collection-editing-and-resync`, shared by the pool builder and
  collection editing per its own doc comment) and isn't listed.
  **Location:** `src/lib/components/BggSearchAdd.svelte`
  **Severity:** cosmetic — the component follows the same extraction
  pattern the artifact describes, just missing from the enumerated list.

## ui.md / constitution.md

No defects found — all spot-checked claims (pool filter include/exclude
semantics, BGG endpoint/auth contract, worker invocation contract, job
queue naming, structured logging, no `any` usage, TDD paradigm markers)
match the codebase.
