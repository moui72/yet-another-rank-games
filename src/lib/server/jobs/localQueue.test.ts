import { describe, it, expect, vi } from 'vitest';
import { LocalJobQueue } from './localQueue';
import type { ImportJob } from './types';

describe('LocalJobQueue', () => {
	it('hands the enqueued job to the processor', async () => {
		const seen: ImportJob[] = [];
		const queue = new LocalJobQueue(async (job) => {
			seen.push(job);
		});
		await queue.enqueue({ collectionId: 'c1', username: 'tyler', ownedOnly: true });
		expect(seen).toEqual([{ collectionId: 'c1', username: 'tyler', ownedOnly: true }]);
	});

	it('surfaces processor errors to the caller (so the job can be retried/dead-lettered)', async () => {
		const processor = vi.fn(async () => {
			throw new Error('boom');
		});
		const queue = new LocalJobQueue(processor);
		await expect(queue.enqueue({ collectionId: 'c1', username: 'x' })).rejects.toThrow('boom');
	});
});
