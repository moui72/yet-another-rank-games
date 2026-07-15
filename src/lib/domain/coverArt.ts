/**
 * Shared cover-art fallback chain (bgg-cover-art-and-card-view, Principle
 * IX/XIII): `image_url` -> `thumbnail_url` -> placeholder. Used by both the
 * pool builder card view and the pairwise comparison cards so the chain isn't
 * duplicated per view.
 */

/** A simple inline placeholder — no network request, just a data URI. */
export const PLACEHOLDER_COVER_ART =
	'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23d1d5db"/%3E%3C/svg%3E';

/**
 * Resolve the display image for a game. When `showCoverArt` is false,
 * returns `null` so callers make no image request at all (compact
 * text-only layout).
 */
export function resolveCoverArt(
	game: { imageUrl: string | null; thumbnailUrl: string | null },
	showCoverArt: boolean
): string | null {
	if (!showCoverArt) return null;
	return game.imageUrl ?? game.thumbnailUrl ?? PLACEHOLDER_COVER_ART;
}
