/** A request to import (or refresh) a BGG collection into `collectionId`. */
export interface ImportJob {
	collectionId: string;
	username: string;
	ownedOnly?: boolean;
}

/**
 * Enqueues import jobs. Two implementations: an in-process queue for local dev
 * (invokes the processor directly) and a Cloud Tasks queue for production
 * (enqueues an HTTP task that invokes the worker) — see infrastructure.md.
 */
export interface JobQueue {
	enqueue(job: ImportJob): Promise<void>;
}

/** Processes a single import job (the worker side). */
export type JobProcessor = (job: ImportJob) => Promise<void>;
