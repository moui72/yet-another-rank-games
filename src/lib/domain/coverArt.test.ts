import { describe, it, expect } from 'vitest';
import { resolveCoverArt, PLACEHOLDER_COVER_ART } from './coverArt';

// bgg-cover-art-and-card-view (T004): a single shared fallback chain
// (image_url -> thumbnail_url -> placeholder) used by both the pool card
// view and the pairwise comparison cards, so it isn't duplicated per view.
describe('resolveCoverArt', () => {
	it('prefers imageUrl when present', () => {
		expect(
			resolveCoverArt({ imageUrl: 'full.jpg', thumbnailUrl: 'thumb.jpg' }, true)
		).toBe('full.jpg');
	});

	it('falls back to thumbnailUrl when imageUrl is null', () => {
		expect(resolveCoverArt({ imageUrl: null, thumbnailUrl: 'thumb.jpg' }, true)).toBe('thumb.jpg');
	});

	it('falls back to the placeholder when both are null', () => {
		expect(resolveCoverArt({ imageUrl: null, thumbnailUrl: null }, true)).toBe(
			PLACEHOLDER_COVER_ART
		);
	});

	it('returns null when showCoverArt is false, regardless of available images', () => {
		expect(resolveCoverArt({ imageUrl: 'full.jpg', thumbnailUrl: 'thumb.jpg' }, false)).toBeNull();
	});
});
