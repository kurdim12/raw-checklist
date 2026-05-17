// Supabase Edge Function — admin-users
//
// Manager-only operations that require the service-role key:
//   * invite          — create auth user + profile row in one call
//   * reset_password  — set a new password for an existing user
//
// The caller's JWT is read from the Authorization header; we look up
// their profile to confirm role='manager' and active=true before doing
// anything privileged.

import { createClient } from 'npm:@supabase/supabase-js@2';

type InviteBody = {
  action: 'invite';
  email: string;
  display_name: string;
  role: 'manager' | 'barista';
  password: string;
};

type ResetBody = {
  action: 'reset_password';
  user_id: string;
  password: string;
};

type Body = InviteBody | ResetBody;

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...cors },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!url || !serviceKey || !anonKey) {
      return json({ error: 'missing supabase env' }, 500);
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader) return json({ error: 'missing authorization' }, 401);

    const sbCaller = createClient(url, anonKey, {
      global: { headers: { authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await sbCaller.auth.getUser();
    if (userErr || !userRes.user) return json({ error: 'invalid auth' }, 401);

    const sbAdmin = createClient(url, serviceKey);
    const { data: profile, error: profileErr } = await sbAdmin
      .from('profiles')
      .select('role, active')
      .eq('id', userRes.user.id)
      .maybeSingle();
    if (profileErr) return json({ error: profileErr.message }, 500);
    if (!profile || profile.role !== 'manager' || !profile.active) {
      return json({ error: 'manager role required' }, 403);
    }

    const body = (await req.json()) as Body;

    if (body.action === 'invite') {
      const { email, display_name, role, password } = body;
      if (!email || !display_name || !password) {
        return json({ error: 'email, display_name and password are required' }, 400);
      }
      if (role !== 'manager' && role !== 'barista') {
        return json({ error: 'role must be manager or barista' }, 400);
      }
      if (password.length < 6) {
        return json({ error: 'password must be at least 6 characters' }, 400);
      }

      const { data: created, error: createErr } = await sbAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createErr || !created.user) {
        return json({ error: createErr?.message ?? 'failed to create user' }, 400);
      }

      const { error: profInsErr } = await sbAdmin.from('profiles').insert({
        id: created.user.id,
        display_name,
        role,
        active: true,
      });
      if (profInsErr) {
        await sbAdmin.auth.admin.deleteUser(created.user.id);
        return json({ error: profInsErr.message }, 400);
      }

      return json({ ok: true, user_id: created.user.id });
    }

    if (body.action === 'reset_password') {
      const { user_id, password } = body;
      if (!user_id || !password) {
        return json({ error: 'user_id and password are required' }, 400);
      }
      if (password.length < 6) {
        return json({ error: 'password must be at least 6 characters' }, 400);
      }

      const { error: updErr } = await sbAdmin.auth.admin.updateUserById(user_id, { password });
      if (updErr) return json({ error: updErr.message }, 400);
      return json({ ok: true });
    }

    return json({ error: 'unknown action' }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
