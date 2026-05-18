import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ComplianceRun {
  run_id: string;
  shift_date: string;
  shift: 'opening' | 'closing';
  closed_at: string | null;
  closed_by: string | null;
  closed_by_name: string | null;
  total: number;
  done: number;
}

export interface ComplianceMissedItem {
  template_id: string;
  title: string;
  title_ar: string;
  shift: 'opening' | 'closing';
  occurrences: number;
  missed: number;
  miss_rate: number;
}

export interface ComplianceSummary {
  since: string;
  overall: { done: number; total: number };
  opening: { done: number; total: number };
  closing: { done: number; total: number };
  runs: ComplianceRun[];
  missed: ComplianceMissedItem[];
}

export function useComplianceSummary(days: number) {
  return useQuery({
    queryKey: ['compliance', days],
    queryFn: async (): Promise<ComplianceSummary> => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceStr = since.toISOString().slice(0, 10);
      const { data, error } = await supabase.rpc('get_compliance_summary', {
        p_since: sinceStr,
      });
      if (error) throw error;
      return data as ComplianceSummary;
    },
    staleTime: 30_000,
  });
}

export function pct(done: number, total: number): number {
  if (!total) return 0;
  return Math.round((100 * done) / total);
}
