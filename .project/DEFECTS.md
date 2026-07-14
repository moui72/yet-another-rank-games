# Defects

_Last verified: 2026-07-14_

No defects found — artifacts match the codebase as of this run.

Notes from this pass:

- `datamodel.md`'s new `CollectionItem.source`/`status`/`removed_at`,
  `CollectionItemDuplicate`, and `Collection(user_id, bgg_username)` unique
  constraint all match `src/lib/server/schema.ts` and
  `supabase/migrations/20260714190000_collection_editing_and_resync.sql`
  exactly (column names, enum values, cascade behavior).
- `PoolGame.excludedFromRanking` (feedback F001–F003) previously drifted
  (implemented in `schema.ts`/migration but undocumented on `PoolGame` in
  `datamodel.md`) — fixed via `/ardd-refine datamodel` this session; the
  entity table now lists it.
- `ui.md`'s new Collection management view (active/removed list, resync,
  possible-duplicates review with confirm-merge/reject-distinct) matches
  `src/routes/collections/[id]/+page.svelte` and `+page.server.ts` — same
  states and actions described.
- `ui.md`'s Ranked/Unranked pairwise view split matches
  `src/lib/components/PairwiseRanker.svelte` (Ranked/Unranked headings,
  exclude vs. hard-delete actions).
- `infrastructure.md`'s freshness model and Cloud Tasks/`LocalJobQueue`
  split, and the RLS-off posture (no RLS statements in any migration),
  remain accurate — unaffected by this run's changes.
