import type { BggResponse } from './client';
import type { BggCollectionItem } from './types';
import { isCollectionQueued, parseCollectionXml } from './parse';

/** A non-retryable BGG API error (auth, not-found, server error). */
export class BggApiError extends Error {
	readonly status: number;
	constructor(status: number, message?: string) {
		super(message ?? `BGG API error (status ${status})`);
		this.name = 'BggApiError';
		this.status = status;
	}
}

/** The collection export never became ready within the attempt budget. */
export class BggQueuedTimeoutError extends Error {
	constructor(attempts: number) {
		super(`BGG collection still queued after ${attempts} attempts`);
		this.name = 'BggQueuedTimeoutError';
	}
}

type FetchFn = (username: string, opts: { ownedOnly?: boolean }) => Promise<BggResponse>;

export interface RetryOptions {
	ownedOnly?: boolean;
	/** Max poll attempts before giving up (dead-letter). Default 10. */
	maxAttempts?: number;
	/** Base backoff in ms; the delay grows linearly with the attempt. Default 1000. */
	baseDelayMs?: number;
	/** Injected for tests. */
	sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Fetch a BGG collection, polling through the `202 Accepted` (queued) state with
 * bounded, backing-off retries. Resolves to the parsed items once ready; throws
 * `BggQueuedTimeoutError` if it never becomes ready within `maxAttempts`
 * (a terminal, dead-letterable state — a 202 must never loop forever), or
 * `BggApiError` on a non-retryable status. `429` is treated as retryable.
 */
export async function fetchCollectionWithRetry(
	fetchFn: FetchFn,
	username: string,
	opts: RetryOptions = {}
): Promise<BggCollectionItem[]> {
	const maxAttempts = opts.maxAttempts ?? 10;
	const baseDelayMs = opts.baseDelayMs ?? 1000;
	const sleep = opts.sleep ?? defaultSleep;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		const res = await fetchFn(username, { ownedOnly: opts.ownedOnly });

		const queued = res.status === 202 || res.status === 429 || isCollectionQueued(res.xml);
		if (res.status === 200 && !queued) {
			return parseCollectionXml(res.xml);
		}
		if (!queued) {
			throw new BggApiError(res.status);
		}
		if (attempt < maxAttempts) {
			await sleep(baseDelayMs * attempt);
		}
	}
	throw new BggQueuedTimeoutError(maxAttempts);
}
