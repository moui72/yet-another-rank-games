---
name: infrastructure
status: stable
last_updated: 2026-07-10
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
- **Freshness model:** a collection's BGG data is imported once and cached; it
  is re-fetched **only when the user explicitly requests a refresh**, never on
  a schedule. This keeps us well clear of rate limits in normal use.

## Storage & auth — Supabase

- **PostgreSQL** on Supabase (real free tier, scale-to-zero) holds all
  application data (see `datamodel.md`). Chosen because the data is strongly
  relational (users → collections → games; lists → comparisons).
- **Supabase Auth** provides accounts (email + OAuth). The Cloud Run app and
  worker validate Supabase-issued JWTs.
- **Row-Level Security is off.** All data access flows through our own trusted
  Cloud Run app and worker, which enforce per-user ownership in application code
  (backed by the denormalized `List.user_id` etc. in `datamodel.md`). The DB is
  reached with a service credential, not per-user anon keys, so RLS would add
  policy overhead without being the enforcement path. Trade-off accepted: a
  server-side authorization bug has no DB backstop — see Production Annotations.
- **The Supabase Data API (PostgREST) is disabled.** With RLS off, exposing the
  auto-generated REST API on the public schema would let the public anon key
  read/write tables directly. Because we enforce authorization server-side, we
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
