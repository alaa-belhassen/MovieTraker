-- CinéTrack: rooms schema and non-recursive RLS hardening.
-- Run in Supabase SQL Editor, then reload the room page.

alter table if exists public.rooms
  add column if not exists video_url text,
  add column if not exists video_provider text,
  add column if not exists mode text not null default 'video',
  add column if not exists access text not null default 'invite',
  add column if not exists max_participants integer,
  add column if not exists scheduled_at timestamptz,
  add column if not exists status text not null default 'active',
  add column if not exists rights_confirmed_at timestamptz;

create or replace function public.is_room_member(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.rooms r where r.id = target_room_id and r.host_id = (select auth.uid())
  ) or exists (
    select 1 from public.room_participants p where p.room_id = target_room_id and p.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_room_member(uuid) from public;
grant execute on function public.is_room_member(uuid) to authenticated;

alter table if exists public.room_participants enable row level security;
alter table if exists public.room_messages enable row level security;
alter table if exists public.room_playback_state enable row level security;

drop policy if exists rooms_select_host_or_participant on public.rooms;
drop policy if exists room_participants_self_or_host on public.room_participants;

do $$
begin
  if to_regclass('public.room_messages') is not null then
    execute 'drop policy if exists room_messages_select_members on public.room_messages';
    execute 'drop policy if exists room_messages_insert_members on public.room_messages';
  end if;
  if to_regclass('public.room_playback_state') is not null then
    execute 'drop policy if exists room_playback_state_select_members on public.room_playback_state';
    execute 'drop policy if exists room_playback_state_write_members on public.room_playback_state';
  end if;
end $$;

create policy rooms_select_host_or_participant on public.rooms
for select to authenticated using (public.is_room_member(id));

create policy room_participants_self_or_host on public.room_participants
for all to authenticated
using (user_id = (select auth.uid()) or public.is_room_member(room_id))
with check (user_id = (select auth.uid()) or public.is_room_member(room_id));

-- These policies are created only when the optional tables exist.
do $$
begin
  if to_regclass('public.room_messages') is not null then
    execute $policy$create policy room_messages_select_members on public.room_messages for select to authenticated using (public.is_room_member(room_id))$policy$;
    execute $policy$create policy room_messages_insert_members on public.room_messages for insert to authenticated with check (author_id = (select auth.uid()) and public.is_room_member(room_id))$policy$;
  end if;
  if to_regclass('public.room_playback_state') is not null then
    execute $policy$create policy room_playback_state_select_members on public.room_playback_state for select to authenticated using (public.is_room_member(room_id))$policy$;
    execute $policy$create policy room_playback_state_write_members on public.room_playback_state for all to authenticated using (public.is_room_member(room_id)) with check (public.is_room_member(room_id))$policy$;
  end if;
end $$;
