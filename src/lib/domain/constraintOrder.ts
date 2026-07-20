/**
 * Constraint-graph derivation for the `efficient` ranking mode (see
 * `datamodel.md` "Constraint-graph derivation" and the research plan
 * `research-efficient-durable-secondary-ranking-mode-2026-07-20-d22b.md`).
 *
 * Unlike the primary pairwise mode — which feeds the comparison log to a
 * rating model — the efficient mode treats each comparison as a hard ordering
 * *edge* and derives the order by topological sort. The rating survives only as
 * a tie-breaker for games the edges leave incomparable, never as the authority.
 * This is what makes a manual override land exactly where dropped: an override
 * is just a fresh, latest-wins edge, not evidence to be averaged away.
 *
 * ## Cycle-breaking spec (the pinned rule every later task depends on)
 *
 * The edge set is built from the comparison log with two rules, and both keep
 * to a single **total order** on judgments so the result is deterministic
 * rather than order-of-iteration dependent:
 *
 * 1. **Latest-wins per unordered pair.** A pair `{a, b}` may be judged more
 *    than once. Only the *newest* judgment for that pair contributes an edge;
 *    older judgments for the same pair are discarded. "Newest" = the maximum of
 *    the tuple `(created_at, id)` — `created_at` ascending, tie-broken by the
 *    comparison row `id` ascending. (The `(list_id, game_a, game_b)` upsert
 *    means the store normally holds one row per pair already; this rule makes
 *    the derivation correct even if it is handed a raw multi-row log.)
 *
 * 2. **Cycles are broken by dropping the oldest edge.** Per-pair edges carry no
 *    transitivity guarantee, so `a>b>c>a` cycles are reachable through ordinary
 *    use. While the graph has a cycle, drop the **oldest** edge participating
 *    in a cycle and retry, until the graph is acyclic. "Oldest" is again the
 *    `(created_at, id)` tuple: `created_at` ascending, tie-broken by comparison
 *    row `id` ascending. Recency wins — the newest judgment (typically the
 *    user's most recent override) is the last edge to ever be dropped, which is
 *    what the durability contract requires.
 *
 * Because `(created_at, id)` is a strict total order over judgments (ids are
 * unique), both "newest" and "oldest" are unambiguous even when several edges
 * share a `created_at`. The outcome is therefore a pure, deterministic function
 * of the log — the same log always derives the same order.
 */

/**
 * A single judgment from the comparison log, carrying the ordering fields the
 * cycle-breaking rule needs. `winnerId` beats `loserId`. `createdAt` is an ISO
 * timestamp and `id` a unique row id; together they form the `(createdAt, id)`
 * total order the spec above keys on.
 */
export interface Judgment {
	winnerId: number;
	loserId: number;
	createdAt: string;
	id: string;
}

/** A directed ordering edge: `winnerId` ranks above `loserId`. */
export interface ConstraintEdge {
	winnerId: number;
	loserId: number;
	/** The `(createdAt, id)` tuple of the judgment that produced this edge. */
	createdAt: string;
	id: string;
}
