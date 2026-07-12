import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/db', () => ({ db: {} }));

const getOwnedList = vi.fn();
vi.mock('$lib/server/ownership', () => ({
	getOwnedList: (...args: unknown[]) => getOwnedList(...args),
	AccessDeniedError: class AccessDeniedError extends Error {}
}));

const listRankedEntries = vi.fn();
vi.mock('$lib/server/repositories/listEntries', () => ({
	listRankedEntries: (...args: unknown[]) => listRankedEntries(...args)
}));

import { GET } from './+server';

type Params = Record<string, string>;
function makeEvent(format: string | null, user: unknown = { id: 'u1' }) {
	const url = new URL('http://localhost/api/lists/l1/export');
	if (format !== null) url.searchParams.set('format', format);
	return {
		locals: { user },
		params: { id: 'l1' } as Params,
		url
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any;
}

const entries = [
	{ rank: 1, name: 'Pandemic', bggId: 30549, score: 12.3 },
	{ rank: 2, name: 'Spirit Island', bggId: 162886, score: null }
];

describe('GET export endpoint', () => {
	beforeEach(() => {
		getOwnedList.mockReset();
		listRankedEntries.mockReset();
		getOwnedList.mockResolvedValue({ name: 'Top Co-op' });
		listRankedEntries.mockResolvedValue(entries);
	});

	it('exports GeekList BBCode with text/plain and a -geeklist.txt filename', async () => {
		const res = await GET(makeEvent('bbcode'));
		expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
		expect(res.headers.get('content-disposition')).toBe(
			'attachment; filename="top-co-op-geeklist.txt"'
		);
		expect(await res.text()).toBe('[thing=30549][/thing]\n[thing=162886][/thing]\n');
	});

	it('rejects an unknown format with 400', async () => {
		await expect(GET(makeEvent('xml'))).rejects.toMatchObject({ status: 400 });
	});

	it('rejects an unauthenticated request with 401', async () => {
		await expect(GET(makeEvent('bbcode', null))).rejects.toMatchObject({ status: 401 });
	});
});
