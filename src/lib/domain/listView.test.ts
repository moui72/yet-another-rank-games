import { describe, it, expect } from 'vitest';
import { listStatusLabel, rankingMethodLabel } from './listView';

describe('listStatusLabel', () => {
	it('labels each status', () => {
		expect(listStatusLabel('in_progress')).toBe('In progress');
		expect(listStatusLabel('complete')).toBe('Complete');
	});
});

describe('rankingMethodLabel', () => {
	it('labels each ranking method', () => {
		expect(rankingMethodLabel('pairwise')).toBe('Pairwise');
		expect(rankingMethodLabel('efficient')).toBe('Efficient');
		expect(rankingMethodLabel('manual')).toBe('Manual');
		expect(rankingMethodLabel('tier')).toBe('Tiered');
	});
});
