import { describe, it, expect, vi } from 'vitest';
import { CloudTasksJobQueue, type CloudTasksJobQueueConfig } from './cloudTasksQueue';
import type { ImportJob } from './types';

const config: CloudTasksJobQueueConfig = {
	projectId: 'yarg-staging-zbch',
	location: 'us-east4',
	queueName: 'yarg-import',
	workerUrl: 'https://yarg-worker-abc.a.run.app',
	invokerServiceAccountEmail: 'yarg-tasks-invoker@yarg-staging-zbch.iam.gserviceaccount.com'
};

const job: ImportJob = { collectionId: 'c1', username: 'tyler', ownedOnly: true };

describe('CloudTasksJobQueue', () => {
	it('creates an HTTP task targeting /tasks/import with an OIDC token for the invoker SA', async () => {
		const createTask = vi.fn().mockResolvedValue([{}]);
		const client = {
			queuePath: vi.fn().mockReturnValue('projects/yarg-staging-zbch/locations/us-east4/queues/yarg-import'),
			createTask
		};
		const queue = new CloudTasksJobQueue(client, config);

		await queue.enqueue(job);

		expect(client.queuePath).toHaveBeenCalledWith('yarg-staging-zbch', 'us-east4', 'yarg-import');
		expect(createTask).toHaveBeenCalledTimes(1);
		const [{ parent, task }] = createTask.mock.calls[0];
		expect(parent).toBe('projects/yarg-staging-zbch/locations/us-east4/queues/yarg-import');
		expect(task.httpRequest.httpMethod).toBe('POST');
		expect(task.httpRequest.url).toBe('https://yarg-worker-abc.a.run.app/tasks/import');
		expect(task.httpRequest.headers).toEqual({ 'Content-Type': 'application/json' });
		expect(JSON.parse(Buffer.from(task.httpRequest.body, 'base64').toString())).toEqual(job);
		expect(task.httpRequest.oidcToken).toEqual({
			serviceAccountEmail: config.invokerServiceAccountEmail,
			audience: config.workerUrl
		});
	});
});
