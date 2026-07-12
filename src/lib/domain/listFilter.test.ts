import { describe, it, expect } from 'vitest';
import { parseListFilter, isValidListFilter } from './listFilter';

describe('parseListFilter', () => {
	it('accepts an empty filter (whole collection)', () => {
		expect(parseListFilter({})).toEqual({});
	});

	it('accepts a full, valid filter', () => {
		const filter = {
			mechanics: { include: ['Cooperative Game'], exclude: [] },
			categories: { include: [], exclude: ['Wargame'] },
			weight: { min: 3, max: 5 },
			playingTime: { max: 60 },
			yearPublished: { min: 2000 },
			playerCount: { supports: 4 },
			ownedOnly: true,
			expansions: 'exclude' as const
		};
		expect(parseListFilter(filter)).toEqual(filter);
	});

	it('accepts both expansions enum values and rejects others', () => {
		expect(parseListFilter({ expansions: 'only' })).toEqual({ expansions: 'only' });
		expect(() => parseListFilter({ expansions: 'both' })).toThrow();
	});

	it('rejects an unknown top-level key', () => {
		expect(() => parseListFilter({ nonsense: true })).toThrow();
	});

	it('rejects an unknown key inside a predicate', () => {
		expect(() => parseListFilter({ weight: { min: 1, avg: 2 } })).toThrow();
	});

	it('rejects a wrong value type', () => {
		expect(() => parseListFilter({ ownedOnly: 'yes' })).toThrow();
		expect(() => parseListFilter({ weight: { min: 'heavy' } })).toThrow();
		expect(() => parseListFilter({ playerCount: { supports: 2.5 } })).toThrow();
	});

	it('rejects non-object input', () => {
		expect(() => parseListFilter(null)).toThrow();
		expect(() => parseListFilter('{}')).toThrow();
	});
});

describe('isValidListFilter', () => {
	it('is a boolean guard that does not throw', () => {
		expect(isValidListFilter({ ownedOnly: true })).toBe(true);
		expect(isValidListFilter({ bogus: 1 })).toBe(false);
	});
});
