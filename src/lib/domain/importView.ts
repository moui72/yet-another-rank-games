import type { ImportStatus } from '$lib/types/entities';

/** A user-facing description of a collection's import state, for the UI. */
export interface ImportView {
	state: ImportStatus;
	heading: string;
	detail: string;
	/** True while an import is in progress (drives spinners / disabled actions). */
	busy: boolean;
}

/**
 * Map a collection's import lifecycle to display text. Pure so it can be
 * unit-tested for every state (idle / importing / complete / failed). The
 * `failed` state surfaces the dead-letter error message.
 */
export function describeImport(c: {
	importStatus: ImportStatus;
	importError: string | null;
	lastSyncedAt: string | null;
}): ImportView {
	switch (c.importStatus) {
		case 'importing':
			return {
				state: 'importing',
				heading: 'Importing your collection…',
				detail: 'Fetching from BoardGameGeek — this can take a moment.',
				busy: true
			};
		case 'complete':
			return {
				state: 'complete',
				heading: 'Collection imported',
				detail: c.lastSyncedAt
					? `Last synced ${new Date(c.lastSyncedAt).toLocaleString()}`
					: 'Import complete.',
				busy: false
			};
		case 'failed':
			return {
				state: 'failed',
				heading: 'Import failed',
				detail: c.importError ?? 'Something went wrong during the import. Please try again.',
				busy: false
			};
		default:
			return {
				state: 'idle',
				heading: 'No collection imported yet',
				detail: 'Enter your BoardGameGeek username to import your collection.',
				busy: false
			};
	}
}
