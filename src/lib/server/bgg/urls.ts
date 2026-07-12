const BASE = 'https://boardgamegeek.com/xmlapi2';

/** Collection export URL for a BGG username (stats included). */
export function buildCollectionUrl(username: string, opts: { ownedOnly?: boolean } = {}): string {
	const params = new URLSearchParams({ username, stats: '1' });
	if (opts.ownedOnly) params.set('own', '1');
	return `${BASE}/collection?${params.toString()}`;
}

/** Thing (game detail) URL for one or more BGG ids (stats included). */
export function buildThingUrl(ids: number[]): string {
	const params = new URLSearchParams({ id: ids.join(','), stats: '1' });
	return `${BASE}/thing?${params.toString()}`;
}

/** Search URL for board games matching a name query. */
export function buildSearchUrl(query: string): string {
	const params = new URLSearchParams({ query, type: 'boardgame' });
	return `${BASE}/search?${params.toString()}`;
}
