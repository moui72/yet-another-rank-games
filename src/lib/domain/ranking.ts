import { rating as osRating, rate } from 'openskill';
import { conservativeScore } from './score';

/**
 * The pairwise ranking engine (see `ui.md` / the ranking research). Ratings are
 * a Bradley–Terry/Weng–Lin `(mu, sigma)` per game, updated by `openskill` from
 * the comparison log; the order is those ratings sorted by a conservative score.
 * Everything here is pure and derivable from the comparison log, so a list's
 * order is reconstructible at any point (native stop-early/resume).
 */
export interface Rating {
	mu: number;
	sigma: number;
}

export type Ratings = Map<number, Rating>;

/** The rating a game starts with before any comparison. */
export function initialRating(): Rating {
	const r = osRating();
	return { mu: r.mu, sigma: r.sigma };
}

/** Apply one comparison (winner beats loser), returning a new ratings map. */
export function applyComparison(ratings: Ratings, winnerId: number, loserId: number): Ratings {
	const winner = ratings.get(winnerId) ?? initialRating();
	const loser = ratings.get(loserId) ?? initialRating();
	// openskill treats the first team as the winner (rank order).
	const [[nextWinner], [nextLoser]] = rate([[winner], [loser]]);
	const next = new Map(ratings);
	next.set(winnerId, { mu: nextWinner.mu, sigma: nextWinner.sigma });
	next.set(loserId, { mu: nextLoser.mu, sigma: nextLoser.sigma });
	return next;
}

/** Replay a comparison log into a ratings map. */
export function ratingsFromComparisons(
	comparisons: readonly { winnerId: number; loserId: number }[]
): Ratings {
	let ratings: Ratings = new Map();
	for (const c of comparisons) ratings = applyComparison(ratings, c.winnerId, c.loserId);
	return ratings;
}

/**
 * Order game ids best-first by conservative score (`mu - k*sigma`). Games with
 * no rating yet use the initial rating (so they tie, keeping a stable order).
 */
export function rankGames(gameIds: readonly number[], ratings: Ratings, k = 3): number[] {
	const scoreOf = (id: number) => {
		const r = ratings.get(id) ?? initialRating();
		return conservativeScore(r.mu, r.sigma, k);
	};
	return [...gameIds].sort((a, b) => scoreOf(b) - scoreOf(a));
}

/** Order-independent key for a compared pair of games. */
export function pairKey(a: number, b: number): string {
	return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/** One recorded pairwise choice. */
export interface Choice {
	winnerId: number;
	loserId: number;
}

/**
 * Derive the full pairwise state from the choice log (the source of truth) and
 * the games being ranked: ratings, the seen-pair set, the current best-first
 * order, and the next matchup to show. Everything is a pure function of the
 * log, so a session serialized to its log and reconstructed is identical
 * (stop-early/resume).
 */
export function pairwiseState(
	gameIds: readonly number[],
	log: readonly Choice[],
	excludedIds: ReadonlySet<number> = new Set()
) {
	const ratings = ratingsFromComparisons(log);
	const comparedKeys = new Set(log.map((c) => pairKey(c.winnerId, c.loserId)));
	// Manually-excluded games (T014) aren't offered for new comparisons.
	const activeIds = gameIds.filter((id) => !excludedIds.has(id));
	return {
		ratings,
		comparedKeys,
		order: rankGames(gameIds, ratings),
		currentPair: selectNextPair(activeIds, ratings, comparedKeys),
		...splitRankedUnranked(gameIds, ratings, log, excludedIds)
	};
}

/**
 * How informative comparing two games would be: favors **close ratings** (the
 * outcome is uncertain, so it teaches us the most) and **high combined
 * uncertainty**. Higher = more informative.
 */
function informativeness(a: number, b: number, ratings: Ratings): number {
	const ra = ratings.get(a) ?? initialRating();
	const rb = ratings.get(b) ?? initialRating();
	return ra.sigma + rb.sigma - Math.abs(ra.mu - rb.mu);
}

/**
 * Pick the next matchup (novelty-biased, `ui.md`): prefer the most informative
 * **unseen** pair; only fall back to a repeat when every pair has been seen.
 * Deterministic tie-break by game id. Returns null when fewer than two games.
 */
export function selectNextPair(
	gameIds: readonly number[],
	ratings: Ratings,
	comparedKeys: ReadonlySet<string>
): [number, number] | null {
	if (gameIds.length < 2) return null;

	const pairs: { a: number; b: number; seen: boolean; info: number }[] = [];
	for (let i = 0; i < gameIds.length; i++) {
		for (let j = i + 1; j < gameIds.length; j++) {
			const a = gameIds[i];
			const b = gameIds[j];
			pairs.push({ a, b, seen: comparedKeys.has(pairKey(a, b)), info: informativeness(a, b, ratings) });
		}
	}

	const unseen = pairs.filter((p) => !p.seen);
	const candidates = unseen.length > 0 ? unseen : pairs;
	candidates.sort((x, y) => y.info - x.info || x.a - y.a || x.b - y.b);
	return [candidates[0].a, candidates[0].b];
}

/** Every game id that appears (as winner or loser) anywhere in the log. */
export function comparedGameIds(log: readonly Choice[]): Set<number> {
	const ids = new Set<number>();
	for (const c of log) {
		ids.add(c.winnerId);
		ids.add(c.loserId);
	}
	return ids;
}

/**
 * Split a list's pool games into **Ranked** (has ≥1 comparison in this list
 * and isn't manually excluded) and **Unranked** (everything else — a game
 * starts here until its first comparison, and a manually-excluded game moves
 * back here regardless of comparison history) — feedback F001-F003. Ranked
 * preserves the best-first order; Unranked keeps the given `gameIds` order.
 */
export function splitRankedUnranked(
	gameIds: readonly number[],
	ratings: Ratings,
	log: readonly Choice[],
	excludedIds: ReadonlySet<number>
): { ranked: number[]; unranked: number[] } {
	const compared = comparedGameIds(log);
	const isRanked = (id: number) => compared.has(id) && !excludedIds.has(id);
	const ranked = rankGames(gameIds, ratings).filter(isRanked);
	const unranked = gameIds.filter((id) => !isRanked(id));
	return { ranked, unranked };
}
