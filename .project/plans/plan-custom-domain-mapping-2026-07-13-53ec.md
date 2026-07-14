---
status: approved
branch: main
created: 2026-07-13
features: [custom-domain-mapping]
surfaced-defects: []
---

# Plan: custom-domain-mapping

## Goal

Map production's web Cloud Run service to `https://yarg.ty-pe.com` so users
have a durable, brandable URL instead of the default `*.run.app` address.

## Scope

**In scope:**
- Terraform `google_cloud_run_domain_mapping` resource for production's
  `web` Cloud Run service, in `infra/terraform/modules/environment`.
- Domain ownership verification in Google Search Console (human-only step,
  documented as a prerequisite — cannot be automated).
- DNS records at the `ty-pe.com` registrar pointing the domain at Cloud Run's
  mapping targets (human-only step — outside GCP, no automation path).
- Verifying the managed TLS certificate provisions and the domain serves the
  app correctly end-to-end.
- Updating Supabase Auth's production Site URL / redirect URLs from the
  `*.run.app` origin to `https://yarg.ty-pe.com`.

**Out of scope:**
- Staging keeps its default `*.run.app` URL — no subdomain mapping for
  staging in this plan.
- No app-code changes are anticipated (Cloud Run domain mapping is a routing
  layer in front of the existing service; SvelteKit doesn't need to know its
  own external hostname for anything currently implemented).

## Technical Approach

Cloud Run's built-in **Domain Mappings** feature (not a load balancer / NEG
setup) binds a verified custom domain directly to an existing Cloud Run
service and auto-provisions a managed TLS certificate once DNS resolves.
This is the simplest option for a single production service on one domain,
consistent with the project's single-region, hobby-scale posture
(infrastructure.md Production Annotations).

Sequencing matters: domain **ownership verification** (Search Console) must
happen before Terraform can create the mapping (`google_cloud_run_domain_mapping`
fails otherwise), and **DNS propagation** must happen before Cloud Run can
issue the managed cert — both are human/external-system steps Terraform
cannot perform, so they gate the apply and the final verification
respectively.

## Phase Breakdown

### Phase 1: Terraform domain mapping (production only)
- [ ] T001 `[artifacts: infrastructure]` Add a `google_cloud_run_domain_mapping`
  resource to `infra/terraform/modules/environment`, parameterized so it's
  created only for the production environment instance of the module (e.g. a
  `custom_domain` variable, empty/null for staging). Bind it to the existing
  `web` Cloud Run service. Run `tofu validate` for both envs to confirm
  staging is unaffected.

### Phase 2: Human-only prerequisites (blocking, sequential)
- [ ] T002 (human-only) Verify ownership of `ty-pe.com` (or the `yarg.ty-pe.com`
  subdomain, per Search Console's supported verification scope) in Google
  Search Console for the GCP account tied to the production project. Record
  completion in the tasks file — Terraform apply in T003 will fail without
  this.
- [ ] T003 Run `tofu apply` (production, targeted to the new domain-mapping
  resource) now that verification is done. Capture the DNS records Cloud Run
  reports as required (CNAME/A/AAAA per Cloud Run's domain-mapping output).
- [ ] T004 (human-only) Add the DNS records from T003 at the `ty-pe.com`
  registrar. Record completion in the tasks file.

### Phase 3: Verification
- [ ] T005 Poll the domain mapping status (`gcloud run domain-mappings describe`
  or equivalent) until the managed TLS certificate is `Ready` — DNS
  propagation and cert issuance are not instant. Verify `https://yarg.ty-pe.com`
  serves the app (title check + an authenticated route, mirroring the T003/T008
  smoke checks already used for staging/production in the multi-env-deploy
  plan).
- [ ] T006 `[artifacts: infrastructure]` Update Supabase Auth's production
  Site URL and redirect URLs (currently the production `*.run.app` origin,
  per multi-env-deploy T008) to `https://yarg.ty-pe.com`. Re-verify the
  signup/email-confirmation redirect lands on the new domain, not the old
  `*.run.app` address or `localhost`.
- [ ] T007 Smoke-test the full signup → import → rank → export flow against
  `https://yarg.ty-pe.com` (same flow T008 in multi-env-deploy already
  exercised against the `*.run.app` URL) to confirm parity after the
  domain cutover.

## Complexity Tracking

No deviations to justify — this plan uses Cloud Run's built-in Domain
Mappings feature (Principle IX: check library/platform idioms before
building custom mechanism), not a custom routing or load-balancer setup.

## Open Questions

- Whether the old `*.run.app` URL should keep working (Cloud Run domain
  mappings are additive, not exclusive, so it will by default) or whether
  that's undesirable for any reason (e.g. confusion, duplicate-content SEO
  concerns) — no action planned here; default (both URLs live) is accepted
  unless the user says otherwise.
- Exact Search Console verification scope (whole `ty-pe.com` vs. just the
  `yarg` subdomain) depends on how the domain is currently verified/owned in
  the user's Google account — resolved during T002, not knowable in advance.

## Production Annotation Summary

- None new — this plan implements existing Production Annotations
  (durable production URL) rather than introducing new shortcuts.
