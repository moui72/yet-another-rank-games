# Audit
_Updated: 2026-07-15_

## datamodel

- [x] **[S]** `ListEntry.tier` is a schema field reserved for a feature (tiering) that is explicitly deferred and not scheduled — this is exactly the "design for hypothetical future requirements" pattern Principle VII (YAGNI) rules out. Nothing reads or writes it today.
  > `/ardd-refine datamodel remove the unused ListEntry.tier column reserved for the deferred tiering feature; it can be reintroduced via a migration when tiering is actually built`

- [x] **[R]** `Comparison` has no uniqueness constraint over `(list_id, game_a, game_b)`. A double-submit (double click, network retry, replayed request) inserts a second `Comparison` row for the same pair judged the same way, silently double-weighting that judgment in the `openskill` rating update — no error surfaced, no dedupe path described anywhere in `datamodel.md` or `ui.md`. Resolved: added a unique `(list_id, game_a, game_b)` constraint with canonical (lower-id-first) pair ordering, and recording a comparison for an already-seen pair now upserts rather than inserting a duplicate.

- [x] **[Q]** The pool filter's `mechanics`/`categories` `include` semantics ("all listed values, or any — a tuning decision left to implementation") is left open, but it changes actual pool membership for any filter using two or more include values — a product-visible outcome, not an implementation nuance. Should this be decided now (AND-all vs OR-any), and which? Resolved: decided as AND-all for v1; a Production Annotation now flags the filter UI itself as due for a future rework, at which point this may be revisited.

## ui

- [x] **[Q]** `manual-pairwise-ranking-adjust` (ui.md:134-146) explicitly rejected drag-and-drop for reordering ("no drag-and-drop... needed, per constitution Principle VI") in favor of move-up/move-down buttons, because DnD wasn't reliably keyboard/screen-reader accessible. The separate manual-list ranking method (ui.md:201-206) still uses `svelte-dnd-action` drag-to-order as its *only* mechanism, relying on that library's built-in keyboard support to clear the same WCAG 2.1 AA bar. Has `svelte-dnd-action`'s keyboard mode actually been verified to meet AA for this view, or should the same button-based pattern be applied there too for consistency? Resolved: manual (drag-to-order) ranking method deprecated — pairwise is now the sole method offered when creating a list. Backlogged `revisit-ranking-modes` to reconsider non-pairwise ranking modes going forward.

## constitution

- [x] **[Q]** 15 core principles plus a separate Quality Standards section is a substantial governance surface for a solo hobby project (Project Scope & Intent: single author, "hobby project"). Some principles (e.g. XII Single Source of State, XV Bootstrap Files Wire Dependencies Only) read as team-codebase conventions more than personal-discipline rules. Is the full set still earning its keep, or would some be more proportional folded into a shorter list / moved to a lighter-weight "conventions" note? Resolved: shrunk to 11 principles (constitution v2.0.0) — former IX folded into VII as a sub-point; former XII–XV consolidated into one new "Code Organization Discipline" principle with each original rule preserved as a labeled bullet. No substantive rule content dropped.

## Summary
1 suggestion · 3 questions · 1 risk across 3 artifacts. All resolved.
