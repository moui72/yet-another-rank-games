import { describe, it, expect } from 'vitest';
import { conservativeScore } from './score';

describe('conservativeScore', () => {
	it('subtracts k standard deviations of uncertainty from the mean skill', () => {
		// A rating of mu=25, sigma=8 with the default k=3 is the classic
		// "conservative" estimate: 25 - 3*8 = 1.
		expect(conservativeScore(25, 8)).toBe(1);
	});

	it('allows the uncertainty weight k to be tuned', () => {
		expect(conservativeScore(25, 8, 1)).toBe(17);
	});

	it('returns the raw mean when there is no uncertainty', () => {
		expect(conservativeScore(30, 0)).toBe(30);
	});

	it('can go negative when uncertainty dominates', () => {
		expect(conservativeScore(5, 10)).toBe(-25);
	});
});
