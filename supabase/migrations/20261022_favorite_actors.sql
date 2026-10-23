-- C4: followed / favorite actors (TMDB person ids).
-- Run in the Supabase SQL Editor if you want favorites synced to the database.

create table if not exists public.favorite_actors (
  user_id uuid not null references auth.users (id) on delete cascade,
  actor_id integer not null,
  name text,
  profile_path text,
  created_at timestamptz not null default now(),
  primary key (user_id, actor_id)
);

alter table public.favorite_actors enable row level security;

drop policy if exists favorite_actors_own_rows on public.favorite_actors;
create policy favorite_actors_own_rows
  on public.favorite_actors
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.favorite_actors to authenticated;
