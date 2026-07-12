import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BggSearchResult } from '$lib/server/bgg/types';

const fetchSearchXml = vi.fn();
vi.mock('$lib/server/bgg/client', () => ({
	fetchSearchXml: (...args: unknown[]) => fetchSearchXml(...args)
}));

const parseSearchXml = vi.fn();
vi.mock('$lib/server/bgg/parse', () => ({
	parseSearchXml: (...args: unknown[]) => parseSearchXml(...args)
}));

import { GET } from './+server';

function makeEvent(q: string | null, user: unknown = { id: 'u1' }) {
	const url = new URL('http://localhost/api/games/search');
	if (q !== null) url.searchParams.set('q', q);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return { locals: { user }, url } as any;
}

describe('GET /api/games/search', () => {
	beforeEach(() => {
		fetchSearchXml.mockReset();
		parseSearchXml.mockReset();
		fetchSearchXml.mockResolvedValue({ status: 200, xml: '<items/>' });
	});

	it('rejects an unauthenticated request with 401', async () => {
		await expect(GET(makeEvent('catan', null))).rejects.toMatchObject({ status: 401 });
		expect(fetchSearchXml).not.toHaveBeenCalled();
	});

	it('rejects an empty/blank query with 400', async () => {
		await expect(GET(makeEvent('   '))).rejects.toMatchObject({ status: 400 });
		await expect(GET(makeEvent(null))).rejects.toMatchObject({ status: 400 });
		expect(fetchSearchXml).not.toHaveBeenCalled();
	});

	it('returns parsed results as JSON for a valid query', async () => {
		const results: BggSearchResult[] = [
			{ bggId: 13, name: 'Catan', yearPublished: 1995 },
			{ bggId: 822, name: 'Carcassonne', yearPublished: null }
		];
		parseSearchXml.mockReturnValue(results);
		const res = await GET(makeEvent('catan'));
		expect(fetchSearchXml).toHaveBeenCalledWith('catan');
		expect(res.headers.get('content-type')).toContain('application/json');
		expect(await res.json()).toEqual(results);
	});

	it('caps results at 10', async () => {
		const many: BggSearchResult[] = Array.from({ length: 25 }, (_, i) => ({
			bggId: i + 1,
			name: `Game ${i + 1}`,
			yearPublished: null
		}));
		parseSearchXml.mockReturnValue(many);
		const res = await GET(makeEvent('game'));
		expect(await res.json()).toHaveLength(10);
	});
});
