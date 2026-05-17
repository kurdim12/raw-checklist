import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
}

// NOTE: We intentionally don't pass a Database generic here — the
// hand-rolled types in @/types/database.ts are good enough as response
// type assertions but don't satisfy supabase-js's strict GenericSchema
// shape. Replace with `supabase gen types typescript --project-id <ref>`
// output to get full inference back.
export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 5 },
  },
});
