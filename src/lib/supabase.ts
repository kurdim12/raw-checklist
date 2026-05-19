import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
}

// iOS Safari's navigator.locks implementation can deadlock when a stale
// lock entry survives in localStorage (e.g. from a previous tab that
// crashed mid-refresh). When that happens, supabase-js's auth.getSession()
// never resolves and the app hangs on the auth-loading skeleton forever.
// This is a single-tab PWA, so we don't need cross-tab lock coordination
// — replace the default lock with a passthrough that just runs the fn.
async function noLock<R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  return fn();
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
    lock: noLock,
  },
  realtime: {
    params: { eventsPerSecond: 5 },
  },
});
