-- Whether a game is an expansion/promo (BGG subtype "boardgameexpansion"),
-- so pools can filter to base games only, or expansions only.
alter table games add column is_expansion boolean not null default false;
