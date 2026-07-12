---
status: approved
branch: bgg-geeklist-and-search
created: 2026-07-12
features: [bgg-geeklist-export, bgg-game-search-import]
surfaced-defects: []
---

# Plan — BGG GeekList export & search import

## Goal

Add two BGG-community features: export a finished ranking as a GeekList
(BBCode) body, and add any BGG game to a pool by searching BGG — even games in
no one's collection.

## Scope

**In**
- A `bbcode` / GeekList export format (a pure transform beside the existing
  Markdown/CSV/JSON in `src/lib/domain/export.ts`), wired into the export
  endpoint and the list result view.
- A BGG `search` client + parser (`fetchSearchXml` / `parseSearchXml`)
  alongside the existing collection/thing client.
- A pool-builder "Search BGG" flow: query → results → add a chosen game, which
  imports it into the catalogue (`thing` fetch + `Game` upsert) and adds it to
  the pool.

**Out**
- Creating the GeekList on BGG programmatically — the XML API is read-only for
  this, so the app produces the *body* and the user pastes it into a new
  GeekList on BGG.
- Bulk / multi-select search import (one game at a time in v1).
- Re-ranking or fuzzy-scoring BGG's search results (use BGG's own order).
- The public-sharing model (a separate, still-open `ui.md` question) — untouched.

## Technical Approach

- **GeekList export** mirrors the existing export functions: a pure
  `toBbcode(data: ExportData): string` in `export.ts`, selected by a new
  `format` value in `src/routes/api/lists/[id]/export/+server.ts`. No BGG call,
  no schema change (uses the existing rank/name/bggId export data).
- **BGG search** reuses the typed-client + `fast-xml-parser` pattern
  (`infrastructure.md`): `fetchSearchXml(query)` hits
  `search?query=<name>&type=boardgame` with the Bearer token; `parseSearchXml`
  yields `{ bggId, name, yearPublished }[]`. Search is **synchronous** (no
  `202`), so it lives in the web request, not the Cloud Tasks worker.
- **Add-from-search** reuses existing repositories: fetch the pick's `thing`,
  `upsertGame` (same upsert-by-`bgg_id` path as collection import — see the
  `datamodel.md` normalization note), then `addPoolGames`. Ownership checks on
  the pool reuse `getOwnedPool`.
- Type-safety end to end (Principle II): a shared `BggSearchResult` type in
  `$lib/types` (or `bgg/types.ts`), consumed by client, endpoint, and UI.

## Phase Breakdown

**Phase 1 — GeekList (BBCode) export** (feature `bgg-geeklist-export`; no infra,
self-contained, ships first)
1. TDD `toBbcode` in `export.ts`: rank-ordered body, one `[thing=<bggId>][/thing]`
   entry per line (BGG renders the game inline); unit tests cover ordering,
   escaping, and empty list.
2. Add the `bbcode` format branch (content-type `text/plain`, sensible filename)
   to the export endpoint, with a test.
3. Add the GeekList option to the list result & export view with copy/download,
   plus a short "paste into a new GeekList on BGG" hint; extend the export e2e
   (axe) to cover the new control.

**Phase 2 — BGG search import** (feature `bgg-game-search-import`; independent of
Phase 1)
4. TDD `parseSearchXml` + `fetchSearchXml` against BGG `search` fixtures
   (`{ bggId, name, yearPublished }`), including the empty-results body; add the
   shared `BggSearchResult` type.
5. `GET /api/games/search?q=` endpoint: auth-gated, calls the client, returns
   typed results; test covers auth, empty query, and a mocked result set.
6. Add-from-search server action on the pool builder: `thing` fetch →
   `upsertGame` → `addPoolGames`; integration test proves a searched game lands
   in the catalogue and the pool (reusing the local-Supabase harness).
7. Pool-builder UI: a "Search BGG" input, results list with year, an add
   control, and the idle / searching / no-results / error states; e2e (axe)
   with a mocked search.

## Complexity Tracking

None — both features reuse existing patterns (the `export.ts` transform family
and the BGG client/repository stack); no new architecture or dependency
(Principle VII).

## Open Questions

- **GeekList line format:** one bare `[thing=<id>][/thing]` per line vs.
  prefixing each with its rank number. Lean to bare `[thing]` in rank order
  (BGG renders name+thumbnail; rank is implied by position) — settle in T001.
- **Result cap & dedupe:** cap search results (~10) and whether to flag games
  already in the pool/catalogue in the results list — a small UX call for T005/T007.

## Production Annotation Summary

- **Synchronous BGG search in the web request** (Phase 2): fine at hobby scale
  and user-initiated, but a production posture might debounce input and cache
  recent queries to cut BGG traffic and latency. Annotate at the search
  endpoint during implementation.
