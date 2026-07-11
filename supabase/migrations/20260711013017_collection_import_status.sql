-- Track the import lifecycle per collection so the UI can show progress/errors
-- and a permanently-failed import is queryable (app-side dead-letter state).
alter table collections
	add column import_status text not null default 'idle'
		check (import_status in ('idle', 'importing', 'complete', 'failed')),
	add column import_error text;
