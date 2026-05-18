-- =====================================================================
-- 0008 — Consolidate settings into the existing `settings` table
-- =====================================================================
-- 0007 created an app_settings table without realising a `settings`
-- table (with three rows and the right RLS) already existed. Roll the
-- new keys into the existing table and drop the redundant one.
-- =====================================================================

-- Drop the table created in 0007 (no app code reads it yet)
drop table if exists app_settings cascade;

-- Add the new keys to the existing settings table
insert into settings (key, value) values
  ('whatsapp_alert_enabled',       'true'::jsonb),
  ('whatsapp_alert_recipients',    '[]'::jsonb),
  ('require_note_on_uncheck',      'true'::jsonb),
  ('allow_barista_inventory_edit', 'false'::jsonb)
on conflict (key) do nothing;
