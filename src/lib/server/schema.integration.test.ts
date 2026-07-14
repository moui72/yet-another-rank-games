import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';

// Integration test: verifies the initial migration produced the expected
// schema on the live local Postgres. Run via `npm run test:integration`, which
// resets the DB (re-applying migrations) first.
const sql = postgres(process.env.DATABASE_URL ?? '');

const EXPECTED_TABLES = [
	'users',
	'games',
	'collections',
	'collection_items',
	'lists',
	'comparisons',
	'list_entries'
];

async function columns(table: string): Promise<Set<string>> {
	const rows = await sql<{ column_name: string }[]>`
		select column_name from information_schema.columns
		where table_schema = 'public' and table_name = ${table}`;
	return new Set(rows.map((r) => r.column_name));
}

beforeAll(async () => {
	if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set for integration tests');
});
afterAll(async () => {
	await sql.end();
});

describe('initial schema', () => {
	it('creates all core tables in the public schema', async () => {
		const rows = await sql<{ table_name: string }[]>`
			select table_name from information_schema.tables
			where table_schema = 'public' and table_type = 'BASE TABLE'`;
		const present = new Set(rows.map((r) => r.table_name));
		for (const t of EXPECTED_TABLES) expect(present, `table ${t}`).toContain(t);
	});

	it('gives games a unique bgg_id and array mechanics/categories', async () => {
		const cols = await columns('games');
		for (const c of ['bgg_id', 'name', 'weight', 'mechanics', 'categories']) {
			expect(cols, `games.${c}`).toContain(c);
		}
		const [uniq] = await sql<{ count: number }[]>`
			select count(*)::int as count
			from pg_constraint c join pg_class t on t.oid = c.conrelid
			where t.relname = 'games' and c.contype = 'u'
			and pg_get_constraintdef(c.oid) ilike '%bgg_id%'`;
		expect(uniq.count).toBeGreaterThan(0);
	});

	it('enforces one row per (collection, game) in collection_items', async () => {
		const [uniq] = await sql<{ count: number }[]>`
			select count(*)::int as count
			from pg_constraint c join pg_class t on t.oid = c.conrelid
			where t.relname = 'collection_items' and c.contype = 'u'`;
		expect(uniq.count).toBeGreaterThan(0);
	});

	it('links lists and comparisons by foreign key', async () => {
		const [fk] = await sql<{ count: number }[]>`
			select count(*)::int as count
			from pg_constraint c join pg_class t on t.oid = c.conrelid
			where t.relname = 'comparisons' and c.contype = 'f'`;
		expect(fk.count).toBeGreaterThan(0);
	});
});

// collection-editing-and-resync (T001): Collection unique (user_id,
// bgg_username); CollectionItem.source/status/removed_at; CollectionItemDuplicate.
describe('collection editing & resync schema', () => {
	async function makeUser(): Promise<string> {
		const [row] = await sql<{ id: string }[]>`
			insert into auth.users (id) values (gen_random_uuid()) returning id`;
		return row.id;
	}

	it('rejects a duplicate (user_id, bgg_username) collection insert', async () => {
		const userId = await makeUser();
		await sql`insert into collections (user_id, bgg_username) values (${userId}, 'tyler')`;
		await expect(
			sql`insert into collections (user_id, bgg_username) values (${userId}, 'tyler')`
		).rejects.toThrow();
	});

	it('backfills existing collection_items to source=bgg_import, status=active', async () => {
		const userId = await makeUser();
		const [collection] = await sql<{ id: string }[]>`
			insert into collections (user_id, bgg_username) values (${userId}, 'someoneelse') returning id`;
		const [game] = await sql<{ id: number }[]>`
			insert into games (bgg_id, name) values (999001, 'Backfill Game') returning id`;
		const [item] = await sql<{ id: string; source: string; status: string; removed_at: string | null }[]>`
			insert into collection_items (collection_id, game_id) values (${collection.id}, ${game.id})
			returning id, source, status, removed_at`;
		expect(item.source).toBe('bgg_import');
		expect(item.status).toBe('active');
		expect(item.removed_at).toBeNull();
	});

	it('creates the collection_item_duplicates table with expected columns', async () => {
		const cols = await columns('collection_item_duplicates');
		for (const c of ['id', 'collection_item_id', 'candidate_game_id', 'status', 'created_at']) {
			expect(cols, `collection_item_duplicates.${c}`).toContain(c);
		}
	});
});
