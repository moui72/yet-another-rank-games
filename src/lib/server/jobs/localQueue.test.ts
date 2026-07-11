import { describe, it, expect, vi } from 'vitest';
import { LocalJobQueue } from './localQueue';
import type { ImportJob } from './types';

const job: ImportJob = { collectionId: 'c1', username: 'tyler', ownedOnly: true };

describe('LocalJobQueue', () => {
	it('runs the processor with the enqueued job (asynchronously)', async () => {
		const seen: ImportJob[] = [];
		const queue = new LocalJobQueue(async (j) => {
			seen.push(j);
		});
		await queue.enqueue(job);
		await vi.waitFor(() => expect(seen).toEqual([job]));
	});

	it('enqueue resolves immediately even if the processor rejects (handled out-of-band)', async () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const queue = new LocalJobQueue(async () => {
			throw new Error('boom');
		});
		await expect(queue.enqueue(job)).resolves.toBeUndefined();
		await vi.waitFor(() => expect(spy).toHaveBeenCalled());
		spy.mockRestore();
	});
});
