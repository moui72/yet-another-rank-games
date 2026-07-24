-- Public list sharing (feature public-list-sharing, datamodel.md): a list is
-- private by default; the owner can flip is_shared to true to allow an
-- unauthenticated read of the list via its share_token. share_token is
-- generated lazily (app-side, on first transition to is_shared=true) rather
-- than defaulted here, so most rows never get one.
alter table lists add column is_shared boolean not null default false;
alter table lists add column share_token uuid;
