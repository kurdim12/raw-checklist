import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AuditRow {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  before: unknown;
  after: unknown;
  note: string | null;
  created_at: string;
  actor?: { display_name: string } | null;
}

export interface AuditFilter {
  action?: string;
  since?: string; // ISO date
  limit?: number;
}

export function useAuditLog(filter: AuditFilter = {}) {
  return useQuery({
    queryKey: ['auditLog', filter],
    queryFn: async (): Promise<AuditRow[]> => {
      let q = supabase
        .from('audit_log')
        .select('*, actor:profiles!audit_log_actor_id_fkey(display_name)')
        .order('created_at', { ascending: false })
        .limit(filter.limit ?? 100);
      if (filter.action) q = q.eq('action', filter.action);
      if (filter.since) q = q.gte('created_at', filter.since);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });
}

export function useAuditActions() {
  return useQuery({
    queryKey: ['auditActions'],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('action')
        .limit(500);
      if (error) throw error;
      const set = new Set<string>();
      for (const r of data ?? []) set.add((r as { action: string }).action);
      return Array.from(set).sort();
    },
    staleTime: 60_000,
  });
}
