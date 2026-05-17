import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface InviteArgs {
  email: string;
  display_name: string;
  role: 'manager' | 'barista';
  password: string;
}

interface ResetArgs {
  user_id: string;
  password: string;
}

async function callAdminUsers(body: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body,
  });
  if (error) {
    const message =
      (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : null) ?? error.message;
    throw new Error(message);
  }
  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
    throw new Error(data.error);
  }
}

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: InviteArgs) => {
      await callAdminUsers({ action: 'invite', ...args });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['allStaff'] });
      qc.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (args: ResetArgs) => {
      await callAdminUsers({ action: 'reset_password', ...args });
    },
  });
}
