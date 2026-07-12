# Defects

_Last verified: 2026-07-12_

No defects found — artifacts match the codebase as of this run.

Notes from this pass:

- The prior cosmetic defect (ui.md's pool-filter enumeration omitting the
  expansions filter) is resolved — `ui.md` now documents it.
- `design.md` (newly stabilized) matches the code: the spine palette in
  `src/lib/spine.ts`, the `mark`/`yarg`/`full` variants in `Logo.svelte`, the
  custom `light`/`dark` DaisyUI theme blocks + `@fontsource` fonts + `.spine`
  classes in `src/app.css`, and the logo navbar + spine-stripe + hero breakout.
- `datamodel.md` and `infrastructure.md` match the migrated schema and the
  implemented BGG/config/data layers; the Cloud Run / Cloud Tasks / Terraform
  sections remain intended-but-unbuilt Phase 6 work (a `JobQueue` interface
  with a dev `LocalJobQueue` is in place), which is expected-pending, not drift.
