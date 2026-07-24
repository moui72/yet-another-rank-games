import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/db', () => ({ db: {} }));

const getSharedListByToken = vi.fn();
vi.mock('$lib/server/repositories/lists', () => ({
	getSharedListByToken: (...args: unknown[]) => getSharedListByToken(...args)
}));

const listRankedEntries = vi.fn();
vi.mock('$lib/server/repositories/listEntries', () => ({
	listRankedEntries: (...args: unknown[]) => listRankedEntries(...args)
}));

import { load } from './+page.server';

type Params = Record<string, string>;
function makeEvent(token: string) {
	return {
		params: { token } as Params
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any;
}

const entries = [
	{ rank: 1, name: 'Pandemic', bggId: 30549, score: 12.3 },
	{ rank: 2, name: 'Spirit Island', bggId: 162886, score: null }
];

describe('GET /share/[token] load', () => {
	beforeEach(() => {
		getSharedListByToken.mockReset();
		listRankedEntries.mockReset();
	});

	it('renders a shared list with its live current ranking, no auth required', async () => {
		getSharedListByToken.mockResolvedValue({ id: 'l1', name: 'Top Co-op' });
		listRankedEntries.mockResolvedValue(entries);

		const result = await load(makeEvent('good-token'));

		expect(getSharedListByToken).toHaveBeenCalledWith(expect.anything(), 'good-token');
		expect(result).toEqual({ listName: 'Top Co-op', entries });
	});

	it('404s for an unknown token', async () => {
		getSharedListByToken.mockResolvedValue(undefined);
		await expect(load(makeEvent('unknown-token'))).rejects.toMatchObject({ status: 404 });
		expect(listRankedEntries).not.toHaveBeenCalled();
	});

	it('404s (not a distinct unauthorized response) for a token whose list is no longer shared', async () => {
		// getSharedListByToken itself only ever returns shared lists, so a
		// disabled-sharing token is indistinguishable from an unknown one —
		// both resolve to undefined here and get the same 404.
		getSharedListByToken.mockResolvedValue(undefined);
		await expect(load(makeEvent('disabled-token'))).rejects.toMatchObject({ status: 404 });
	});
});
