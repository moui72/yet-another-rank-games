import { describe, it, expect } from 'vitest';
import { parseCollectionXml, parseThingXml, isCollectionQueued } from './parse';

const COLLECTION_XML = `<?xml version="1.0" encoding="utf-8"?>
<items totalitems="2">
	<item objecttype="thing" objectid="13">
		<name sortindex="1">Catan</name>
		<yearpublished>1995</yearpublished>
		<status own="1" prevowned="0" />
		<numplays>5</numplays>
		<stats minplayers="3" maxplayers="4">
			<rating value="7.5"><average value="7.1" /></rating>
		</stats>
	</item>
	<item objecttype="thing" objectid="822">
		<name sortindex="1">Carcassonne</name>
		<status own="0" />
		<numplays>0</numplays>
		<stats>
			<rating value="N/A" />
		</stats>
	</item>
</items>`;

// BGG returns 202 Accepted with a message body while the export is generated.
const QUEUED_XML = `<?xml version="1.0" encoding="utf-8"?>
<message>Your request for this collection has been accepted and will be processed. Please try again later.</message>`;

const THING_XML = `<?xml version="1.0" encoding="utf-8"?>
<items>
	<item type="boardgame" id="13">
		<thumbnail>https://cf.geekdo-images.com/catan.jpg</thumbnail>
		<name type="alternate" sortindex="1" value="Die Siedler" />
		<name type="primary" sortindex="1" value="Catan" />
		<yearpublished value="1995" />
		<minplayers value="3" />
		<maxplayers value="4" />
		<playingtime value="120" />
		<link type="boardgamemechanic" id="2004" value="Trading" />
		<link type="boardgamemechanic" id="2072" value="Dice Rolling" />
		<link type="boardgamecategory" id="1021" value="Economic" />
		<statistics>
			<ratings><averageweight value="2.32" /></ratings>
		</statistics>
	</item>
</items>`;

// One item, missing most optional fields — parser must tolerate it.
const THING_SPARSE_XML = `<?xml version="1.0" encoding="utf-8"?>
<items>
	<item type="boardgame" id="99">
		<name type="primary" value="Mystery Game" />
	</item>
</items>`;

describe('parseCollectionXml', () => {
	it('maps each item to a typed collection entry', () => {
		const items = parseCollectionXml(COLLECTION_XML);
		expect(items).toHaveLength(2);
		expect(items[0]).toEqual({ bggId: 13, name: 'Catan', owned: true, userRating: 7.5, numPlays: 5 });
	});

	it('tolerates missing/N-A fields (not owned, no rating)', () => {
		const items = parseCollectionXml(COLLECTION_XML);
		expect(items[1]).toEqual({
			bggId: 822,
			name: 'Carcassonne',
			owned: false,
			userRating: null,
			numPlays: 0
		});
	});

	it('returns [] for a queued (202) message body', () => {
		expect(parseCollectionXml(QUEUED_XML)).toEqual([]);
	});

	it('reads a plain (attribute-less) name node', () => {
		const xml = `<items><item objectid="7"><name>Plain</name><status own="1"/></item></items>`;
		const [item] = parseCollectionXml(xml);
		expect(item.name).toBe('Plain');
	});
});

describe('isCollectionQueued', () => {
	it('detects the queued message body', () => {
		expect(isCollectionQueued(QUEUED_XML)).toBe(true);
		expect(isCollectionQueued(COLLECTION_XML)).toBe(false);
	});
});

describe('parseThingXml', () => {
	it('extracts game facts, primary name, mechanics and categories', () => {
		const [g] = parseThingXml(THING_XML);
		expect(g).toEqual({
			bggId: 13,
			name: 'Catan',
			yearPublished: 1995,
			weight: 2.32,
			minPlayers: 3,
			maxPlayers: 4,
			playingTime: 120,
			thumbnailUrl: 'https://cf.geekdo-images.com/catan.jpg',
			mechanics: ['Trading', 'Dice Rolling'],
			categories: ['Economic'],
			isExpansion: false
		});
	});

	it('flags boardgameexpansion items as expansions', () => {
		const xml = `<items><item type="boardgameexpansion" id="926"><name type="primary" value="Catan: Seafarers" /></item></items>`;
		const [g] = parseThingXml(xml);
		expect(g.isExpansion).toBe(true);
	});

	it('decodes numeric HTML entities in names (BGG encodes apostrophes as &#039;)', () => {
		const xml = `<items><item type="boardgame" id="77130"><name type="primary" value="Sid Meier&#039;s Civilization &amp; More" /></item></items>`;
		const [g] = parseThingXml(xml);
		expect(g.name).toBe("Sid Meier's Civilization & More");
	});

	it('tolerates a sparse item, defaulting missing fields to null/empty', () => {
		const [g] = parseThingXml(THING_SPARSE_XML);
		expect(g).toEqual({
			bggId: 99,
			name: 'Mystery Game',
			yearPublished: null,
			weight: null,
			minPlayers: null,
			maxPlayers: null,
			playingTime: null,
			thumbnailUrl: null,
			mechanics: [],
			categories: [],
			isExpansion: false
		});
	});
});
