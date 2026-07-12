# Defects

_Last verified: 2026-07-11_

## ui.md

- **Claim:** The Pool builder view's "Bulk-add by filter" lists the filter
  dimensions as "mechanic — e.g. co-op, weight range, player count, playing
  time, owned-only" (ui.md:38–40).
  **Actual:** The pool builder also exposes an **Expansions & promos** filter
  (Include both / Base games only / Expansions & promos only), backed by
  `Game.is_expansion` and the `expansions` filter predicate now documented in
  `datamodel.md`. ui.md's enumeration predates it.
  **Location:** `src/routes/pools/[id]/+page.svelte:87–94`;
  `src/lib/domain/listForm.ts:53`; `.project/artifacts/datamodel.md:199,210`
  **Severity:** cosmetic — ui.md's list is illustrative ("e.g."), not a
  contract; fold the expansions filter in on the next `/ardd-refine ui`.
