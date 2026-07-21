---
topic: F001 pairwise manual-reorder reload divergence — repro + fix direction
date: 2026-07-21
status: complete
---

# Research: Pairwise Manual-Reorder Reload Divergence (F001)

## Question

Feedback F001 (`.project/feedback/feedback-move-up-down-reverts-on-reload-2fd0.md`)
claims a move-up/move-down adjustment can appear to work in-session and then
revert after reload, because `recordComparison` upserts on the unique
`(list_id, game_a, game_b)` so only one row per pair persists while the live
session log keeps every synthetic repeat. Three things to establish: (1) does
this actually reproduce against a running app, and in what form; (2) does the
just-shipped `efficient` mode's constraint-graph mechanism supersede the need
to patch pairwise; (3) what fix, if any, to recommend.

## Findings

### 1. Repro verdict: **REPRODUCED — but the mechanism is not the one F001 describes**

Environment: local Supabase (`supabase start`) + `npm run dev`, dev account
`repro-f001@example.com`, lists seeded directly into Postgres, driven in a
real Chrome session.

**Run A (simple case — does NOT diverge).** A 6-game pairwise list with a full
15-row round-robin history (one row per pair, A>B>C>D>E>F). Clicking move-up
on the bottom game repeatedly (8 clicks total, including repeats: 2× against
Charlie, 3× against Alpha) walked it all the way to rank 1 in-session, and
**the order survived reload exactly**, including the intermediate one-spot
nudge. DB check confirmed the storage half of F001's claim: still exactly 15
rows, repeats collapsed, overridden pairs' `winnerId` and `createdAt`
overwritten (`comparisons.ts:27-30` `doUpdateSet({winnerId, createdAt})`).
The reorder held anyway.

**Why the naive hypothesis fails.** Two effects F001's analysis missed cancel
its arithmetic:

- The upsert **bumps `createdAt`**, and replay is ordered by
  `(createdAt, id)` (`listComparisons`, `comparisons.ts` bottom). So an
  overridden pair replays at the **end** of the log — the override literally
  gets the last word in the rating update, which is disproportionately
  effective at holding the flip.
- The same unique constraint also **caps the prior at one row per pair**, so
  the "m prior judgments needing ceil(m/2)+ repeats" scenario cannot exist in
  a persisted log. On session start, live log == persisted log; the only
  in-session repeat source is move-clicks themselves (the matchup selector
  never offers repeats — `selectNextPair` only picks unseen pairs, and the
  matchup UI hides entirely once `isFullyOrdered`, `PairwiseRanker.svelte:171-204`).

**Run B (real divergence — reproduced in the browser).** The true defect is
**replay-order divergence**, not lost repeats. When a move-click re-judges a
pair that already has a row, the live session *appends* a new observation
while keeping the old one in place; the persisted log instead *deletes the old
observation from its original position* and re-inserts it (possibly with a
flipped winner) at the end. Every rating computed between those two positions
differs, so the whole trajectory diverges — no repeat-collapsing needed.

I searched for a minimal deterministic recipe by simulation (my own
experiment, this session — script `simF001*.mjs`/`findRecipe.mjs` in the
session scratchpad, using the repo's `openskill@5.0.1`, the same
`mu − 3·sigma` score as `src/lib/domain/score.ts`, and the exact
persistence/replay semantics of `comparisons.ts`), then replayed it live:

- 6 games, 10-row partial prior (some noisy judgments), initial order
  Hotel, India, Golf, Lima, Juliet, Kilo.
- User actions: **Juliet ▲ ×3** (lands rank 1), **India ▼ ×2**.
- In-session final order: **Juliet**, Hotel, Golf, Lima, India, Kilo.
- After reload: Hotel, Lima, **Juliet**, Golf, India, Kilo.

The game the user deliberately moved to rank 1 **reverted to rank 3**, and
Lima jumped from 4 to 2 with no user action on it. Browser behavior matched
the simulation's prediction exactly, both before and after reload. DB
evidence: 12 rows persisted for 12 in-session judgments — in this recipe *no
repeats were even emitted*; two of the India move-down clicks overwrote
existing prior rows ((Golf,India) same winner, (India,Lima) flipped winner)
and bumped their `createdAt` from the prior block to the end of the replay.
That reordering alone produced the revert.

**Prevalence (my simulation, 300 trials/n).** With realistic session shapes
(deduped prior at 50–100% pair coverage, 10% noisy judgments, 1–3 moves of
1–3 spots): any-divergence in 56–83% of sessions, and the *moved game itself*
lands on a different rank after reload in **34–63%** of sessions (n=8→40),
with shifts up to 6 positions. Single-move sessions over a clean fully-judged
prior essentially never revert the moved game (0/210 across scenario sweeps);
occasional one-position bystander swaps appear at n≥15 (~3–10%).

**Refined statement of the defect:** the in-session order and the
reload-replayed order are computed from *different logs* whenever any pair is
re-judged (which every move-click of more than trivial distance does). The
user's move usually survives simple cases, but multi-move or
partially-judged-list sessions revert or reshuffle roughly half the time —
including moving games the user never touched. F001's user-visible claim is
confirmed; its causal story ("repeats collapse, fewer observations") is only
half right — the dominant mechanism is the **replay-position change from the
`createdAt` bump plus old-observation deletion**.

### 2. Does the constraint-graph mechanism supersede a patch?

What shipped for `efficient` mode (`src/lib/domain/constraintOrder.ts`,
`overrideEdges.ts`, `insertionSelect.ts`; server derivation branch in
`src/lib/server/ranking.ts:41-59`): comparisons are latest-wins hard edges
(`deriveEdges`), order is a deterministic topological sort with the rating
only as tie-breaker, cycles broken by dropping the oldest edge. An override is
authoritative by construction, and — critically — **its durability contract is
immune to this bug**, because `deriveOrder` keys only on the latest edge per
pair and `(createdAt, id)` recency, which the upsert preserves perfectly. The
persisted log is a lossless input for the constraint derivation; it is a lossy
input for a sequential rating replay.

Options weighed (audit lenses applied — simplicity, failure modes,
semantics, proportionality):

- **(a) Wholesale: use constraintOrder for pairwise too.** Over-reach. It
  reverses the constitution's deliberate two-mode split (v2.2.x: Principle III
  scopes novelty-preference to the primary mode *because* the modes differ in
  what order means) and changes pairwise's identity — a rating model that
  absorbs noisy, contradictory "fun" judgments gracefully is the point of the
  mode. Rejected.
- **(b) Hybrid: rating-derived base order + manual overrides as pinned
  constraint edges layered on top.** Technically feasible — `topologicalOrder`
  already accepts an arbitrary `scoreOf`, so pairwise could pass its openskill
  conservative scores and only the override edges. But it creates two sources
  of truth for one order, needs a way to distinguish synthetic from real
  comparisons in storage (a new flag — today they are indistinguishable rows),
  and raises unresolved semantics: does a later real comparison beat a pinned
  edge? Do pinned edges decay? This is a real design, not a patch — and it
  buys durability the *primary* mode never promised (its move affordance was
  shipped as a nudge, `ui.md`).
- **(c) Allow repeat rows (drop/relax the unique constraint).** Fixes the
  divergence fully (replay == live log) but re-opens the double-submit
  duplicate-weighting defect migration `20260715220000` closed, and the
  efficient mode's batched upsert (`recordComparisons`) depends on the
  constraint. A partial variant (keep constraint, stop bumping `createdAt`)
  does NOT fix it — the deletion-from-original-position effect remains, and it
  would *weaken* the accidental last-word mitigation that currently saves the
  simple cases. Rejected as primary fix.
- **(d) Recency/weight term on the rating update.** Tunes symptom severity,
  adds a free parameter foreign to the openskill model, and still cannot make
  live and replayed orders equal (the two logs differ; any sequential model
  diverges). Rejected.
- **(e) Accept-as-advisory + make the persisted derivation the single source
  of truth the session shows.** The root cause is *session-vs-replay
  divergence*, and there is a patch smaller than all of the above: after any
  comparison write, the server already recomputes the authoritative snapshot
  (`recordComparisonAndRecompute`). If the client, after a move (or on any
  write), re-syncs its log/order from the server instead of trusting its
  append-only local log, the user *sees the same order reload will produce* —
  no silent revert, because there is nothing to revert to. The move stays
  advisory (matching the mode's identity), and in the common cases measured
  above it sticks anyway.

### 3. Reversed-decisions check

- No committed decision requires pairwise moves to be authoritative;
  `ui.md`'s `manual-pairwise-ranking-adjust` describes a nudge "through the
  same choose() path", and constitution v2.2.x explicitly assigns exact-
  override durability to the efficient mode only.
- Option (c) would reverse the ardd-audit 2026-07-15 decision recorded in
  migration `20260715220000` and `comparisons.ts`'s doc comment.
- Option (a) would reverse constitution Principle III's mode split.
- The recommended route reverses nothing.

## Recommendation

**Ranked:**

1. **Fix the session/replay divergence directly (variant of "accept as
   advisory"): make the client converge to the replayed order after
   move-writes.** Concretely: after the `/compare` POST for a move resolves,
   refetch the canonical log (or have the endpoint return it — it already
   recomputes `list_entries`) and rebuild the `PairwiseSession` from it, so
   the in-session order equals the reload order at all times. Scope: small —
   client-side in `PairwiseRanker.svelte` + optionally returning the replayed
   log from `src/routes/api/lists/[id]/compare/+server.ts`; no schema change,
   no model change, no reversal of the dedup decision. Risk: low; worst case
   is the user watching a move settle somewhere other than exactly one spot
   up — which is *honest*, and per the measurements the moved game holds its
   spot in the large majority of simple interactions. Document the nudge
   semantics in `ui.md` while touching it.
2. **Constraint-graph hybrid (pinned override edges over the rating order)** —
   the right move *if* the product later decides pairwise moves must be
   authoritative. Requires a synthetic-comparison marker in storage and pinned-
   edge semantics; vet it as its own proposal then. Don't do it as a bug fix.
3. **Recency weighting** and **relaxing the unique constraint** — rejected
   (see Findings §2c/§2d).

Route: **`/ardd-backlog` the #1 fix** (it is understood well enough to plan,
but it's a change to shipped-feature behavior, so let the next plan pick it up
with this research as its spec). If the product conversation instead lands on
"moves must stick exactly", vet option 2 with a fresh `/ardd-research
proposal:` before any backlog entry.

## Rejected Alternatives

- Adopt `constraintOrder` wholesale for pairwise — changes the mode's
  identity; reverses constitution Principle III's mode split.
- Drop/relax `comparisons_list_pair_unique` — re-opens the duplicate-row
  double-weighting defect; also breaks `recordComparisons` batching.
- Stop bumping `createdAt` on upsert — does not fix the divergence and
  removes the accidental "override replays last" mitigation.
- Recency/weight term in the rating update — parameter tuning that cannot
  equalize two structurally different logs.
- Do nothing/document only — the reload reshuffle also moves games the user
  never touched (measured up to 6 positions), which reads as data loss.

## Open Questions

- Product call: should pairwise manual moves ever be *authoritative* (option
  2), or is honest-advisory (option 1) the intended contract? `ui.md` should
  state it either way.
- Whether the `/compare` endpoint should return the canonical replayed log on
  every write (real picks too, not just moves) so undo/redo also can't drift.
- The GIF export of the browser repro reported success from Chrome (44
  frames, `f001-repro-revert-on-reload.gif`) but the file could not be located
  on disk afterward; the before/after screenshots and the seeded repro list
  (`F001 Recipe List`, local DB) remain available to re-record.

---

*Repro provenance: browser runs against local stack (this session, 2026-07-21);
row-level evidence via direct Postgres reads; prevalence numbers from my
simulations (`simF001.mjs`, `simF001b.mjs`, `simF001c.mjs`, `findRecipe.mjs`,
session scratchpad) using the repo's own openskill and exact
persistence/replay semantics. Prior measurements cited from
`research-efficient-durable-secondary-ranking-mode-2026-07-20-d22b.md` §3.*
