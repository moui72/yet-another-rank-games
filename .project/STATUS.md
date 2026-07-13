# yet-another-rank-games — Project Status

_Updated: 2026-07-13. Keep this current as artifacts are refined and open questions are resolved._

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
- `plan-multi-env-deploy-2026-07-12.md` — **approved**; `tasks-multi-env-deploy-5928.md` **in-progress, 3/8**. The active work.
  - T001 (web Dockerfile) done — multi-stage build, smoke-tested against local Supabase; real app now containerizes (no longer just the Cloud Run placeholder).
  - T002 (worker deployable) done — `/tasks/import` route (SvelteKit, same image as web — no separate Dockerfile), `verifyCloudTasksAuth` (OIDC signature/issuer/audience + invoker-SA pinning via `google-auth-library`), `CloudTasksJobQueue` (deploy-time swap for `LocalJobQueue`), Terraform IAM (`tasks_invoker` SA, `run.invoker` grant). 5 new integration tests, `tofu validate` clean for both envs. Merged to `main`.
  - T003 done — staging now serves the **real app**, not the placeholder. Two gotchas hit and resolved (documented in the tasks file for T005/T007's CI to avoid repeating): (1) a local Apple Silicon `docker build` produces `arm64`, which Cloud Run rejects (`exec format error`) — fixed via `gcloud builds submit` (native GCP build, no QEMU); (2) re-applying `tofu apply` with the same image *tag* after fixing the image silently kept the stale revision — fixed by pinning `web_image`/`worker_image` to the image **digest**, not the tag. Verified live: `https://yarg-web-qc5dllhv7q-uk.a.run.app/` title is `yet-another-rank-games`, `/login` 200, `/api/games/search` 401 (DB-backed auth path confirmed working against the Supabase pooler).
  - T004 onward (production parity, CI/CD, promotion, e2e verify) not yet started — each remaining live-infra step needs explicit user go-ahead.

## Deploy progress (ops state, applied ad-hoc this session — not yet a completed tasks file)

- **GCP:** projects `yarg-staging-zbch` / `yarg-production-cwqd`, billing linked, account + per-project budgets, disable-billing kill-switch **applied in both**.
- **Terraform:** `infra/terraform/` (modules environment / github-wif / billing-guard), validated + committed. Web Cloud Run service made publicly invokable (`roles/run.invoker` for `allUsers`; worker stays private/OIDC-only); `user_project_override` set on the google provider in both envs (fixes a 403 on budget creation under user ADC).
- **Secrets:** Secret Manager containers + values loaded in **both** projects.
- **Staging:** full `tofu apply` done — Cloud Run web (public) + worker, WIF, all 6 migrations pushed. Web now serves the **real app** (SHA `789ba3c2ef88`, deployed by digest) at `https://yarg-web-qc5dllhv7q-uk.a.run.app`.
- **Production:** only billing-guard + secrets applied; environment module NOT applied; migrations NOT pushed; `terraform.tfvars` publishable key still `REPLACE_ME`.
- **App image:** `us-east4-docker.pkg.dev/yarg-staging-zbch/yarg/web@sha256:3858a95…` (built via Cloud Build, not local docker — see T003 gotcha notes) is the image T004 will redeploy (no rebuild) to production.

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-diagram datamodel`)
- infrastructure.md — stale ⚠️ (run `/ardd-diagram infrastructure`) — changed since last render (worker invocation contract added)
- ui.md — unrendered ⚠️ (run `/ardd-diagram ui`)

## Code-vs-Artifact Defects

No defects — artifacts match the codebase (verified 2026-07-12; infrastructure.md's worker-contract addition on 2026-07-13 hasn't been re-verified against code yet, but nothing in the codebase contradicts it since no `CloudTasksJobQueue` implementation exists). Note: the deploy scaffolding in `infra/` is infra-as-code, outside the app artifacts' scope.

## In Flight

- Nothing active. Two stale worktrees remain on disk from merged runs — `.claude/worktrees/agent-a86d4a56d7bfe4ff6` and `.claude/worktrees/agent-aa6379495865c92cd` — safe to clean up whenever (not done automatically; deleting a worktree is destructive).
- `main` is ahead of `origin` by local commits from this session (not pushed).

## Recommended Next Step

T004 (bring production to parity with staging: fill the publishable key, `supabase db push`, full `tofu apply` in `envs/production`, deploy the same SHA image) is the next `tasks-multi-env-deploy-5928.md` step — needs explicit user go-ahead before touching live production GCP/DB. `custom-domain-mapping` (`https://yarg.ty-pe.com`) is backlogged; staging is now live enough to plan it against, though production DNS is likely the more relevant target once T004 lands.
