# yet-another-rank-games

[![sponsor](https://shieldcn.dev/badge/sponsor-%E2%9D%A4-ea4aaa.svg?variant=secondary&theme=pink)](https://github.com/sponsors/moui72)

Build ranked lists of board games from your [BoardGameGeek](https://boardgamegeek.com)
collection. A single collection feeds many themed, filtered lists ("top 10
co-op", "top 100 of all time"), ranked primarily through a fun **pairwise
comparison** flow (with manual drag-to-order as an override).

Design and decisions live in [`.project/`](./.project) (the ARDD workflow):
`artifacts/` holds the constitution, data model, infrastructure, and UI specs;
`plans/` and `tasks/` drive implementation.

## Tech stack

- **SvelteKit** (Svelte 5 / runes) + **TypeScript** end-to-end, `adapter-node`
- **Supabase** — Postgres + Auth
- **GCP** — Cloud Run (web + import worker), Cloud Tasks (BGG import queue)
- **openskill** — the pairwise ranking (Bradley–Terry/Weng–Lin) model

## Development

```sh
npm install        # also runs husky + svelte-kit sync (prepare)
npm run dev        # dev server
npm run build      # production build (adapter-node)
```

### Quality gates

| Script | What it does |
|---|---|
| `npm run lint` | ESLint (incl. `no-explicit-any`) |
| `npm run check` | `svelte-check` / `tsc` type-check |
| `npm run test` | Vitest unit tests (`src/**/*.test.ts`) |
| `npm run coverage` | Vitest with v8 coverage |
| `npm run coverage:ratchet` | Coverage + never-decrease ratchet |
| `npm run test:e2e` | Playwright + axe (WCAG 2.1 AA) |

A **pre-commit hook** (husky) runs lint → check → unit tests before every
commit. Bypassing it (`--no-verify`) is prohibited except in a documented
emergency, and any bypass must be immediately followed by a commit that
restores the passing state. **CI** (`.github/workflows/ci.yml`) is the gate of
record and additionally runs the e2e/axe suite and the coverage ratchet.

Development is **test-first (TDD)**: write the failing test, then the
implementation. Coverage on `src/lib` logic is enforced as a never-decrease
ratchet (`coverage-baseline.json`); accessibility is held to **WCAG 2.1 AA**.

## Source layout

Entry points only wire dependencies; logic lives in focused modules
(constitution Principles XIII, XV).

```
src/
  lib/
    domain/   Pure, framework-free business logic (ranking, filters, scoring)
    types/    Shared, exported types — the single source of truth for shapes
    server/   Server-only modules (DB, BGG client, auth) — never shipped to the client
  routes/     SvelteKit routes: thin; delegate to lib/
e2e/          Playwright accessibility / end-to-end specs
scripts/      Repo tooling (e.g. the coverage ratchet)
```

## Datamodel

```mermaid
erDiagram
    User ||--o{ Collection : imports
    User ||--o{ Pool : owns
    Collection ||--o{ CollectionItem : contains
    Game ||--o{ CollectionItem : "referenced by"
    Game ||--o{ PoolGame : "referenced by"
    Pool ||--o{ PoolGame : contains
    Pool ||--o{ List : "ranked by"
    List ||--o{ Comparison : records
    List ||--o{ ListEntry : orders
    Game ||--o{ Comparison : "compared as"
    Game ||--o{ ListEntry : ranks
    CollectionItem ||--o| CollectionItemDuplicate : "might be"
    Game ||--o{ CollectionItemDuplicate : "candidate match"

    User {
        uuid id PK
        string bgg_username
        boolean show_cover_art
    }
    Game {
        bigint id PK
        integer bgg_id UK
        string name
        boolean is_expansion
        string image_url
        timestamptz last_fetched_at
    }
    Collection {
        uuid id PK
        uuid user_id FK
        string bgg_username
        enum import_status
    }
    CollectionItem {
        uuid id PK
        uuid collection_id FK
        bigint game_id FK
        boolean owned
        numeric user_rating
        enum source
        enum status
        timestamptz removed_at
    }
    CollectionItemDuplicate {
        uuid id PK
        uuid collection_item_id FK
        bigint candidate_game_id FK
        enum status
    }
    Pool {
        uuid id PK
        uuid user_id FK
        string name
    }
    PoolGame {
        uuid id PK
        uuid pool_id FK
        bigint game_id FK
        boolean excluded_from_ranking
    }
    List {
        uuid id PK
        uuid pool_id FK
        uuid user_id FK
        enum ranking_method
        enum status
    }
    Comparison {
        uuid id PK
        uuid list_id FK
        bigint game_a FK,UK
        bigint game_b FK,UK
        bigint winner_id FK
    }
    ListEntry {
        uuid id PK
        uuid list_id FK
        bigint game_id FK
        integer position
        numeric score
    }
```

## Infrastructure

```mermaid
graph TD
    User[Browser / User]

    subgraph GCP["Google Cloud Platform"]
        Web["Cloud Run: web\n(SvelteKit, min-instances=1)"]
        Worker["Cloud Run: worker\n(private, OIDC-only)"]
        Tasks["Cloud Tasks queue\n(bounded retry + dead-letter)"]
        SM["Secret Manager\n(DB_PASSWORD, SUPABASE_SECRET_KEY, BGG_API_TOKEN)"]
    end

    subgraph Supabase["Supabase (per-environment project)"]
        Auth["Supabase Auth (GoTrue)"]
        DB["PostgreSQL\n(via Supavisor pooler)"]
    end

    BGG["Board Game Geek xmlapi2"]

    Domain["yarg.ty-pe.com\n(Cloud Run domain mapping,\nproduction only)"]

    User -->|HTTPS| Domain
    Domain --> Web
    User -.->|or default *.run.app URL| Web
    Web -->|JWT validate| Auth
    Web -->|direct Postgres\nvia Kysely| DB
    Web -->|enqueue import job| Tasks
    Tasks -->|OIDC-signed\nPOST /tasks/import| Worker
    Worker -->|fetch collection/thing/search| BGG
    Worker -->|write imported games| DB
    Web -.->|reads secrets at start| SM
    Worker -.->|reads secrets at start| SM

    CI["GitHub Actions CI/CD"] -->|build + push SHA image,\nmigrate, tofu apply| GCP
    CI -->|supabase db push| Supabase
```

## UI

```mermaid
graph TD
    Import["Collection import & management view\n(queued → fetching → processing → done;\nview/edit active + removed items)"]
    Resync["Collection resync\n(re-pull, reconcile removed/pending-delete,\npossible-duplicates review)"]
    PoolBuilder["Pool builder view\n(filter bulk-add, hand-edit,\nBGG search-import,\nlist/card view toggle + cover art)"]
    ListMgmt["List management view\n(create list from pool;\npairwise is the sole ranking method)"]
    Pairwise["Pairwise ranking view\n(Ranked / Unranked split,\ncomparison cards show cover art,\nmove up/down (synthetic comparisons),\nnovelty-preferring matchups,\nconfetti + hidden controls when fully ordered,\nkeyboard-operable)"]
    Result["List result & export view\n(Markdown / CSV / JSON / GeekList)"]

    Import -->|collection populated| PoolBuilder
    Import -->|re-pull triggered| Resync
    Resync -->|reconciled| Import
    PoolBuilder -->|pool created| ListMgmt
    ListMgmt -->|create| Pairwise
    Pairwise -->|stop early or complete| Result
```

