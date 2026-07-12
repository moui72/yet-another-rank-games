---
name: infrastructure
status: stable
last_updated: 2026-07-11
diagram_type: graph TD
render_section: Infrastructure
diagram_status: unrendered
---

# Infrastructure

## Overview

A multi-user web application that keeps recurring cost near zero at hobby scale
while remaining safe against runaway spend (constitution Principle IV). Compute
runs on **Google Cloud Platform**; the database and authentication are provided
by **Supabase**. The application is **SvelteKit** (Svelte 5 / runes),
TypeScript end to end, deployed as a Node server via `adapter-node`.

The one workload that shapes the architecture is importing a BGG collection:
BGG's API is slow and asynchronous (it returns `202 Accepted` — "request
queued, retry shortly" — and rate-limits callers), so imports are **queue- and
worker-driven** rather than handled inline in a request.

## Application runtime — Cloud Run (web)

- SvelteKit built with `adapter-node`, containerized, deployed to **Cloud Run**.
- **`min-instances = 1`** to avoid cold starts on the primary app (a small,
  predictable cost accepted deliberately).
- **`max-instances` capped** so autoscaling cannot run away (Principle IV).
- Request concurrency set deliberately rather than left at defaults.

## BGG import — Cloud Tasks + worker

- Importing a collection enqueues a job on **Cloud Tasks**, which HTTP-invokes
  a **worker** (a separate Cloud Run service) with built-in retry/backoff.
- The worker calls BGG `xmlapi2`, handles the `202` poll-retry loop, respects
  rate limits, and reports progress.
- **Bounded retries + a dead-letter / give-up state are mandatory** — a `202`
  must never loop forever (Principle IV). Max attempts and a terminal failure
  state are defined for every job type.
- Cloud Run's support for long-running requests absorbs the poll-retry duration
  without the short-timeout problems of Vercel-style serverless (the reason
  serverless-with-10s-caps was rejected).

## External integration — Board Game Geek (`xmlapi2`)

- Source of all game and collection data. Consumed via BGG's `xmlapi2`
  endpoints through **our own thin typed client** built on **`fast-xml-parser`**
  for XML→object parsing. Decided by the T015 spike: the surveyed BGG SDKs are
  either stale, untyped, or (for the maintained one, `bgg-xml-api-client`) a
  pre-1.0 API — and crucially none own the `202 Accepted` poll-retry loop, rate
  limiting, or partial-XML tolerance that dominate this integration. Those are
  ours to write regardless, so we call `xmlapi2` directly and parse with a
  maintained library rather than couple a core path to an unstable wrapper
  (Principle IX is satisfied by using `fast-xml-parser`, not by adopting a whole
  SDK).
- **Authentication (BGG "XML APIcalypse", Oct 2025):** the XML API is no longer
  anonymous — every request needs an `Authorization: Bearer <token>` header from
  a **registered** BGG application, or BGG returns `401 Unauthorized`. The token
  is an app-level secret, `BGG_API_TOKEN`, held server-side (env var; never sent
  to the client) and attached by the client on every call. Obtaining it requires
  registering the app with BGG (see https://boardgamegeek.com/using_the_xml_api).
  Until a token is provisioned, the client and pipeline are built and tested
  against fixtures/mocks; live import is blocked on the token.
- Quirks to design around: `202 Accepted` async queueing, slow responses,
  rate limits, and occasionally malformed/partial XML.
- **Freshness model — two independent concerns:**
  - **Game catalogue** (the global, shared `Game` rows: name, weight, mechanics,
    …) is cached and governed by a **time-to-live** (`GAME_CACHE_TTL_DAYS`,
    default 30). On import the app serves catalogue data from its own cache and
    calls the `thing` endpoint **only for games that are missing or past their
    TTL**. Since games are shared across users, a popular game is fetched from
    BGG roughly **once**, not once per user. Slightly stale game facts are
    tolerated; there is no per-user force-refresh of catalogue data.
  - **Collection membership** (the per-user `CollectionItem` rows: which games,
    owned, rating, plays) is **user-driven** — re-fetched only when the user
    explicitly refreshes their collection, never on a schedule. A refresh
    re-pulls membership and fetches any *missing* games, but leaves
    fresh-enough catalogue rows untouched.
  This split keeps request volume low and is driven solely by games in real
  users' collections (no bulk crawling).

## Storage & auth — Supabase

- **PostgreSQL** on Supabase (real free tier, scale-to-zero) holds all
  application data (see `datamodel.md`). Chosen because the data is strongly
  relational (users → collections → games; lists → comparisons).
- **Supabase Auth** provides accounts (email + OAuth). The Cloud Run app and
  worker validate Supabase-issued JWTs.
- **Row-Level Security is off.** All data access flows through our own trusted
  Cloud Run app and worker, which enforce per-user ownership in application code
  (backed by the denormalized `List.user_id` etc. in `datamodel.md`). The DB is
  reached with the secret key, not per-user publishable keys, so RLS would add
  policy overhead without being the enforcement path. Trade-off accepted: a
  server-side authorization bug has no DB backstop — see Production Annotations.
- **The Supabase Data API (PostgREST) is disabled.** With RLS off, exposing the
  auto-generated REST API on the public schema would let the public publishable
  key read/write tables directly. Because we enforce authorization server-side, we
  turn the Data API off entirely and reach Postgres over a **direct connection**
  instead — so there is no public data surface.
- **Data access:** a direct Postgres connection (`postgres.js` driver) with
  **Kysely** as the type-safe query builder. `supabase-js`/`@supabase/ssr` are
  used only for Auth (a separate endpoint), not for table queries.
- Schema changes go through **SQL migrations managed by the Supabase CLI**
  (`supabase/migrations`, applied locally and pushed to the hosted project at
  deploy), per constitution Principle XI — no implicit ORM sync against real
  data.

## Local development

Development runs against a **local Supabase stack** via the Supabase CLI
(Docker): Postgres + Auth + the API gateway + a local mail server, with the
heavier services (Studio, Realtime, Storage) disabled in `supabase/config.toml`
to keep startup light. Local dev uses the CLI's standard local-only demo keys;
the hosted Supabase project is only needed for deployment.

## Configuration & secrets

Config is read at runtime from `process.env` via SvelteKit's `$env/dynamic/*`
(never `$env/static/*`), so **one container image is configured per environment
without a rebuild**. There is no committed env file with real values and no
`.env.prod` — a prod secrets file in a public repo would leak (and Supabase
auto-revokes secret keys detected in public repositories). The variable contract
lives in the committed `.env.example`.

| Variable | Secret? | Local | Production |
|---|---|---|---|
| `PUBLIC_SUPABASE_URL` | no | `.env` | Cloud Run plain env var |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | no | `.env` | Cloud Run plain env var |
| `SUPABASE_SECRET_KEY` | yes | `.env` (local demo key) | GCP Secret Manager |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_NAME` | no | via `DATABASE_URL` | Cloud Run plain env vars |
| `DB_PASSWORD` | yes | via `DATABASE_URL` | GCP Secret Manager |
| `BGG_API_TOKEN` | yes | `.env` (empty until provisioned) | GCP Secret Manager |

The database connection accepts **either** a full `DATABASE_URL` (used locally
and by tooling) **or** discrete components. Production uses the components so
that **only `DB_PASSWORD` is a secret** — the host, port, user, and database
name are non-sensitive plain config, and the app assembles the connection (no
password ever embedded in a stored URL string).

The web and worker Cloud Run services receive the same bindings; secret-marked
variables are injected from Secret Manager as env vars at container start.

**Secret management — Terraform + 1Password:**

- **Terraform owns the secret *containers* and wiring**, not the values:
  `google_secret_manager_secret` resources, IAM grants to the Cloud Run service
  accounts, and the Cloud Run secret-env bindings. No secret value lands in
  Terraform state.
- **Values come from 1Password and are never committed.** A committed template
  holds only 1Password secret references (`op://Vault/item/field`), resolved with
  the `op` CLI:
  - Local: `op run --env-file=secrets.op.env -- <cmd>` (or `op inject`) injects
    values from the unlocked 1Password app into the process — nothing sensitive
    on disk.
  - Seeding GCP: a script resolves the same references with `op` and pushes each
    into Secret Manager (`gcloud secrets versions add <name> --data-file=-`), so
    values flow 1Password → Secret Manager, out of git and out of Terraform state.
  - CI (if used) authenticates `op` with a 1Password **Service Account token** —
    the one bootstrap secret, held in the CI provider's own secret store.
- Alternative (documented, not chosen): the 1Password Terraform provider
  (`data.onepassword_item` → `google_secret_manager_secret_version`) manages
  values inside Terraform too — simpler apply, but the resolved values then live
  in Terraform state, requiring an encrypted, access-controlled remote backend
  (GCS + CMEK). Chosen split keeps values out of state entirely.

## Cost guardrails (cross-cutting)

Enforced from the first deploy, per Principle IV:

- Cloud Run `max-instances` caps on both web and worker services.
- Cloud Tasks bounded retry counts + dead-letter handling.
- A GCP **billing budget with alerts**, and low quota caps where available as a
  practical kill-switch.

## Production Annotations

- **Single-region, hobby-scale deploy**: initial deployment targets one region
  with minimal redundancy — in production, multi-region and a considered
  DR/backup posture would be required.
- **Supabase free tier**: relies on free-tier limits and Supabase-managed
  backups — a revenue-bearing version would move to a paid tier with an
  explicit backup/restore and connection-pooling strategy.
- **RLS off, authorization in app code only**: per-user data isolation is
  enforced solely by the app/worker, with no database-level backstop. In a
  hardened production posture, enabling Supabase RLS as defense-in-depth (so a
  server-side auth bug can't leak another user's data) would be the correct
  approach.
