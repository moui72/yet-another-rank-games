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

/** Detailed insertion progress for the ranking-view indicator (T017). */
export interface InsertionState {
	/** The pair to ask next. */
	pair: ComparisonPair;
	/** The game currently being placed (the one being binary-searched in). */
	placingGameId: number;
	/** How many games are already fully placed (0-based prefix length). */
	placedCount: number;
	/** Total games to place. */
	total: number;
	/** Which question this is for the current game (1-based estimate). */
	questionNumber: number;
	/** Estimated total questions to place the current game. */
	questionsForGame: number;
}

const bitsFor = (slots: number): number => (slots <= 1 ? 0 : Math.ceil(Math.log2(slots)));

/**
 * Re-walk the binary insertion to report progress for the T017 indicator:
 * which game is being placed, how many are already placed, and an estimate of
 * how many questions this game needs and which one we're on. Returns null when
 * the ordering is complete. Question counts are estimates (binary search on the
 * live edge set skips implied probes), which is exactly the framing the plan
 * wants surfaced — the deliberate re-asking of one game is shown, not hidden.
 */
export function insertionState(
	sequence: readonly number[],
	edges: readonly ConstraintEdge[]
): InsertionState | null {
	const above = reachability(edges);
	const placed: number[] = [];
	for (const g of sequence) {
		let lo = 0;
		let hi = placed.length;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			const h = placed[mid];
			if (above(g, h)) {
				hi = mid;
			} else if (above(h, g)) {
				lo = mid + 1;
			} else {
				const questionsForGame = Math.max(1, bitsFor(placed.length + 1));
				const remaining = Math.max(1, bitsFor(hi - lo + 1));
				const questionNumber = Math.min(
					questionsForGame,
					Math.max(1, questionsForGame - remaining + 1)
				);
				return {
					pair: { a: g, b: h },
					placingGameId: g,
					placedCount: placed.length,
					total: sequence.length,
					questionNumber,
					questionsForGame
				};
			}
		}
		placed.splice(lo, 0, g);
	}
	return null;
}

/**
 * Best-first placement order for the insertion selector (T007). Games with a
 * `CollectionItem.user_rating` are placed first, highest rating first, so the
 * strongest candidates anchor the order early; unrated games follow in pool
 * order. Equal ratings keep pool order (stable). With no ratings at all this
 * degrades to exactly `poolGameIds` — the phase still works, it just loses the
 * warm-start (cold-start caveat in the plan's Open Questions).
 */
export function bestFirstSequence(
	poolGameIds: readonly number[],
	userRatings: ReadonlyMap<number, number | null | undefined>
): number[] {
	const rated: number[] = [];
	const unrated: number[] = [];
	for (const id of poolGameIds) {
		const r = userRatings.get(id);
		if (r == null) unrated.push(id);
		else rated.push(id);
	}
	const poolIndex = new Map(poolGameIds.map((id, i) => [id, i]));
	rated.sort((a, b) => {
		const ra = userRatings.get(a) as number;
		const rb = userRatings.get(b) as number;
		if (ra !== rb) return rb - ra; // rating descending
		return (poolIndex.get(a) ?? 0) - (poolIndex.get(b) ?? 0); // stable
	});
	return [...rated, ...unrated];
}
