import { buildCollectionUrl, buildThingUrl } from './urls';

/** A raw BGG API response: HTTP status plus the XML body text. */
export interface BggResponse {
	status: number;
	xml: string;
}

async function get(url: string): Promise<BggResponse> {
	// The XML API requires a registered Bearer token (BGG "XML APIcalypse",
	// Oct 2025) — anonymous requests get 401. See infrastructure.md.
	const headers: Record<string, string> = { accept: 'application/xml' };
	const token = process.env.BGG_API_TOKEN;
	if (token) headers.authorization = `Bearer ${token}`;

	// A hung BGG call must never hang the import — bound it with a timeout.
	const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
	return { status: res.status, xml: await res.text() };
}

/**
 * Fetch a collection export. BGG may answer `202 Accepted` (queued) — the
 * caller (the poll-retry loop) inspects `status`/`isCollectionQueued`.
 */
export function fetchCollectionXml(
	username: string,
	opts: { ownedOnly?: boolean } = {}
): Promise<BggResponse> {
	return get(buildCollectionUrl(username, opts));
}

/** Fetch full game details for one or more BGG ids. */
export function fetchThingXml(ids: number[]): Promise<BggResponse> {
	return get(buildThingUrl(ids));
}
