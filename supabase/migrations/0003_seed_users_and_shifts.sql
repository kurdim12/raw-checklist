-- =====================================================================
-- Raw Smith Ops — seed profiles + sample week shifts
-- =====================================================================
-- Run this AFTER creating the 5 auth.users in Supabase Dashboard ->
-- Authentication -> Users.
--
-- The expected emails are:
--   manager@rawsmith.local   (will be set as role='manager')
--   obida@rawsmith.local     (barista)
--   ahmad@rawsmith.local     (barista)
--   samaher@rawsmith.local   (barista)
--   muneeb@rawsmith.local    (barista)
--
-- Idempotent — re-running is safe.
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------

insert into profiles (id, display_name, role, active)
select u.id, 'Manager', 'manager', true
from auth.users u
where u.email = 'manager@rawsmith.local'
on conflict (id) do update
  set display_name = excluded.display_name,
      role         = excluded.role,
      active       = excluded.active;

insert into profiles (id, display_name, role, active)
select u.id, 'Obida', 'barista', true
from auth.users u
where u.email = 'obida@rawsmith.local'
on conflict (id) do update
  set display_name = excluded.display_name,
      role         = excluded.role,
      active       = excluded.active;

insert into profiles (id, display_name, role, active)
select u.id, 'Ahmad', 'barista', true
from auth.users u
where u.email = 'ahmad@rawsmith.local'
on conflict (id) do update
  set display_name = excluded.display_name,
      role         = excluded.role,
      active       = excluded.active;

insert into profiles (id, display_name, role, active)
select u.id, 'Samaher', 'barista', true
from auth.users u
where u.email = 'samaher@rawsmith.local'
on conflict (id) do update
  set display_name = excluded.display_name,
      role         = excluded.role,
      active       = excluded.active;

insert into profiles (id, display_name, role, active)
select u.id, 'Muneeb', 'barista', true
from auth.users u
where u.email = 'muneeb@rawsmith.local'
on conflict (id) do update
  set display_name = excluded.display_name,
      role         = excluded.role,
      active       = excluded.active;

-- Safety check — fail loudly if a user is missing.
do $$
declare
  missing text;
begin
  select string_agg(name, ', ') into missing
  from (
    select 'Manager' as name where not exists (select 1 from profiles where display_name = 'Manager')
    union all
    select 'Obida'  where not exists (select 1 from profiles where display_name = 'Obida')
    union all
    select 'Ahmad'  where not exists (select 1 from profiles where display_name = 'Ahmad')
    union all
    select 'Samaher' where not exists (select 1 from profiles where display_name = 'Samaher')
    union all
    select 'Muneeb' where not exists (select 1 from profiles where display_name = 'Muneeb')
  ) m;

  if missing is not null then
    raise exception 'Missing profile rows: %. Create these auth.users first in Supabase Dashboard.', missing;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- sample week of shifts (Mon 2026-05-18 → Sun 2026-05-24)
-- ---------------------------------------------------------------------
-- Wipe and re-insert so this is idempotent.

delete from shifts where shift_date between '2026-05-18' and '2026-05-24';

-- Standard pattern for Mon/Tue/Wed/Sat
with std_days(d) as (values
  ('2026-05-18'::date), ('2026-05-19'::date), ('2026-05-20'::date), ('2026-05-23'::date)
)
insert into shifts (staff_id, shift_date, start_time, end_time, role, is_off)
select p.id, d.d, t.start_time, t.end_time, t.role, false
from std_days d
cross join lateral (values
  ('Obida'::text,   '06:00'::time, '14:30'::time, 'artist'::text),
  ('Muneeb',        '06:00',       '14:30',       'assistant'),
  ('Ahmad',         '14:30',       '22:00',       'artist'),
  ('Samaher',       '13:30',       '22:00',       'assistant')
) as t(display_name, start_time, end_time, role)
join profiles p on p.display_name = t.display_name;

-- Thursday 2026-05-21 — Obida OFF
insert into shifts (staff_id, shift_date, start_time, end_time, role, is_off)
select p.id, '2026-05-21'::date, t.start_time, t.end_time, t.role, t.is_off
from (values
  ('Obida'::text,   null::time,    null::time,    'artist'::text,   true),
  ('Muneeb',        '06:00'::time, '14:30'::time, 'assistant',      false),
  ('Ahmad',         '14:30',       '22:00',       'artist',         false),
  ('Samaher',       '13:30',       '22:00',       'assistant',      false)
) as t(display_name, start_time, end_time, role, is_off)
join profiles p on p.display_name = t.display_name;

-- Friday 2026-05-22 — Ahmad OFF; Obida moves to evening, Samaher fills morning
insert into shifts (staff_id, shift_date, start_time, end_time, role, is_off)
select p.id, '2026-05-22'::date, t.start_time, t.end_time, t.role, t.is_off
from (values
  ('Ahmad'::text,   null::time,    null::time,    'artist'::text,   true),
  ('Samaher',       '06:00'::time, '14:30'::time, 'assistant',      false),
  ('Obida',         '13:30',       '22:00',       'artist',         false),
  ('Muneeb',        '06:00',       '14:30',       'assistant',      false)
) as t(display_name, start_time, end_time, role, is_off)
join profiles p on p.display_name = t.display_name;

-- Sunday 2026-05-24 — Samaher free-time pattern
insert into shifts (staff_id, shift_date, start_time, end_time, role, is_off, notes)
select p.id, '2026-05-24'::date, t.start_time, t.end_time, t.role, false, t.notes
from (values
  ('Obida'::text,   '06:00'::time, '14:30'::time, 'artist'::text,    null::text),
  ('Muneeb',        '06:00',       '14:30',       'assistant',       null),
  ('Ahmad',         '14:30',       '22:00',       'artist',          null),
  ('Samaher',       '05:50',       null::time,    'free',            'Free-time pattern starting Sun (no fixed end)')
) as t(display_name, start_time, end_time, role, notes)
join profiles p on p.display_name = t.display_name;

-- Sanity summary
select
  (select count(*) from profiles)                              as profiles,
  (select count(*) from shifts
    where shift_date between '2026-05-18' and '2026-05-24')    as shifts_this_week,
  (select count(*) from inventory_items where active)          as inventory_items,
  (select count(*) from checklist_templates where active)      as checklist_templates;
