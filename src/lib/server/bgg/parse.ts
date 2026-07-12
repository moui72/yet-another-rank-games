import { XMLParser } from 'fast-xml-parser';
import type { BggCollectionItem, BggThing, BggSearchResult } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XmlNode = any;

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '',
	parseAttributeValue: true,
	textNodeName: '#text',
	trimValues: true,
	// BGG encodes names with numeric HTML entities (e.g. `&#039;` for an
	// apostrophe); decode them so titles render correctly.
	htmlEntities: true
});

/** fast-xml-parser yields a single object for one child, an array for many. */
function toArray<T>(v: T | T[] | undefined | null): T[] {
	if (v === undefined || v === null) return [];
	return Array.isArray(v) ? v : [v];
}

/** Coerce an attribute/text value to a finite number, or null. */
function num(v: unknown): number | null {
	if (v === undefined || v === null || v === '' || v === 'N/A') return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

/** A `<name>` node may be a plain string, `{ '#text' }`, or have a `value` attr. */
function textOf(node: XmlNode): string {
	if (node === undefined || node === null) return '';
	if (typeof node === 'object') return String(node['#text'] ?? node.value ?? '');
	return String(node);
}

/** True when the body is BGG's "request accepted, try later" (202) message. */
export function isCollectionQueued(xml: string): boolean {
	const doc = parser.parse(xml);
	return doc?.message !== undefined && doc?.items === undefined;
}

export function parseCollectionXml(xml: string): BggCollectionItem[] {
	const doc = parser.parse(xml);
	return toArray<XmlNode>(doc?.items?.item)
		.map((it): BggCollectionItem => {
			const ratingValue = it?.stats?.rating?.value;
			return {
				bggId: Number(it?.objectid),
				name: textOf(it?.name),
				owned: Number(it?.status?.own ?? 0) === 1,
				userRating: num(ratingValue),
				numPlays: num(it?.numplays)
			};
		})
		.filter((i) => Number.isFinite(i.bggId));
}

export function parseSearchXml(xml: string): BggSearchResult[] {
	const doc = parser.parse(xml);
	return toArray<XmlNode>(doc?.items?.item)
		.map((it): BggSearchResult => {
			const names = toArray<XmlNode>(it?.name);
			const primary = names.find((n) => n?.type === 'primary') ?? names[0];
			return {
				bggId: Number(it?.id),
				name: textOf(primary),
				yearPublished: num(it?.yearpublished?.value)
			};
		})
		.filter((r) => Number.isFinite(r.bggId));
}

export function parseThingXml(xml: string): BggThing[] {
	const doc = parser.parse(xml);
	return toArray<XmlNode>(doc?.items?.item)
		.map((it): BggThing => {
			const names = toArray<XmlNode>(it?.name);
			const primary = names.find((n) => n?.type === 'primary') ?? names[0];
			const links = toArray<XmlNode>(it?.link);
			const linkValues = (type: string) =>
				links.filter((l) => l?.type === type).map((l) => String(l.value));
			const thumbnail = it?.thumbnail;
			return {
				bggId: Number(it?.id),
				name: textOf(primary),
				yearPublished: num(it?.yearpublished?.value),
				weight: num(it?.statistics?.ratings?.averageweight?.value),
				minPlayers: num(it?.minplayers?.value),
				maxPlayers: num(it?.maxplayers?.value),
				playingTime: num(it?.playingtime?.value),
				thumbnailUrl: thumbnail ? String(thumbnail).trim() : null,
				mechanics: linkValues('boardgamemechanic'),
				categories: linkValues('boardgamecategory'),
				isExpansion: it?.type === 'boardgameexpansion'
			};
		})
		.filter((t) => Number.isFinite(t.bggId));
}
