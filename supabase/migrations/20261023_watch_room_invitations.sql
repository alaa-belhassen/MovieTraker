create or replace function public.invite_room_participants(
  target_room_id uuid,
  target_usernames text[]
)
returns table(requested_username text, invited_username text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (
    select 1 from public.rooms
    where id = target_room_id and host_id = auth.uid()
  ) then raise exception 'HOST_REQUIRED'; end if;
  if coalesce(cardinality(target_usernames), 0) > 20 then raise exception 'TOO_MANY_INVITES'; end if;

  with requested as (
    select distinct lower(regexp_replace(btrim(username), '^@+', '')) as username
    from unnest(coalesce(target_usernames, array[]::text[])) as input(username)
    where btrim(username) <> ''
      and char_length(regexp_replace(btrim(username), '^@+', '')) <= 40
  ),
  matched as (
    select requested.username as requested_username, profiles.id, profiles.username
    from requested
    join public.profiles on lower(btrim(profiles.username)) = requested.username
    where profiles.id <> auth.uid()
  )
  insert into public.room_participants(room_id, user_id)
  select target_room_id, matched.id
  from matched
  on conflict (room_id, user_id) do nothing;

  return query
  with requested as (
    select distinct lower(regexp_replace(btrim(username), '^@+', '')) as username
    from unnest(coalesce(target_usernames, array[]::text[])) as input(username)
    where btrim(username) <> ''
      and char_length(regexp_replace(btrim(username), '^@+', '')) <= 40
  )
  select requested.username, profiles.username
  from requested
  left join public.profiles
    on lower(btrim(profiles.username)) = requested.username
    and profiles.id <> auth.uid();
end;
$$;

revoke all on function public.invite_room_participants(uuid, text[]) from public;
grant execute on function public.invite_room_participants(uuid, text[]) to authenticated;
