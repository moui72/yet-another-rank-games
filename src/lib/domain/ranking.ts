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
