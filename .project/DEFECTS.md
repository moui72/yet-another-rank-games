# Defects

_Last verified: 2026-07-14_

No defects found — artifacts match the codebase as of this run.

Notes from this pass:

- `datamodel.md`'s new `Game.image_url` and `User.show_cover_art` match
  `src/lib/server/schema.ts`, `src/lib/types/entities.ts`, and
  `supabase/migrations/20260714210000_bgg_cover_art_and_show_cover_art.sql`
  exactly (nullability, default, column names).
- `ui.md`'s pool builder card view, pairwise comparison-card cover art, and
  the inline "Show cover art" toggle all match
  `src/routes/pools/[id]/+page.svelte`, `src/lib/components/PairwiseRanker.svelte`,
  and the shared `src/lib/domain/coverArt.ts` fallback helper
  (`image_url → thumbnail_url → placeholder`, short-circuiting to `null`
  when the preference is off).
- Prior findings (`collection-editing-and-resync`'s `PoolGame.excluded_from_ranking`)
  remain fixed; no new drift introduced by this feature.
