import type { ImportJob, JobProcessor, JobQueue } from './types';

/**
 * In-process job queue for local development: schedules the processor to run
 * asynchronously (fire-and-forget) so `enqueue` returns immediately, mirroring
 * Cloud Tasks (which enqueues an HTTP task and returns without running it). The
 * processor is expected to handle its own failures (the import wrapper marks the
 * collection failed / dead-letters); the queue only guards against an unhandled
 * rejection. The production Cloud Tasks queue is the deploy-time swap.
 */
export class LocalJobQueue implements JobQueue {
	constructor(private readonly processor: JobProcessor) {}

	enqueue(job: ImportJob): Promise<void> {
		void Promise.resolve()
			.then(() => this.processor(job))
			.catch((error: unknown) => {
				console.error(
					JSON.stringify({ level: 'error', event: 'job.unhandled', error: String(error) })
				);
			});
		return Promise.resolve();
	}
}
