import { describe, it, expect } from 'vitest';
import { overrideToEdges } from './overrideEdges';
import { deriveOrder, type Judgment } from './constraintOrder';

/**
 * T011 — the regression guard for the whole design choice. A game moved a long
 * way against a *fully round-robined* order (every pair already judged the
 * other way) must still land exactly where dropped. The rating-model approach
 * in the research simulation landed rank-9→rank-2 at rank 8 or rank 3, because
 * one override cannot outweigh nine contradicting comparisons under a rating
 * update. Under the constraint derivation it lands at rank 2 exactly — the
 * override edges are the newest judgments for their pairs and win latest-wins.
 */
const iso = (n: number) => new Date(Date.UTC(2026, 0, 1) + n * 1000).toISOString();

describe('override durability against contradicting evidence (T011)', () => {
	it('moves rank 9 to rank 2 in a fully round-robined 10-game order — lands at rank 2', () => {
		const order = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // rank 1..10, index 0 = best
		// Fully round-robined base: every pair judged consistent with `order`,
		// all with OLD timestamps so the later override wins the pair.
		const base: Judgment[] = [];
		let n = 0;
		for (let i = 0; i < order.length; i++) {
			for (let k = i + 1; k < order.length; k++) {
				base.push({ winnerId: order[i], loserId: order[k], createdAt: iso(n), id: `b${n}` });
				n++;
			}
		}
		// Sanity: the base derives exactly the round-robin order.
		expect(deriveOrder(order, base)).toEqual(order);

		// Move rank 9 (game 9, index 8) to rank 2 (index 1).
		const intents = overrideToEdges(order, 9, 1);
		expect(intents).toHaveLength(7); // crosses games at indices 1..7

		const overrides: Judgment[] = intents.map((e, i) => ({
			winnerId: e.winnerId,
			loserId: e.loserId,
			createdAt: iso(1000 + i), // newest — must win latest-wins
			id: `o${i}`
		}));

		const derived = deriveOrder(order, [...base, ...overrides]);

		// The decisive assertion: game 9 lands at rank 2 (index 1) — not rank 8,
		// not rank 3.
		expect(derived[1]).toBe(9);
		expect(derived).toEqual([1, 9, 2, 3, 4, 5, 6, 7, 8, 10]);
	});
});
