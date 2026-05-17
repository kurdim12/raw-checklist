/**
 * Seed one sample week of shifts using the Excel sheet's pattern.
 * Resolves staff_id by looking up profiles by display_name, so it
 * must run AFTER `npm run seed:users`.
 *
 *   $ npm run seed:shifts
 *
 * Wipes any existing shift rows in the sample week before inserting,
 * so re-running is safe.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const sb: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Sample week — Mon 2026-05-18 → Sun 2026-05-24.
const WEEK = [
  '2026-05-18', // Mon
  '2026-05-19', // Tue
  '2026-05-20', // Wed
  '2026-05-21', // Thu — Obida OFF
  '2026-05-22', // Fri — Ahmad OFF
  '2026-05-23', // Sat
  '2026-05-24', // Sun — Samaher free-time starts
];

type ShiftSeed = {
  display_name: 'Ahmad' | 'Samaher' | 'Obida' | 'Muneeb';
  shift_date: string;
  start_time: string | null;
  end_time: string | null;
  role: 'artist' | 'assistant' | 'free';
  is_off: boolean;
  notes?: string | null;
};

const seed: ShiftSeed[] = [];
const STD_MORNING = { start: '06:00', end: '14:30' };
const STD_EVENING_ARTIST = { start: '14:30', end: '22:00' };
const STD_EVENING_ASSISTANT = { start: '13:30', end: '22:00' };

// Mon-Wed + Sat → the standard pattern
for (const d of [WEEK[0], WEEK[1], WEEK[2], WEEK[5]]) {
  seed.push({ display_name: 'Obida',   shift_date: d, start_time: STD_MORNING.start, end_time: STD_MORNING.end, role: 'artist',    is_off: false });
  seed.push({ display_name: 'Muneeb',  shift_date: d, start_time: STD_MORNING.start, end_time: STD_MORNING.end, role: 'assistant', is_off: false });
  seed.push({ display_name: 'Ahmad',   shift_date: d, start_time: STD_EVENING_ARTIST.start, end_time: STD_EVENING_ARTIST.end, role: 'artist',    is_off: false });
  seed.push({ display_name: 'Samaher', shift_date: d, start_time: STD_EVENING_ASSISTANT.start, end_time: STD_EVENING_ASSISTANT.end, role: 'assistant', is_off: false });
}

// Thursday → Obida OFF, Muneeb solos the morning, evening as usual.
seed.push({ display_name: 'Obida',   shift_date: WEEK[3], start_time: null, end_time: null, role: 'artist',    is_off: true });
seed.push({ display_name: 'Muneeb',  shift_date: WEEK[3], start_time: STD_MORNING.start, end_time: STD_MORNING.end, role: 'assistant', is_off: false });
seed.push({ display_name: 'Ahmad',   shift_date: WEEK[3], start_time: STD_EVENING_ARTIST.start, end_time: STD_EVENING_ARTIST.end, role: 'artist',    is_off: false });
seed.push({ display_name: 'Samaher', shift_date: WEEK[3], start_time: STD_EVENING_ASSISTANT.start, end_time: STD_EVENING_ASSISTANT.end, role: 'assistant', is_off: false });

// Friday → Ahmad OFF; Obida moves to evening, Samaher fills morning.
seed.push({ display_name: 'Ahmad',   shift_date: WEEK[4], start_time: null, end_time: null, role: 'artist',    is_off: true });
seed.push({ display_name: 'Samaher', shift_date: WEEK[4], start_time: STD_MORNING.start, end_time: STD_MORNING.end, role: 'assistant', is_off: false });
seed.push({ display_name: 'Obida',   shift_date: WEEK[4], start_time: STD_EVENING_ASSISTANT.start, end_time: STD_EVENING_ASSISTANT.end, role: 'artist', is_off: false });
seed.push({ display_name: 'Muneeb',  shift_date: WEEK[4], start_time: STD_MORNING.start, end_time: STD_MORNING.end, role: 'assistant', is_off: false });

// Sunday → standard morning + Samaher 05:50 "free-time" pattern.
seed.push({ display_name: 'Obida',   shift_date: WEEK[6], start_time: STD_MORNING.start, end_time: STD_MORNING.end, role: 'artist',    is_off: false });
seed.push({ display_name: 'Muneeb',  shift_date: WEEK[6], start_time: STD_MORNING.start, end_time: STD_MORNING.end, role: 'assistant', is_off: false });
seed.push({ display_name: 'Ahmad',   shift_date: WEEK[6], start_time: STD_EVENING_ARTIST.start, end_time: STD_EVENING_ARTIST.end, role: 'artist',    is_off: false });
seed.push({ display_name: 'Samaher', shift_date: WEEK[6], start_time: '05:50',          end_time: null,             role: 'free',      is_off: false, notes: 'Free-time pattern starting Sun (no fixed end)' });

async function main() {
  const { data: profiles, error } = await sb.from('profiles').select('id, display_name');
  if (error) throw error;
  if (!profiles?.length) {
    console.error('No profiles found. Run `npm run seed:users` first.');
    process.exit(1);
  }
  const byName = new Map(profiles.map((p) => [p.display_name, p.id as string]));

  const rows = seed.map((s) => {
    const id = byName.get(s.display_name);
    if (!id) throw new Error(`No profile for ${s.display_name}. Run npm run seed:users first.`);
    return {
      staff_id: id,
      shift_date: s.shift_date,
      start_time: s.start_time,
      end_time: s.end_time,
      role: s.role,
      is_off: s.is_off,
      notes: s.notes ?? null,
    };
  });

  const { error: delErr } = await sb.from('shifts').delete().in('shift_date', WEEK);
  if (delErr) throw delErr;

  const { error: insErr } = await sb.from('shifts').insert(rows);
  if (insErr) throw insErr;

  process.stdout.write(`Inserted ${rows.length} shifts across ${WEEK[0]} → ${WEEK[6]}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
