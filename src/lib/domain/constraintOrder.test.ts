import { describe, it, expect } from 'vitest';
import { deriveEdges, type Judgment } from './constraintOrder';

function j(winnerId: number, loserId: number, createdAt: string, id: string): Judgment {
	return { winnerId, loserId, createdAt, id };
}

describe('deriveEdges (T002)', () => {
	it('derives a single edge from a single judgment', () => {
		const edges = deriveEdges([j(1, 2, '2026-01-01T00:00:00Z', 'a')]);
		expect(edges).toHaveLength(1);
		expect(edges[0]).toMatchObject({ winnerId: 1, loserId: 2 });
	});

	it('latest judgment for a pair wins (later createdAt)', () => {
		const edges = deriveEdges([
			j(1, 2, '2026-01-01T00:00:00Z', 'a'),
			j(2, 1, '2026-01-02T00:00:00Z', 'b')
		]);
		expect(edges).toHaveLength(1);
		expect(edges[0]).toMatchObject({ winnerId: 2, loserId: 1 });
	});

	it('breaks a createdAt tie by id ascending (higher id wins as newest)', () => {
		const edges = deriveEdges([
			j(1, 2, '2026-01-01T00:00:00Z', 'a'),
			j(2, 1, '2026-01-01T00:00:00Z', 'b')
		]);
		expect(edges).toHaveLength(1);
		// id 'b' > 'a', so the (2 beats 1) judgment is newest.
		expect(edges[0]).toMatchObject({ winnerId: 2, loserId: 1 });
	});

	it('keeps disjoint pairs as separate edges regardless of side order', () => {
		const edges = deriveEdges([
			j(1, 2, '2026-01-01T00:00:00Z', 'a'),
			j(4, 3, '2026-01-01T00:00:01Z', 'b')
		]);
		expect(edges).toHaveLength(2);
		const pairs = edges.map((e) => `${e.winnerId}>${e.loserId}`).sort();
		expect(pairs).toEqual(['1>2', '4>3']);
	});
});

import { topologicalOrder } from './constraintOrder';
import { ratingsFromComparisons, rankGames } from './ranking';
import { conservativeScore } from './score';

function edge(winnerId: number, loserId: number, createdAt = '2026-01-01T00:00:00Z', id = `${winnerId}-${loserId}`) {
	return { winnerId, loserId, createdAt, id };
}

// scoreOf built from an openskill rating map, mirroring how the derivation
// will call it in production (rating as tie-breaker only).
function scoreFromRatings(comparisons: { winnerId: number; loserId: number }[]) {
	const ratings = ratingsFromComparisons(comparisons);
	return (id: number) => {
		const r = ratings.get(id);
		return r ? conservativeScore(r.mu, r.sigma) : conservativeScore(0, 25 / 3);
	};
}

describe('topologicalOrder (T003)', () => {
	it('orders a fully-constrained chain by its edges', () => {
		// 3>2, 2>1  =>  [3,2,1]
		const order = topologicalOrder([1, 2, 3], [edge(3, 2), edge(2, 1)], () => 0);
		expect(order).toEqual([3, 2, 1]);
	});

	it('falls back to rating order for a fully-incomparable set', () => {
		// No edges: order is purely by conservative score. Build ratings where
		// 30 clearly beats everyone, 10 loses to everyone.
		const scoreOf = scoreFromRatings([
			{ winnerId: 30, loserId: 20 },
			{ winnerId: 30, loserId: 10 },
			{ winnerId: 20, loserId: 10 }
		]);
		const order = topologicalOrder([10, 20, 30], [], scoreOf);
		expect(order).toEqual([30, 20, 10]);
	});

	it('respects edges but tie-breaks incomparable games by rating', () => {
		// Edge 1>2 only. 3 is incomparable to both. Rating puts 3 highest.
		const scoreOf = (id: number) => (id === 3 ? 100 : id === 1 ? 10 : 5);
		const order = topologicalOrder([1, 2, 3], [edge(1, 2)], scoreOf);
		// 3 (highest rating, no constraints) first, then the 1>2 chain.
		expect(order).toEqual([3, 1, 2]);
	});

	it('matches rankGames exactly when there are no edges', () => {
		const comparisons = [
			{ winnerId: 5, loserId: 6 },
			{ winnerId: 7, loserId: 5 },
			{ winnerId: 6, loserId: 8 }
		];
		const ratings = ratingsFromComparisons(comparisons);
		const ids = [5, 6, 7, 8];
		const order = topologicalOrder(ids, [], scoreFromRatings(comparisons));
		expect(order).toEqual(rankGames(ids, ratings));
	});
});
