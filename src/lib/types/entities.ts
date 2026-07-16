/**
 * Shared entity types — the single source of truth for the app's data shapes
 * (constitution Principle XIII), mirroring `.project/artifacts/datamodel.md`.
 * Reused by the server data layer and the UI.
 *
 * Convention: camelCase in TypeScript; the Kysely layer maps these to the
 * snake_case columns via CamelCasePlugin (see `lib/server/schema.ts`).
 * Timestamps are ISO-8601 strings; uuid ids are strings; the shared `games`
 * table uses a numeric surrogate id.
 */

/** How a list's order is produced. */
export type RankingMethod = 'pairwise' | 'manual' | 'tier';

/** Whether a list is still being ranked or finalized. */
export type ListStatus = 'in_progress' | 'complete';

/** A user; `id` mirrors the Supabase Auth user id. */
export interface User {
	id: string;
	bggUsername: string | null;
	/** Whether cover art is shown in the pool card view and pairwise comparison cards. */
	showCoverArt: boolean;
	createdAt: string;
}

/** One row per distinct BGG game, shared across all collections. */
export interface Game {
	id: number;
	bggId: number;
	name: string;
	yearPublished: number | null;
	weight: number | null;
	minPlayers: number | null;
	maxPlayers: number | null;
	playingTime: number | null;
	thumbnailUrl: string | null;
	/** BGG's full-size `<image>` (nullable until enrichment fetches it). */
	imageUrl: string | null;
	mechanics: string[];
	categories: string[];
	/** True for expansions/promos (BGG subtype "boardgameexpansion"). */
	isExpansion: boolean;
	lastFetchedAt: string | null;
}

/** Lifecycle of a collection's BGG import. */
export type ImportStatus = 'idle' | 'importing' | 'complete' | 'failed';

/** A user's imported BGG collection. */
export interface Collection {
	id: string;
	userId: string;
	bggUsername: string;
	lastSyncedAt: string | null;
	importStatus: ImportStatus;
	/** Failure message when importStatus is 'failed' (app-side dead-letter). */
	importError: string | null;
	createdAt: string;
}

/** Provenance of a `CollectionItem`: BGG-sourced vs. a local hand-add. */
export type CollectionItemSource = 'bgg_import' | 'local_add';

/**
 * A `CollectionItem`'s local-edit lifecycle. `active` is normal; `removed` is
 * a user soft-delete (undoable back to `active`); `pending_delete` is
 * `removed` **and** a re-pull confirmed it's no longer in the source
 * collection (confirm to hard-delete, or undo back to `active`).
 */
export type CollectionItemStatus = 'active' | 'removed' | 'pending_delete';

/** Join of collection ↔ game, plus BGG collection-specific facts. */
export interface CollectionItem {
	id: string;
	collectionId: string;
	gameId: number;
	owned: boolean;
	userRating: number | null;
	numPlays: number | null;
	source: CollectionItemSource;
	status: CollectionItemStatus;
	/** When the item entered `removed` (nullable; for display, e.g. "removed 3 days ago"). */
	removedAt: string | null;
}

/** Lifecycle of a surfaced possible duplicate. */
export type CollectionItemDuplicateStatus = 'pending' | 'confirmed_same' | 'rejected_distinct';

/**
 * A possible duplicate surfaced by a collection re-pull: a `local_add`
 * `CollectionItem` whose title fuzzy-matched a newly-pulled game under a
 * different `bgg_id`. See `datamodel.md`.
 */
export interface CollectionItemDuplicate {
	id: string;
	collectionItemId: string;
	candidateGameId: number;
	status: CollectionItemDuplicateStatus;
	createdAt: string;
}

/** A reusable, user-owned curated group of games (see Pool builder). */
export interface Pool {
	id: string;
	userId: string;
	name: string;
	description: string | null;
	createdAt: string;
}

/** Membership of a pool — the explicit, editable eligible set. */
export interface PoolGame {
	id: string;
	poolId: string;
	gameId: number;
	/**
	 * Manually pulled out of a list's active ranking (feedback F002) while
	 * keeping its `Comparison` history — distinct from a game that's simply
	 * never been compared yet. Drives the Unranked/Ranked split (T013).
	 */
	excludedFromRanking: boolean;
}

/** A named ranking over a pool's games. Many lists can rank one pool. */
export interface List {
	id: string;
	poolId: string;
	userId: string;
	name: string;
	description: string | null;
	rankingMethod: RankingMethod;
	status: ListStatus;
	createdAt: string;
}

/** A single pairwise judgment within a list; source of truth for order. */
export interface Comparison {
	id: string;
	listId: string;
	gameA: number;
	gameB: number;
	winnerId: number;
	createdAt: string;
}

/** Derived ordering snapshot for a list (or authored directly for manual lists). */
export interface ListEntry {
	id: string;
	listId: string;
	gameId: number;
	position: number;
	score: number | null;
}

/** A min/max predicate; either bound omitted or null means open-ended. */
export interface RangePredicate {
	min?: number | null;
	max?: number | null;
}

/** Include requires all listed values; exclude removes any listed value. */
export interface TagPredicate {
	include: string[];
	exclude: string[];
}

/**
 * `List.filter` — a conjunction (AND) of optional predicates selecting games
 * from a collection. An omitted key means no constraint on that dimension;
 * `{}` selects the whole collection. See datamodel.md "List filter schema".
 */
export interface ListFilter {
	mechanics?: TagPredicate;
	categories?: TagPredicate;
	weight?: RangePredicate;
	playingTime?: RangePredicate;
	yearPublished?: RangePredicate;
	/** Keep games whose [minPlayers, maxPlayers] range includes this count. */
	playerCount?: { supports: number };
	/** Restrict to owned games. */
	ownedOnly?: boolean;
	/** `exclude` = base games only; `only` = expansions/promos only; omitted = both. */
	expansions?: 'exclude' | 'only';
}
