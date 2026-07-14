import { describe, it, expect } from 'vitest';
import { titlesMatch, findFuzzyDuplicate } from './duplicateMatch';

describe('titlesMatch', () => {
	it('matches an exact title, case/whitespace-insensitive', () => {
		expect(titlesMatch('Gloomhaven', '  gloomhaven  ')).toBe(true);
	});

	it('matches a near-identical title (e.g. a reprint/edition variant)', () => {
		expect(titlesMatch('Catan: 5-6 Player Extension', 'Catan 5-6 Player Extensio')).toBe(true);
	});

	it('does not match an unrelated title', () => {
		expect(titlesMatch('Catan', 'Pandemic')).toBe(false);
	});
});

describe('findFuzzyDuplicate', () => {
	const candidates = [
		{ gameId: 10, title: 'Gloomhaven' },
		{ gameId: 11, title: 'Pandemic' }
	];

	it('finds a near-identical title among candidates, excluding the item’s own game', () => {
		const match = findFuzzyDuplicate('Gloomhaven ', 99, candidates);
		expect(match?.gameId).toBe(10);
	});

	it('excludes a candidate that is the item’s own gameId', () => {
		const match = findFuzzyDuplicate('Gloomhaven', 10, candidates);
		expect(match).toBeUndefined();
	});

	it('returns undefined when no candidate matches', () => {
		expect(findFuzzyDuplicate('Chess', 99, candidates)).toBeUndefined();
	});
});
