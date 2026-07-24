---
plan: plan-5b25-2026-07-24-9ef0.md
generated: 2026-07-24
status: in-progress
---

# Tasks

## Phase 1: Seed list_entries

- [ ] T001 In `e2e/sharing.spec.ts`'s `seedPoolAndList` function, after inserting the `list` row, insert one `list_entries` row per seeded game (`list_id`, `game_id`, `position` — 1 for the first seeded game "Sharing Alpha", 2 for the second "Sharing Beta") using the existing `games` array returned from the earlier insert, so the list has real ranked-order data (feedback F001). Run the "public /share/[token] view" test in the same file and confirm it now passes end-to-end (it previously failed at the point where it asserted on the rendered "Sharing Alpha"/"Sharing Beta" game names, which the empty list didn't have).
