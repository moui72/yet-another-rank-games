import { describe, it, expect } from 'vitest';
import { buildListFilter } from './listForm';
import { parseListFilter } from './listFilter';

describe('buildListFilter', () => {
	it('returns an empty filter for empty input', () => {
		expect(buildListFilter({})).toEqual({});
	});

	it('builds a filter from populated fields', () => {
		const filter = buildListFilter({
			mechanicsInclude: 'Cooperative Game, Deck Building',
			weightMin: '3',
			weightMax: '5',
			playerCount: '4',
			playingTimeMax: '60',
			ownedOnly: true
		});
		expect(filter).toEqual({
			mechanics: { include: ['Cooperative Game', 'Deck Building'], exclude: [] },
			weight: { min: 3, max: 5 },
			playerCount: { supports: 4 },
			playingTime: { max: 60 },
			ownedOnly: true
		});
	});

	it('omits blank fields', () => {
		expect(buildListFilter({ weightMin: '', mechanicsInclude: '  ' })).toEqual({});
	});

	it('produces a filter the schema rejects when a numeric field is non-numeric', () => {
		// build is lenient; validation is the gate.
		expect(() => parseListFilter(buildListFilter({ weightMin: 'heavy' }))).toThrow();
	});

	it('a well-formed built filter passes validation', () => {
		expect(() => parseListFilter(buildListFilter({ playerCount: '2', ownedOnly: true }))).not.toThrow();
	});
});
