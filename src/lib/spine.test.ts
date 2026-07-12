import { describe, it, expect } from 'vitest';
import { spineColor } from './spine';

describe('spineColor', () => {
	it('returns a hex color for any index', () => {
		expect(spineColor(0)).toMatch(/^#[0-9a-f]{6}$/);
	});

	it('cycles through the palette', () => {
		// 7 colors: index 7 wraps back to index 0.
		expect(spineColor(7)).toBe(spineColor(0));
		expect(spineColor(8)).toBe(spineColor(1));
	});

	it('handles negative indices without going out of bounds', () => {
		expect(spineColor(-1)).toBe(spineColor(6));
	});
});
