---
status: planned
created: 2026-07-24
plan: plan-b47a-2026-07-24-76cb.md
---

# Feedback

## Bugs

- [x] F001 Pre-existing e2e hydration-race flake: clicking an interactive
  element immediately after `page.goto()` can race Svelte's client
  hydration, so the click/keypress silently has no effect (no
  console/network error to indicate anything went wrong). This affects the
  "public /share/[token] view" test in `e2e/sharing.spec.ts`, which still
  fails on `main` for reasons unrelated to the sharing feature or its
  clipboard fixes. A `waitForLoadState('networkidle')` fix was applied to a
  different test in the same file (the "share toggle and copy-link" test,
  as part of hardening its clipboard-permissions coverage) but not to this
  one, since it was out of scope for that task. Likely needs the same
  `waitForLoadState('networkidle')` treatment, or a broader fix if this
  race affects other e2e specs beyond this file.
