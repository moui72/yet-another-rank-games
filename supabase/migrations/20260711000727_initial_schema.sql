-- Initial schema for yet-another-rank-games (see .project/artifacts/datamodel.md).
-- RLS is intentionally left OFF on every table: all access flows through the
-- trusted server/worker over a direct connection (infrastructure.md).

-- A user; id mirrors the Supabase Auth user.
create table users (
	id uuid primary key references auth.users (id) on delete cascade,
	bgg_username text,
	created_at timestamptz not null default now()
);

-- One row per distinct BGG game, shared across all users' collections.
create table games (
	id bigint generated always as identity primary key,
	bgg_id integer not null unique,
	name text not null,
	year_published integer,
	weight numeric,
	min_players integer,
	max_players integer,
	playing_time integer,
	thumbnail_url text,
	mechanics text[] not null default '{}',
	categories text[] not null default '{}',
	last_fetched_at timestamptz
);

-- A user's imported BGG collection.
create table collections (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references users (id) on delete cascade,
	bgg_username text not null,
	last_synced_at timestamptz,
	created_at timestamptz not null default now()
);
create index collections_user_id_idx on collections (user_id);

-- Join of collection <-> game, plus BGG collection-specific facts.
create table collection_items (
	id uuid primary key default gen_random_uuid(),
	collection_id uuid not null references collections (id) on delete cascade,
	game_id bigint not null references games (id),
	owned boolean not null default false,
	user_rating numeric,
	num_plays integer,
	unique (collection_id, game_id)
);

-- A named, filtered, ordered subset of a collection.
create table lists (
	id uuid primary key default gen_random_uuid(),
	collection_id uuid not null references collections (id) on delete cascade,
	user_id uuid not null references users (id) on delete cascade,
	name text not null,
	description text,
	filter jsonb not null default '{}',
	ranking_method text not null check (ranking_method in ('pairwise', 'manual', 'tier')),
	status text not null default 'in_progress' check (status in ('in_progress', 'complete')),
	created_at timestamptz not null default now()
);
create index lists_collection_id_idx on lists (collection_id);
create index lists_user_id_idx on lists (user_id);

-- A single pairwise judgment within a list; the source of truth for order.
create table comparisons (
	id uuid primary key default gen_random_uuid(),
	list_id uuid not null references lists (id) on delete cascade,
	game_a_id bigint not null references games (id),
	game_b_id bigint not null references games (id),
	winner_id bigint not null references games (id),
	created_at timestamptz not null default now(),
	check (winner_id in (game_a_id, game_b_id)),
	check (game_a_id <> game_b_id)
);
create index comparisons_list_id_idx on comparisons (list_id);

-- Derived ordering snapshot for a list (recomputed from comparisons, or
-- authored directly for a manual list).
create table list_entries (
	id uuid primary key default gen_random_uuid(),
	list_id uuid not null references lists (id) on delete cascade,
	game_id bigint not null references games (id),
	position integer not null,
	score numeric,
	tier text,
	unique (list_id, game_id)
);
create index list_entries_list_id_position_idx on list_entries (list_id, position);
