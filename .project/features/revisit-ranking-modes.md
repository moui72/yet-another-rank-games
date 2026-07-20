---
slug: revisit-ranking-modes
status: subsumed
logged: 2026-07-15
---

Reconsider what non-pairwise ranking modes the product should offer, now that the manual drag-to-order method is deprecated and pairwise is the sole method offered when creating a list.
Why: manual drag-to-order was deprecated (ardd-audit finding, ui.md Production Annotations) in favor of pairwise-only, leaving open whether a reworked manual/override mode, the deferred tiering mode, both, or neither should eventually replace it.

Subsumed 2026-07-20 by `efficient-ordering-mode`, which answers the "reworked manual/override mode" half of this question: drag-and-drop returns, but inside an efficiency-first constraint-graph mode rather than as a purely manual method. Tiering (`ranking_method = 'tier'`) is *not* covered by that entry and remains undesigned — log a fresh entry if it is ever wanted.
