---
topic: collection-editing-and-resync (proposal vetting)
date: 2026-07-14
status: complete
---

# Research: Collection Editing & Resync Reconciliation

## Question

Is the `collection-editing-and-resync` backlog entry (view/edit an imported
BGG collection, re-pull to resync, reconcile local edits via
soft-delete/`removed_at`+`deleted_at` lifecycle, and fuzzy-title "might be"
merge relations) sound against the current `datamodel.md` and `ui.md`, or
does it conflict with standing decisions / need further pinning-down before
`/ardd-plan`?

## Findings

**What already exists vs. what's new.** `infrastructure.md`'s freshness model
already distinguishes catalogue TTL-refresh from user-driven "Collection
membership ... re-fetched only when the user explicitly refreshes" — so
re-pull-on-demand is *not* new; it's already the designed behavior, just
undocumented as reconciling anything (today a refresh presumably just
re-syncs membership rows). The genuinely new surface is: (1) a view/edit UI
for collections at all — currently `ui.md` only exposes hand-edit at the
**pool** level, not the collection level; (2) username-keyed import dedup
(no unique constraint exists today — `Collection` has `user_id` +
`bgg_username` with no uniqueness in the Indexes section, so nothing stops
importing the same username twice into two `Collection` rows); (3) the
soft-delete/reconcile/merge machinery.

**Lens: Simplicity.** The pool already has hand-edit add/remove
(`ui.md` "Hand-edit: remove individual games, and add individual games from
the catalogue"), and `Pool`/`PoolGame` are explicitly **collection-agnostic**
(`datamodel.md`: "Pools are user-owned and collection-agnostic ... a pool can
mix games across collections and the catalogue"). That raises a real
question the proposal doesn't address: **why edit the collection itself,
rather than only the pool?** A plausible answer — collection edits are meant
to persist as a curation layer *upstream* of every pool built from that
collection (e.g. "I don't own this expansion anymore, stop offering it to
every pool-filter"), which pool-level edits alone can't express since they're
per-pool. That's a legitimate distinct capability, but the plan should state
this rationale explicitly rather than leave "why not just edit the pool"
unanswered — otherwise a future reader (or `/ardd-audit`) will flag it as
possible duplicate mechanism.

**Lens: Failure modes / semantics — scope of soft/hard delete.** The
proposal's phrasing ("a game that had been removed... gets deleted_at",
"hard deleted") is ambiguous about *what* is being deleted. `Game` rows are
explicitly global/shared catalogue ("stored once, globally... referenced by
many users' collections" — `datamodel.md` Overview). Soft/hard-delete must
apply to **`CollectionItem`** (the per-user membership join row), never to
`Game` itself — hard-deleting a shared `Game` row would break other users'
collections, pools, and lists. This should be pinned down explicitly in the
plan; as written it's inferrable but not stated, and the DB name overlap
("game ... gets deleted_at") invites a scoping bug if not made explicit in
the schema.

**Lens: Robustness — does hard-deleting `CollectionItem` cascade anywhere?**
No: `PoolGame` and `Comparison`/`ListEntry` all reference `game_id → Game`
directly, not `CollectionItem`. A `Pool` is collection-agnostic by design, so
a game already added to a pool stays there even after its source
`CollectionItem` is hard-deleted. This is a real point in the proposal's
favor — no cascade-corruption risk — but the plan should say so explicitly
so it isn't re-litigated later.

**Lens: Standardness / DRYness — the removed_at + deleted_at pair.** Two
independent nullable timestamps encoding what's really a 4-state lifecycle
(active → user-removed → pending-hard-delete-confirmation → gone) is more
naturally a single `status` enum
(`active | removed | pending_delete | deleted`, or similar), which is more
standard, self-documents legal transitions, and avoids an implicit
`removed_at IS NOT NULL AND deleted_at IS NOT NULL` compound-condition doing
the "confirmable" check by convention rather than by type (constitution
Principle XIII, Named Types Over Inline Duplication, plus the Simplicity
lens). Recommend the plan collapse this to an enum rather than the two raw
timestamps as literally described.

**Lens: Constitution conflict — production annotation.** `datamodel.md`'s
Production Annotations section currently states, as a deliberate accepted
shortcut: *"No soft-delete / audit history: entities are hard-deleted...
a production system handling valuable user data might add soft-deletes and
an audit trail."* This proposal is exactly that upgrade, scoped to
`CollectionItem`. That's not a blocker — the annotation anticipates exactly
this kind of addition — but the plan should update/narrow that annotation
(e.g. "no soft-delete *except* `CollectionItem`, which needs it for BGG
resync reconciliation") rather than let it stand as if still fully true.

**Lens: Proportionality / open question — what is a "might-be" match a
relation *between*?** The description says "a game that had been added on
our side" gets a "might be" relation to "the newly pulled game" when titles
match. This is under-specified in a way that matters: if collection-add
always goes through `bgg-game-search-import` (per `ui.md`), the added item
already has a definite, distinct `bgg_id` — a title-similarity heuristic
would then be flagging two *different* BGG ids as possibly-the-same
real-world game (e.g. a reprint/variant with its own BGG id), which is a
narrower, rarer case than it sounds. If instead manual add is meant to allow
a free-text placeholder with **no** BGG-linked `Game` row at all, that's a
materially bigger schema change (a nullable `game_id`/free-text title field
on `CollectionItem`, rippling into `Pool`/`List`/`Comparison`, all of which
currently assume a non-null `game_id → Game`). This distinction changes the
size of the feature by roughly an order of magnitude and must be resolved
before `/ardd-plan` estimates scope — it isn't a detail that can be left
"TBD" the way the matching *heuristic* itself can.

**Reversed/extended decisions, named:** none of `datamodel.md`'s decisions
are reversed outright; the proposal narrows/extends one accepted shortcut
(the no-soft-delete production annotation, `datamodel.md` lines 257–259) and
adds a new uniqueness constraint not previously stated (`Collection`
username-per-user dedup, currently absent from the Indexes section).

## Recommendation

Worth doing — proceed to **`/ardd-plan collection-editing-and-resync`** (it's
already backlogged; no need to re-log). Fold these findings into that
planning pass as things to pin down, not further research: (1) state
explicitly that delete lifecycle applies to `CollectionItem`, never `Game`;
(2) collapse `removed_at`/`deleted_at` into a single status enum; (3) update
the datamodel.md "no soft-delete" production annotation to scope its
exception; (4) add the missing `Collection (user_id, bgg_username)` unique
constraint; (5) resolve, up front, whether "added on our side" collection
items always have a definite `bgg_id` (narrow reconciliation case) or can be
unlinked free-text placeholders (materially larger schema change) — this
determines the feature's actual size; (6) state the "why the collection
layer and not just pool hand-edit" rationale in the plan/artifact so it
isn't re-flagged as redundant later.

## Rejected Alternatives

Not applicable — no alternative *approach* to reconciliation was surveyed
beyond scrutinizing the proposal's own design as given (this was a vetting
pass, not a build-vs-buy investigation). One implicit alternative surfaced
by the Simplicity lens — do this entirely at the `Pool`/`PoolGame` level
instead of introducing a collection-editing layer — was considered and
rejected as not equivalent: pool edits are per-pool and collection-agnostic
by design, so they can't express "remove this from my collection so no pool
built from it defaults to including it," which appears to be the actual
intent behind the request.

## Open Questions

- Does "added on our side" always mean added via `bgg-game-search-import`
  (definite `bgg_id`), or can a collection item exist unlinked to any `Game`
  row pending reconciliation? (See Proportionality finding above — resolve
  before planning, it changes scope materially.)
- What is the actual fuzzy-match heuristic (string similarity threshold,
  normalization of edition/subtitle noise, etc.)? Explicitly deferred as TBD
  in the original request — fine to leave for the plan/implementation, not a
  blocker to backlog-to-plan progression.
- Should the per-user `Collection` uniqueness be enforced as a DB constraint
  (`unique (user_id, bgg_username)`) or app-level check-then-insert? Given
  Principle XI (migrations required) and RLS being off app-side already,
  a DB unique constraint is the more consistent choice but should be an
  explicit plan decision rather than assumed.
