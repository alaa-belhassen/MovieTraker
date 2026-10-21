-- Authoritative, versioned playback state for Watch Together rooms.
create table if not exists public.room_playback_state (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  source_url text,
  provider text,
  is_playing boolean not null default false,
  position_seconds double precision not null default 0 check (position_seconds >= 0),
  playback_rate double precision not null default 1 check (playback_rate > 0 and playback_rate <= 4),
  sequence bigint not null default 0 check (sequence >= 0),
  reference_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id)
);

alter table public.room_playback_state enable row level security;

create or replace function public.apply_room_playback_event(
  target_room_id uuid,
  event_type text,
  next_source_url text default null,
  next_provider text default null,
  next_is_playing boolean default null,
  next_position_seconds double precision default null,
  next_playback_rate double precision default null,
  expected_sequence bigint default null
)
returns public.room_playback_state
language plpgsql
security definer
set search_path = public
as $$
declare current_state public.room_playback_state;
declare next_sequence bigint;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.is_room_member(target_room_id) then raise exception 'ROOM_FORBIDDEN'; end if;
  if not exists (select 1 from public.rooms where id = target_room_id and host_id = auth.uid()) then raise exception 'HOST_REQUIRED'; end if;
  if event_type not in ('video', 'play', 'pause', 'seek', 'rate') then raise exception 'INVALID_EVENT'; end if;
  if next_position_seconds is not null and (next_position_seconds < 0 or next_position_seconds > 86400 * 30) then raise exception 'INVALID_POSITION'; end if;
  if next_playback_rate is not null and (next_playback_rate <= 0 or next_playback_rate > 4) then raise exception 'INVALID_RATE'; end if;

  select * into current_state from public.room_playback_state where room_id = target_room_id for update;
  if current_state.sequence is not null and expected_sequence is not null and expected_sequence <> current_state.sequence then
    return current_state;
  end if;
  next_sequence := coalesce(current_state.sequence, 0) + 1;

  insert into public.room_playback_state(room_id, source_url, provider, is_playing, position_seconds, playback_rate, sequence, reference_at, updated_at, updated_by)
  values (target_room_id, coalesce(next_source_url, current_state.source_url), coalesce(next_provider, current_state.provider), coalesce(next_is_playing, current_state.is_playing, false), coalesce(next_position_seconds, current_state.position_seconds, 0), coalesce(next_playback_rate, current_state.playback_rate, 1), next_sequence, now(), now(), auth.uid())
  on conflict (room_id) do update set source_url = excluded.source_url, provider = excluded.provider, is_playing = excluded.is_playing, position_seconds = excluded.position_seconds, playback_rate = excluded.playback_rate, sequence = excluded.sequence, reference_at = excluded.reference_at, updated_at = excluded.updated_at, updated_by = excluded.updated_by;
  select * into current_state from public.room_playback_state where room_id = target_room_id;
  return current_state;
end;
$$;

revoke all on function public.apply_room_playback_event(uuid, text, text, text, boolean, double precision, double precision, bigint) from public;
grant execute on function public.apply_room_playback_event(uuid, text, text, text, boolean, double precision, double precision, bigint) to authenticated;
