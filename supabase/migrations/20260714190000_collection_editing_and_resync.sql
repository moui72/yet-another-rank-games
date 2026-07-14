-- collection-editing-and-resync (datamodel.md): a Collection can only be
-- imported once per (user, bgg_username); CollectionItem gains a local-edit
-- lifecycle (source/status/removed_at) so a re-pull can reconcile local
-- changes instead of silently overwriting them; CollectionItemDuplicate
-- records a possible local-add/newly-pulled-game match for user review.

alter table collections
	add constraint collections_user_id_bgg_username_key unique (user_id, bgg_username);

alter table collection_items
	add column source text not null default 'bgg_import'
		check (source in ('bgg_import', 'local_add')),
	add column status text not null default 'active'
		check (status in ('active', 'removed', 'pending_delete')),
	add column removed_at timestamptz;

create index collection_items_status_idx on collection_items (status);

create table collection_item_duplicates (
	id uuid primary key default gen_random_uuid(),
	collection_item_id uuid not null references collection_items (id) on delete cascade,
	candidate_game_id bigint not null references games (id),
	status text not null default 'pending'
		check (status in ('pending', 'confirmed_same', 'rejected_distinct')),
	created_at timestamptz not null default now()
);
create index collection_item_duplicates_collection_item_id_idx
	on collection_item_duplicates (collection_item_id);
