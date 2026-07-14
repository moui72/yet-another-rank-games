-- Pairwise ranking unranked/ranked split (feedback F001-F003): a pool game can
-- be manually pulled out of a list's active ranking without losing its
-- Comparison history (distinct from simply having zero comparisons yet).
alter table pool_games add column excluded_from_ranking boolean not null default false;
