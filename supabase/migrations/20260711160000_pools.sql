-- Introduce pools: reusable, user-owned curated game groups that lists rank.
-- Hierarchy becomes Collection -> Pool -> List (see datamodel.md).

create table pools (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references users (id) on delete cascade,
	name text not null,
	description text,
	created_at timestamptz not null default now()
);
create index pools_user_id_idx on pools (user_id);

-- Explicit, editable pool membership.
create table pool_games (
	id uuid primary key default gen_random_uuid(),
	pool_id uuid not null references pools (id) on delete cascade,
	game_id bigint not null references games (id),
	unique (pool_id, game_id)
);

-- A list now ranks a pool (not a collection), and the filter is no longer
-- stored on the list (it's a transient pool-build tool). Safe on empty tables.
alter table lists drop column collection_id;
alter table lists drop column filter;
alter table lists add column pool_id uuid not null references pools (id) on delete cascade;
create index lists_pool_id_idx on lists (pool_id);
