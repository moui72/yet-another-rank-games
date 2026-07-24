---
status: open
created: 2026-07-24
plan: null
---

# Feedback

## Bugs

- [ ] F001 The e2e test helper `seedPoolAndList` never inserts `list_entries`
  rows, so a seeded list's shared/public view renders "No games ranked yet"
  instead of the expected game names. This is a test-fixture data-seeding
  gap, not a product bug — it surfaced in `e2e/sharing.spec.ts`'s "public
  /share/[token] view" test, which still fails on this gap even after the
  hydration-race fix (T001 of `plan-b47a-2026-07-24-76cb.md`) landed. The
  helper needs to seed `list_entries` (or equivalent ranked-order data) so
  tests asserting on rendered game names have real data to find.
