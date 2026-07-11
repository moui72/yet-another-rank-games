-- Auto-provision a public.users row whenever a Supabase Auth user is created,
-- so app tables that reference users(id) have a row to point at. Runs for every
-- sign-up path (email, OAuth) and for direct auth.users inserts (tests).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
	insert into public.users (id) values (new.id) on conflict (id) do nothing;
	return new;
end;
$$;

create trigger on_auth_user_created
	after insert on auth.users
	for each row execute function public.handle_new_user();
