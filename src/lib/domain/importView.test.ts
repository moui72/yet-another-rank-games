import { describe, it, expect } from 'vitest';
import { describeImport } from './importView';

describe('describeImport', () => {
	it('idle — never imported', () => {
		const v = describeImport({ importStatus: 'idle', importError: null, lastSyncedAt: null });
		expect(v.state).toBe('idle');
		expect(v.busy).toBe(false);
	});

	it('importing — in progress and busy', () => {
		const v = describeImport({ importStatus: 'importing', importError: null, lastSyncedAt: null });
		expect(v.state).toBe('importing');
		expect(v.busy).toBe(true);
	});

	it('complete — shows the last sync time when present', () => {
		const v = describeImport({
			importStatus: 'complete',
			importError: null,
			lastSyncedAt: '2026-07-11T00:00:00.000Z'
		});
		expect(v.state).toBe('complete');
		expect(v.busy).toBe(false);
		expect(v.detail).toContain('2026');
	});

	it('failed — surfaces the error message (dead-letter)', () => {
		const v = describeImport({
			importStatus: 'failed',
			importError: 'BGG API error (status 401)',
			lastSyncedAt: null
		});
		expect(v.state).toBe('failed');
		expect(v.busy).toBe(false);
		expect(v.detail).toContain('401');
	});

	it('failed — falls back to a generic message when no error text', () => {
		const v = describeImport({ importStatus: 'failed', importError: null, lastSyncedAt: null });
		expect(v.detail.length).toBeGreaterThan(0);
	});
});
