---
status: approved
branch: multi-env-deploy
created: 2026-07-12
features: []
surfaced-defects: []
---

# Plan — Multi-environment deploy & release flow

## Goal

Deploy the app to **staging** and **production** on GCP Cloud Run, each backed
by its own hosted Supabase project, with a promote-based GitOps release flow
(`main` → staging automatically; a fast-forward `production` pointer → production
on promotion), per the Environments & release flow in `infrastructure.md`.

## Scope

**In**
- Containerize web + worker as separate images, tagged by commit SHA.
- Two hosted Supabase projects (staging, production), each via the Supavisor
  pooler; migrations applied per environment.
- Cloud Run services per environment (web `min-instances=1`, `max-instances`
  capped on both services; deliberate concurrency) + a production Cloud Tasks
  queue with bounded retry + dead-letter.
- Secrets per environment via GCP Secret Manager, seeded from 1Password;
  Terraform owns the secret containers + wiring (not values).
- GCP **billing budget + alerts** and low quota caps as a kill-switch
  (Principle IV).
- CI/CD: push to `main` builds the SHA image and deploys it to **staging**;
  a manual **"Promote to production"** `workflow_dispatch` fast-forwards
  `production` to `main`; push to `production` deploys **the same SHA image**
  to production behind a **GitHub Environments** approval gate.
- Rollback documented/exercised as a Cloud Run traffic shift to the prior
  revision.

**Out**
- Multi-region / DR (single-region hobby deploy — see infra Production
  Annotations).
- Any app-feature work; this plan is deploy/ops only.
- Replacing local dev (stays on the Supabase CLI stack).

**Relationship to prior work:** this **replaces the deploy scope** of
`tasks-foundation-cd84.md` (T035–T039), which assumed a single deploy target.
`plan-foundation` is *not* superseded — its Phases 0–5 shipped; only its
unstarted Phase 6 is reconceived here. The foundation tasks file stays at 41/46
as the record of Phases 0–5.

## Prerequisites (blocking)

Implementation is **blocked** until these exist — the plan/tasks can be written
and approved now, but not executed:
- A GCP project with billing, and credentials for Cloud Run / Cloud Tasks /
  Secret Manager / budgets.
- Two Supabase projects (staging, production) — URLs, keys, DB passwords,
  pooler connection strings.
- A registered BGG API token per deployed environment (or one shared token).
- GitHub repo admin to create Environments (`staging`, `production`) with the
  production approval gate and per-env secrets.

## Technical Approach

- **One image, many environments** (infra Configuration & secrets): config is
  read from `process.env` via `$env/dynamic/*`, so staging and production run
  the *same* image with different env/secrets. Build once (SHA-tagged), promote
  the artifact — never rebuild for prod.
- **Release flow** exactly as `infrastructure.md` Environments & release flow:
  `main`→staging auto; `production` is fast-forward-only from `main`; promotion
  is a manual workflow that advances the pointer and ships the SHA image behind
  the production approval gate.
- **Data path** unchanged from the app's side (direct Postgres via Kysely, Auth
  via supabase-js); deployed envs point `DB_HOST`/`DB_PORT` at the Supavisor
  pooler; only `DB_PASSWORD` is secret.
- **Migrations** run per deploy (`supabase db push` against the linked project)
  before traffic shift; expand/contract only.

## Phase Breakdown

**Phase 1 — Containerize (SHA-tagged images)**
1. Dockerfiles for the web (`adapter-node`) and worker as separate images;
   build tagged by commit SHA. Local container **smoke test** of both (web
   serves; worker starts and can process a queued job against local Supabase).
   [replaces T035]

**Phase 2 — Provision environments (staging first, then production)**
2. Create the staging + production Supabase projects; capture per-env config
   (URL, publishable/secret keys, pooler host/port, DB password) as the env
   contract; apply migrations to each (`supabase db push`). Verify a trivial
   query + auth round-trip against each pooler connection.
3. Terraform: `google_secret_manager_secret` containers + IAM grants + Cloud
   Run secret-env bindings per environment (no secret values in state); seed
   values from 1Password via `op`. [supports T039]
4. Cloud Run services per environment: web `min-instances=1`, **`max-instances`
   capped on web and worker**, deliberate concurrency. [replaces T036]
5. Production **Cloud Tasks** queue: bounded max-attempts + dead-letter target
   aligned with the worker's give-up state. [replaces T037]
6. GCP **billing budget + alerts** and low quota caps as a kill-switch; verify
   an alert fires against a low test threshold. [replaces T038]

**Phase 3 — Staging CD**
7. GitHub Actions: on push to `main`, build the SHA image, push it to the
   registry, run staging migrations, deploy to staging Cloud Run, using the
   `staging` GitHub Environment's secrets. Verify a push to `main` lands on
   staging.

**Phase 4 — Promotion & production**
8. Create the `production` branch as a fast-forward-only pointer; add the
   **"Promote to production"** `workflow_dispatch` workflow (optionally gated on
   `main` CI green) that fast-forwards `production` to `main`'s tip.
9. Production deploy workflow: on push to `production`, deploy **the same SHA
   image** (no rebuild) to production Cloud Run behind the `production` GitHub
   Environment **approval gate**, running prod migrations first. Document +
   exercise **rollback** as a Cloud Run traffic shift to the prior revision.

**Phase 5 — End-to-end verification**
10. Smoke the full flow (import → build pool → rank → export, incl. GeekList +
    BGG search) against **staging**, then promote and smoke **production**
    against the deployed stack. [replaces T039's end-to-end smoke]

## Complexity Tracking

| Deviation | Why justified |
|---|---|
| Two hosted environments + a promotion workflow (vs. a single deploy) | A pre-production environment is the minimum safe way to validate migrations + releases before they reach users; the fast-forward pointer + artifact promotion keep it as simple as a second environment can be (no divergent branch, no prod rebuild). Aligns with Principle IV (a controlled release reduces blast radius) without adding standing cost (free-tier Supabase, scale-to-zero staging). |
| Terraform + 1Password + Secret Manager for secrets | Keeps secret values out of git and out of Terraform state across two environments; the split is already the chosen approach in `infrastructure.md`. |

## Open Questions

- **Staging cost posture:** staging web at `min-instances=0` (scale-to-zero,
  cold starts OK for a pre-prod) vs `1` like prod. Lean `0` for staging to keep
  cost near zero — confirm during Phase 4.
- **BGG token per environment:** one shared registered token vs one per
  environment. Lean shared until rate limits bite — confirm during Phase 2.
- **Promote gate on CI:** whether "Promote to production" hard-requires the
  `main` commit's CI to be green, or only warns. Lean hard-require.

## Production Annotation Summary

- **Single-region, hobby-scale deploy** (already in infra Production
  Annotations) — annotate the region choice at provisioning.
- **Supabase free tier** for both environments — annotate at provisioning that a
  revenue-bearing version needs a paid tier + explicit backup/restore.
- **RLS off** carries into both deployed environments — annotate that enabling
  RLS as defense-in-depth is the hardened-production posture.
