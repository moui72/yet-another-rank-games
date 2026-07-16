-- Drop the unused ListEntry.tier column (ardd-audit 2026-07-15): reserved for
-- the deferred tiering feature but never read or written by any code path.
-- Principle VII (YAGNI) — don't carry schema for a feature that isn't built.
-- If/when tiering ships, the column returns via a migration alongside it.

alter table list_entries drop column tier;
