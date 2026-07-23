---
status: approved
branch: public-list-sharing
created: 2026-07-23
features: [public-list-sharing]
surfaced-defects: []
---

# Plan: Public List Sharing

## Goal

Let a list owner enable a live, view-only, non-revocable public share link for a finished list, no login required to view.

## Scope

**In scope:**
- A per-list `is_shared` toggle and a generated `share_token` (`datamodel.md`).
- One unauthenticated public route that resolves a list by its `share_token` and renders the list's live current ranking, read-only (`infrastructure.md`).
- Enabling/disabling the toggle from the List result & export view (`ui.md`), including the copy-link affordance.
- Help text explaining the sharing model's guarantees (private by default; link keeps working once shared, even if later "turned off").

**Out of scope:**
- Link revocation / token rotation (see Production Annotation Summary below).
- Any authenticated/permissioned sharing (e.g. share with specific users) — this is public-or-nothing.
- Snapshot/point-in-time sharing — the shared view is always live, never frozen.

## Technical Approach

The public route is a plain read of the same server-side list-rendering path the authenticated list view already uses (`ui.md`'s List result & export view), swapping the auth/ownership check for a `share_token` lookup — no new rendering logic, no cache/snapshot layer. `share_token` is generated once, lazily, the first time a list's `is_shared` flips to `true` (datamodel.md), and is never regenerated afterward: this keeps the "already-shared links keep working" guarantee mechanically trivial (there is only ever one token per list, and disabling `is_shared` doesn't touch it). RLS is already off project-wide (`infrastructure.md`), so this route's authorization model — "possession of the token" instead of a user session — is a natural extension of the existing app-enforced-not-DB-enforced posture, not a new one.

## Phase Breakdown

Phase lists are plan work-items, not live checklists — progress is tracked in the linked tasks file.

**Phase 1: Data model** (no dependency)
- Add `is_shared` and `share_token` columns to `List` via migration (Principle X). `share_token` nullable, populated lazily.

**Phase 2: Public read route** (depends on Phase 1)
- Add the unauthenticated `/share/[token]` route resolving a `List` by `share_token`, reusing the existing list-rendering/derivation logic read-only.
- 404 (not a permission error) when the token doesn't match any list — never reveal whether a token is "wrong" vs. "not shared".

**Phase 3: Sharing UI** (depends on Phase 1, can start in parallel with Phase 2) [parallel]
- Add the enable/disable toggle and copy-link affordance to the List result & export view.
- Add the `InfoPopover` help blurb explaining the live, non-revocable sharing model (`ui.md`'s Help & info text pattern).

**Phase 4: Accessibility & polish** (depends on Phases 2–3)
- WCAG 2.1 AA pass on the new toggle, copy-link control, and public share view (Principle VI) — keyboard operability, labeling, contrast.

## Complexity Tracking

| Deviation | Why | Simpler alternative rejected because |
|---|---|---|
| Public unauthenticated route bypassing the app's otherwise-universal auth check | Feature requires no-login viewing by design | An authenticated "share with account" model was rejected — it doesn't satisfy "no login required to view," which is the feature's explicit goal |

## Open Questions

None — the sharing model (private-by-default, view-only, non-revocable, live) was decided during `/ardd-refine ui` prior to this plan.

## Production Annotation Summary

- **Share links are not revocable in v1**: once a link is generated and distributed, the owner cannot invalidate viewer access to it. A production version handling sensitive lists may need real revocation (e.g. rotating `share_token`) rather than the always-valid link assumed here.
