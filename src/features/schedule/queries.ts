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

export interface TodayAssignment {
  opening: boolean;
  closing: boolean;
  isOff: boolean;
  hasAnyShift: boolean;
}

/**
 * Today's shift assignment for the signed-in user. Opening = start_time
 * before 14:00 Amman, closing = 14:00 or later. Lets Home show only the
 * relevant checklist instead of both.
 */
export function useTodayShiftAssignment(staffId: string | undefined) {
  return useQuery({
    queryKey: ['todayAssignment', staffId],
    enabled: !!staffId,
    queryFn: async (): Promise<TodayAssignment> => {
      const today = todayAmman();
      const { data, error } = await supabase
        .from('shifts')
        .select('start_time, is_off')
        .eq('staff_id', staffId!)
        .eq('shift_date', today);
      if (error) throw error;

      const rows = (data ?? []) as { start_time: string | null; is_off: boolean }[];
      const working = rows.filter((r) => !r.is_off);

      const opening = working.some((r) => r.start_time !== null && r.start_time < '14:00:00');
      const closing = working.some((r) => r.start_time !== null && r.start_time >= '14:00:00');

      return {
        opening,
        closing,
        isOff: rows.length > 0 && working.length === 0,
        hasAnyShift: working.length > 0,
      };
    },
    staleTime: 60_000,
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
      const endIso = addDays(weekStartIso, 6);
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
