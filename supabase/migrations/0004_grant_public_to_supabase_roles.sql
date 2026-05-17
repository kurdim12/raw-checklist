-- =====================================================================
-- Restore standard Supabase grants on the public schema.
-- =====================================================================
-- 0001_init.sql was applied as a role whose default privileges didn't
-- flow to anon / authenticated / service_role, so every PostgREST query
-- returned "permission denied for table ...". RLS is still the real
-- gate; these grants just let the API role attempt the query at all.
-- =====================================================================

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables    in schema public to anon, authenticated;
grant all                                    on all tables    in schema public to service_role;
grant usage, select                          on all sequences in schema public to anon, authenticated, service_role;
grant execute                                on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant select, insert, update, delete on tables    to anon, authenticated;
alter default privileges in schema public grant all                            on tables    to service_role;
alter default privileges in schema public grant usage, select                  on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute                        on functions to anon, authenticated, service_role;
