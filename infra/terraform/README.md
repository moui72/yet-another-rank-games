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
env is its own root module with local state.

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
- **State** is local for now (gitignored). Move to a GCS backend when you run
  tofu from more than one place.
