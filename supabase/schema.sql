-- Pratipaksh database schema — run once in Supabase → SQL Editor → New query → Run.
-- Every row is owned by a user and protected by Row Level Security,
-- so a user can only ever read or delete their own data.

create table if not exists public.hearings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title            text not null,
  doc_type         text,
  user_side        text,
  round            int  not null default 1,
  win_probability  int,
  data             jsonb not null,          -- full hearing (clauses, issues, ledger, fixes)
  created_at       timestamptz not null default now()
);

create index if not exists hearings_user_created_idx on public.hearings (user_id, created_at desc);

alter table public.hearings enable row level security;

drop policy if exists "read own hearings"   on public.hearings;
drop policy if exists "insert own hearings" on public.hearings;
drop policy if exists "delete own hearings" on public.hearings;

create policy "read own hearings"   on public.hearings for select using (auth.uid() = user_id);
create policy "insert own hearings" on public.hearings for insert with check (auth.uid() = user_id);
create policy "delete own hearings" on public.hearings for delete using (auth.uid() = user_id);

-- "Delete my account": removes the calling user's data AND their login.
-- SECURITY DEFINER lets it delete from auth.users, but it can only ever
-- touch the row of the user who calls it (auth.uid()).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  delete from public.hearings where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ───── Abuse protection (safe to re-run) ─────
-- Signed-out visitors get no access to the table at all.
revoke all on table public.hearings from anon;

-- Cap the size of each saved hearing and its text fields.
do $$ begin
  alter table public.hearings add constraint hearings_data_size check (pg_column_size(data) < 2000000);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.hearings add constraint hearings_text_len check (
    char_length(title) <= 300 and coalesce(char_length(doc_type), 0) <= 300 and coalesce(char_length(user_side), 0) <= 100
  );
exception when duplicate_object then null; end $$;

-- At most 500 saved hearings per user (stops one account filling the free database).
create or replace function public.enforce_hearing_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $q$
begin
  if (select count(*) from public.hearings where user_id = new.user_id) >= 500 then
    raise exception 'Hearing limit reached (500). Delete old hearings to save new ones.';
  end if;
  return new;
end;
$q$;

drop trigger if exists hearings_quota on public.hearings;
create trigger hearings_quota before insert on public.hearings
  for each row execute function public.enforce_hearing_quota();

-- Make the API pick up the new table immediately
notify pgrst, 'reload schema';
