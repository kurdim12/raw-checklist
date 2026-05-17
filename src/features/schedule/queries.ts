import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { todayAmman } from '@/lib/date';
import type { Shift } from '@/types/database';

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
