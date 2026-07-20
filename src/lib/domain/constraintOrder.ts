import { ratingsFromComparisons, initialRating } from './ranking';
import { conservativeScore } from './score';

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

/** Order-independent key for a pair of game ids (spec rule 1's "unordered pair"). */
function pairKey(a: number, b: number): string {
	return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/**
 * Compare two judgments/edges by the `(createdAt, id)` total order (spec).
 * Returns >0 when `x` is newer than `y`, <0 when older, 0 only for the same id.
 */
export function compareRecency(
	x: { createdAt: string; id: string },
	y: { createdAt: string; id: string }
): number {
	if (x.createdAt !== y.createdAt) return x.createdAt < y.createdAt ? -1 : 1;
	if (x.id !== y.id) return x.id < y.id ? -1 : 1;
	return 0;
}

/**
 * Derive the latest-wins constraint-edge set from a judgment log (spec rule 1).
 * For each unordered pair only the newest judgment — max `(createdAt, id)` —
 * contributes an edge; older judgments for the same pair are discarded.
 */
export function deriveEdges(judgments: readonly Judgment[]): ConstraintEdge[] {
	const latest = new Map<string, Judgment>();
	for (const jm of judgments) {
		const key = pairKey(jm.winnerId, jm.loserId);
		const current = latest.get(key);
		if (!current || compareRecency(jm, current) > 0) latest.set(key, jm);
	}
	return [...latest.values()].map((jm) => ({
		winnerId: jm.winnerId,
		loserId: jm.loserId,
		createdAt: jm.createdAt,
		id: jm.id
	}));
}

/**
 * Deterministic topological sort of `gameIds` under the constraint edges,
 * using `scoreOf` (an openskill conservative score) purely as a tie-breaker
 * for games the edges leave incomparable (spec: "the rating survives as a
 * prior, not the authority"). Expects an acyclic edge set — run `breakCycles`
 * first. Edges referencing games outside `gameIds` are ignored.
 *
 * Among the nodes currently free to place (in-degree 0), the highest `scoreOf`
 * wins, tie-broken by position in `gameIds` so a fully-incomparable set
 * degrades to exactly `rankGames`' stable score order.
 */
export function topologicalOrder(
	gameIds: readonly number[],
	edges: readonly ConstraintEdge[],
	scoreOf: (id: number) => number
): number[] {
	const present = new Set(gameIds);
	const index = new Map(gameIds.map((id, i) => [id, i]));
	const successors = new Map<number, number[]>();
	const inDegree = new Map<number, number>();
	for (const id of gameIds) inDegree.set(id, 0);

	for (const e of edges) {
		if (!present.has(e.winnerId) || !present.has(e.loserId)) continue;
		(successors.get(e.winnerId) ?? successors.set(e.winnerId, []).get(e.winnerId)!).push(e.loserId);
		inDegree.set(e.loserId, (inDegree.get(e.loserId) ?? 0) + 1);
	}

	const better = (a: number, b: number): boolean => {
		const sa = scoreOf(a);
		const sb = scoreOf(b);
		if (sa !== sb) return sa > sb;
		return (index.get(a) ?? 0) < (index.get(b) ?? 0);
	};

	const available = gameIds.filter((id) => (inDegree.get(id) ?? 0) === 0);
	const order: number[] = [];
	while (available.length > 0) {
		let bestIdx = 0;
		for (let i = 1; i < available.length; i++) {
			if (better(available[i], available[bestIdx])) bestIdx = i;
		}
		const [next] = available.splice(bestIdx, 1);
		order.push(next);
		for (const s of successors.get(next) ?? []) {
			const d = (inDegree.get(s) ?? 0) - 1;
			inDegree.set(s, d);
			if (d === 0) available.push(s);
		}
	}
	return order;
}

/**
 * Find one directed cycle in the edge set, returned as the list of edges
 * forming it, or null if the graph is acyclic. Deterministic: nodes and
 * out-edges are visited in a stable order so the same edge set always yields
 * the same cycle.
 */
function findCycle(edges: readonly ConstraintEdge[]): ConstraintEdge[] | null {
	const out = new Map<number, ConstraintEdge[]>();
	const nodes = new Set<number>();
	for (const e of edges) {
		nodes.add(e.winnerId);
		nodes.add(e.loserId);
		(out.get(e.winnerId) ?? out.set(e.winnerId, []).get(e.winnerId)!).push(e);
	}
	// Stable visitation order.
	for (const list of out.values()) list.sort((a, b) => compareRecency(a, b));
	const sortedNodes = [...nodes].sort((a, b) => a - b);

	const WHITE = 0;
	const GRAY = 1;
	const BLACK = 2;
	const color = new Map<number, number>();
	const stackEdges: ConstraintEdge[] = [];

	function dfs(u: number): ConstraintEdge[] | null {
		color.set(u, GRAY);
		for (const e of out.get(u) ?? []) {
			const v = e.loserId;
			const c = color.get(v) ?? WHITE;
			if (c === WHITE) {
				stackEdges.push(e);
				const found = dfs(v);
				if (found) return found;
				stackEdges.pop();
			} else if (c === GRAY) {
				// Back-edge to v: the cycle is the stack tail from where v entered.
				const start = stackEdges.findIndex((s) => s.winnerId === v);
				const cycle = start >= 0 ? stackEdges.slice(start) : [];
				return [...cycle, e];
			}
		}
		color.set(u, BLACK);
		return null;
	}

	for (const n of sortedNodes) {
		if ((color.get(n) ?? WHITE) === WHITE) {
			const found = dfs(n);
			if (found) return found;
		}
	}
	return null;
}

/** True if the constraint edges contain a directed cycle. */
export function hasCycle(edges: readonly ConstraintEdge[]): boolean {
	return findCycle(edges) !== null;
}

/**
 * Break every cycle in the edge set by repeatedly dropping the **oldest** edge
 * (min `(createdAt, id)`) in a found cycle until the graph is acyclic (spec
 * rule 2). Recency wins — the newest judgment is the last to be dropped.
 * Returns the surviving acyclic edge subset; input order is otherwise preserved.
 */
export function breakCycles(edges: readonly ConstraintEdge[]): ConstraintEdge[] {
	let kept = [...edges];
	// Each iteration drops exactly one edge, so it terminates in <= |edges|.
	for (let guard = 0; guard <= edges.length; guard++) {
		const cycle = findCycle(kept);
		if (!cycle) return kept;
		let oldest = cycle[0];
		for (const e of cycle) if (compareRecency(e, oldest) < 0) oldest = e;
		kept = kept.filter((e) => e.id !== oldest.id);
	}
	return kept;
}

/**
 * The full efficient-mode derivation: from the raw judgment log to a total
 * order over `gameIds`. Pure and deterministic — derive edges (latest-wins),
 * break cycles (drop-oldest), then topologically sort with the openskill
 * conservative score as the incomparable-tie-breaker. This is the single
 * source the selector, override mapping, and server read path all re-derive
 * from, so an override lands exactly where placed regardless of older evidence.
 */
export function deriveOrder(
	gameIds: readonly number[],
	judgments: readonly Judgment[],
	k = 3
): number[] {
	const edges = breakCycles(deriveEdges(judgments));
	const ratings = ratingsFromComparisons(
		judgments.map((jm) => ({ winnerId: jm.winnerId, loserId: jm.loserId }))
	);
	const scoreOf = (id: number): number => {
		const r = ratings.get(id) ?? initialRating();
		return conservativeScore(r.mu, r.sigma, k);
	};
	return topologicalOrder(gameIds, edges, scoreOf);
}
