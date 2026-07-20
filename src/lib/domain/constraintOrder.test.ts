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
