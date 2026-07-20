-- Add the `efficient` ranking mode (feature efficient-ordering-mode): a
-- constraint-graph derivation with binary-insertion selection and exact
-- drag-and-drop overrides (see datamodel.md "Constraint-graph derivation").
-- `ranking_method` is a text column with a CHECK constraint (not a PG enum),
-- so widening the allowed set is a drop-and-recreate of the check.
--
-- `manual` stays for now — it is retired separately in a later migration, only
-- after its last read path is replaced (see the efficient-ordering-mode plan,
-- Phase 6). Widening here is purely additive and safe on existing rows.

alter table lists drop constraint lists_ranking_method_check;
alter table lists
	add constraint lists_ranking_method_check
	check (ranking_method in ('pairwise', 'efficient', 'manual', 'tier'));
