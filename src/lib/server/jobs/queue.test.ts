import { describe, it, expect } from 'vitest';
import { buildImportQueue } from './queue';
import { LocalJobQueue } from './localQueue';
import { CloudTasksJobQueue } from './cloudTasksQueue';

const cloudTasksEnv = {
	DATABASE_URL: 'x',
	GCP_PROJECT_ID: 'yarg-staging-zbch',
	GCP_LOCATION: 'us-east4',
	CLOUD_TASKS_QUEUE: 'yarg-import',
	WORKER_URL: 'https://yarg-worker-abc.a.run.app',
	TASKS_INVOKER_SA_EMAIL: 'yarg-tasks-invoker@yarg-staging-zbch.iam.gserviceaccount.com'
};

describe('buildImportQueue', () => {
	it('uses LocalJobQueue when no Cloud Tasks env vars are set (local dev)', () => {
		expect(buildImportQueue({ DATABASE_URL: 'x' })).toBeInstanceOf(LocalJobQueue);
	});

	it('uses CloudTasksJobQueue when the Cloud Tasks env vars are set (deployed)', () => {
		expect(buildImportQueue(cloudTasksEnv)).toBeInstanceOf(CloudTasksJobQueue);
	});

	it('falls back to LocalJobQueue if only the queue vars are set (worker service, no invoker email)', () => {
		const queueOnly = { ...cloudTasksEnv, TASKS_INVOKER_SA_EMAIL: undefined };
		expect(buildImportQueue(queueOnly)).toBeInstanceOf(LocalJobQueue);
	});
});
