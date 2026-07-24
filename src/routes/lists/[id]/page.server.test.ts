import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/db', () => ({ db: {} }));

const getOwnedList = vi.fn();
vi.mock('$lib/server/ownership', () => ({
	getOwnedList: (...args: unknown[]) => getOwnedList(...args),
	AccessDeniedError: class AccessDeniedError extends Error {}
}));

vi.mock('$lib/server/repositories/pools', () => ({ listPoolGames: vi.fn().mockResolvedValue([]) }));
vi.mock('$lib/server/repositories/comparisons', () => ({ listComparisons: vi.fn().mockResolvedValue([]) }));
vi.mock('$lib/server/repositories/users', () => ({
	getUserById: vi.fn().mockResolvedValue(null),
	setShowCoverArt: vi.fn()
}));
vi.mock('$lib/server/repositories/collectionItems', () => ({
	getUserRatingsForGames: vi.fn().mockResolvedValue(new Map())
}));

const setListShared = vi.fn();
vi.mock('$lib/server/repositories/lists', () => ({
	setListShared: (...args: unknown[]) => setListShared(...args)
}));

import { actions } from './+page.server';

function makeRequestEvent(user: unknown, formValues: Record<string, string>) {
	return {
		locals: { user },
		params: { id: 'l1' },
		request: {
			formData: async () => {
				const fd = new FormData();
				for (const [k, v] of Object.entries(formValues)) fd.set(k, v);
				return fd;
			}
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any;
}

describe('toggleShare action (T004)', () => {
	beforeEach(() => {
		getOwnedList.mockReset();
		setListShared.mockReset();
	});

	it('enables sharing for an owned list and returns the updated share state', async () => {
		getOwnedList.mockResolvedValue({ id: 'l1', userId: 'u1' });
		setListShared.mockResolvedValue({ id: 'l1', isShared: true, shareToken: 'tok-123' });

		const result = await actions.toggleShare(
			makeRequestEvent({ id: 'u1' }, { isShared: 'true' })
		);

		expect(setListShared).toHaveBeenCalledWith(expect.anything(), 'l1', true);
		expect(result).toEqual({ isShared: true, shareToken: 'tok-123' });
	});

	it('disables sharing and keeps returning the (retained) token', async () => {
		getOwnedList.mockResolvedValue({ id: 'l1', userId: 'u1' });
		setListShared.mockResolvedValue({ id: 'l1', isShared: false, shareToken: 'tok-123' });

		const result = await actions.toggleShare(
			makeRequestEvent({ id: 'u1' }, { isShared: 'false' })
		);

		expect(setListShared).toHaveBeenCalledWith(expect.anything(), 'l1', false);
		expect(result).toEqual({ isShared: false, shareToken: 'tok-123' });
	});

	it('rejects an unauthenticated request with 401', async () => {
		await expect(
			actions.toggleShare(makeRequestEvent(null, { isShared: 'true' }))
		).rejects.toMatchObject({ status: 401 });
		expect(setListShared).not.toHaveBeenCalled();
	});

	it('rejects a non-owner with 404', async () => {
		getOwnedList.mockRejectedValue(
			Object.assign(new Error('denied'), { name: 'AccessDeniedError' })
		);
		const { AccessDeniedError } = await import('$lib/server/ownership');
		getOwnedList.mockRejectedValue(new AccessDeniedError('list'));

		await expect(
			actions.toggleShare(makeRequestEvent({ id: 'u2' }, { isShared: 'true' }))
		).rejects.toMatchObject({ status: 404 });
	});
});
