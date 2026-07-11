import { describe, it, expect } from 'vitest';
import {
	initialRating,
	applyComparison,
	ratingsFromComparisons,
	rankGames
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
