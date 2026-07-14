---
slug: collection-editing-and-resync
status: tasked
logged: 2026-07-14
plan: plan-collection-editing-and-resync-2026-07-14-d0af.md
tasks: tasks-collection-editing-and-resync-b3ff.md
---

View and edit an imported collection (add/remove games), re-pull the same collection to resync, and reconcile local edits against what BGG returns — since collection import is a one-way sync from BGG, edits need to be tracked so a later pull can be reconciled rather than silently overwritten.
Why: collections are currently import-only and re-pullable without dedup or reconciliation; this adds bidirectional-feeling editing on top of a fundamentally one-way sync.

Design constraints captured from the request (to be worked out in /ardd-plan, not decided here):
- Collections are keyed by bgg_username so the same collection can't be imported twice for a user.
- A collection can be re-pulled (re-synced) on demand, not just imported once.
- Local add/remove edits get yarg-only metadata so they're distinguishable from BGG-sourced state and reversible.
- Removing a game from a collection is a soft delete (removed_at timestamp); removed games are viewable and the removal can be undone.
- On re-pull, if a game removed locally (removed_at set) is no longer present in the source collection, it additionally gets deleted_at; games with both removed_at and deleted_at can be user-confirmed and then hard-deleted.
- On re-pull, if a game added locally now appears to match (same or similar title — matching heuristic TBD) a newly-pulled game, the two get a "might be" relation; users get an interface to confirm+merge or reject+keep-distinct.
