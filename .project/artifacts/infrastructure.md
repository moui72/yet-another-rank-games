---
name: infrastructure
status: draft
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
  endpoints. [OPEN: raw `xmlapi2` HTTP + our own typed XML parser vs. an existing
  BGG SDK/wrapper — **deliberately deferred to an early implementation spike**
  that vets candidate SDKs (typed? maintained? handles `202`?) against a
  raw-parser baseline before committing. Default fallback if no SDK clears the
  bar: raw + our own parser, for full control over the `202` poll-retry, rate
  limiting, and partial-XML tolerance (per Principle IX, don't adopt an
  unmaintained wrapper just to avoid boilerplate).]
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
- Schema changes go through migrations (constitution Principle XI); no implicit
  ORM sync against real data.

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
