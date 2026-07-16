-- Enforce the unordered pair as the identity of a comparison (ardd-audit
-- 2026-07-15): a double-submit for a pair already judged in a list must
-- overwrite the existing row, not insert a duplicate that would silently
-- double-weight the judgment in the openskill rating update. Canonicalize
-- game_a/game_b (lower id first) so the same pair always resolves to the
-- same row regardless of which game was shown on which side.

-- Normalize existing rows into canonical order first, so the new check
-- constraint below doesn't reject rows inserted before this migration.
update comparisons
set game_a = game_b, game_b = game_a
where game_a > game_b;

-- Dedupe any pair already judged more than once under the old (no-unique)
-- regime, keeping the most recent judgment per pair (same "most recent wins"
-- tie-break already used by deleteLastComparison's undo).
delete from comparisons a
using comparisons b
where a.list_id = b.list_id
	and a.game_a = b.game_a
	and a.game_b = b.game_b
	and (a.created_at, a.id) < (b.created_at, b.id);

alter table comparisons add constraint comparisons_canonical_pair_order check (game_a < game_b);
alter table comparisons add constraint comparisons_list_pair_unique unique (list_id, game_a, game_b);
