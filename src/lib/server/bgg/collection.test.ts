import { describe, it, expect, vi } from 'vitest';
import {
	fetchCollectionWithRetry,
	BggQueuedTimeoutError,
	BggApiError
} from './collection';
import type { BggResponse } from './client';

const OK_XML = `<items><item objectid="13"><name>Catan</name><status own="1"/></item></items>`;
const QUEUED = `<message>accepted, try later</message>`;

/** A fake fetch that returns the given responses in sequence, then the last one. */
function fakeFetch(responses: BggResponse[]) {
	let i = 0;
	return vi.fn(async () => responses[Math.min(i++, responses.length - 1)]);
}

const noSleep = () => Promise.resolve();

describe('fetchCollectionWithRetry', () => {
	it('polls past 202s and parses the eventual 200', async () => {
		const fetchFn = fakeFetch([
			{ status: 202, xml: QUEUED },
			{ status: 202, xml: QUEUED },
			{ status: 200, xml: OK_XML }
		]);
		const items = await fetchCollectionWithRetry(fetchFn, 'tyler', { sleep: noSleep });
		expect(items).toHaveLength(1);
		expect(items[0].bggId).toBe(13);
		expect(fetchFn).toHaveBeenCalledTimes(3);
	});

	it('gives up with a timeout error when 202 persists past maxAttempts', async () => {
		const fetchFn = fakeFetch([{ status: 202, xml: QUEUED }]);
		await expect(
			fetchCollectionWithRetry(fetchFn, 'tyler', { sleep: noSleep, maxAttempts: 4 })
		).rejects.toBeInstanceOf(BggQueuedTimeoutError);
		expect(fetchFn).toHaveBeenCalledTimes(4);
	});

	it('retries on 429 rate limiting then succeeds', async () => {
		const fetchFn = fakeFetch([
			{ status: 429, xml: '' },
			{ status: 200, xml: OK_XML }
		]);
		const items = await fetchCollectionWithRetry(fetchFn, 'tyler', { sleep: noSleep });
		expect(items).toHaveLength(1);
	});

	it('throws BggApiError immediately on 401 (auth), without retrying', async () => {
		const fetchFn = fakeFetch([{ status: 401, xml: 'Unauthorized' }]);
		await expect(
			fetchCollectionWithRetry(fetchFn, 'tyler', { sleep: noSleep })
		).rejects.toMatchObject({ name: 'BggApiError', status: 401 });
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});

	it('treats a 200 with a queued body as still pending', async () => {
		const fetchFn = fakeFetch([
			{ status: 200, xml: QUEUED },
			{ status: 200, xml: OK_XML }
		]);
		const items = await fetchCollectionWithRetry(fetchFn, 'tyler', { sleep: noSleep });
		expect(items).toHaveLength(1);
		expect(fetchFn).toHaveBeenCalledTimes(2);
	});
});

// keep BggApiError referenced for the type import
void BggApiError;
