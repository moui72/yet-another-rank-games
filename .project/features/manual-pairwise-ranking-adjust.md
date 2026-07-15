---
slug: manual-pairwise-ranking-adjust
status: implemented
logged: 2026-07-14
plan: plan-manual-pairwise-ranking-adjust-2026-07-15-3db7.md
tasks: tasks-manual-pairwise-ranking-adjust-97c6.md
---

Let a user manually adjust relative rankings in a pairwise-sorted list — reordering games directly rather than only through comparisons.
Why: pairwise comparisons drive the order today (order is derived, not authored); manual adjustment is a way to override that when the algorithm's placement doesn't match the user's intent. Ideally available even mid-ranking (while comparisons are still incomplete), but if that conflicts with the derived-order model it can be restricted to only after the ranking is complete.
