# infra/terraform

OpenTofu for the YARG deploy (see `.project/artifacts/infrastructure.md` →
Environments & release flow, and `.project/plans/plan-multi-env-deploy-2026-07-12.md`).

**Status: scaffolding.** Written ahead of the GCP phase; validated with
`tofu validate`, but **not yet applied** (blocked on GCP projects + credentials).
It becomes the artifact the plan's Phase 2 refines and applies.

## Layout

```
modules/
  environment/   reusable per-env stack: APIs, Artifact Registry, service
                 accounts + IAM, Secret Manager containers, Cloud Run (web +
                 worker), Cloud Tasks queue.
  github-wif/    keyless GitHub Actions -> GCP auth (Workload Identity
                 Federation), scoped to this repo.
envs/
  staging/       -> project yarg-staging-zbch    (web min-instances 0)
  production/    -> project yarg-production-cwqd  (web min-instances 1)
```

Two separate GCP projects (separate budgets, IAM blast radius, quotas). Each
env is its own root module with its own GCS-backed state (see Notes below).

## Bootstrap (by hand, once — before the first apply)

Tofu enables APIs *through* the Service Usage API, so a minimal bootstrap must
precede it (it can't bootstrap itself):

```bash
gcloud auth login
gcloud auth application-default login          # ADC for tofu's local apply
export BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX     # gcloud billing accounts list

gcloud projects create yarg-staging-zbch    --name="YARG staging"
gcloud projects create yarg-production-cwqd --name="YARG production"
gcloud billing projects link yarg-staging-zbch    --billing-account=$BILLING_ACCOUNT
gcloud billing projects link yarg-production-cwqd --billing-account=$BILLING_ACCOUNT

# Set a budget + alerts on each project in the console (kill-switch).

for p in yarg-staging-zbch yarg-production-cwqd; do
  gcloud services enable serviceusage.googleapis.com cloudresourcemanager.googleapis.com --project=$p
done
```

## Apply

```bash
cd envs/staging
cp terraform.tfvars.example terraform.tfvars   # fill in non-secret values
tofu init
tofu plan
tofu apply
```

Then repeat in `envs/production`.

## Notes

- **Secrets are containers only.** Values are added out-of-band from 1Password,
  never in tofu state:
  `op read "op://yarg/<item>/<field>" | gcloud secrets versions add <name> --data-file=- --project=<project>`
- **Image is CI-managed.** The deploy workflow runs
  `tofu apply -var web_image=<registry>/<sha> -var worker_image=...`, so tofu
  stays the single source of truth and the *same* SHA image is promoted to
  production (never rebuilt). The `hello` default lets the first apply succeed
  before any image is pushed.
- **WIF, no keys.** `tofu output wif_provider` gives the value for the deploy
  workflow's `google-github-actions/auth@v2` (`workload_identity_provider`);
  `tofu output deployer_sa` gives `service_account`. No JSON key exists.
- **Cross-project image promotion (`deploy-production.yml`).** Production
  never rebuilds; it pulls the SHA-tagged image staging already built from
  staging's own Artifact Registry and re-pushes it into production's
  registry. That pull needs a one-time, owner-applied IAM grant (CI's deployer
  SA can't grant itself cross-project access):
  ```bash
  gcloud artifacts repositories add-iam-policy-binding yarg \
    --project=yarg-staging-zbch --location=us-east4 \
    --member="serviceAccount:yarg-deployer@yarg-production-cwqd.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.reader"
  ```
- **State** lives in a per-env GCS bucket (`<project_id>-tfstate`, versioned),
  configured via the `backend "gcs"` block in each env's `main.tf`. Moved off
  local state so CI (deploy-staging.yml onward) and local runs share the
  same state — a CI runner starting from empty local state would otherwise
  try to recreate everything from scratch on every run.

## Rollback (production)

Per `infrastructure.md`'s release flow, `production` is a fast-forward-only
pointer, so rolling back a bad deploy is **not** a git operation in the normal
case — re-pointing the branch is reserved for the exceptional case. The normal
path is a **Cloud Run traffic shift back to the prior revision**: Cloud Run
revisions are immutable and retained, so the previous good build is still
sitting there, undeployed but ready.

```bash
# 1. Find the prior good revision (the one before the bad deploy).
gcloud run revisions list \
  --service=yarg-web --project=yarg-production-cwqd --region=us-east4 \
  --format="table(metadata.name,status.conditions[0].lastTransitionTime,spec.containers[0].image)"

# 2. Shift 100% of traffic back to it.
gcloud run services update-traffic yarg-web \
  --project=yarg-production-cwqd --region=us-east4 \
  --to-revisions=<PRIOR_REVISION_NAME>=100

# Repeat for the worker service (yarg-worker) if the bad revision affected it too.
gcloud run services update-traffic yarg-worker \
  --project=yarg-production-cwqd --region=us-east4 \
  --to-revisions=<PRIOR_REVISION_NAME>=100
```

**Migration caveat:** if the bad deploy included a migration, a traffic shift
alone does not undo schema changes. Because migrations are required to be
expand/contract (`infrastructure.md` — "Migrations must be backward-compatible
… Cloud Run may briefly run old and new revisions together"), the prior
revision must still work against the *new* schema; a full rollback additionally
needs that migration's contract step (dropping the now-unused old
column/table) run manually, or simply left in its expand state until the fix
is redeployed.

**Re-establishing `production` as the source of truth after a manual traffic
shift:** the `production` branch pointer still names the bad commit even after
traffic is shifted. Once a fix lands on `main` and passes CI, promote normally
(`promote-to-production.yml`) — the next promotion's `deploy-production.yml`
run redeploys and traffic naturally moves to the new (fixed) revision at
100%, superseding the manual shift.
