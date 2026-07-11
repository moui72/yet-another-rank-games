-- Kysely's CamelCasePlugin is asymmetric for `x_a_id`-style names (it writes
-- gameAId as game_aid, not game_a_id). Rename to plugin-friendly columns.
-- The check constraints that reference these columns are updated automatically.
alter table comparisons rename column game_a_id to game_a;
alter table comparisons rename column game_b_id to game_b;
