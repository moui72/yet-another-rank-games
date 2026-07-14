import { describe, it, expect } from 'vitest';
import {
	initialRating,
	applyComparison,
	ratingsFromComparisons,
	rankGames,
	pairKey,
	selectNextPair,
	pairwiseState,
	comparedGameIds,
	splitRankedUnranked,
	type Ratings,
	type Choice
} from './ranking';

describe('applyComparison', () => {
	it('raises the winner and lowers the loser, shrinking both uncertainties', () => {
		const ratings = applyComparison(new Map(), 1, 2); // 1 beats 2
		const w = ratings.get(1)!;
		const l = ratings.get(2)!;
		expect(w.mu).toBeGreaterThan(25);
		expect(l.mu).toBeLessThan(25);
		expect(w.sigma).toBeLessThan(initialRating().sigma);
		expect(l.sigma).toBeLessThan(initialRating().sigma);
	});

	it('does not mutate the input map', () => {
		const before = new Map();
		applyComparison(before, 1, 2);
		expect(before.size).toBe(0);
	});
});

describe('ratingsFromComparisons (replay/resume)', () => {
	it('is deterministic — the same log yields the same ratings', () => {
		const log = [
			{ winnerId: 1, loserId: 2 },
			{ winnerId: 1, loserId: 3 },
			{ winnerId: 2, loserId: 3 }
		];
		const a = ratingsFromComparisons(log);
		const b = ratingsFromComparisons(log);
		expect(a.get(1)).toEqual(b.get(1));
		expect(a.get(3)).toEqual(b.get(3));
	});
});

describe('rankGames', () => {
	it('orders a consistent winner first and a consistent loser last', () => {
		// 1 beats everyone, 3 loses to everyone.
		const ratings = ratingsFromComparisons([
			{ winnerId: 1, loserId: 2 },
			{ winnerId: 1, loserId: 3 },
			{ winnerId: 2, loserId: 3 }
		]);
		expect(rankGames([1, 2, 3], ratings)).toEqual([1, 2, 3]);
	});

	it('treats unrated games as the initial rating (tie, stable order)', () => {
		expect(rankGames([7, 8, 9], new Map())).toEqual([7, 8, 9]);
	});

	it('does not mutate the input array', () => {
		const ids = [3, 1, 2];
		rankGames(ids, new Map());
		expect(ids).toEqual([3, 1, 2]);
	});
});

describe('pairKey', () => {
	it('is order-independent', () => {
		expect(pairKey(2, 5)).toBe(pairKey(5, 2));
	});
});

describe('selectNextPair', () => {
	// 1 & 2 are close (informative); 3 is far.
	const ratings: Ratings = new Map([
		[1, { mu: 30, sigma: 2 }],
		[2, { mu: 29, sigma: 2 }],
		[3, { mu: 10, sigma: 2 }]
	]);

	it('returns null when fewer than two games', () => {
		expect(selectNextPair([], ratings, new Set())).toBeNull();
		expect(selectNextPair([1], ratings, new Set())).toBeNull();
	});

	it('prefers the most informative (closest-rated) unseen pair', () => {
		expect(selectNextPair([1, 2, 3], ratings, new Set())).toEqual([1, 2]);
	});

	it('skips a seen pair for the next most informative unseen one', () => {
		const seen = new Set([pairKey(1, 2)]);
		expect(selectNextPair([1, 2, 3], ratings, seen)).toEqual([2, 3]);
	});

	it('permits a repeat only when every pair has been seen', () => {
		const allSeen = new Set([pairKey(1, 2), pairKey(1, 3), pairKey(2, 3)]);
		expect(selectNextPair([1, 2, 3], ratings, allSeen)).toEqual([1, 2]);
	});

	it('picks a deterministic pair when all games are unrated (tie)', () => {
		expect(selectNextPair([5, 6, 7], new Map(), new Set())).toEqual([5, 6]);
	});
});

describe('pairwiseState', () => {
	const games = [1, 2, 3];

	it('starts with the initial order and the first matchup, nothing seen', () => {
		const s = pairwiseState(games, []);
		expect(s.order).toEqual([1, 2, 3]);
		expect(s.currentPair).toEqual([1, 2]);
		expect(s.comparedKeys.size).toBe(0);
	});

	it('serialize/resume — the same log reproduces the same state', () => {
		const log: Choice[] = [
			{ winnerId: 1, loserId: 2 },
			{ winnerId: 1, loserId: 3 },
			{ winnerId: 2, loserId: 3 }
		];
		const a = pairwiseState(games, log);
		const b = pairwiseState(games, log);
		expect(a.order).toEqual(b.order);
		expect(a.currentPair).toEqual(b.currentPair);
		expect(a.order).toEqual([1, 2, 3]);
	});

	it('reflects wins in the order and does not re-show a seen pair while unseen remain', () => {
		const s = pairwiseState(games, [{ winnerId: 3, loserId: 1 }]);
		expect(s.currentPair).not.toEqual([3, 1]);
		expect(s.currentPair).not.toEqual([1, 3]);
	});
});

// Pairwise ranking unranked/ranked split (T013, feedback F002).
describe('comparedGameIds', () => {
	it('collects every game id that appears in the log', () => {
		const log: Choice[] = [
			{ winnerId: 1, loserId: 2 },
			{ winnerId: 1, loserId: 3 }
		];
		expect(comparedGameIds(log)).toEqual(new Set([1, 2, 3]));
	});

	it('is empty for an empty log', () => {
		expect(comparedGameIds([])).toEqual(new Set());
	});
});

describe('splitRankedUnranked', () => {
	const log: Choice[] = [{ winnerId: 1, loserId: 2 }];
	const ratings = ratingsFromComparisons(log);

	it('a game starts in Unranked until its first comparison', () => {
		const { ranked, unranked } = splitRankedUnranked([1, 2, 3], ratings, log, new Set());
		expect(ranked).toEqual([1, 2]);
		expect(unranked).toEqual([3]);
	});

	it('an excluded game moves to Unranked even with comparison history', () => {
		const { ranked, unranked } = splitRankedUnranked([1, 2, 3], ratings, log, new Set([1]));
		expect(ranked).toEqual([2]);
		expect(unranked).toEqual([1, 3]);
	});

	it('ranked preserves best-first order', () => {
		const threeWayLog: Choice[] = [
			{ winnerId: 1, loserId: 2 },
			{ winnerId: 2, loserId: 3 },
			{ winnerId: 1, loserId: 3 }
		];
		const r = ratingsFromComparisons(threeWayLog);
		const { ranked } = splitRankedUnranked([3, 1, 2], r, threeWayLog, new Set());
		expect(ranked).toEqual([1, 2, 3]);
	});
});
