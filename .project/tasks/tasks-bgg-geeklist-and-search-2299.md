---
plan: plan-bgg-geeklist-and-search-2026-07-12.md
generated: 2026-07-12
status: completed
---

# Tasks

## Phase 1: GeekList (BBCode) export

- [x] T001 [artifacts: ui] TDD `toBbcode(data: ExportData): string` in
  `src/lib/domain/export.ts`, mirroring the existing `toMarkdown`/`toCsv`/`toJson`
  functions. Output is a rank-ordered body with one `[thing=<bggId>][/thing]`
  entry per line (bare, no rank prefix — BGG renders name+thumbnail and rank is
  implied by position; this settles the plan's "GeekList line format" open
  question). Write the failing unit tests first in `export.test.ts`: correct
  rank order, an empty list yields an empty string (no trailing junk), and a
  large id passes through unescaped. Then implement to green. Coverage gate must
  stay at 100% lines.

- [x] T002 Add a `bbcode` (GeekList) branch to the export endpoint
  `src/routes/api/lists/[id]/export/+server.ts` alongside markdown/csv/json:
  call `toBbcode`, return `content-type: text/plain; charset=utf-8` with a
  `.txt` filename (e.g. `<list>-geeklist.txt`). Follow the existing format-switch
  and ownership pattern. Add/extend the endpoint test to assert the new format's
  body and headers, and that an unknown format still errors.

- [x] T003 [artifacts: ui] Add the GeekList option to the list result & export
  view (`src/routes/lists/[id]/+page.svelte` export section): a control to copy
  and/or download the BBCode, with a one-line hint ("Paste into a new GeekList
  on BGG"). Keep it visually consistent with the other export controls. Extend
  the export e2e (`e2e/ranking.spec.ts` or the export spec) to exercise the new
  control and keep the axe (WCAG 2.1 AA) assertion green.

## Phase 2: BGG search import

- [x] T004 [artifacts: infrastructure] TDD the BGG search client + parser.
  Add `fetchSearchXml(query: string)` to `src/lib/server/bgg/client.ts` (hits
  `search?query=<name>&type=boardgame` via the existing Bearer-token `get`
  helper and `buildSearchUrl`) and `parseSearchXml(xml)` to
  `src/lib/server/bgg/parse.ts` returning `BggSearchResult[]`
  (`{ bggId, name, yearPublished }`). Add the shared `BggSearchResult` type to
  `src/lib/server/bgg/types.ts`. Write failing parse tests first against a
  `search` XML fixture (multiple results with/without `yearpublished`) and the
  empty-results body; implement to green. 100% line coverage on the new logic.

- [x] T005 [artifacts: infrastructure] Add `GET /api/games/search?q=` at
  `src/routes/api/games/search/+server.ts`: auth-gated (401 when no
  `locals.user`), 400 on an empty/blank query, otherwise call `fetchSearchXml` +
  `parseSearchXml` and return typed `BggSearchResult[]` as JSON, capped at ~10
  results. Test auth rejection, empty-query rejection, and a mocked result set
  (inject the fetch/parse the same way the import tests mock BGG).

- [x] T006 [artifacts: datamodel, infrastructure] Add an add-from-search server
  action to the pool builder (`src/routes/pools/[id]/+page.server.ts`): given a
  `bggId` and the pool id, verify pool ownership (`getOwnedPool`), fetch the
  `thing` (`fetchThingXml` + parse), `upsertGame` it into the catalogue (same
  upsert-by-`bgg_id` path as import, setting `lastFetchedAt`), then
  `addPoolGames` to attach it. Integration test (local-Supabase harness) proves
  a searched game that was in no collection lands in both `games` and the pool.
  Add a Production Annotation at the search endpoint noting the synchronous BGG
  call could be debounced/cached in production.

- [x] T007 [artifacts: ui] Add the "Search BGG" UI to the pool builder
  (`src/routes/pools/[id]/+page.svelte`): a query input that calls
  `/api/games/search`, a results list showing name + year with an "Add" control
  per result wired to the T006 action, and the idle / searching / no-results /
  error states. Keep it keyboard-operable. Add an e2e (axe) test with a mocked
  search that adds a game to a pool and keeps the WCAG 2.1 AA assertion green.
