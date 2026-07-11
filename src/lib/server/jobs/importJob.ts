import type { ImportJob } from './types';

/**
 * Worker-side processor for an import job. Skeleton for T018 — the real import
 * (poll-retry collection fetch, thing-detail fetch, upsert games +
 * collection_items, mark synced) lands in T019. Kept as its own function so the
 * queue wiring and the import logic evolve independently.
 */
export async function processImportJob(job: ImportJob): Promise<void> {
	console.log(
		JSON.stringify({ event: 'import.received', collectionId: job.collectionId, username: job.username })
	);
}
