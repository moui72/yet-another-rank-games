-- bgg-cover-art-and-card-view (T001): games.image_url (BGG's full-size
-- <image>, nullable, alongside the existing thumbnail_url) and
-- users.show_cover_art (default true) so users can opt out of loading cover
-- art in the pool builder and pairwise comparison views.
alter table games add column image_url text;
alter table users add column show_cover_art boolean not null default true;
