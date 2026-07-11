import { describe, it, expect, vi, afterEach } from 'vitest';
import { logEvent, logError } from './log';

afterEach(() => vi.restoreAllMocks());

describe('structured logging', () => {
	it('logEvent emits a JSON info line with the event and fields', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
		logEvent('import.done', { collectionId: 'c1', gameCount: 5 });
		expect(spy).toHaveBeenCalledOnce();
		const payload = JSON.parse(spy.mock.calls[0][0] as string);
		expect(payload).toMatchObject({ level: 'info', event: 'import.done', collectionId: 'c1', gameCount: 5 });
	});

	it('logError emits a JSON error line', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		logError('import.failed', { collectionId: 'c1', error: 'boom' });
		const payload = JSON.parse(spy.mock.calls[0][0] as string);
		expect(payload).toMatchObject({ level: 'error', event: 'import.failed', error: 'boom' });
	});
});
