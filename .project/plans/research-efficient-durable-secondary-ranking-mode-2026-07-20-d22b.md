---
topic: efficient, override-durable secondary ranking mode — algorithm/selection-policy choice
date: 2026-07-20
status: complete
---

# Research: Efficient, Override-Durable Secondary Ranking Mode

## Question

The product wants a NEW secondary ranking mode with two hard requirements:
(a) **maximum efficiency** — reach a confident total ordering in as few user
comparisons as possible; (b) **durability to manual fiddling** — the user can
drag-and-drop (plus keyboard move-up/move-down) to override the ranking at any
time, and the mode must absorb that gracefully. What algorithm/selection
policy best satisfies both?

The leading hypothesis to pressure-test: *no new ranking algorithm is needed —
keep the existing Bradley–Terry/Weng–Lin (`openskill`) rating model and only
swap the matchup-selection policy from novelty-preferring to maximum
information gain; durability comes free because a dnd override is synthetic
comparisons, exactly as `manual-pairwise-ranking-adjust` already works.*

## Findings

### 1. What the current system actually is (important nuance)

The current selector (`selectNextPair` in `src/lib/domain/ranking.ts`) is
**already an information-gain policy** — it scores every pair by
`sigma_a + sigma_b − |mu_a − mu_b|` (combined uncertainty + closeness) and
picks the best. The "novelty" constraint is only a *filter*: unseen pairs are
tried before repeats. So the hypothesis's proposed change is small: drop the
unseen-first filter (and/or restrict attention to adjacent pairs in the
current order). That framing matters — the hypothesis is really "does removing
the novelty filter make openskill converge meaningfully faster?"

### 2. Simulation: does info-gain selection over openskill actually converge fast? **No.**

I ran a convergence simulation (my own experiment, this session; script uses
the repo's own `openskill@5.0.1` and the same conservative score `mu − 3·sigma`
as `src/lib/domain/score.ts`). Setup: hidden true order, simulated user
(noiseless, and a noisy logistic variant), 20 trials, n ∈ {10, 25, 50, 100}.
Three policies: **novelty** (the current app policy), **info** (pure max
info-gain, repeats allowed), **adjacent** (most-uncertain adjacent pair in the
current derived order). Metric: normalized Kendall-tau distance to the true
order after k comparisons, and mean comparisons to first reach an exact order.

Results (noiseless user; tau = 0 means exact order):

| n | binary-insertion sort, exact | openskill *any* policy, exact | openskill, tau ≤ ~0.05 ("looks right") |
|---|---|---|---|
| 10 | 25 | ~28 (novelty & info tie) | ~20 |
| 25 | 94 | ~197 (novelty best; info/adjacent worse) | ~116 |
| 50 | 237 | ~957 (novelty); info/adjacent never within budget | ~282 |
| 100 | 573 | >2800 (none converged exactly in budget) | ~664 |

Two falsifying observations:

- **Swapping the selection policy does not help.** Pure info-gain and
  adjacent-uncertainty selection were *equal or slightly worse* than the
  existing novelty policy at every n and noise level. The reason: allowing
  repeats lets the greedy selector re-ask near-duplicate questions whose
  answer it already knows; the unseen-first filter is accidentally a decent
  exploration guard. There is no efficiency win to harvest here.
- **The rating model itself is the bottleneck, not the selector.** To reach a
  *confident exact* total order, openskill (under any selection policy) needs
  roughly **4× the comparisons of plain binary-insertion sort** (n=50:
  ~957 vs 237). This is by design — a Bayesian model discounts any single
  answer as possibly noisy, so it needs corroborating evidence a
  deterministic sort doesn't ask for. Even at the looser "looks right"
  threshold (tau ≤ 0.05, a few adjacent games swapped), the model only
  matches — never beats — the sort's *exact*-order count.

This matches published results, not just my simulation: Maystre &
Grossglauser, **"Just Sort It! A Simple and Effective Approach to Active
Preference Learning"** (ICML 2017, PMLR 70:2504–2512) show that
quicksort-driven comparison selection matches or beats
information-gain/uncertainty-sampling heuristics for Bradley–Terry ranking at
a fraction of the computational cost. Jamieson & Nowak, **"Active Ranking
using Pairwise Comparisons"** (NeurIPS 2011) similarly get O(n log n) adaptive
queries via structure, not via greedy information gain. The
information-theoretic floor is log₂(n!) comparisons (~525 for n=100);
Ford–Johnson merge-insertion sort and binary-insertion sort sit within ~10%
of it, and no rating-model policy can beat that floor.

**Verdict on hypothesis prong (a): falsified.** Keeping openskill and
swapping the selection policy yields no meaningful efficiency gain; the
efficiency the new mode wants lives in sorting-shaped comparison schedules.

### 3. Simulation: is durability via synthetic comparisons actually graceful? **Only approximately — and not enough.**

Second experiment (also mine, this session), testing the shipped
synthetic-comparison mechanism (`PairwiseSession.moveUp/moveDown`) and its
dnd generalization under openskill:

- **Contradicting prior evidence:** after m prior "B beats A" judgments, a
  single synthetic "A beats B" flips the order only for m=1. m=3 needs 2
  synthetic repeats, m=5 needs 3, m=10 needs 4. So yes — **a deliberate
  override can be drowned out by older evidence**, confirming the concern in
  the research brief. Worse, the persisted `Comparison` table upserts keyed on
  the unordered pair (`datamodel.md`), so those repeat synthetic rows
  *collapse to one row on save* — a moveUp that needed 3 in-session repeats
  can partially revert after reload, because replaying the deduped log
  re-derives from less evidence than the live session had. (This is a latent
  session-vs-replay divergence in the *existing* feature, independent of the
  new mode — worth logging regardless.)
- **Distant drag:** 10 games fully round-robined consistently, then game at
  rank 9 dragged to rank 2. Emitting one synthetic comparison against the new
  neighbor leaves it at **rank 8** — the drop visibly does not stick.
  Emitting comparisons against *every* crossed game lands it at rank 3, still
  not the dropped position. A rating model aggregates evidence; it
  fundamentally **cannot guarantee** an authored position sticks, because
  that's the property that makes it noise-tolerant.

**Verdict on hypothesis prong (b): falsified as "free."** Synthetic
comparisons into openskill give *approximate* durability. For the primary
pairwise mode (where a nudge is advisory) that's fine and shipped; for a mode
whose promise is "your drag is authoritative," a drop that lands somewhere
other than where you dropped it is a broken promise, and no fixed number of
synthetic rows fixes it in general (it depends on the whole evidence graph).

### 4. What does satisfy (a) + (b): a constraint-graph mode over the same `Comparison` storage

The two requirements point at the same design once stated together:

- Efficiency wants a **sorting-shaped comparison schedule** (binary insertion
  / merge-insertion territory, ~n·log₂n asks).
- Durability wants judgments treated as **authoritative constraints with
  recency** ("latest judgment about this pair wins"), not as noisy evidence.

The existing storage already provides both halves' substrate:

1. **Edges = the persisted `Comparison` table as-is.** Its
   latest-write-wins upsert per unordered pair (`unique (list_id, game_a,
   game_b)`, `winner_id` overwritten) is *exactly* a recency mechanism: the
   current row for a pair IS the current constraint. No weighting scheme
   needed — an override literally replaces the old judgment.
2. **Order = deterministic topological sort** of the latest-wins edge set,
   with two small policies: incomparable games tie-broken by the openskill
   rating (nice reuse: the rating becomes a *prior/tie-breaker*, not the
   authority), and cycles (possible since edges are per-pair) broken by
   dropping the **oldest** edge in the cycle until acyclic — recency wins,
   matching the durability contract. n ≤ 100, so an O(n²)-ish topo pass per
   recompute is trivial.
3. **Selection = resumable binary insertion.** Repeatedly pick an unplaced /
   least-connected game and binary-search it into the current derived order;
   each probe is just a normal comparison written through the existing
   `choose()` path. Before *asking* a probe, consult the edge set — if the
   pair (or its transitive implication) is already known, use it silently.
   That makes the schedule **stateless across sessions**: resuming just
   restarts the current game's insertion, and already-answered probes are
   skipped for free, so an interruption costs at most ~log₂n wasted asks.
   This dodges the resume-fragility that killed merge sort in the 2026-07-10
   research — the fragility was in persisting merge-frontier state, and this
   design has none.
4. **dnd override mapping:** dropping A between X and Y after crossing k
   games upserts k rows — "A beats each crossed game" (or loses, moving
   down) — through the same upsert path. Because derivation is
   constraint-respecting, the drop lands **exactly** where dropped, every
   time, regardless of how much older evidence it contradicts. Move-up/down
   is the k=1 case and stays one row. (k ≤ n−1 ≈ 99 writes worst case; a
   single batched upsert.)
5. **Human error handling:** sorting with noisy comparisons is a real
   literature problem (Feige, Raghavan, Peleg & Upfal, "Computing with Noisy
   Information," SIAM J. Comput. 23(5), 1994; Braverman & Mossel, "Noisy
   sorting without resampling," SODA 2008) — resampling/verification rounds
   push the count back toward O(n log n) but complicate the flow. This mode
   doesn't need them: **the override affordance IS the error-correction
   loop.** A mis-answered probe misplaces one game; the user sees it and
   drags it — which is requirement (b) doing double duty. This is my own
   reasoning, not a cited result, but it's why the mode's two requirements
   are complementary rather than in tension.

Comparison count: binary insertion is ~⌈log₂(n!)⌉·(1+ε): 25 asks for n=10,
94 for n=25, 237 for n=50, 573 for n=100 — vs ~4950 pairs total and vs ~4×
those numbers for openskill to become *confident*. That is the "maximum
efficiency" the mode asks for, within ~10% of the information-theoretic floor
(Ford–Johnson would shave a few percent more at real implementation cost —
not worth it).

Prior-art anchor for the overall shape: TrueSkill (Herbrich, Minka & Graepel,
"TrueSkill: A Bayesian Skill Rating System," NeurIPS 2006) popularized
uncertainty-driven adaptive matchmaking — that's the *primary* mode's family,
and it's the family whose noise tolerance is precisely what makes overrides
non-authoritative. Weng & Lin, "A Bayesian Approximation Method for Online
Ranking" (JMLR 12, 2011) is the model `openskill` implements. The sort-driven
active-learning result is Maystre & Grossglauser 2017 (above).

### 5. Options table

| Option | Comparisons to confident order (n=50) | Override durability | Build cost | Failure modes |
|---|---|---|---|---|
| A. Status quo policy (ship as "the mode") | ~957 exact / ~282 looks-right | approximate (drop may not stick) | zero | fails both requirements; not a new mode at all |
| B. Hypothesis: openskill + pure info-gain / adjacent selection | ~same or worse than A (measured) | same as A; needs repeat-weighting hacks; upsert collapses repeats on reload | small | no measurable efficiency win; durability still approximate; repeat-heavy matchups feel broken ("it keeps asking the same two games") |
| C. Classic merge/merge-insertion sort with persisted sort state | 237 (optimal-ish) | poor — an override invalidates in-flight sort state | medium | resume fragility; contradiction intolerance (both already documented in the 2026-07-10 research) |
| D. **Constraint-graph mode: latest-wins `Comparison` edges + topo order (rating tie-break) + resumable binary-insertion selection** | 237 (same schedule as C) | **exact — drop always sticks; upsert is the recency mechanism** | medium: new derivation fn (topo + cycle-break + tie-break), new selector, dnd surface; all pure functions over the existing log, unit-testable (Principle I) | cycle-breaking must be deterministic & tested; a wrong probe answer misplaces a game until the user fixes it (by design); O(k) upserts per long drag |
| E. Authored-position mode (resurrect `manual` with pins) | n/a (no comparisons) | exact | small-medium | reverses "order is derived, not authored"; two authorities (score vs pin) with no reconciliation rule — already rejected in research-manual-pairwise-ranking-adjustment-2026-07-14 |

### 6. Scope/constitution notes

- Constitution v2.1.1 Principle III's novelty mandate is scoped (per the
  user's clarification) to the primary mode; the new mode declares
  efficiency-over-novelty. Binary insertion *does* hammer one game ~log₂n
  times in a row while inserting it — that is the accepted trade, and the UI
  should lean into it ("placing *Brass*… 3 of 6") rather than hide it.
- `datamodel.md`'s "Order is derived, not authored" survives intact in
  option D: order is still derived from the `Comparison` log — just by a
  different, constraint-respecting derivation for this mode. No new tables;
  `List.ranking_method` gains a value (and the deprecated `manual` retirement
  planned in `revisit-ranking-modes` can proceed independently).
- **Accessibility flag (not relitigating):** keyboard move-up/move-down gives
  functional parity with dnd, but a long-distance move is O(distance)
  keypresses vs one drag. A "move to position N" field (or type-ahead) would
  give real parity cheaply; recommend including it, since in this mode long
  moves are the *point* of the override affordance.
- **Latent defect found in passing (existing feature, any mode):** in-session
  `moveUp` repeats append to the client log, but persistence upserts per
  pair — a nudge that needed multiple synthetic comparisons to take effect
  can partially revert after reload. Worth an `/ardd-feedback` entry.

## Recommendation

**Reject the leading hypothesis; build option D.** The new mode should be a
**constraint-graph ranking mode over the existing `Comparison` storage**:
latest-wins pair edges (the upsert already implements recency), deterministic
topological derivation with openskill-rating tie-breaks and
recency-based cycle-breaking, and a **resumable binary-insertion selection
policy** that consults recorded edges before asking (~⌈log₂n!⌉ ≈ 237
comparisons for 50 games, ~4× fewer than the rating model needs for the same
confidence — measured this session). dnd / move-up / move-down map to pair
upserts against the crossed games and are honored *exactly*, with no
weighting mechanism needed. The hypothesis's core reuse instinct was right —
same `Comparison` table, same upsert, same `choose()` plumbing, ratings kept
as tie-breaker — but both of its load-bearing claims failed measurement: the
selection-policy swap buys no efficiency (the model, not the selector, is the
bottleneck), and synthetic comparisons into a rating model give only
approximate durability, which breaks this mode's central promise.

Next step: this reverses no committed decision but adds substantial scope —
log it with **`/ardd-backlog`** (efficient-ordering mode per this research)
and let `/ardd-plan` design it; also file the session-vs-replay `moveUp`
divergence via `/ardd-feedback`.

## Rejected Alternatives

- **The hypothesis (openskill + info-gain selection):** no measured
  efficiency gain over the shipped policy at any n in 10–100; durability only
  approximate (distant drags demonstrably don't stick; overrides can be
  outvoted by old evidence; persisted upsert collapses the repeats that made
  an override take). Rejected on both hard requirements.
- **Classic merge / merge-insertion sort with persisted internal state:**
  optimal count but resume-fragile and override-intolerant — an authored
  reorder invalidates the in-flight merge frontier. The binary-insertion
  schedule in option D keeps the count while deriving all "state" from the
  comparison log.
- **Authored-position (`manual` resurrection / pin field):** exact durability
  but zero comparison efficiency story, reverses "order is derived, not
  authored," and re-creates the dual-authority problem already rejected in
  `research-manual-pairwise-ranking-adjustment-2026-07-14-5810.md`.
- **Noisy-sorting verification rounds (Feige et al. / Braverman–Mossel
  style):** principled but adds flow complexity; the mode's own override
  affordance already serves as the error-correction channel.

## Open Questions

- **Insertion order of games** (which unplaced game to insert next): pool
  order, cold-start BGG `user_rating` seeding (best-first insertion makes the
  top of the list correct earliest — likely the right call), or
  user-chosen. Tuning decision for planning.
- **Cycle-breaking details:** drop-oldest-edge is the proposal; needs a
  deterministic spec + property tests (e.g. after any single drag on any
  acyclic state, derivation honors the drag exactly).
- **Cross-mode semantics:** can one list switch between primary (rating) and
  efficient (constraint) modes over the same comparison log, or is the mode
  fixed at list creation? Same rows, two derivations — switching is
  technically free but may confuse ("order changed because I switched
  modes").
- **Long-drag write cost:** k upserts per drag (k = positions crossed) —
  batch endpoint or per-row? Trivial at n ≤ 100 but should be one request.
- **"Move to position N"** keyboard affordance — include for real dnd parity?
  (Flagged above; recommend yes.)
