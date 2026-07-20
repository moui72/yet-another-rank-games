import { describe, it, expect } from 'vitest';
import { overrideToEdges } from './overrideEdges';

describe('overrideToEdges (T010)', () => {
	const order = [10, 20, 30, 40, 50]; // index 0 = rank 1 (best)

	it('move up by one produces exactly one edge (k=1)', () => {
		// Move 30 (index 2) up to index 1: it crosses only 20.
		const edges = overrideToEdges(order, 30, 1);
		expect(edges).toEqual([{ winnerId: 30, loserId: 20 }]);
	});

	it('move down by one produces exactly one edge (k=1)', () => {
		// Move 20 (index 1) down to index 2: it crosses only 30.
		const edges = overrideToEdges(order, 20, 2);
		expect(edges).toEqual([{ winnerId: 30, loserId: 20 }]);
	});

	it('a long upward move produces one edge per crossed game, in move direction', () => {
		// Move 50 (index 4) up to index 1: crosses 40, 30, 20 — 50 beats each.
		const edges = overrideToEdges(order, 50, 1);
		expect(edges).toEqual([
			{ winnerId: 50, loserId: 20 },
			{ winnerId: 50, loserId: 30 },
			{ winnerId: 50, loserId: 40 }
		]);
	});

	it('a long downward move produces one edge per crossed game, losing to each', () => {
		// Move 10 (index 0) down to index 3: crosses 20, 30, 40 — each beats 10.
		const edges = overrideToEdges(order, 10, 3);
		expect(edges).toEqual([
			{ winnerId: 20, loserId: 10 },
			{ winnerId: 30, loserId: 10 },
			{ winnerId: 40, loserId: 10 }
		]);
	});

	it('a no-op move (same position) produces no edges', () => {
		expect(overrideToEdges(order, 30, 2)).toEqual([]);
	});

	it('throws for a game not in the order', () => {
		expect(() => overrideToEdges(order, 999, 1)).toThrow();
	});
});
