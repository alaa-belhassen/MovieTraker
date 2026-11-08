create table if not exists public.forum_topics (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 3 and 120),
  content text not null check (char_length(trim(content)) between 1 and 5000),
  category text not null default 'Discussion générale',
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.forum_topics(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 3000),
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.forum_topics add column if not exists title text;
alter table public.forum_topics add column if not exists content text;
alter table public.forum_topics add column if not exists category text;
alter table public.forum_topics add column if not exists author_id uuid references auth.users(id) on delete set null;
alter table public.forum_topics add column if not exists created_at timestamptz;
alter table public.forum_topics alter column created_at set default now();
update public.forum_topics set category = coalesce(category, 'Discussion générale');
alter table public.forum_topics alter column category set default 'Discussion générale';

alter table public.forum_replies add column if not exists topic_id uuid references public.forum_topics(id) on delete cascade;
alter table public.forum_replies add column if not exists content text;
alter table public.forum_replies add column if not exists author_id uuid references auth.users(id) on delete set null;
alter table public.forum_replies add column if not exists created_at timestamptz;
alter table public.forum_replies alter column created_at set default now();

create index if not exists forum_topics_created_at_idx on public.forum_topics(created_at desc);
create index if not exists forum_replies_topic_id_idx on public.forum_replies(topic_id, created_at);

alter table public.forum_topics enable row level security;
alter table public.forum_replies enable row level security;

revoke all on table public.forum_topics from anon, authenticated;
revoke all on table public.forum_replies from anon, authenticated;
grant select on public.forum_topics, public.forum_replies to anon, authenticated;
grant insert on public.forum_topics, public.forum_replies to authenticated;
grant update, delete on public.forum_topics to authenticated;
grant update, delete on public.forum_replies to authenticated;

drop policy if exists forum_topics_public_read on public.forum_topics;
create policy forum_topics_public_read on public.forum_topics for select using (true);

drop policy if exists forum_topics_authenticated_insert on public.forum_topics;
create policy forum_topics_authenticated_insert on public.forum_topics for insert to authenticated with check (author_id = auth.uid());

drop policy if exists forum_topics_author_update on public.forum_topics;
create policy forum_topics_author_update on public.forum_topics for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists forum_topics_author_delete on public.forum_topics;
create policy forum_topics_author_delete on public.forum_topics for delete to authenticated using (author_id = auth.uid());

drop policy if exists forum_replies_public_read on public.forum_replies;
create policy forum_replies_public_read on public.forum_replies for select using (true);

drop policy if exists forum_replies_authenticated_insert on public.forum_replies;
create policy forum_replies_authenticated_insert on public.forum_replies for insert to authenticated with check (author_id = auth.uid());

drop policy if exists forum_replies_author_update on public.forum_replies;
create policy forum_replies_author_update on public.forum_replies for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists forum_replies_author_delete on public.forum_replies;
create policy forum_replies_author_delete on public.forum_replies for delete to authenticated using (author_id = auth.uid());

notify pgrst, 'reload schema';
