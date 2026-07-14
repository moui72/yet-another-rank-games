# yet-another-rank-games — Project Status

_Updated: 2026-07-14. Keep this current as artifacts are refined and open questions are resolved._

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

- 0 backlogged · 1 planned · 1 tasked (`custom-domain-mapping`) · 2 implemented (`bgg-geeklist-export`, `bgg-game-search-import`) — see `.project/features/`.

## Plans & Tasks

- `plan-foundation-2026-07-10.md` — approved; `tasks-foundation-cd84.md` **in-progress, 41/46**. Its remaining Phase 6 (T035–T039) is **superseded** by the multi-env-deploy plan; the file stays as the record of Phases 0–5.
- `plan-bgg-geeklist-and-search-2026-07-12.md` — approved; `tasks-bgg-geeklist-and-search-2299.md` **completed, 7/7**. Shipped + merged.
- `plan-multi-env-deploy-2026-07-12.md` — approved; `tasks-multi-env-deploy-5928.md` **completed, 8/8**. Merged to `main`.
- `plan-custom-domain-mapping-2026-07-13-53ec.md` — approved; `tasks-custom-domain-mapping-6ce2.md` **in-progress, 4/7**. Merged to `main`. T001–T004 done: Terraform `google_cloud_run_domain_mapping` created for production (`yarg.ty-pe.com` → `yarg-web`, applied with `web_image`/`worker_image` pinned to the live SHA to avoid reverting to the placeholder image), Search Console ownership verified, CNAME (`yarg` → `ghs.googlehosted.com.`) added at Namecheap and confirmed propagated via multiple public resolvers. **Blocked on T005**: Cloud Run's managed TLS certificate is still `CertificatePending` — Google's automatic issuance retries roughly hourly and can take anywhere from minutes to several hours after DNS propagates; nothing further to do but wait and re-check. T006 (Supabase Auth Site URL → the new domain) and T007 (full smoke test against `https://yarg.ty-pe.com`) remain, both gated on T005.

## Diagrams

- datamodel.md — current ✅
- infrastructure.md — current ✅
- ui.md — current ✅

## Code-vs-Artifact Defects

No defects — last checked 2026-07-12. Run `/ardd-defects` to refresh (artifacts have changed since — the custom-domain-mapping infrastructure.md addition hasn't been re-verified against code, but it describes infra-as-code outside the app artifacts' usual scope).

## In Flight

Nothing in flight — all worktrees from this session (including the one that did T002–T004) have been merged and removed.

## Recommended Next Step

Re-check the domain mapping's certificate status later: `gcloud beta run domain-mappings describe --domain=yarg.ty-pe.com --region=us-east4 --project=yarg-production-cwqd --format=yaml` — once `CertificateProvisioned`/`Ready` report `status: 'True'`, resume `/ardd-implement` on `tasks-custom-domain-mapping-6ce2.md` to run T005 (verify `https://yarg.ty-pe.com` serves the app), T006 (update Supabase Auth's production Site URL to the new domain), and T007 (full smoke test). Lower-priority items in the meantime: the `ui.md` open question (public sharing model) is a deferred product decision with no urgency, and the ARDD tool itself has an update available (`/ardd-update`).
