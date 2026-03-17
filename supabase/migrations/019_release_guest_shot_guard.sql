create or replace function release_guest_shot(
  p_guest_session_id uuid
)
returns table (
  id uuid,
  shots_taken int,
  shots_remaining int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    update guest_sessions as gs
    set
      shots_taken = greatest(gs.shots_taken - 1, 0),
      shots_remaining = gs.shots_remaining + 1,
      updated_at = now()
    where gs.id = p_guest_session_id
      and gs.shots_taken > 0
    returning
      gs.id,
      gs.shots_taken,
      gs.shots_remaining;
end;
$$;
