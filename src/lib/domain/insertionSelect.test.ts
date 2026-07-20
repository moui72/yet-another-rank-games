import { describe, it, expect } from 'vitest';
import { selectNextComparison } from './insertionSelect';
import type { ConstraintEdge } from './constraintOrder';

function edge(winnerId: number, loserId: number, n = 0): ConstraintEdge {
	return { winnerId, loserId, createdAt: `2026-01-01T00:00:0${n}Z`, id: `${winnerId}-${loserId}` };
}

describe('selectNextComparison (T006)', () => {
	it('returns null when the sequence has fewer than two games (nothing to place)', () => {
		expect(selectNextComparison([], [])).toBeNull();
		expect(selectNextComparison([1], [])).toBeNull();
	});

	it('asks the first unresolved pair when no edges exist', () => {
		// Placing game 2 into [1]: nothing known, so ask 2 vs 1.
		const next = selectNextComparison([1, 2], []);
		expect(next).not.toBeNull();
		expect(new Set([next!.a, next!.b])).toEqual(new Set([1, 2]));
	});

	it('returns null when every pair is already resolved by the edges', () => {
		// Full chain 1>2>3 — every insertion is answerable from edges.
		const edges = [edge(1, 2), edge(2, 3), edge(1, 3)];
		expect(selectNextComparison([1, 2, 3], edges)).toBeNull();
	});

	it('consumes a transitively-implied probe silently rather than asking it', () => {
		// Sequence [1,2,3]. Edges 1>2 and 2>3 imply 1>3 transitively.
		// Placing 3 into [1,2]: binary search midpoint is index 1 (game 2) →
		// known 2>3. Then compare against index 0 (game 1): 1>3 is only known
		// transitively — it must be treated as known, so NOTHING is asked and
		// the selector reports done.
		const edges = [edge(1, 2), edge(2, 3)];
		expect(selectNextComparison([1, 2, 3], edges)).toBeNull();
	});

	it('asks a genuinely-unknown probe when the edge set is incomplete', () => {
		// Sequence [1,2,3]. Only 1>2 known. Placing 3 into [1,2]:
		// midpoint index 1 = game 2, and 2-vs-3 is unknown → ask {2,3}.
		const edges = [edge(1, 2)];
		const next = selectNextComparison([1, 2, 3], edges);
		expect(next).not.toBeNull();
		expect(new Set([next!.a, next!.b])).toEqual(new Set([2, 3]));
	});
});

import { bestFirstSequence } from './insertionSelect';

describe('bestFirstSequence (T007)', () => {
	it('orders rated games by user_rating descending, unrated after in pool order', () => {
		const pool = [10, 20, 30, 40];
		const ratings = new Map<number, number>([
			[10, 6.5],
			[30, 9.0]
		]);
		// 30 (9.0), 10 (6.5) first; then 20, 40 unrated in pool order.
		expect(bestFirstSequence(pool, ratings)).toEqual([30, 10, 20, 40]);
	});

	it('degrades to exact pool order when nothing is rated (no error)', () => {
		const pool = [5, 3, 8, 1];
		expect(bestFirstSequence(pool, new Map())).toEqual([5, 3, 8, 1]);
	});

	it('breaks equal ratings by pool order (stable)', () => {
		const pool = [1, 2, 3];
		const ratings = new Map<number, number>([
			[1, 7],
			[2, 7],
			[3, 9]
		]);
		expect(bestFirstSequence(pool, ratings)).toEqual([3, 1, 2]);
	});
});

import { insertionState } from './insertionSelect';

describe('insertionState (T017 progress)', () => {
	it('returns null when nothing is left to place', () => {
		expect(insertionState([], [])).toBeNull();
		expect(insertionState([1], [])).toBeNull();
		expect(insertionState([1, 2, 3], [edge(1, 2), edge(2, 3)])).toBeNull();
	});

	it('reports the game being placed and how many are already placed', () => {
		// [1,2,3] no edges: 1 placed, now placing 2 against 1.
		const s = insertionState([1, 2, 3], []);
		expect(s).not.toBeNull();
		expect(s!.placingGameId).toBe(2);
		expect(s!.placedCount).toBe(1);
		expect(s!.total).toBe(3);
		expect(s!.questionNumber).toBeGreaterThanOrEqual(1);
		expect(s!.questionNumber).toBeLessThanOrEqual(s!.questionsForGame);
	});

	it('advances placedCount as earlier games get resolved', () => {
		// 1>2 known, so 2 is placed after 1; now placing 3 against the prefix.
		const s = insertionState([1, 2, 3], [edge(1, 2)]);
		expect(s!.placingGameId).toBe(3);
		expect(s!.placedCount).toBe(2);
	});
});

describe('insertionState — placing a game that outranks the probed prefix', () => {
	it('takes the upper half when the placing game ranks above the probed placed game', () => {
		// sequence [3,1,2] with 1>3: after 3 is placed, placing 1 probes against
		// 3, finds 1 ranks above it, and narrows to the upper half — the branch
		// the earlier cases never reach. 2 is then left to ask about.
		const s = insertionState([3, 1, 2], [edge(1, 3)]);
		expect(s).not.toBeNull();
		expect(s!.placingGameId).toBe(2);
		expect(s!.placedCount).toBe(2);
	});
});
