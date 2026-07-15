# Defects

_Last verified: 2026-07-15_

No defects found — artifacts match the codebase as of this run.

Notes from this pass:

- The 3 cosmetic gaps found in the prior full survey are now fixed via
  `/ardd-refine`:
  - `datamodel.md`'s Indexes section now documents the `ListEntry
    (list_id, game_id)` unique constraint alongside the existing
    `(list_id, position)` index.
  - `infrastructure.md`'s Data API claim now accurately describes the
    local mechanism (`auto_expose_new_tables` defaulting off, not the
    Data API service itself being disabled) and scopes the "hosted
    environments" part of the claim to what's actually verifiable from
    this repo.
  - `design.md`'s component list now includes `BggSearchAdd.svelte`.
    While fixing this, also caught and corrected an adjacent
    over-claim: the artifact said all shared components "are documented
    in Storybook," but only `Logo.stories.svelte` and
    `ThemeToggle.stories.svelte` actually exist — `PairwiseRanker`,
    `ManualRanker`, and `BggSearchAdd` don't have stories yet. Both
    mentions (Layout & components, Production Annotations) now state
    this accurately.
