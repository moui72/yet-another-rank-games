import { LocalJobQueue } from './localQueue';
import { processImportJob } from './importJob';
import type { JobQueue } from './types';

/**
 * The application's import queue. Local dev uses the in-process queue; the
 * production Cloud Tasks queue is swapped in at deploy (infrastructure.md).
 */
export const importQueue: JobQueue = new LocalJobQueue(processImportJob);
