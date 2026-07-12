/** A game as it appears in a BGG collection export (collection endpoint). */
export interface BggCollectionItem {
	bggId: number;
	name: string;
	owned: boolean;
	userRating: number | null;
	numPlays: number | null;
}

/** Full game facts from the BGG thing endpoint (stats=1). */
export interface BggThing {
	bggId: number;
	name: string;
	yearPublished: number | null;
	weight: number | null;
	minPlayers: number | null;
	maxPlayers: number | null;
	playingTime: number | null;
	thumbnailUrl: string | null;
	mechanics: string[];
	categories: string[];
	isExpansion: boolean;
}
