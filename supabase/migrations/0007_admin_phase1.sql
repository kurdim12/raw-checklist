-- =====================================================================
-- 0007 — Admin phase 1
-- =====================================================================
-- New surface for the manager admin console. Adds infrastructure only;
-- no destructive changes to existing tables.
--
-- Tables
--   * app_settings           — runtime config (WhatsApp recipients, hours)
--   * audit_log              — append-only trail of admin actions
--   * announcements          — manager broadcasts to staff
--   * announcement_reads     — per-user read receipts
--
-- New columns
--   * inventory_items.cost_per_unit, last_counted_at, last_counted_by
--   * checklist_runs.flagged, manager_review_note
--
-- RPCs
--   * log_audit(...)                          — internal helper
--   * admin_bulk_update_inventory(jsonb)      — stock-count save
--   * admin_force_complete_shift(uuid, text)  — manager unstucks a run
--   * mark_announcement_read(uuid)            — barista read receipt
-- =====================================================================

-- 1) app_settings ------------------------------------------------------
create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

alter table app_settings enable row level security;

drop policy if exists "settings_read_auth" on app_settings;
create policy "settings_read_auth" on app_settings
  for select using (auth.role() = 'authenticated');

drop policy if exists "settings_write_manager" on app_settings;
create policy "settings_write_manager" on app_settings
  for all
  using (is_manager(auth.uid()))
  with check (is_manager(auth.uid()));

drop trigger if exists trg_app_settings_updated_at on app_settings;
create trigger trg_app_settings_updated_at
  before update on app_settings
  for each row execute procedure set_updated_at();

insert into app_settings (key, value) values
  ('cafe_open_time',              '"06:00"'::jsonb),
  ('cafe_close_time',             '"22:00"'::jsonb),
  ('low_stock_debounce_hours',    '12'::jsonb),
  ('whatsapp_alert_enabled',      'true'::jsonb),
  ('whatsapp_alert_recipients',   '[]'::jsonb),
  ('require_note_on_uncheck',     'true'::jsonb),
  ('allow_barista_inventory_edit','false'::jsonb)
on conflict (key) do nothing;

-- 2) audit_log ---------------------------------------------------------
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  before jsonb,
  after jsonb,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_idx on audit_log(created_at desc);
create index if not exists audit_log_actor_idx on audit_log(actor_id, created_at desc);

alter table audit_log enable row level security;

-- Manager-only SELECT. No INSERT / UPDATE / DELETE policy — append-only,
-- writes go through SECURITY DEFINER helpers.
drop policy if exists "audit_read_manager" on audit_log;
create policy "audit_read_manager" on audit_log
  for select using (is_manager(auth.uid()));

-- 3) log_audit helper --------------------------------------------------
-- SECURITY DEFINER lets it INSERT into audit_log even though no INSERT
-- policy exists. Callers are themselves SECURITY DEFINER, so this is
-- only invoked from inside other RPCs. We don't grant it to anon.
create or replace function log_audit(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_before jsonb,
  p_after jsonb,
  p_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (actor_id, action, entity_type, entity_id, before, after, note)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_before, p_after, p_note);
end;
$$;
grant execute on function log_audit(text, text, uuid, jsonb, jsonb, text) to authenticated;

-- 4) announcements -----------------------------------------------------
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  body_ar text,
  pinned boolean not null default false,
  published boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists announcements_active_idx
  on announcements(published, pinned, created_at desc);

alter table announcements enable row level security;

drop policy if exists "announcements_read_published" on announcements;
create policy "announcements_read_published" on announcements
  for select using (
    published = true
    and (expires_at is null or expires_at > now())
  );

drop policy if exists "announcements_write_manager" on announcements;
create policy "announcements_write_manager" on announcements
  for all
  using (is_manager(auth.uid()))
  with check (is_manager(auth.uid()));

-- 5) announcement_reads ------------------------------------------------
create table if not exists announcement_reads (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references announcements(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (announcement_id, user_id)
);

alter table announcement_reads enable row level security;

drop policy if exists "ann_reads_self_select" on announcement_reads;
create policy "ann_reads_self_select" on announcement_reads
  for select using (user_id = auth.uid() or is_manager(auth.uid()));

drop policy if exists "ann_reads_self_insert" on announcement_reads;
create policy "ann_reads_self_insert" on announcement_reads
  for insert with check (user_id = auth.uid());

create or replace function mark_announcement_read(p_announcement_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  insert into announcement_reads (announcement_id, user_id)
  values (p_announcement_id, auth.uid())
  on conflict (announcement_id, user_id) do nothing;
end;
$$;
grant execute on function mark_announcement_read(uuid) to authenticated;

-- 6) inventory_items new columns --------------------------------------
alter table inventory_items
  add column if not exists cost_per_unit numeric,
  add column if not exists last_counted_at timestamptz,
  add column if not exists last_counted_by uuid references profiles(id);

-- 7) checklist_runs new columns ---------------------------------------
alter table checklist_runs
  add column if not exists flagged boolean not null default false,
  add column if not exists manager_review_note text;

-- 8) admin_bulk_update_inventory --------------------------------------
-- Atomically updates a batch of items from the stock-count screen. One
-- audit row per item plus a summary 'inventory.stock_count.batch' row.
-- Manager-only, re-checks the role on every call.
create or replace function admin_bulk_update_inventory(p_updates jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_record jsonb;
  v_item_id uuid;
  v_qty numeric;
  v_before_qty numeric;
  v_count int := 0;
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;
  if not is_manager(v_user) then
    raise exception 'manager role required';
  end if;
  if p_updates is null or jsonb_typeof(p_updates) <> 'array' then
    raise exception 'p_updates must be a jsonb array';
  end if;

  for v_record in select * from jsonb_array_elements(p_updates)
  loop
    v_item_id := (v_record->>'item_id')::uuid;
    v_qty := (v_record->>'quantity')::numeric;

    select quantity into v_before_qty
    from inventory_items where id = v_item_id;

    if not found then
      raise exception 'inventory item % not found', v_item_id;
    end if;

    update inventory_items
    set quantity = v_qty,
        last_counted_at = now(),
        last_counted_by = v_user
    where id = v_item_id;

    perform log_audit(
      'inventory.stock_count',
      'inventory_item',
      v_item_id,
      jsonb_build_object('quantity', v_before_qty),
      jsonb_build_object('quantity', v_qty),
      null
    );

    v_count := v_count + 1;
  end loop;

  perform log_audit(
    'inventory.stock_count.batch',
    'inventory_items',
    null,
    null,
    jsonb_build_object('item_count', v_count),
    'manual stock count'
  );
end;
$$;
grant execute on function admin_bulk_update_inventory(jsonb) to authenticated;

-- 9) admin_force_complete_shift ---------------------------------------
create or replace function admin_force_complete_shift(p_run_id uuid, p_note text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_before jsonb;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if not is_manager(v_user) then raise exception 'manager role required'; end if;

  select to_jsonb(r) into v_before from checklist_runs r where id = p_run_id;
  if v_before is null then
    raise exception 'checklist run % not found', p_run_id;
  end if;

  update checklist_runs
  set closed_by = v_user,
      closed_at = coalesce(closed_at, now()),
      flagged = true,
      manager_review_note = p_note
  where id = p_run_id;

  perform log_audit(
    'shift.force_complete',
    'checklist_run',
    p_run_id,
    v_before,
    (select to_jsonb(r) from checklist_runs r where id = p_run_id),
    p_note
  );
end;
$$;
grant execute on function admin_force_complete_shift(uuid, text) to authenticated;
