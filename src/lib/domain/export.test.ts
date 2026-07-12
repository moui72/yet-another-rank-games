import { describe, it, expect } from 'vitest';
import { toMarkdown, toCsv, toJson, toBbcode, type ExportData } from './export';

const data: ExportData = {
	listName: 'Top co-op',
	entries: [
		{ rank: 1, name: 'Pandemic', bggId: 30549, score: 12.3 },
		{ rank: 2, name: 'Gloomhaven, Jaws of the Lion', bggId: 291457, score: 8.1 },
		{ rank: 3, name: 'Spirit Island', bggId: 162886, score: null }
	]
};

describe('toMarkdown', () => {
	it('renders a titled, numbered ranked list', () => {
		expect(toMarkdown(data)).toBe(
			`# Top co-op\n\n1. Pandemic\n2. Gloomhaven, Jaws of the Lion\n3. Spirit Island\n`
		);
	});
});

describe('toCsv', () => {
	it('has a header and escapes fields containing commas', () => {
		const csv = toCsv(data);
		const lines = csv.trimEnd().split('\n');
		expect(lines[0]).toBe('rank,game,bgg_id,score');
		expect(lines[1]).toBe('1,Pandemic,30549,12.3');
		expect(lines[2]).toBe('2,"Gloomhaven, Jaws of the Lion",291457,8.1');
		expect(lines[3]).toBe('3,Spirit Island,162886,'); // null score is empty
	});

	it('escapes embedded quotes', () => {
		const csv = toCsv({ listName: 'x', entries: [{ rank: 1, name: 'Say "hi"', bggId: 1, score: 1 }] });
		expect(csv).toContain('"Say ""hi"""');
	});
});

describe('toBbcode', () => {
	it('renders one bare [thing] entry per line in rank order', () => {
		expect(toBbcode(data)).toBe(
			`[thing=30549][/thing]\n[thing=291457][/thing]\n[thing=162886][/thing]\n`
		);
	});

	it('yields an empty string for an empty list (no trailing junk)', () => {
		expect(toBbcode({ listName: 'Empty', entries: [] })).toBe('');
	});

	it('passes a large bgg id through unescaped', () => {
		const out = toBbcode({
			listName: 'x',
			entries: [{ rank: 1, name: 'Big', bggId: 999999999, score: null }]
		});
		expect(out).toBe('[thing=999999999][/thing]\n');
	});
});

describe('toJson', () => {
	it('produces structured JSON with the list and entries', () => {
		const parsed = JSON.parse(toJson(data));
		expect(parsed.list).toBe('Top co-op');
		expect(parsed.entries).toHaveLength(3);
		expect(parsed.entries[0]).toEqual({ rank: 1, name: 'Pandemic', bggId: 30549, score: 12.3 });
		expect(parsed.entries[2].score).toBeNull();
	});
});
