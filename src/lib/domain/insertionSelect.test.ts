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
