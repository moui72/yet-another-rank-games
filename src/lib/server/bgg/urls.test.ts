import { describe, it, expect } from 'vitest';
import { buildCollectionUrl, buildThingUrl } from './urls';

describe('buildCollectionUrl', () => {
	it('requests the collection with stats', () => {
		const url = buildCollectionUrl('tyler');
		expect(url).toContain('/xmlapi2/collection?');
		expect(url).toContain('username=tyler');
		expect(url).toContain('stats=1');
		expect(url).not.toContain('own=1');
	});

	it('restricts to owned when asked', () => {
		expect(buildCollectionUrl('tyler', { ownedOnly: true })).toContain('own=1');
	});

	it('encodes usernames', () => {
		expect(buildCollectionUrl('a b&c')).toContain('username=a+b%26c');
	});
});

describe('buildThingUrl', () => {
	it('requests multiple thing ids with stats', () => {
		const url = buildThingUrl([13, 822]);
		expect(url).toContain('/xmlapi2/thing?');
		expect(url).toContain('id=13%2C822');
		expect(url).toContain('stats=1');
	});
});
