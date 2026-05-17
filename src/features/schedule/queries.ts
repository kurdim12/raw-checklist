import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { todayAmman } from '@/lib/date';
import type { Profile, Shift } from '@/types/database';

export function useMyNextShift(staffId: string | undefined) {
  return useQuery({
    queryKey: ['myNextShift', staffId],
    enabled: !!staffId,
    queryFn: async (): Promise<Shift | null> => {
      const today = todayAmman();
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('staff_id', staffId!)
        .gte('shift_date', today)
        .eq('is_off', false)
        .order('shift_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(1);
      if (error) throw error;
      return ((data ?? [])[0] as Shift | undefined) ?? null;
    },
  });
}

export function useStaff() {
  return useQuery({
    queryKey: ['staff'],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('role', { ascending: false }) // manager last (M > B alphabetically backwards)
        .order('display_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
    staleTime: 60_000,
  });
}

export function useWeekShifts(weekStartIso: string) {
  return useQuery({
    queryKey: ['weekShifts', weekStartIso],
    queryFn: async (): Promise<Shift[]> => {
      const start = new Date(weekStartIso);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const endIso = end.toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .gte('shift_date', weekStartIso)
        .lte('shift_date', endIso)
        .order('shift_date')
        .order('start_time', { nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Shift[];
    },
  });
}

/** Returns the Monday of the ISO week containing `iso` (YYYY-MM-DD). */
export function weekStart(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay() || 7; // Sun=0 -> 7
  if (day !== 1) dt.setUTCDate(dt.getUTCDate() - (day - 1));
  return dt.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}
