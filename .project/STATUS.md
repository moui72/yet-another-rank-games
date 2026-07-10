# yet-another-rank-games — Project Status

_Updated: 2026-07-10. Keep this current as artifacts are refined and open questions are resolved._

## Artifact Status

| Artifact | Status | Open questions |
|---|---|---|
| constitution.md | stable ✅ | — |
| datamodel.md | stable ✅ | — |
| infrastructure.md | draft ⚠️ | 1 (deferred to spike) |
| ui.md | draft ⚠️ | 5 (implementation-tuning) |

## Resolved this session

- **Pairwise ranking algorithm** → rating model via **`openskill`** + novelty-biased
  next-pair policy (`ui.md`). Analysis: `.project/plans/research-pairwise-ranking-algorithm-2026-07-10.md`.
- **Order representation** → `Comparison` graph is source of truth, `ListEntry` a
  derived snapshot (`datamodel.md`).
- **Accessibility bar** → full **WCAG 2.1 AA** as a release gate (constitution v1.1.0).
- **Coverage gate** → **ratchet** (never-decrease) policy (constitution v1.1.0).
- **Supabase RLS** → **off**; ownership enforced in app code, annotated as a production trade-off.
- **List `filter` schema** → concrete v1 jsonb schema (AND of typed predicates) in `datamodel.md`.
- **Export formats** → Markdown, CSV, JSON baseline set (`ui.md`).

## Open Questions

**infrastructure**
- BGG access: raw `xmlapi2` + own typed parser vs. an existing SDK — deliberately deferred to an early implementation **spike** (raw is the fallback).

**ui** (all tuning-level; none block a first plan)
- Exact pair-selection scoring (closeness vs. uncertainty vs. novelty; Swiss rounds?).
- Concrete "done" definition (sigma threshold / coverage / budget / user-driven) and how it's shown.
- Comparison budget for large sets (~100 games); cap pairwise list size?
- Presenting the rare intransitive-cycle case.
- Public sharing model (read-only link + visibility rules) — deferred product decision, separate from export.

## Diagrams

- datamodel.md — unrendered (run `/ardd-render datamodel`)
- infrastructure.md — unrendered (run `/ardd-render infrastructure`)
- ui.md — unrendered (run `/ardd-render ui`)

## Plans

- `plan-foundation-2026-07-10.md` — **approved** — 7-phase MVP (scaffolding → data/auth →
  BGG import worker → collection/list UI → ranking+pairwise → drag-order/export → deploy).

## Tasks

- `tasks-foundation-cd84.md` — **ready** — 39 tasks across 7 phases (0/39 done),
  bound to `plan-foundation-2026-07-10.md`.

## Code-vs-Artifact Defects

Never checked — no code yet. Run `/ardd-verify` once implementation exists.

## Recommended Next Step

Run `/ardd-implement` to execute `tasks-foundation-cd84.md` starting at T001
(Phase 0 scaffolding). Work begins on `main` (no commits yet); an initial
commit early in Phase 0 makes later branch/worktree delegation possible.
