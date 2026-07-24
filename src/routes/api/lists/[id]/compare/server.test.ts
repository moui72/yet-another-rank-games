import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/db', () => ({ db: {} }));

const getOwnedList = vi.fn();
vi.mock('$lib/server/ownership', () => ({
	getOwnedList: (...args: unknown[]) => getOwnedList(...args),
	AccessDeniedError: class AccessDeniedError extends Error {}
}));

const recordComparisonAndRecompute = vi.fn();
vi.mock('$lib/server/ranking', () => ({
	recordComparisonAndRecompute: (...args: unknown[]) => recordComparisonAndRecompute(...args)
}));

const listComparisons = vi.fn();
vi.mock('$lib/server/repositories/comparisons', () => ({
	listComparisons: (...args: unknown[]) => listComparisons(...args)
}));

import { POST } from './+server';

type Params = Record<string, string>;
function makeEvent(body: unknown, user: unknown = { id: 'u1' }) {
	return {
		locals: { user },
		params: { id: 'l1' } as Params,
		request: { json: async () => body }
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any;
}

describe('POST compare endpoint (T002)', () => {
	beforeEach(() => {
		getOwnedList.mockReset();
		recordComparisonAndRecompute.mockReset();
		listComparisons.mockReset();
		getOwnedList.mockResolvedValue({ id: 'l1' });
		recordComparisonAndRecompute.mockResolvedValue(undefined);
	});

	it('returns the canonical replayed log (as client Choice[]) alongside ok:true', async () => {
		// Persisted rows, replay-ordered (as listComparisons would return),
		// canonically stored with the lower game id as gameA regardless of
		// who won — the same shape +page.server.ts already maps for a fresh
		// page load.
		listComparisons.mockResolvedValue([
			{ id: 1, listId: 'l1', gameA: 1, gameB: 2, winnerId: 2, createdAt: 't1' },
			{ id: 2, listId: 'l1', gameA: 2, gameB: 3, winnerId: 2, createdAt: 't2' },
			{ id: 3, listId: 'l1', gameA: 1, gameB: 3, winnerId: 1, createdAt: 't3' }
		]);

		const res = await POST(makeEvent({ gameA: 1, gameB: 3, winnerId: 1 }));
		const body = await res.json();

		expect(body.ok).toBe(true);
		expect(body.log).toEqual([
			{ winnerId: 2, loserId: 1 },
			{ winnerId: 2, loserId: 3 },
			{ winnerId: 1, loserId: 3 }
		]);
		expect(recordComparisonAndRecompute).toHaveBeenCalledWith(
			{},
			{ listId: 'l1', gameA: 1, gameB: 3, winnerId: 1 }
		);
		expect(listComparisons).toHaveBeenCalledWith({}, 'l1');
	});

	it('rejects an invalid comparison with 400 without touching the log', async () => {
		await expect(POST(makeEvent({ gameA: 1, gameB: 1, winnerId: 1 }))).rejects.toMatchObject({
			status: 400
		});
		expect(listComparisons).not.toHaveBeenCalled();
	});

	it('rejects an unauthenticated request with 401', async () => {
		await expect(POST(makeEvent({ gameA: 1, gameB: 2, winnerId: 1 }, null))).rejects.toMatchObject({
			status: 401
		});
	});
});
