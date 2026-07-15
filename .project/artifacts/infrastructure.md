---
name: infrastructure
status: stable
last_updated: 2026-07-15
diagram_type: graph TD
render_section: Infrastructure
diagram_status: current
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
- **Worker invocation contract:** Cloud Tasks HTTP-targets a single endpoint,
  `POST /tasks/import`, on the worker Cloud Run service. The request body is
  JSON matching the app's `ImportJob` shape — `{ collectionId, username,
  ownedOnly }` — serialized by the enqueueing `CloudTasksJobQueue` (the
  deploy-time swap for the dev-only `LocalJobQueue`). Cloud Tasks attaches an
  OIDC identity token (`audience` = the worker's Cloud Run URL, signed by the
  dedicated Cloud Tasks invoker service account provisioned in
  `infra/terraform/modules/environment`); the worker verifies the token's
  issuer, audience, and signing service account before processing a request,
  rejecting anything else with `401`. Response codes double as the retry
  contract Cloud Tasks understands: `2xx` marks the job done (no retry);
  any `5xx` (including an unhandled exception) tells Cloud Tasks to retry
  per the queue's bounded backoff/dead-letter config (Principle IV); the
  worker never returns `2xx` for a job it didn't actually complete.

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
- **Endpoints used:** `collection` (a user's owned/rated set, with the
  `202` poll-retry), `thing` (full game details for one or more ids), and
  `search` (`search?query=<name>&type=boardgame` — name → candidate
  `{bggId, name, yearPublished}` results, for the pool builder's
  `bgg-game-search-import` flow). All three go through the same typed client
  (`fetchCollectionXml` / `fetchThingXml` / `fetchSearchXml`) with the Bearer
  token and `fast-xml-parser`. **Search is a synchronous request/response** (no
  `202` queueing); adding a searched game is a normal foreground `thing` fetch +
  `Game` upsert, not a queued import job — so it stays in the web request, not
  the worker.
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
- **No public Data API surface.** With RLS off, exposing the Supabase
  Data API (PostgREST) on the public schema would let the public
  publishable key read/write tables directly. Because we enforce
  authorization server-side, the app reaches Postgres over a **direct
  connection** instead of the Data API. Locally this is achieved by
  leaving `auto_expose_new_tables` unset in `supabase/config.toml` (its
  documented default — new `public`-schema tables are *not*
  auto-granted to `anon`/`authenticated`/`service_role`), not by turning
  the Data API service off outright (`[api] enabled = true` still runs
  locally; it just has nothing to expose). Deployed environments'
  Supabase project settings aren't managed by Terraform, so whether the
  hosted Data API is toggled off in the dashboard isn't verifiable from
  this repo — either way, the app never uses it.
- **Data access:** a direct Postgres connection (`postgres.js` driver) with
  **Kysely** as the type-safe query builder. `supabase-js`/`@supabase/ssr` are
  used only for Auth (a separate endpoint), not for table queries.
- Schema changes go through **SQL migrations managed by the Supabase CLI**
  (`supabase/migrations`, applied locally and pushed to the hosted project at
  deploy), per constitution Principle XI — no implicit ORM sync against real
  data.

## Local development

Development runs against a **local Supabase stack** via the Supabase CLI
(Docker) — the same open-source components as the hosted product, running
**entirely on the developer's machine** (no cloud project is involved). The CLI
brings up **Postgres** (`127.0.0.1:54322`), the **Auth** service (GoTrue) behind
the **Kong API gateway** (`127.0.0.1:54321`), and a local mail catcher; the
heavier services (Studio, Realtime, Storage) are disabled in
`supabase/config.toml` to keep startup light. Local dev uses the CLI's standard
local-only demo keys.

The app reaches this stack as **two independent local endpoints** — the same
two paths it uses against any environment:

- **Data** — a **direct Postgres** connection (`postgres.js`/Kysely) to
  `:54322`. The app never calls the Data API/gateway for table access (see
  "No public Data API surface" above) — it always goes direct.
- **Auth** — `supabase-js` to the Kong gateway `:54321` (→ GoTrue) for
  sign-in / JWTs / OAuth.

So "local Supabase" is really **Postgres-in-Docker plus the auth service the app
depends on** — the same shape as staging/production. Keeping local on the
Supabase stack (rather than a bare Postgres container) is deliberate: the schema
FKs into Supabase's `auth` schema (`users.id references auth.users(id)`) and the
app authenticates via GoTrue, so a non-Supabase local DB would break local auth
and lose dev/prod parity. The hosted Supabase projects are only used by the
deployed environments (see below).

## Environments & release flow

Three environments, all running the **same app image** configured only by env
vars (one build, many environments). Each has its **own** Supabase project and
secrets — no environment shares a database with another:

| Environment | Data + Auth | Deploy trigger |
|---|---|---|
| **local** | Supabase CLI stack (Docker), on the dev machine | `npm run dev` |
| **staging** | a dedicated hosted Supabase project | **automatic** on push to `main` |
| **production** | a **separate** hosted Supabase project | on push to the `production` branch (a promotion) |

Keeping all three on Supabase (rather than plain Postgres locally) preserves
**dev/prod parity** for the Auth coupling described under Local development.

**Branch-based GitOps.**
- `main` is the trunk. Every push to `main` (i.e. every merge) **auto-deploys to
  staging**.
- `production` is a **fast-forward-only pointer branch** — never committed to
  directly, only advanced to a commit already on `main`. Its tip therefore
  always names a commit that has passed through staging; the branch cannot
  diverge from `main`. Pushing to `production` **deploys to production**.

**Cut a release = promote, don't rebuild.** `main`'s CI builds a **single
immutable image tagged by commit SHA** and deploys that image to staging. A
manual **"Promote to production"** GitHub Action (`workflow_dispatch`)
fast-forwards `production` to `main`'s current tip; the resulting push to
`production` deploys **the same SHA image** to production (no rebuild), so
production ships the exact artifact staging validated. The `production` tip SHA
is both "what is live" and "which image."

**Approval gate.** Per-environment secrets and the production gate use **GitHub
Environments** (`staging`, `production`): the `production` environment requires a
**manual reviewer**, so a promotion pauses for approval before it ships.

**Migrations per environment.** Each deploy applies that environment's Supabase
migrations (`supabase db push` against the linked project) before shifting
traffic. Migrations must be backward-compatible (expand/contract), since Cloud
Run may briefly run old and new revisions together.

**Rollback.** Because `production` is fast-forward-only, rollback is **not** a
git operation in the normal case — it is a **Cloud Run traffic shift back to the
previous revision** (revisions are immutable and retained), plus, if a migration
was involved, its contract step. Re-pointing the `production` branch is reserved
for the exceptional case.

**Connection pooling (deployed environments).** Staging and production connect
through Supabase's **pooler (Supavisor)**, not a direct per-instance connection —
with Cloud Run `max-instances` a direct connection would exhaust Postgres
connections. Local keeps the direct `:54322` connection (single developer).

## Configuration & secrets

Config is read at runtime from `process.env` via SvelteKit's `$env/dynamic/*`
(never `$env/static/*`), so **one container image is configured per environment
without a rebuild**. There is no committed env file with real values and no
`.env.prod` — a prod secrets file in a public repo would leak (and Supabase
auto-revokes secret keys detected in public repositories). The variable contract
lives in the committed `.env.example`.

The same variables are set to **per-environment values** — the local demo stack,
the staging Supabase project, and the production Supabase project each supply
their own (`Deployed` below covers both staging and production, each with its
own GitHub Environment secrets):

| Variable | Secret? | Local | Deployed (staging / production) |
|---|---|---|---|
| `PUBLIC_SUPABASE_URL` | no | `.env` | Cloud Run plain env var |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | no | `.env` | Cloud Run plain env var |
| `SUPABASE_SECRET_KEY` | yes | `.env` (local demo key) | GCP Secret Manager |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_NAME` | no | via `DATABASE_URL` | Cloud Run plain env vars (pooler host) |
| `DB_PASSWORD` | yes | via `DATABASE_URL` | GCP Secret Manager |
| `BGG_API_TOKEN` | yes | `.env` (empty until provisioned) | GCP Secret Manager |

The database connection accepts **either** a full `DATABASE_URL` (used locally
and by tooling) **or** discrete components. Deployed environments use the
components so that **only `DB_PASSWORD` is a secret** — host, port, user, and
database name are non-sensitive plain config, and the app assembles the
connection (no password ever embedded in a stored URL string). In staging and
production the host/port point at the Supabase **pooler** (see Environments).

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

## Custom domain (production)

Production's web Cloud Run service is mapped to `https://yarg.ty-pe.com`
(feature `custom-domain-mapping`) instead of users bookmarking the default
`*.run.app` URL. Staging keeps its default `*.run.app` URL — the custom
domain is production-only.

- **Domain ownership verification is a human-only prerequisite.** Cloud Run
  domain mapping requires the domain be verified in **Google Search
  Console** for the GCP account before Terraform can create the mapping —
  this step cannot be automated and must be done once, by hand, before the
  `google_cloud_run_domain_mapping` resource can apply successfully.
- **Terraform owns the mapping**, added to `infra/terraform/modules/environment`
  (applied for production only): a `google_cloud_run_domain_mapping` resource
  binding `yarg.ty-pe.com` to the `web` Cloud Run service.
- **DNS records** (at the `ty-pe.com` registrar, outside GCP) must point the
  domain at Cloud Run per the records the domain mapping resource outputs
  (typically CNAME/A/AAAA to Google's mapping targets) — another human-only
  step, since it requires registrar access this repo has no automation path
  to.
- **TLS is managed automatically**: Cloud Run auto-provisions a managed SSL
  certificate for the mapped domain once DNS resolves correctly: not
  instant, and status should be polled/verified rather than assumed.
- **Supabase Auth's Site URL and redirect URLs** (see T008 — currently the
  production `*.run.app` origin) must be updated to `https://yarg.ty-pe.com`
  once the mapping is live, so post-auth redirects land on the durable
  domain rather than the Cloud Run default.

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
  backups — a revenue-bearing version would move to a paid tier with an explicit
  backup/restore strategy. (Connection pooling is no longer deferred: deployed
  environments connect through the Supavisor pooler — see Environments.)
- **RLS off, authorization in app code only**: per-user data isolation is
  enforced solely by the app/worker, with no database-level backstop. In a
  hardened production posture, enabling Supabase RLS as defense-in-depth (so a
  server-side auth bug can't leak another user's data) would be the correct
  approach.
