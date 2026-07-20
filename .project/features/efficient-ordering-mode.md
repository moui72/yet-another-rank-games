---
slug: efficient-ordering-mode
status: tasked
logged: 2026-07-20
plan: plan-efficient-ordering-mode-2026-07-20-5a1c.md
tasks: tasks-efficient-ordering-mode-8403.md
---

A second ranking mode that reaches a confident total ordering in as few comparisons as possible and honours manual drag-and-drop / move-up / move-down overrides exactly, rather than approximately — built as a constraint graph over the existing Comparison table (latest-wins pair edges, topological derivation with openskill ratings as tie-breaker, resumable binary-insertion selection that consults recorded edges before asking).
Why: deliberately trades away the primary mode's novelty-preferring matchup selection (constitution Principle III) for convergence speed and durability under manual fiddling. Design settled by research-efficient-durable-secondary-ranking-mode-2026-07-20-d22b.md, which measured the rating model — not the selector — as the efficiency bottleneck (~4x more comparisons than binary insertion at n=50) and found synthetic comparisons into a rating model too approximate to honour an override. Subsumes revisit-ranking-modes.
