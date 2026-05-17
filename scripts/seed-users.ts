/**
 * Seed the 5 staff accounts (4 baristas + 1 manager) into Supabase Auth
 * and create matching rows in public.profiles.
 *
 * Idempotent: re-running this script is safe — existing users are
 * detected and their profile row is upserted with the latest role/name.
 *
 * Requires .env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 *   $ npm run seed:users
 *
 * IMPORTANT: never commit SUPABASE_SERVICE_ROLE_KEY anywhere. It is the
 * god-mode key and bypasses all RLS.
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

type Seed = {
  email: string;
  password: string;
  display_name: string;
  role: 'manager' | 'barista';
};

// NOTE: passwords match the brief. Owner is instructed via README to
// rotate them on first login via /admin → Staff → Reset password.
const USERS: Seed[] = [
  { display_name: 'Obida',   email: 'obida@rawsmith.local',   password: 'Obida@Raw2026',    role: 'barista' },
  { display_name: 'Ahmad',   email: 'ahmad@rawsmith.local',   password: 'Ahmad@Raw2026',    role: 'barista' },
  { display_name: 'Samaher', email: 'samaher@rawsmith.local', password: 'Samaher@Raw2026',  role: 'barista' },
  { display_name: 'Muneeb',  email: 'muneeb@rawsmith.local',  password: 'Muneeb@Raw2026',   role: 'barista' },
  { display_name: 'Manager', email: 'manager@rawsmith.local', password: 'Manager@Raw2026!', role: 'manager' },
];

async function findUserByEmail(email: string): Promise<string | null> {
  // For >200 users this would need pagination; fine for our 5.
  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return found?.id ?? null;
}

async function ensureUser(seed: Seed): Promise<string> {
  const { data, error } = await sb.auth.admin.createUser({
    email: seed.email,
    password: seed.password,
    email_confirm: true,
    user_metadata: { display_name: seed.display_name },
  });

  let userId: string;
  if (error) {
    const msg = error.message?.toLowerCase() ?? '';
    const code = (error as { code?: string }).code;
    const isExisting =
      code === 'email_exists' ||
      msg.includes('already been registered') ||
      msg.includes('already registered') ||
      msg.includes('user already exists');
    if (!isExisting) throw error;

    const existing = await findUserByEmail(seed.email);
    if (!existing) throw new Error(`User ${seed.email} reported as existing but not found via listUsers`);
    userId = existing;
    process.stdout.write(`  exists  ${seed.email}\n`);
  } else if (data.user) {
    userId = data.user.id;
    process.stdout.write(`  created ${seed.email}\n`);
  } else {
    throw new Error(`createUser returned no user and no error for ${seed.email}`);
  }

  const { error: profErr } = await sb.from('profiles').upsert(
    {
      id: userId,
      display_name: seed.display_name,
      role: seed.role,
      active: true,
    },
    { onConflict: 'id' }
  );
  if (profErr) throw profErr;
  return userId;
}

async function main() {
  process.stdout.write(`Seeding ${USERS.length} staff accounts into ${SUPABASE_URL}\n`);
  for (const u of USERS) {
    await ensureUser(u);
  }
  process.stdout.write('Done. Next: npm run seed:shifts\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
