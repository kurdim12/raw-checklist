-- =====================================================================
-- Raw Smith Ops — initial schema
-- =====================================================================
-- Tables, RLS policies, RPC functions, triggers.
-- All timestamps are timestamptz. All "today" decisions happen in
-- Asia/Amman via the today_amman() helper.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------

create or replace function today_amman() returns date
language sql stable as $$
  select (now() at time zone 'Asia/Amman')::date;
$$;

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- is_manager() is defined AFTER the profiles table — see below.

-- ---------------------------------------------------------------------
-- profiles (extends auth.users)
-- ---------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('manager','barista')),
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create unique index profiles_display_name_lower on profiles (lower(display_name));

-- is_manager() must be defined AFTER profiles because language sql
-- function bodies are validated at create time.
create or replace function is_manager(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = p_user and role = 'manager' and active
  );
$$;

-- ---------------------------------------------------------------------
-- checklist templates and runs
-- ---------------------------------------------------------------------

create table checklist_templates (
  id uuid primary key default gen_random_uuid(),
  shift text not null check (shift in ('opening','closing')),
  section text not null,
  code text not null,
  title text not null,
  title_ar text not null,
  instructions text,
  instructions_ar text,
  order_index int not null default 0,
  frequency text not null default 'every_shift'
    check (frequency in ('every_shift','mon_thu_fri','weekly')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger checklist_templates_updated_at
  before update on checklist_templates
  for each row execute function set_updated_at();

create index checklist_templates_shift_section_order
  on checklist_templates (shift, section, order_index);

create table checklist_runs (
  id uuid primary key default gen_random_uuid(),
  shift_date date not null,
  shift text not null check (shift in ('opening','closing')),
  opened_by uuid references profiles(id),
  closed_by uuid references profiles(id),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shift_date, shift)
);

create trigger checklist_runs_updated_at
  before update on checklist_runs
  for each row execute function set_updated_at();

create index checklist_runs_date on checklist_runs (shift_date desc);

create table checklist_run_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references checklist_runs(id) on delete cascade,
  template_id uuid not null references checklist_templates(id),
  done boolean not null default false,
  done_by uuid references profiles(id),
  done_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, template_id)
);

create trigger checklist_run_items_updated_at
  before update on checklist_run_items
  for each row execute function set_updated_at();

create index checklist_run_items_run on checklist_run_items (run_id);

-- ---------------------------------------------------------------------
-- inventory
-- ---------------------------------------------------------------------

create table inventory_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  name_ar text not null,
  icon text,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger inventory_categories_updated_at
  before update on inventory_categories
  for each row execute function set_updated_at();

create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references inventory_categories(id),
  name text not null,
  name_ar text not null,
  unit text not null,
  quantity numeric,
  min_level numeric not null default 0,
  par_level numeric not null default 0,
  supplier text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger inventory_items_updated_at
  before update on inventory_items
  for each row execute function set_updated_at();

create unique index inventory_items_name_lower on inventory_items (lower(name));
create index inventory_items_category on inventory_items (category_id);

create table inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references inventory_items(id) on delete cascade,
  delta numeric not null,
  reason text not null check (reason in ('restock','daily_use','waste','correction','order_received')),
  note text,
  by_user uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index inventory_movements_item_created on inventory_movements (item_id, created_at desc);

-- ---------------------------------------------------------------------
-- schedule
-- ---------------------------------------------------------------------

create table shifts (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references profiles(id),
  shift_date date not null,
  start_time time,
  end_time time,
  role text not null default 'artist' check (role in ('artist','assistant','free')),
  is_off boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_id, shift_date, start_time)
);

create trigger shifts_updated_at
  before update on shifts
  for each row execute function set_updated_at();

create index shifts_date on shifts (shift_date);
create index shifts_staff_date on shifts (staff_id, shift_date);

-- ---------------------------------------------------------------------
-- stock orders
-- ---------------------------------------------------------------------

create table stock_orders (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'draft'
    check (status in ('draft','sent','received','cancelled')),
  created_by uuid references profiles(id),
  sent_at timestamptz,
  received_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger stock_orders_updated_at
  before update on stock_orders
  for each row execute function set_updated_at();

create table stock_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references stock_orders(id) on delete cascade,
  item_id uuid not null references inventory_items(id),
  quantity_ordered numeric not null,
  quantity_received numeric,
  notes text,
  created_at timestamptz not null default now()
);

create index stock_order_items_order on stock_order_items (order_id);

-- ---------------------------------------------------------------------
-- low-stock alerts (insert here, then a Supabase DB webhook hits the
-- low-stock-alert Edge Function which calls the WhatsApp endpoint).
-- 12-hour debounce enforced before insert.
-- ---------------------------------------------------------------------

create table low_stock_alerts (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references inventory_items(id) on delete cascade,
  quantity_at_alert numeric not null,
  min_level_at_alert numeric not null,
  sent_at timestamptz,
  webhook_response text,
  created_at timestamptz not null default now()
);

create index low_stock_alerts_item_created on low_stock_alerts (item_id, created_at desc);

-- ---------------------------------------------------------------------
-- settings (for the /admin Settings tab)
-- ---------------------------------------------------------------------

create table settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger settings_updated_at
  before update on settings
  for each row execute function set_updated_at();

insert into settings (key, value) values
  ('cafe_open_hours', '{"open":"06:00","close":"22:00"}'::jsonb),
  ('low_stock_debounce_hours', '12'::jsonb),
  ('whatsapp_webhook_url', '""'::jsonb);

-- =====================================================================
-- RPCs
-- =====================================================================

-- Apply an inventory movement: insert audit row + adjust quantity in one
-- transaction. Never UPDATE inventory_items.quantity directly anywhere
-- else in the app.
create or replace function apply_inventory_movement(
  p_item_id uuid,
  p_delta numeric,
  p_reason text,
  p_note text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_movement_id uuid;
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;

  update inventory_items
  set quantity = coalesce(quantity, 0) + p_delta
  where id = p_item_id and active;

  if not found then
    raise exception 'inventory item % not found or inactive', p_item_id;
  end if;

  insert into inventory_movements (item_id, delta, reason, note, by_user)
  values (p_item_id, p_delta, p_reason, p_note, v_user)
  returning id into v_movement_id;

  return v_movement_id;
end;
$$;

grant execute on function apply_inventory_movement(uuid, numeric, text, text) to authenticated;

-- Open (or get existing) today's run for a given shift. Idempotent.
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

  select id into v_run_id
  from checklist_runs
  where shift_date = v_date and shift = p_shift;

  if v_run_id is null then
    insert into checklist_runs (shift_date, shift, opened_by, opened_at)
    values (v_date, p_shift, v_user, now())
    returning id into v_run_id;

    -- seed run items for every active template of this shift,
    -- filtering on weekday for mon_thu_fri items
    insert into checklist_run_items (run_id, template_id)
    select v_run_id, t.id
    from checklist_templates t
    where t.shift = p_shift
      and t.active
      and (
        t.frequency = 'every_shift'
        or (
          t.frequency = 'mon_thu_fri'
          and extract(isodow from v_date) in (1, 4, 5) -- Mon, Thu, Fri
        )
        or t.frequency = 'weekly'
      );
  end if;

  return v_run_id;
end;
$$;

grant execute on function open_checklist_run(text) to authenticated;

-- Toggle a single run item. Enforces that the caller is authenticated.
create or replace function set_run_item_done(
  p_run_item_id uuid,
  p_done boolean,
  p_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'authentication required';
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

-- Close a checklist run. Enforces the rule:
-- "A shift can only be 'completed' by the user whose schedule includes
--  that shift today" (managers always allowed).
create or replace function close_checklist_run(
  p_run_id uuid,
  p_notes text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_run record;
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;

  select * into v_run from checklist_runs where id = p_run_id;
  if not found then
    raise exception 'run not found';
  end if;

  if not is_manager(v_user)
     and not exists (
       select 1 from shifts
       where staff_id = v_user
         and shift_date = v_run.shift_date
         and not is_off
     ) then
    raise exception 'user % is not scheduled on %', v_user, v_run.shift_date;
  end if;

  update checklist_runs
  set closed_at = now(),
      closed_by = v_user,
      notes = coalesce(p_notes, notes)
  where id = p_run_id;
end;
$$;

grant execute on function close_checklist_run(uuid, text) to authenticated;

-- Create a draft stock order from currently-low items (manager only).
create or replace function create_order_from_low_stock()
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_order_id uuid;
  v_count int;
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;
  if not is_manager(v_user) then
    raise exception 'manager role required';
  end if;

  insert into stock_orders (status, created_by)
  values ('draft', v_user)
  returning id into v_order_id;

  insert into stock_order_items (order_id, item_id, quantity_ordered)
  select v_order_id,
         i.id,
         greatest(coalesce(i.par_level,0) - coalesce(i.quantity,0), 0)
  from inventory_items i
  where i.active
    and coalesce(i.quantity, 0) <= coalesce(i.min_level, 0);

  get diagnostics v_count = row_count;
  if v_count = 0 then
    delete from stock_orders where id = v_order_id;
    raise exception 'no low-stock items to order';
  end if;

  return v_order_id;
end;
$$;

grant execute on function create_order_from_low_stock() to authenticated;

-- Mark an order received: bump inventory + log movements.
create or replace function receive_stock_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  rec record;
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;
  if not is_manager(v_user) then
    raise exception 'manager role required';
  end if;

  for rec in
    select item_id, coalesce(quantity_received, quantity_ordered) as qty
    from stock_order_items
    where order_id = p_order_id
  loop
    update inventory_items
    set quantity = coalesce(quantity, 0) + rec.qty
    where id = rec.item_id;

    insert into inventory_movements (item_id, delta, reason, note, by_user)
    values (rec.item_id, rec.qty, 'order_received',
            'auto from stock order ' || p_order_id::text, v_user);
  end loop;

  update stock_orders
  set status = 'received', received_at = now()
  where id = p_order_id;
end;
$$;

grant execute on function receive_stock_order(uuid) to authenticated;

-- =====================================================================
-- Low-stock alert trigger
-- =====================================================================
-- After a movement, if quantity dropped to or below min_level AND there
-- was no alert for this item in the last debounce window, insert a row
-- in low_stock_alerts. A Supabase DB webhook on this table fires the
-- low-stock-alert Edge Function.

create or replace function fn_check_low_stock() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_item inventory_items%rowtype;
  v_debounce_hours int;
begin
  select * into v_item from inventory_items where id = new.item_id;
  if not found or v_item.min_level is null then
    return new;
  end if;

  if coalesce(v_item.quantity, 0) > coalesce(v_item.min_level, 0) then
    return new;
  end if;

  select coalesce((value)::int, 12) into v_debounce_hours
  from settings where key = 'low_stock_debounce_hours';

  if exists (
    select 1 from low_stock_alerts
    where item_id = new.item_id
      and created_at > now() - make_interval(hours => v_debounce_hours)
  ) then
    return new;
  end if;

  insert into low_stock_alerts (item_id, quantity_at_alert, min_level_at_alert)
  values (v_item.id, coalesce(v_item.quantity, 0), v_item.min_level);

  return new;
end;
$$;

create trigger trg_check_low_stock
  after insert on inventory_movements
  for each row execute function fn_check_low_stock();

-- =====================================================================
-- RLS
-- =====================================================================

alter table profiles              enable row level security;
alter table checklist_templates   enable row level security;
alter table checklist_runs        enable row level security;
alter table checklist_run_items   enable row level security;
alter table inventory_categories  enable row level security;
alter table inventory_items       enable row level security;
alter table inventory_movements   enable row level security;
alter table shifts                enable row level security;
alter table stock_orders          enable row level security;
alter table stock_order_items     enable row level security;
alter table low_stock_alerts      enable row level security;
alter table settings              enable row level security;

-- profiles
create policy "profiles_read_all" on profiles
  for select using (auth.role() = 'authenticated');
create policy "profiles_update_self" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_manager_write" on profiles
  for all using (is_manager(auth.uid())) with check (is_manager(auth.uid()));

-- checklist_templates: read all, write manager only
create policy "tmpl_read_all" on checklist_templates
  for select using (auth.role() = 'authenticated');
create policy "tmpl_manager_write" on checklist_templates
  for all using (is_manager(auth.uid())) with check (is_manager(auth.uid()));

-- checklist_runs: read all authenticated, insert authenticated, update authenticated
create policy "runs_read_all" on checklist_runs
  for select using (auth.role() = 'authenticated');
create policy "runs_insert_auth" on checklist_runs
  for insert with check (auth.role() = 'authenticated');
create policy "runs_update_auth" on checklist_runs
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- checklist_run_items: any authenticated user can read/insert/update
create policy "items_read_all" on checklist_run_items
  for select using (auth.role() = 'authenticated');
create policy "items_write_auth" on checklist_run_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- inventory_categories
create policy "cat_read_all" on inventory_categories
  for select using (auth.role() = 'authenticated');
create policy "cat_manager_write" on inventory_categories
  for all using (is_manager(auth.uid())) with check (is_manager(auth.uid()));

-- inventory_items
create policy "inv_read_all" on inventory_items
  for select using (auth.role() = 'authenticated');
create policy "inv_manager_write" on inventory_items
  for all using (is_manager(auth.uid())) with check (is_manager(auth.uid()));

-- inventory_movements (immutable audit log; quantity changes go through RPC)
create policy "mov_read_all" on inventory_movements
  for select using (auth.role() = 'authenticated');
-- Inserts are blocked via RLS — clients MUST call apply_inventory_movement().
-- SECURITY DEFINER on the RPC bypasses this.

-- shifts
create policy "shifts_read_all" on shifts
  for select using (auth.role() = 'authenticated');
create policy "shifts_manager_write" on shifts
  for all using (is_manager(auth.uid())) with check (is_manager(auth.uid()));

-- stock_orders
create policy "orders_read_all" on stock_orders
  for select using (auth.role() = 'authenticated');
create policy "orders_manager_write" on stock_orders
  for all using (is_manager(auth.uid())) with check (is_manager(auth.uid()));

create policy "order_items_read_all" on stock_order_items
  for select using (auth.role() = 'authenticated');
create policy "order_items_manager_write" on stock_order_items
  for all using (is_manager(auth.uid())) with check (is_manager(auth.uid()));

-- low_stock_alerts: managers read; inserts via trigger only
create policy "alerts_read_manager" on low_stock_alerts
  for select using (is_manager(auth.uid()));

-- settings
create policy "settings_read_all" on settings
  for select using (auth.role() = 'authenticated');
create policy "settings_manager_write" on settings
  for all using (is_manager(auth.uid())) with check (is_manager(auth.uid()));

-- =====================================================================
-- Realtime
-- =====================================================================

alter publication supabase_realtime add table checklist_run_items;
alter publication supabase_realtime add table checklist_runs;
alter publication supabase_realtime add table inventory_items;
alter publication supabase_realtime add table low_stock_alerts;
