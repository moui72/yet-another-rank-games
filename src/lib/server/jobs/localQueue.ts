import type { ImportJob, JobProcessor, JobQueue } from './types';

/**
 * In-process job queue for local development: runs the processor directly
 * (awaiting it) instead of going through Cloud Tasks. Errors propagate to the
 * caller so the same failure handling (retry/dead-letter) can be exercised
 * locally. The production Cloud Tasks queue (deferred to deploy) enqueues an
 * HTTP task that invokes the worker asynchronously instead.
 */
export class LocalJobQueue implements JobQueue {
	constructor(private readonly processor: JobProcessor) {}

	async enqueue(job: ImportJob): Promise<void> {
		await this.processor(job);
	}
}
