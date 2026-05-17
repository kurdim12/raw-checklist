-- =====================================================================
-- Production hardening
-- =====================================================================
-- 1) Pin search_path on the two helpers that were flagged
--    (function_search_path_mutable advisor warning).
-- 2) Revoke anon EXECUTE on every public function — the API role doesn't
--    need to call RPCs without a JWT. Default privileges follow.
-- 3) Add profiles.must_change_password — forces a password change on
--    first login for any user whose flag is true. Seeded staff (Manager,
--    Obida, Ahmad, Samaher, Muneeb) start with the printed defaults, so
--    we set the flag for them.
-- 4) Tighten open_checklist_run / set_run_item_done — only scheduled
--    staff (or any manager) can open or tick a shift's run items.
-- =====================================================================

create or replace function today_amman() returns date
language sql stable set search_path = public as $$
  select (now() at time zone 'Asia/Amman')::date;
$$;

create or replace function set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on all functions in schema public from anon;
alter default privileges in schema public revoke execute on functions from anon;

alter table profiles
  add column if not exists must_change_password boolean not null default false;

update profiles set must_change_password = true
where display_name in ('Manager','Obida','Ahmad','Samaher','Muneeb');

create or replace function set_run_item_done(
  p_run_item_id uuid,
  p_done boolean,
  p_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_run_date date;
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;

  select r.shift_date into v_run_date
  from checklist_run_items i
  join checklist_runs r on r.id = i.run_id
  where i.id = p_run_item_id;

  if not found then
    raise exception 'run item not found';
  end if;

  if not is_manager(v_user)
     and not exists (
       select 1 from shifts
       where staff_id = v_user
         and shift_date = v_run_date
         and not is_off
     ) then
    raise exception 'user is not scheduled on %', v_run_date;
  end if;

  update checklist_run_items
  set done = p_done,
      done_by = case when p_done then v_user else null end,
      done_at = case when p_done then now() else null end,
      note = coalesce(p_note, note)
  where id = p_run_item_id;
end;
$$;
grant execute on function set_run_item_done(uuid, boolean, text) to authenticated;

create or replace function open_checklist_run(
  p_shift text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_date date := today_amman();
  v_run_id uuid;
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;
  if p_shift not in ('opening','closing') then
    raise exception 'invalid shift %', p_shift;
  end if;

  if not is_manager(v_user)
     and not exists (
       select 1 from shifts
       where staff_id = v_user
         and shift_date = v_date
         and not is_off
     ) then
    raise exception 'user is not scheduled on %', v_date;
  end if;

  select id into v_run_id
  from checklist_runs
  where shift_date = v_date and shift = p_shift;

  if v_run_id is null then
    insert into checklist_runs (shift_date, shift, opened_by, opened_at)
    values (v_date, p_shift, v_user, now())
    returning id into v_run_id;

    insert into checklist_run_items (run_id, template_id)
    select v_run_id, t.id
    from checklist_templates t
    where t.shift = p_shift
      and t.active
      and (
        t.frequency = 'every_shift'
        or (
          t.frequency = 'mon_thu_fri'
          and extract(isodow from v_date) in (1, 4, 5)
        )
        or t.frequency = 'weekly'
      );
  end if;

  return v_run_id;
end;
$$;
grant execute on function open_checklist_run(text) to authenticated;
