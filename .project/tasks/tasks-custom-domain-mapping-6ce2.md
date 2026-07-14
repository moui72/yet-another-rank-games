---
plan: plan-custom-domain-mapping-2026-07-13-53ec.md
generated: 2026-07-13
status: in-progress
---

# Tasks

## Phase 1: Terraform domain mapping (production only)
- [ ] T001 [artifacts: infrastructure] Add a `google_cloud_run_domain_mapping`
  resource to `infra/terraform/modules/environment`, gated by a new
  `custom_domain` variable (string, default `""`/null) so it is created only
  when set — pass `"yarg.ty-pe.com"` for the production environment's module
  instantiation and leave it unset for staging. Bind the mapping to the
  existing `web` Cloud Run service in that environment. Run `tofu validate`
  for both `infra/terraform/environments/staging` and
  `infra/terraform/environments/production` (or equivalent env directories)
  to confirm staging's plan is unaffected (no new resources) and
  production's plan shows exactly the one new domain-mapping resource.

## Phase 2: Human-only prerequisites (blocking, sequential — depends on T001)
- [ ] T002 (human-only) Verify ownership of `ty-pe.com` (or the
  `yarg.ty-pe.com` subdomain, whichever Search Console requires) in Google
  Search Console, using the Google account associated with the production
  GCP project. `google_cloud_run_domain_mapping`'s apply fails without this
  verification being in place first. Record in this tasks file when done.
- [ ] T003 Depends on T001 + T002. Run `tofu apply` scoped to the new
  domain-mapping resource in the production environment (mirror the
  `-target=module.environment` scoping used by CI in the multi-env-deploy
  plan, e.g. `-target=module.environment.google_cloud_run_domain_mapping.<name>`).
  Capture the DNS records Cloud Run reports as required in the apply output
  or via `gcloud run domain-mappings describe --domain=yarg.ty-pe.com
  --region=<region>` (CNAME/A/AAAA records per Cloud Run's mapping
  response) and record them in this tasks file for T004.
- [ ] T004 (human-only) Depends on T003. Add the DNS records captured in
  T003 at the `ty-pe.com` registrar's DNS management panel. Record in this
  tasks file when done.

## Phase 3: Verification (depends on T004)
- [ ] T005 Depends on T004. Poll
  `gcloud run domain-mappings describe --domain=yarg.ty-pe.com
  --region=<region>` until the mapping's certificate status is `Ready`
  (DNS propagation and managed-cert issuance are not instant — may take
  minutes to hours). Once ready, verify `https://yarg.ty-pe.com` serves the
  app: check the page title matches the deployed app and `GET
  /api/games/search` returns `401` unauthenticated (the same DB-backed-auth
  smoke check used for staging/production in multi-env-deploy T003/T004).
- [ ] T006 [artifacts: infrastructure] Depends on T005. Update the
  production Supabase project's Auth **Site URL** and add
  `https://yarg.ty-pe.com/**` to **Redirect URLs** (currently the production
  `*.run.app` origin, set in multi-env-deploy T008). Sign up a fresh test
  account against `https://yarg.ty-pe.com` and confirm the email
  confirmation link redirects back to `https://yarg.ty-pe.com`, not the old
  `*.run.app` origin or `localhost`.
- [ ] T007 Depends on T006. Smoke-test the full flow against
  `https://yarg.ty-pe.com` — signup → BGG import → pool build → pairwise
  rank → export (Markdown/CSV/JSON/GeekList) — mirroring multi-env-deploy
  T008's smoke flow, to confirm full parity with the `*.run.app` origin
  after the domain cutover.
