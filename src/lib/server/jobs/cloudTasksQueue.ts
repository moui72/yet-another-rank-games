import type { CloudTasksClient } from '@google-cloud/tasks';
import type { CloudTasksQueueConfig } from '../config';
import type { ImportJob, JobQueue } from './types';

/** `CloudTasksQueueConfig` plus the invoker identity to sign the OIDC token as. */
export type CloudTasksJobQueueConfig = CloudTasksQueueConfig & {
	invokerServiceAccountEmail: string;
};

/**
 * Production import queue: enqueues an HTTP task against Cloud Tasks, which
 * later POSTs it to the worker's `POST /tasks/import` (infrastructure.md
 * "Worker invocation contract"). Cloud Tasks attaches the OIDC token — this
 * class just tells it which service account to sign with and which audience
 * to stamp; it does not call the worker directly (that's the point of the
 * queue: enqueue returns immediately, same contract as `LocalJobQueue`).
 */
export class CloudTasksJobQueue implements JobQueue {
	constructor(
		private readonly client: Pick<CloudTasksClient, 'queuePath' | 'createTask'>,
		private readonly config: CloudTasksJobQueueConfig
	) {}

	async enqueue(job: ImportJob): Promise<void> {
		const parent = this.client.queuePath(this.config.projectId, this.config.location, this.config.queueName);
		const url = `${this.config.workerUrl}/tasks/import`;
		await this.client.createTask({
			parent,
			task: {
				httpRequest: {
					httpMethod: 'POST',
					url,
					headers: { 'Content-Type': 'application/json' },
					body: Buffer.from(JSON.stringify(job)).toString('base64'),
					oidcToken: {
						serviceAccountEmail: this.config.invokerServiceAccountEmail,
						audience: this.config.workerUrl
					}
				}
			}
		});
	}
}
