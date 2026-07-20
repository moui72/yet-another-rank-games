<!--
SYNC IMPACT REPORT
==================
Version change: 2.1.1 → 2.2.0
Rationale: Principle III and `datamodel.md`'s "order is derived, not authored"
  were both written when pairwise was the only ranking mode, so both were
  stated as global product properties. They are properly properties *of a
  mode*. A planned second mode (`efficient-ordering-mode`) deliberately trades
  novelty-preferring matchup selection for convergence speed and exact
  honouring of manual overrides — which the current global wording forbids
  outright rather than scopes.
Modified (MINOR — material expansion; scopes an existing rule, removes none):
  - Principle III: split into the general complexity-for-delight rule plus an
    explicit "ranking modes declare their own priorities" clause. Novelty
    preference now binds the primary pairwise mode specifically. A secondary
    mode may optimize differently if it states its priority and why.
    Accessibility (VI) and exportability (V) are called out as non-negotiable
    in every mode, so the scoping cannot be read as a general opt-out.
Prior report (2.1.1):
  Version change: 2.1.0 → 2.1.1
Rationale: v2.1.0 removed drag-to-order from Principle VI's WCAG AA release
  gate on the strength of `ui.md:245`'s claim that the deprecated view is
  "not user-reachable." Verification against the code showed that claim is
  wrong: `src/routes/lists/[id]/+page.server.ts:27` still branches on
  `list.rankingMethod === 'manual'` and renders the `svelte-dnd-action` view,
  and no migration ever converted existing rows (`ranking_method` appears
  only in the initial schema). Deprecation removed the *creation* path, not
  the *render* path. Dropping a still-reachable flow from the accessibility
  gate is precisely the coverage gap Principle VI exists to prevent.
Modified (PATCH — corrects an overstatement, no rule change):
  - Principle VI: the deprecated drag-to-order view is explicitly returned to
    the AA gate for as long as its render path stays reachable for
    pre-deprecation lists. The bar is unchanged — still full WCAG 2.1 AA.
  - Project Scope & Intent: pairwise is the sole method offered "for new
    lists," not outright, since legacy manual lists still render.
Prior report (2.1.0):
  Version change: 2.0.0 → 2.1.0
Rationale: `ui.md` deprecated manual drag-to-order in favor of pairwise-only
  ranking, but the constitution was never amended to match — it still scoped
  drag-to-order as a live override and named "drag-to-order flows" as a WCAG
  AA release gate, gating a flow that is not user-reachable. Governance
  requires the constitution describe what is actually true (Principle VIII,
  No Dead Architecture, applied to the governing document itself).
Modified (MINOR — material narrowing, no principle added or removed):
  - Project Scope & Intent: pairwise is now stated as the sole ranking method.
    Manual drag-to-order recorded as evaluated and deprecated. The shipped
    move-up/move-down controls described accurately as synthetic comparisons
    through the pairwise model, not authored positions. Tiering retained as a
    possible later feature, now cross-referenced to `revisit-ranking-modes`.
  - Principle VI (Accessibility): the AA release gate no longer names
    drag-to-order flows; it names the pairwise flow and the move-up/move-down
    controls, noting these were chosen over drag-and-drop for accessibility.
    The bar itself is unchanged — still full WCAG 2.1 AA.
  - Development Workflow item 3: corrected a stale reference to the renamed
    `/ardd-critique` skill (now `/ardd-audit`). Wording fix only.
Follow-up required (not applied here — separate artifacts):
  `design.md:22,84,95` still list drag-order/`ManualRanker` as current, and
  `datamodel.md:50-53,216-221` still describe the manual authored-`ListEntry`
  model in present tense.
Prior report (2.0.0):
  Version change: 1.1.0 → 2.0.0
Modified (MAJOR — principle redefinition/removal): shrank the principle list
  from 15 to 11 for a solo-hobby-project-appropriate governance surface
  (ardd-audit finding, 2026-07-15):
  - Former Principle IX (Check Library Idioms Before Building Custom
    Mechanism) folded into Principle VII (Simplicity / YAGNI) as a
    sub-point — no rule content dropped.
  - Former Principles XII (Single Source of State), XIII (Named Types Over
    Inline Duplication), XIV (Dispatch Surfaces Decomposed by Concern), and
    XV (Bootstrap/Entry Files Wire Dependencies Only) consolidated into one
    new Principle XI, "Code Organization Discipline," as labeled bullets —
    no rule content dropped.
  - All remaining principles renumbered accordingly; no other content
    changed.
Prior report (1.1.0):
  Version change: 1.0.0 → 1.1.0
  Modified: Principle VI (Accessibility) — bar set to full WCAG 2.1 AA (was open);
    Quality Standards (test-coverage gate) — set to a ratchet, never-decrease
    policy (was open threshold).
Prior report (1.0.0):
  Version change: (none) → 1.0.0 — Added sections: all (initial)
-->

---
name: constitution
status: stable
last_updated: 2026-07-20
workflow_mode: solo
next_step_prompt: true
delegation: eager
merge_policy: auto
---

# yet-another-rank-games Constitution

## Project Scope & Intent

yet-another-rank-games helps a user build ranked lists of board games drawn
from their Board Game Geek (BGG) collection. A single collection feeds many
lists, each scoped by a theme or filter — "top 10 co-op," "top 10 heavy,"
"top 100 of all time." The primary, "fun" ranking interface is **pairwise
comparison** (repeatedly choose the better of two games, from which a full
ordering is inferred), and it is the **sole** ranking method offered for new
lists. Users can nudge a ranked list directly with per-row move-up/move-down
controls, but these are expressed as synthetic comparisons through the same
pairwise model rather than as authored positions. Manual drag-to-order was
evaluated and **deprecated** — removed from list creation, and as of
2026-07-20 no list in staging or production uses it, though the render path
remains. Drag-and-drop is planned to return, not as a purely manual method
but inside an efficiency-first second mode (`efficient-ordering-mode`).
**Tiering** remains a possible later feature, currently undesigned and
untracked by any register entry.

This is a **multi-user product** with real accounts, a hosted backend, and a
real database — built as a hobby project that must stay cheap to run unless it
grows enough to justify monetization. It is the author's third rebuild of this
idea; the first two are considered buggy. This time the explicit intent is a
**clean, careful, rigorous implementation that avoids bugs** — correctness and
engineering discipline are valued over raw speed of delivery. The principles
below encode that discipline.

## Core Principles

### I. Test-First Development (TDD)

Every code change is preceded by a test that exercises the behavior being
added or changed, written and confirmed to fail (red) before any
implementation code is written, then made to pass (green). A task without a
test requirement is the exception (a pure research/decision task, or a
documentation-only change), not the default. This is the primary safeguard
against repeating the bugginess of the prior rebuilds.

### II. Type-Safety End to End

Types flow unbroken from the database through the server to the client. There
are no untyped seams: BGG-imported data, persisted rows, server-to-client
payloads, and UI state are all statically typed in TypeScript. `any`, unchecked
casts, and untyped boundaries are defects, not conveniences.

### III. Fun UX Is the North Star

The experience is the product. Where a delightful interaction demands more
algorithmic or state-tracking complexity, that complexity is accepted rather
than avoided.

**Ranking modes declare their own priorities.** This principle binds the
*primary* mode, not every mode. The primary pairwise mode optimizes for
enjoyment: it must minimize repeat exposure of any one game (favor novel
matchups; scatter in repetitions only when the algorithm genuinely needs a
comparison it cannot otherwise resolve, or when no novel pairing remains). A
secondary mode may deliberately trade that away for a different goal —
convergence speed, durability under manual override — provided it states
which priority it optimizes for and why. What is not negotiable in any mode
is Principle VI (accessibility) and Principle V (exportability).

### IV. Cost-Safe Infrastructure

No unbounded spend paths exist. Every autoscaling and retry surface has an
explicit ceiling: Cloud Run services cap max-instances; Cloud Tasks jobs have
bounded retries and a dead-letter/give-up state (a BGG `202` must never loop
forever); a billing budget with alerts is in place from the first deploy.
Introducing an infrastructure surface without its cost ceiling is a defect.

### V. Data Exportability & Ownership

Users can get their data out. Ranked lists (and the collection data behind
them) are exportable in a portable format. No feature may trap a user's lists
inside the product with no export path.

### VI. Accessibility

The UI is usable without a mouse or perfect vision: logical tab order, readable
contrast, labeled controls, keyboard-operable interactions — including the
pairwise comparison flow and the move-up/move-down ranking controls (chosen
over drag-and-drop precisely because they are accessible by construction).
The deprecated drag-to-order view stays inside this gate for as long as its
render path remains reachable for pre-deprecation lists — a flow a user can
still land on is a flow that must meet the bar, regardless of whether it can
be newly created. **The bar is full WCAG 2.1 AA compliance**,
treated as a release gate: each feature is checked against AA (automated axe
checks plus contrast and keyboard/screen-reader passes) before it ships.

### VII. Simplicity / YAGNI

Complexity must be justified. Default to the simplest solution that satisfies
the requirement; introduce an abstraction only once duplication across three or
more concrete cases makes it unambiguous. Do not design for hypothetical future
requirements.

**Check library idioms before building custom mechanism.** Before implementing
a custom mechanism to solve a problem in a concern already owned by a
depended-on library, check whether that library already has a built-in,
idiomatic way to solve it. Reaching for a hand-built solution without checking
first is surfaced as a question before being built, not discovered as
duplicated work later.

### VIII. No Dead Architecture

When an approach is replaced, the old approach is deleted in the same change —
not archived in place, not left "for reference" in a directory that no longer
reflects reality. Documentation describes only what is actually true of the
current codebase.

### IX. Observability

Non-trivial operations emit structured, machine-readable log events, including
outcome (success/failure) and identifiers sufficient to reproduce an error
without a debugger attached.

### X. Migrations Required for Schema Changes

Changes to the persisted data shape are made through a migration, never by
hand-editing data in place or relying on an ORM's implicit sync in an
environment with real data.

### XI. Code Organization Discipline

- **Single source of state.** Application state lives in one reactive store
  per runtime. Shared mutable objects threaded by reference between modules,
  as a substitute for the store, are not permitted; modules that need to see
  the same state read from and write through the store.
- **Named types over inline duplication.** A type used in more than one place
  is a named, exported type with a single source of truth — not independently
  retyped at each usage site, even when the inline shapes happen to match
  today.
- **Dispatch surfaces decomposed by concern.** A dispatcher over many
  message/event types routes to named handler functions, one per type, each
  independently readable without scrolling through unrelated cases. Duplicated
  logic across cases is extracted, not copy-pasted.
- **Bootstrap/entry files wire dependencies only.** Application entry points
  are limited to reading config, constructing dependencies, and starting the
  app. Business logic, transport glue, and persistence concerns each live in
  their own module with a single responsibility, imported by the entry point —
  never defined inline in it.

## Quality Standards

- **Test coverage as a release gate (ratchet).** Coverage is enforced as a
  never-decrease ratchet rather than a fixed percentage: CI fails any change
  that lowers overall coverage below the current baseline, and the baseline is
  raised as coverage improves. This keeps the gate meaningful from day one
  (when absolute coverage is still low) without gaming a round number.
- **Performance budgets for user-observable operations.** Any user-observable
  operation where latency matters (pairwise next-match render, import progress,
  a page load) has a stated performance budget, defined per feature when the
  operation is added.
- **Lifecycle reference cleanup.** Component or handler references that must
  survive Svelte's lifecycle hooks are documented at the point of definition —
  not left as a bare comment warning a future reader not to break them.
- **Manifest/script hygiene.** `package.json`'s declared name, dependencies,
  and scripts match the actual package and files on disk. A stale script entry
  or unused dependency is treated as a bug, not background noise.
- **No vendored dependency with a nested `.git`.** No vendored third-party code
  carries its own nested `.git` directory. If a dependency must be vendored, its
  provenance is recorded in a README note and it is committed as plain files, or
  added as a real git submodule.

### Pre-commit & CI Enforcement

- A pre-commit hook runs lint, type-check, and the test suite, in that order,
  before a commit is accepted. Bypassing the hook is prohibited except in a
  documented emergency, and any bypass is followed immediately by a commit that
  re-establishes the passing state.
- The same lint, type-check, and test suite required by the pre-commit hook
  also run in CI on every push and pull request, and a failing run blocks merge.
  CI is the actual gate of record; the pre-commit hook is a local convenience
  that catches the same issues earlier and does not substitute for it, since a
  hook can be skipped, uninstalled, or never configured on a given clone.

## Development Workflow

1. Work is driven test-first (Principle I): write the failing test, implement
   to green, refactor.
2. Lint, type-check, and tests pass locally (pre-commit hook) and in CI before
   anything merges.
3. Any artifact documenting a known production shortcut or gap (a deliberate
   simplification, an unintentional gap awaiting future work, etc.) does so
   under a `## Production Annotations` heading — not inline prose elsewhere
   in the artifact — so `/ardd-plan`'s Production Annotation Summary step and
   `/ardd-audit` can rely on a single, consistent place to find them.

## Governance

This constitution supersedes all other practices documented in the repository.
Amendments require:

1. A written rationale explaining why the current principle is insufficient.
2. An updated Sync Impact Report (prepended as an HTML comment).
3. Version increment per semantic versioning: MAJOR for principle removal or
   redefinition; MINOR for new principle or material expansion; PATCH for
   clarifications or wording fixes.
4. `last_updated` date updated in frontmatter.

**Version**: 2.2.0 | **Ratified**: 2026-07-10 | **Last Amended**: 2026-07-20
