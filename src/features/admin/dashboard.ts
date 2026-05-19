import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AdminDashboard {
  date: string;
  low_stock_count: number;
  orders_draft: number;
  orders_sent: number;
  active_notices: number;
  compliance_today: number;
  runs_today: number;
  scheduled_today: number;
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async (): Promise<AdminDashboard> => {
      const { data, error } = await supabase.rpc('get_admin_dashboard');
      if (error) throw error;
      return data as AdminDashboard;
    },
    staleTime: 30_000,
  });
}
