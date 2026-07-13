---
plan: plan-multi-env-deploy-2026-07-12.md
generated: 2026-07-12
status: in-progress
---

# Tasks

<!--
Already applied ad-hoc this session (plan Phase 2, mostly done — do NOT redo):
- GCP projects yarg-staging-zbch / yarg-production-cwqd, billing linked, account budget set.
- infra/terraform/ scaffolding (modules environment / github-wif / billing-guard).
- Budgets + disable-billing kill-switch applied in BOTH projects.
- Secret Manager containers + values (supabase-secret-key, db-password, bgg-api-token) in BOTH.
- STAGING: full `tofu apply` done — Cloud Run web (public) + worker, WIF, all 6 migrations pushed.
  Web serves the Cloud Run PLACEHOLDER image (real app image not built yet).
- PRODUCTION: only billing-guard applied; environment module NOT applied; migrations NOT pushed;
  terraform.tfvars PUBLIC_SUPABASE_PUBLISHABLE_KEY still "REPLACE_ME".
Testing paradigm: constitution is TDD, but deploy/infra tasks verify via container smoke tests
and live checks rather than unit tests — follow that where unit tests don't apply.
-->

## Phase 1: Containerize (SHA-tagged images)

- [x] T001 [artifacts: infrastructure] Write a production Dockerfile for the **web** service: multi-stage build (install deps, `npm run build` with `adapter-node`, then a slim runtime stage running `node build` on `$PORT`). `.dockerignore` to keep the image lean. Verify by building locally and running the container against the local Supabase stack — it must serve the real YARG app (not the Cloud Run placeholder) and pass a request. Smoke test is the acceptance check.

- [x] T002 [artifacts: infrastructure] Provide the **worker** as a deployable that Cloud Tasks can invoke over HTTP: a protected endpoint (or minimal server) that receives an import job and runs `executeImportJob`, plus its Dockerfile (may reuse the web image with a different entrypoint/command, or a separate image — decide per `infrastructure.md`'s "web + worker as separate images"). If the worker's HTTP/invocation contract isn't specified in `infrastructure.md`, stop and surface it before building. Smoke test locally: a simulated Cloud Tasks POST processes a queued import against local Supabase.

  **RESOLVED (2026-07-13).** The invocation contract is now documented in
  `infrastructure.md` under "Worker invocation contract" (`POST /tasks/import`,
  `ImportJob` JSON body, OIDC token audience/signing-SA check, `2xx`/`5xx`
  retry contract). Implemented this run:
  - `src/routes/tasks/import/+server.ts` — the worker's HTTP entry point:
    verifies the Cloud Tasks OIDC token (`verifyCloudTasksAuth`), validates the
    body against the `ImportJob` shape (zod, `400` on mismatch), then runs
    `processImportJob`, returning `204` on completion or `500` on an
    unhandled exception (Cloud Tasks retries `5xx` only).
  - `src/lib/server/tasks/verifyCloudTasksAuth.ts` — verifies the token via
    `google-auth-library`'s `OAuth2Client.verifyIdToken` (signature + issuer +
    audience) and additionally pins the signing identity (`email` claim) to
    the dedicated invoker service account.
  - `src/lib/server/jobs/cloudTasksQueue.ts` (`CloudTasksJobQueue`) — the
    deploy-time swap for `LocalJobQueue`: creates a Cloud Tasks HTTP task
    targeting `${WORKER_URL}/tasks/import` via `@google-cloud/tasks`, with an
    `oidcToken` naming the invoker SA and the worker URL as audience. Wired in
    `src/lib/server/jobs/queue.ts` (`getImportQueue()`, lazily built —
    `LocalJobQueue` when the Cloud Tasks env vars are absent).
  - **No separate worker Dockerfile.** `/tasks/import` is one more SvelteKit
    route in the same app — the web and worker Cloud Run services deploy the
    *same* built image (T001's Dockerfile), differing only in Terraform
    config (ingress, public invocability, `min_instances`). This is the
    simpler of the two options `infrastructure.md` allows ("may reuse the web
    image with a different entrypoint/command, or a separate image").
  - Terraform (`infra/terraform/modules/environment/`): added a dedicated
    `tasks_invoker` service account (`iam.tf`), granted it `run.invoker` on
    the worker service and granted `runtime` `serviceAccountUser` on it (so
    `CloudTasksJobQueue` can create tasks naming it). `run.tf` merges computed
    env vars into the containers — `GCP_PROJECT_ID`/`GCP_LOCATION`/
    `CLOUD_TASKS_QUEUE`/`WORKER_URL` onto **web only** (it needs the worker's
    Terraform-computed URL; wiring that into the worker's *own* env would be
    a self-referential cycle) and `TASKS_INVOKER_SA_EMAIL` onto **both**. The
    worker verifies the OIDC audience against its own incoming request
    origin rather than a `WORKER_URL` env var, sidestepping that cycle.
    `tofu validate` passes for both `envs/staging` and `envs/production`
    (not applied — that's T003/T004, live infra, out of this task's scope).
  - Verified via `src/routes/tasks/import/server.integration.test.ts` against
    local Supabase (docker + `supabase start`): asserts a missing/invalid/
    wrong-signer token is rejected without touching the DB or BGG, a
    malformed body is rejected `400`, and a valid request drives a queued
    import to completion (`collections.import_status` -> `complete`,
    `last_synced_at` stamped) end-to-end through the real route, real
    `executeImportJob`, and the real DB — with the BGG HTTP client mocked
    (as in the existing import tests) and `google-auth-library`'s
    `verifyIdToken` (the actual cryptographic signature check) stubbed, since
    minting a real Google-signed OIDC token isn't possible without live GCP
    credentials. `verifyCloudTasksAuth.test.ts` unit-tests every check
    *around* that verification (missing header, wrong signer, unverified
    email) against the same mocked library. Full unit suite (113 tests),
    integration suite (43 tests, 5 new), `svelte-check`, `eslint`, and the
    coverage ratchet (100% lines) all pass.

## Phase 2: Deploy the real image to staging

- [ ] T003 [artifacts: infrastructure] Build the web + worker images, tag by commit SHA, push to the **staging** Artifact Registry (`us-east4-docker.pkg.dev/yarg-staging-zbch/yarg/...`), then `tofu apply -var web_image=<sha> -var worker_image=<sha>` in `infra/terraform/envs/staging`. Verify the staging URL now serves the real app (title is YARG, not "Congratulations | Cloud Run") and that a DB-backed page renders (confirms the pooler connection + secrets are correct).

## Phase 3: Production bring-up (parity with staging)

- [ ] T004 [artifacts: infrastructure] Bring production to the same state as staging: fill `PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `envs/production/terraform.tfvars` (currently `REPLACE_ME`); `supabase link --project-ref tmncunthbcfdaolqswcq` + `supabase db push` (all 6 migrations); full `tofu apply` in `envs/production` (creates Cloud Run web/worker + WIF, reconciling the earlier partial apply); push + deploy the **same SHA image** from T003 (no rebuild) via `-var web_image=<sha>`. Verify the production URL serves the real app. (Secrets + budget/kill-switch already applied.)

## Phase 4: Staging continuous deployment

- [ ] T005 [artifacts: infrastructure] GitHub Actions workflow `deploy-staging.yml`: on push to `main`, authenticate to staging GCP via **Workload Identity Federation** (use `tofu output wif_provider` / `deployer_sa` from `envs/staging`), build the SHA image, push to Artifact Registry, run staging migrations (`supabase db push`), then deploy (`tofu apply -var web_image=<sha> -var worker_image=<sha>` or `gcloud run deploy`). Store non-secret config/secret refs in the `staging` GitHub Environment. Verify a push to `main` lands the new image on staging. (Requires GitHub repo admin to create the `staging` Environment — note the human step in the workflow PR.)

## Phase 5: Promotion & production CD

- [ ] T006 [artifacts: infrastructure] Set up the promotion path: create the `production` branch as a fast-forward-only pointer from `main`; add `promote-to-production.yml` (`workflow_dispatch`) that hard-requires `main`'s CI green then fast-forwards `production` to `main`'s tip (resolves the plan's "promote gate on CI" open question — lean hard-require). Create the `production` GitHub Environment with a **required reviewer** (the approval gate). Document the human setup steps.

- [ ] T007 [artifacts: infrastructure] Production deploy workflow `deploy-production.yml`: on push to `production`, behind the `production` Environment approval gate, run prod migrations then deploy **the same SHA image** already on staging (resolve the image by the `production` tip commit SHA — no rebuild) to production Cloud Run via WIF (`envs/production` outputs). Document and **exercise rollback** as a Cloud Run traffic shift to the prior revision (`gcloud run services update-traffic`). Add the Production Annotations from the plan (single-region, Supabase free tier, RLS-off) at the relevant points.

## Phase 6: End-to-end verification

- [ ] T008 [artifacts: infrastructure, ui] Smoke the full user flow against the **deployed** stack: sign up → import a BGG collection → build a pool → rank (pairwise) → export (incl. GeekList) → BGG search-import — first on **staging**, then promote and repeat on **production**. Confirm auth (GoTrue), the pooled DB connection, the worker/import path, and the BGG token all work end-to-end in each environment.
