import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

export interface SettingRow {
  key: string;
  value: unknown;
  updated_at: string;
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async (): Promise<SettingRow[]> => {
      const { data, error } = await supabase.from('settings').select('*').order('key');
      if (error) throw error;
      return (data ?? []) as SettingRow[];
    },
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { key: string; value: unknown }) => {
      const { error } = await supabase
        .from('settings')
        .update({ value: args.value })
        .eq('key', args.key);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useToggleStaffActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ active: args.active })
        .eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      qc.invalidateQueries({ queryKey: ['allStaff'] });
    },
  });
}

export function useAllStaff() {
  return useQuery({
    queryKey: ['allStaff'],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('active', { ascending: false })
        .order('display_name');
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });
}
