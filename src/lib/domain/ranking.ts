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
