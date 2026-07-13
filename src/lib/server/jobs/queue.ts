import { CloudTasksClient } from '@google-cloud/tasks';
import { LocalJobQueue } from './localQueue';
import { CloudTasksJobQueue } from './cloudTasksQueue';
import { processImportJob } from './importJob';
import { loadServerConfig } from '../config';
import type { JobQueue } from './types';

/**
 * Local dev uses the in-process queue; the production Cloud Tasks queue is
 * swapped in at deploy. Requires both the queue vars (GCP_PROJECT_ID etc. —
 * only ever set on the web service, see config.ts) and the shared invoker SA
 * email (also read by `/tasks/import` to verify requests).
 */
export function buildImportQueue(env: Record<string, string | undefined> = process.env): JobQueue {
	const { cloudTasksQueue, cloudTasksAuth } = loadServerConfig(env);
	if (!cloudTasksQueue || !cloudTasksAuth) return new LocalJobQueue(processImportJob);
	return new CloudTasksJobQueue(new CloudTasksClient(), {
		...cloudTasksQueue,
		invokerServiceAccountEmail: cloudTasksAuth.invokerServiceAccountEmail
	});
}

// Built lazily (not at module load) so importing this module doesn't require
// server config — e.g. a test that imports `$lib/server/jobs/importJob` via
// this barrel shouldn't need DATABASE_URL just to load the module graph.
let cached: JobQueue | undefined;

/** The application's import queue — one instance per process, built on first use. */
export function getImportQueue(): JobQueue {
	if (!cached) cached = buildImportQueue();
	return cached;
}
