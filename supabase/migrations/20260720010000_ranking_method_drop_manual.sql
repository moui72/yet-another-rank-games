-- Retire the `manual` ranking mode (efficient-ordering-mode plan, Phase 6).
-- Its only consumer (ManualRanker + the mode==='manual' read path) is replaced
-- by the efficient mode, and `manual` is no longer offered at list creation.
--
-- Verified safe at execution-planning time: zero `ranking_method = 'manual'`
-- rows in BOTH staging (ujaxenitxmnmxcqkoddy) and production
-- (tmncunthbcfdaolqswcq) — re-checked via SQL, not trusting the plan snapshot.
-- The recreate below is also self-guarding: adding a CHECK that excludes
-- 'manual' physically fails if any such row exists, so it can never silently
-- drop data even if a row raced in. `tier` stays a valid (deferred) value.

alter table lists drop constraint lists_ranking_method_check;
alter table lists
	add constraint lists_ranking_method_check
	check (ranking_method in ('pairwise', 'efficient', 'tier'));
