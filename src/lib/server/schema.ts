import type { Generated, ColumnType } from 'kysely';
import type { RankingMethod, ListStatus, ListFilter } from '$lib/types/entities';

/**
 * Kysely database interface — the typed view of the Postgres schema
 * (`supabase/migrations`). Columns are declared camelCase and mapped to their
 * snake_case DB names by CamelCasePlugin (see `db.ts`). `Generated<T>` marks
 * columns the database fills in (identity ids, defaults), so they're optional
 * on insert. Selected entity shapes live in `$lib/types/entities` (Principle
 * XIII); this interface adds only DB-insert/update nuance.
 */

interface UsersTable {
	id: string;
	bggUsername: string | null;
	createdAt: Generated<string>;
}

interface GamesTable {
	id: Generated<number>;
	bggId: number;
	name: string;
	yearPublished: number | null;
	weight: number | null;
	minPlayers: number | null;
	maxPlayers: number | null;
	playingTime: number | null;
	thumbnailUrl: string | null;
	mechanics: Generated<string[]>;
	categories: Generated<string[]>;
	lastFetchedAt: string | null;
}

interface CollectionsTable {
	id: Generated<string>;
	userId: string;
	bggUsername: string;
	lastSyncedAt: string | null;
	createdAt: Generated<string>;
}

interface CollectionItemsTable {
	id: Generated<string>;
	collectionId: string;
	gameId: number;
	owned: Generated<boolean>;
	userRating: number | null;
	numPlays: number | null;
}

interface ListsTable {
	id: Generated<string>;
	collectionId: string;
	userId: string;
	name: string;
	description: string | null;
	// Stored as jsonb; read back as ListFilter, written as ListFilter.
	filter: ColumnType<ListFilter, ListFilter, ListFilter>;
	rankingMethod: RankingMethod;
	status: Generated<ListStatus>;
	createdAt: Generated<string>;
}

interface ComparisonsTable {
	id: Generated<string>;
	listId: string;
	gameAId: number;
	gameBId: number;
	winnerId: number;
	createdAt: Generated<string>;
}

interface ListEntriesTable {
	id: Generated<string>;
	listId: string;
	gameId: number;
	position: number;
	score: number | null;
	tier: string | null;
}

export interface Database {
	users: UsersTable;
	games: GamesTable;
	collections: CollectionsTable;
	collectionItems: CollectionItemsTable;
	lists: ListsTable;
	comparisons: ComparisonsTable;
	listEntries: ListEntriesTable;
}
