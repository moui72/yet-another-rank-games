import { describe, it, expect } from 'vitest';
import { deriveOrder, type Judgment } from './constraintOrder';

/**
 * T005 — property test for the efficient mode's central promise: applying any
 * single override to an acyclic state and re-deriving places the moved game at
 * exactly the overridden position. This is the guarantee the whole mode rests
 * on, so it is generated over many cases, not a single example.
 *
 * We have no `fast-check` dependency (and won't add one for this); a seeded RNG
 * over a few hundred cases is deterministic and meaningful. The same harness
 * backs T011's round-robin regression.
 */
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const iso = (n: number) => new Date(Date.UTC(2026, 0, 1) + n * 1000).toISOString();

/**
 * A complete, acyclic edge set consistent with `order` (index 0 = best): every
 * pair judged, winner = the earlier game in `order`. Timestamps are "old" so a
 * later override always wins the latest-wins rule.
 */
function edgesForOrder(order: number[]): Judgment[] {
	const js: Judgment[] = [];
	let n = 0;
	for (let i = 0; i < order.length; i++) {
		for (let k = i + 1; k < order.length; k++) {
			js.push({ winnerId: order[i], loserId: order[k], createdAt: iso(n), id: `base-${n}` });
			n++;
		}
	}
	return js;
}

/** k newest edges pinning `g` at target index `p` in `current` (T010 preview). */
function overrideEdges(current: number[], g: number, p: number, startId: number): Judgment[] {
	const i = current.indexOf(g);
	const js: Judgment[] = [];
	let n = startId;
	if (p < i) {
		for (let idx = p; idx < i; idx++) {
			js.push({ winnerId: g, loserId: current[idx], createdAt: iso(n), id: `ovr-${n}` });
			n++;
		}
	} else if (p > i) {
		for (let idx = i + 1; idx <= p; idx++) {
			js.push({ winnerId: current[idx], loserId: g, createdAt: iso(n), id: `ovr-${n}` });
			n++;
		}
	}
	return js;
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(rnd() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

describe('single-override durability (T005 property)', () => {
	it('places the moved game at exactly the overridden position across generated cases', () => {
		const rnd = mulberry32(0x5eed);
		const CASES = 400;
		for (let c = 0; c < CASES; c++) {
			const n = 3 + Math.floor(rnd() * 8); // 3..10 games
			const ids = shuffle(
				Array.from({ length: n }, (_, i) => 100 + i),
				rnd
			);
			const base = edgesForOrder(ids); // derived order == ids

			// Sanity: the base derives back to itself.
			expect(deriveOrder(ids, base)).toEqual(ids);

			const g = ids[Math.floor(rnd() * n)];
			const from = ids.indexOf(g);
			let to = Math.floor(rnd() * n);
			if (to === from) to = (to + 1) % n;

			const log = [...base, ...overrideEdges(ids, g, to, base.length)];
			const derived = deriveOrder(ids, log);

			// Central promise: the moved game lands at exactly the target index.
			expect(derived[to]).toBe(g);

			// Stronger: the full order is the base with g removed and reinserted.
			const expected = ids.filter((x) => x !== g);
			expected.splice(to, 0, g);
			expect(derived).toEqual(expected);
		}
	});
});
