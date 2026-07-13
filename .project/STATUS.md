# yet-another-rank-games — Project Status

_Updated: 2026-07-13. Keep this current as artifacts are refined and open questions are resolved._

ARDD update available: installed `7c5dcd0`, latest release `v0.10.0` — run `/ardd-update`.

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | stable ✅ | — |
| design.md | stable ✅ | — |
| ui.md | draft ⚠️ | 1 |

## Open Questions

**ui**
- Public sharing model — whether a list can be exposed as a read-only shared view (deferred product decision).

## Feature Backlog

- **1 backlogged** (`custom-domain-mapping` — map the web Cloud Run service to `https://yarg.ty-pe.com`) · 0 planned · 0 tasked · **2 implemented** (`bgg-geeklist-export`, `bgg-game-search-import`) — see `.project/features/`. Target it with `/ardd-plan custom-domain-mapping` once the app is actually live on Cloud Run (T003+ below).

## Plans & Tasks

- `plan-foundation-2026-07-10.md` — approved; `tasks-foundation-cd84.md` **in-progress, 41/46**. Its remaining Phase 6 (T035–T039) is **superseded** by the multi-env-deploy plan below; the file stays as the record of Phases 0–5.
- `plan-bgg-geeklist-and-search-2026-07-12.md` — approved; `tasks-bgg-geeklist-and-search-2299.md` **completed, 7/7**. Shipped + merged.
- `plan-multi-env-deploy-2026-07-12.md` — **approved**; `tasks-multi-env-deploy-5928.md` **in-progress, 6/8, T007 partial**. The active work. Reconciled against the codebase this run — checkbox state was already accurate, no drift, no gaps.
  - T001 (web Dockerfile) done — multi-stage build, smoke-tested against local Supabase; real app now containerizes (no longer just the Cloud Run placeholder).
  - T002 (worker deployable) done — `/tasks/import` route (SvelteKit, same image as web — no separate Dockerfile), `verifyCloudTasksAuth` (OIDC signature/issuer/audience + invoker-SA pinning via `google-auth-library`), `CloudTasksJobQueue` (deploy-time swap for `LocalJobQueue`), Terraform IAM (`tasks_invoker` SA, `run.invoker` grant). 5 new integration tests, `tofu validate` clean for both envs. Merged to `main`.
  - T003 done — staging now serves the **real app**, not the placeholder. Two gotchas hit and resolved (documented in the tasks file for T005/T007's CI to avoid repeating): (1) a local Apple Silicon `docker build` produces `arm64`, which Cloud Run rejects (`exec format error`) — fixed via `gcloud builds submit` (native GCP build, no QEMU); (2) re-applying `tofu apply` with the same image *tag* after fixing the image silently kept the stale revision — fixed by pinning `web_image`/`worker_image` to the image **digest**, not the tag. Verified live: title `yet-another-rank-games`, `/login` 200, `/api/games/search` 401 (DB-backed auth path confirmed working against the Supabase pooler).
  - T004 done — **production is now live and at parity with staging.** Publishable key fetched via live Supabase MCP lookup (a prior-session memory named a stale project ref); all 6 migrations pushed to the live prod DB; same T003 image digest retagged (no rebuild) into production's own registry; `tofu apply` discovered and repaired two **tainted** Cloud Run services from an earlier failed attempt (destroy+recreate, no data loss — Cloud Run holds no state) and stood up WIF + `tasks_invoker`. Verified live at `https://yarg-web-c4lzpursqq-uk.a.run.app/` — same checks as staging all pass.
  - T005 done — `deploy-staging.yml` verified green end-to-end (two consecutive successful runs) on push to `main`: build → push SHA image → migrate → `tofu apply` → verify deployed title.
    - **Prerequisite fixed along the way:** Terraform state was local-only (gitignored `.tfstate`), which would make CI start from empty state every run. Migrated both staging and production to a versioned GCS bucket backend (`<project_id>-tfstate`) before wiring up CI — did both envs now rather than deferring production's migration to T007.
    - **Four live-run failures hit and fixed** (none catchable by `tofu validate`): (1) wrong OpenTofu install script URL; (2) deployer SA 403 on `module.billing_guard`'s project services — fixed by scoping CI's apply to `-target=module.environment -target=module.wif`, excluding billing_guard entirely (it's deliberately self-contained for the owner to apply by hand); (3) deployer SA still 403 reading `module.environment`'s own project-service state — granted `serviceusage.serviceUsageViewer`; (4) still failed on secrets/service-account/IAM-binding reads — `-target` scopes writes, not reads, so Terraform still resolves every interpolated reference regardless of target scope. Fixed by replacing (3)'s narrow grant with project-wide `roles/viewer` (read-only; write capability stays limited to `run.admin` + `artifactregistry.writer`), applied to both projects.
  - T006 done — `production` branch created (fast-forward-only pointer), `promote-to-production.yml` (`workflow_dispatch`) hard-requires `main`'s `quality`+`e2e` check runs to be green before fast-forwarding, `production` GitHub Environment created with required reviewer (moui72) and deployment restricted to the `production` branch only. **Verified with a real promotion** — production fast-forwarded to main's exact tip after CI went green.
  - T007 **partial**: `deploy-production.yml` written (mirrors `deploy-staging.yml` — WIF auth, retag staging's SHA image by digest into production's own registry, `supabase db push`, `tofu apply` by digest, targeted to `module.environment`/`module.wif`) and the "Rollback (production)" runbook section added to `infra/terraform/README.md` (Cloud Run traffic-shift back to the prior revision + migration-contract caveat). Production Annotations (single-region, Supabase free tier/pooler, RLS-off) added at the relevant points. **Blocked on three human-only steps, in order** (all commands/values already resolved and recorded in the tasks file):
    1. Grant the production deployer SA `roles/artifactregistry.reader` on staging's `yarg` Artifact Registry repo (needs GCP owner credentials).
    2. Populate the GitHub `production` Environment (currently empty) — vars `GCP_WIF_PROVIDER`, `GCP_DEPLOYER_SA`, `PRODUCTION_SUPABASE_URL`, `PRODUCTION_SUPABASE_PUBLISHABLE_KEY` (all non-secret, already resolved) and secrets `PRODUCTION_BILLING_ACCOUNT`, `SUPABASE_DB_PASSWORD`, `SUPABASE_ACCESS_TOKEN` (needs someone with secret-write permission in this session's auto-mode classifier, or the account owner directly).
    3. Exercise the rollback for real — needs steps 1–2 done and at least one live `deploy-production.yml` run to have shipped, so there's a prior revision to shift back to.
  - T008 (full staging → production smoke: signup → import → pool → rank → export → BGG search-import) not started — depends on T007 going live.

## Deploy progress (ops state, applied ad-hoc this session — not yet a completed tasks file)

- **GCP:** projects `yarg-staging-zbch` / `yarg-production-cwqd`, billing linked, account + per-project budgets, disable-billing kill-switch **applied in both**.
- **Terraform:** `infra/terraform/` (modules environment / github-wif / billing-guard), validated + committed. Web Cloud Run service made publicly invokable (`roles/run.invoker` for `allUsers`; worker stays private/OIDC-only); `user_project_override` set on the google provider in both envs (fixes a 403 on budget creation under user ADC).
- **Secrets:** Secret Manager containers + values loaded in **both** projects.
- **Staging:** full `tofu apply` done — Cloud Run web (public) + worker, WIF, all 6 migrations pushed. Web serves the **real app** (SHA `789ba3c2ef88`, deployed by digest) at `https://yarg-web-qc5dllhv7q-uk.a.run.app`.
- **Production:** full `tofu apply` done — Cloud Run web (public) + worker, WIF, `tasks_invoker`, all 6 migrations pushed, publishable key filled in. Web serves the **real app** (same digest as staging, retagged into production's own registry) at `https://yarg-web-c4lzpursqq-uk.a.run.app`.
- **App image:** `sha256:3858a95…` (built via Cloud Build, not local docker — see T003 gotcha notes) is now deployed identically to both staging and production registries — the "same SHA, no rebuild" promotion path T005–T007 will formalize.

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-diagram datamodel`)
- infrastructure.md — stale ⚠️ (run `/ardd-diagram infrastructure`) — changed since last render (worker invocation contract added)
- ui.md — unrendered ⚠️ (run `/ardd-diagram ui`)

## Code-vs-Artifact Defects

No defects — artifacts match the codebase (verified 2026-07-12; infrastructure.md's worker-contract addition on 2026-07-13 hasn't been re-verified against code yet, but nothing in the codebase contradicts it since no `CloudTasksJobQueue` implementation exists). Note: the deploy scaffolding in `infra/` is infra-as-code, outside the app artifacts' scope.

## In Flight

- Nothing active. The two stale worktrees noted previously (`agent-a86d4a56d7bfe4ff6`, `agent-aa6379495865c92cd`) were confirmed fully merged into `main` with no unique commits and removed this run, along with their branches.
- `main` is in sync with `origin` up to `6607227` (T007 partial). `production` is behind `main` by T006's follow-up commit plus T007's new commit — expected, since promotion is manual/on-demand.

## Recommended Next Step

T007 is blocked on three human-only steps (see Plans & Tasks above): grant
the production deployer SA registry-read access on staging, populate the
`production` GitHub Environment's vars/secrets (all non-secret values
already resolved and listed in `tasks-multi-env-deploy-5928.md`), then push
a change through `promote-to-production.yml` to exercise the workflow and
rollback for real. None of these can be done by an agent in this session's
permission mode — they need the account owner. Once T007 is fully live,
T008 (full staging → production smoke test) follows. `custom-domain-mapping`
(`https://yarg.ty-pe.com`) remains backlogged and can be planned in parallel
via `/ardd-plan custom-domain-mapping`.
