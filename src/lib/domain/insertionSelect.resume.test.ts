import { describe, it, expect } from 'vitest';
import { selectNextComparison } from './insertionSelect';
import { deriveOrder, type Judgment } from './constraintOrder';

/**
 * T009 — resumability. The mode persists *no sort state*, only the edge set
 * (comparison rows). Interrupting a partially-complete insertion and re-deriving
 * from the persisted edges alone must resume at the same point, costing at most
 * ~log2(n) repeated asks (the in-progress game's binary search re-walk — and in
 * practice zero, because every answered probe is already an edge).
 */
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Drive the selector against a noiseless ground truth starting from `initial`
 * judgments, asking at most `maxAsks` questions. Returns the accumulated
 * judgment log and how many questions were asked.
 */
function run(
	ids: number[],
	rank: Map<number, number>,
	initial: Judgment[],
	maxAsks: number
): { judgments: Judgment[]; asked: number } {
	const judgments = [...initial];
	let asked = 0;
	while (asked < maxAsks) {
		const next = selectNextComparison(ids, judgments);
		if (!next) break;
		const winner = (rank.get(next.a) ?? 0) < (rank.get(next.b) ?? 0) ? next.a : next.b;
		const loser = winner === next.a ? next.b : next.a;
		judgments.push({
			winnerId: winner,
			loserId: loser,
			createdAt: new Date(Date.UTC(2026, 0, 1) + judgments.length * 1000).toISOString(),
			id: `c${judgments.length}`
		});
		asked++;
	}
	return { judgments, asked };
}

describe('selector resumability (T009)', () => {
	it('resumes from persisted edges alone with ~0 repeated asks and correct order', () => {
		const n = 25;
		const rnd = mulberry32(0xbeef);
		const ids = Array.from({ length: n }, (_, i) => i + 1);
		const truth = [...ids];
		for (let i = truth.length - 1; i > 0; i--) {
			const j = Math.floor(rnd() * (i + 1));
			[truth[i], truth[j]] = [truth[j], truth[i]];
		}
		const rank = new Map(truth.map((id, i) => [id, i]));

		// Full, uninterrupted run for the baseline count.
		const full = run(ids, rank, [], Infinity);

		// Interrupt at ~40% of the way through, keeping only the edge set.
		const interruptAt = Math.floor(full.asked * 0.4);
		const partial = run(ids, rank, [], interruptAt);
		expect(partial.asked).toBe(interruptAt);

		// Resume from the persisted judgments alone — nothing else carried over.
		const resumed = run(ids, rank, partial.judgments, Infinity);

		const totalAsked = partial.asked + resumed.asked;
		const repeated = totalAsked - full.asked;
		expect(repeated).toBeGreaterThanOrEqual(0);
		expect(repeated).toBeLessThanOrEqual(Math.ceil(Math.log2(n)));

		// And the resumed order is the correct, complete ordering.
		expect(deriveOrder(ids, resumed.judgments)).toEqual(truth);
	});
});
