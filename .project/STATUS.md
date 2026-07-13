# yet-another-rank-games — Project Status

_Updated: 2026-07-12. Keep this current as artifacts are refined and open questions are resolved._

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

- 0 backlogged · 0 planned · 0 tasked · **2 implemented** (`bgg-geeklist-export`, `bgg-game-search-import`) — see `.project/features/`.

## Plans & Tasks

- `plan-foundation-2026-07-10.md` — approved; `tasks-foundation-cd84.md` **in-progress, 41/46**. Its remaining Phase 6 (T035–T039) is **superseded** by the multi-env-deploy plan below; the file stays as the record of Phases 0–5.
- `plan-bgg-geeklist-and-search-2026-07-12.md` — approved; `tasks-bgg-geeklist-and-search-2299.md` **completed, 7/7**. Shipped + merged.
- `plan-multi-env-deploy-2026-07-12.md` — **approved**; `tasks-multi-env-deploy-5928.md` **ready, 0/8**. The active work. Ready to `/ardd-implement` (first real task T001 = web Dockerfile).

## Deploy progress (ops state, applied ad-hoc this session — not yet a completed tasks file)

- **GCP:** projects `yarg-staging-zbch` / `yarg-production-cwqd`, billing linked, account + per-project budgets, disable-billing kill-switch **applied in both**.
- **Terraform:** `infra/terraform/` (modules environment / github-wif / billing-guard), validated + committed.
- **Secrets:** Secret Manager containers + values loaded in **both** projects.
- **Staging:** full `tofu apply` done — Cloud Run web (public) + worker, WIF, all 6 migrations pushed. Web currently serves the **Cloud Run placeholder** (real app image not built yet) at `https://yarg-web-qc5dllhv7q-uk.a.run.app`.
- **Production:** only billing-guard + secrets applied; environment module NOT applied; migrations NOT pushed; `terraform.tfvars` publishable key still `REPLACE_ME`.
- These map to `tasks-multi-env-deploy-5928.md`'s "already applied" header; the tasks pick up from here (containerize → real image → prod parity → CI/CD → promote → verify).

## Diagrams

- datamodel.md — stale ⚠️ (run `/ardd-diagram datamodel`)
- infrastructure.md — unrendered ⚠️ (run `/ardd-diagram infrastructure`)
- ui.md — unrendered ⚠️ (run `/ardd-diagram ui`)

## Code-vs-Artifact Defects

No defects — artifacts match the codebase (verified 2026-07-12). Note: the deploy scaffolding in `infra/` is infra-as-code, outside the app artifacts' scope.

## In Flight

- Nothing in a worktree or draft PR. `main` is at the latest deploy-scaffolding commit and **in sync with `origin`** (0 unpushed).

## Recommended Next Step

`/ardd-implement` on `tasks-multi-env-deploy-5928.md` — T001 (web Dockerfile) is self-contained, local, and gets the real app into a container. Note T002 (worker deployable) may surface an `infrastructure.md` gap on the worker's invocation contract.
