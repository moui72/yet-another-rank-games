import type { ConstraintEdge } from './constraintOrder';

/** A pair of games to compare next. */
export interface ComparisonPair {
	a: number;
	b: number;
}

/**
 * Build a transitive-reachability predicate over the constraint edges:
 * `above(x, y)` is true when the edges imply `x` ranks above `y`, directly or
 * transitively. Memoised BFS — a probe already answered transitively is
 * therefore treated as known, so the selector consumes it silently rather than
 * re-asking (T006 requirement).
 */
function reachability(edges: readonly ConstraintEdge[]): (x: number, y: number) => boolean {
	const adj = new Map<number, number[]>();
	for (const e of edges) {
		(adj.get(e.winnerId) ?? adj.set(e.winnerId, []).get(e.winnerId)!).push(e.loserId);
	}
	const cache = new Map<number, Set<number>>();
	const closureOf = (start: number): Set<number> => {
		const cached = cache.get(start);
		if (cached) return cached;
		const seen = new Set<number>();
		const stack = [...(adj.get(start) ?? [])];
		while (stack.length) {
			const node = stack.pop()!;
			if (seen.has(node)) continue;
			seen.add(node);
			for (const nxt of adj.get(node) ?? []) if (!seen.has(nxt)) stack.push(nxt);
		}
		cache.set(start, seen);
		return seen;
	};
	return (x, y) => closureOf(x).has(y);
}

/**
 * The resumable binary-insertion selector (T006). Places the games in
 * `sequence` (best-first placement order, see `insertionSelect`/T007) one at a
 * time by binary-searching each into the prefix of already-placed games,
 * consulting the constraint edges before asking. Returns the next pair whose
 * answer the edge set does not yet imply — or `null` when every insertion is
 * fully determined by the edges (the ordering is complete).
 *
 * No sort state is persisted: the placement is re-walked from the edge set on
 * every call, which is exactly what makes the mode resumable — re-deriving from
 * the persisted edges alone resumes at the same point, costing at most
 * ~log2(n) repeated asks for the game currently mid-insertion.
 */
export function selectNextComparison(
	sequence: readonly number[],
	edges: readonly ConstraintEdge[]
): ComparisonPair | null {
	const above = reachability(edges);
	const placed: number[] = [];
	for (const g of sequence) {
		let lo = 0;
		let hi = placed.length;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			const h = placed[mid];
			if (above(g, h)) {
				hi = mid; // g ranks above the midpoint → search the upper half
			} else if (above(h, g)) {
				lo = mid + 1; // g ranks below the midpoint → search the lower half
			} else {
				return { a: g, b: h }; // unknown — this is the probe to ask
			}
		}
		placed.splice(lo, 0, g);
	}
	return null;
}
