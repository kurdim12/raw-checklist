import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { todayAmman } from '@/lib/date';
import type {
  ChecklistRun,
  ChecklistRunItem,
  ChecklistTemplate,
  ShiftType,
} from '@/types/database';

// ---------- summary (Home cards) -----------------------------------------

export interface RunSummary {
  run: ChecklistRun | null;
  total: number;
  done: number;
}

async function fetchRunSummary(shift: ShiftType): Promise<RunSummary> {
  const today = todayAmman();
  const runRes = await supabase
    .from('checklist_runs')
    .select('*')
    .eq('shift_date', today)
    .eq('shift', shift)
    .maybeSingle();
  if (runRes.error) throw runRes.error;
  const run = runRes.data as ChecklistRun | null;

  if (!run) {
    const { count } = await supabase
      .from('checklist_templates')
      .select('*', { count: 'exact', head: true })
      .eq('shift', shift)
      .eq('active', true)
      .eq('frequency', 'every_shift');
    return { run: null, total: count ?? 0, done: 0 };
  }

  const itemsRes = await supabase
    .from('checklist_run_items')
    .select('done')
    .eq('run_id', run.id);
  if (itemsRes.error) throw itemsRes.error;
  const items = (itemsRes.data ?? []) as Array<{ done: boolean }>;
  return { run, total: items.length, done: items.filter((i) => i.done).length };
}

export function useTodayRunSummary(shift: ShiftType) {
  return useQuery({
    queryKey: ['runSummary', shift, todayAmman()],
    queryFn: () => fetchRunSummary(shift),
  });
}

// ---------- full run detail (Checklist screen) ----------------------------

export type RunItemWithTemplate = ChecklistRunItem & { template: ChecklistTemplate };

export interface RunDetail {
  run: ChecklistRun;
  items: RunItemWithTemplate[];
}

async function openOrFetchRun(shift: ShiftType): Promise<RunDetail> {
  // RPC creates the run + items if they don't exist yet.
  const rpc = await supabase.rpc('open_checklist_run', { p_shift: shift });
  if (rpc.error) throw rpc.error;
  const runId = rpc.data as string;

  const [runRes, itemsRes] = await Promise.all([
    supabase.from('checklist_runs').select('*').eq('id', runId).single(),
    supabase
      .from('checklist_run_items')
      .select('*, template:checklist_templates(*)')
      .eq('run_id', runId),
  ]);
  if (runRes.error) throw runRes.error;
  if (itemsRes.error) throw itemsRes.error;

  const items = (itemsRes.data ?? []) as unknown as RunItemWithTemplate[];
  items.sort((a, b) => {
    if (a.template.section !== b.template.section) {
      return a.template.section.localeCompare(b.template.section);
    }
    return a.template.order_index - b.template.order_index;
  });

  return { run: runRes.data as ChecklistRun, items };
}

export function useChecklistRun(shift: ShiftType) {
  return useQuery({
    queryKey: ['checklistRun', shift, todayAmman()],
    queryFn: () => openOrFetchRun(shift),
  });
}

// ---------- mutations -----------------------------------------------------

export function useToggleRunItem(shift: ShiftType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { runItemId: string; done: boolean; note?: string | null }) => {
      const { error } = await supabase.rpc('set_run_item_done', {
        p_run_item_id: args.runItemId,
        p_done: args.done,
        p_note: args.note ?? null,
      });
      if (error) throw error;
    },
    onMutate: async ({ runItemId, done }) => {
      const key = ['checklistRun', shift, todayAmman()];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<RunDetail>(key);
      if (prev) {
        qc.setQueryData<RunDetail>(key, {
          ...prev,
          items: prev.items.map((i) =>
            i.id === runItemId ? { ...i, done, done_at: done ? new Date().toISOString() : null } : i,
          ),
        });
      }
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['checklistRun', shift, todayAmman()], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['checklistRun', shift, todayAmman()] });
      qc.invalidateQueries({ queryKey: ['runSummary', shift, todayAmman()] });
    },
  });
}

export function useCloseRun(shift: ShiftType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { runId: string; notes?: string | null }) => {
      const { error } = await supabase.rpc('close_checklist_run', {
        p_run_id: args.runId,
        p_notes: args.notes ?? null,
      });
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['checklistRun', shift, todayAmman()] });
      qc.invalidateQueries({ queryKey: ['runSummary', shift, todayAmman()] });
    },
  });
}

// ---------- realtime ------------------------------------------------------

export function useChecklistRealtime(runId: string | undefined, shift: ShiftType) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!runId) return;
    const channel = supabase
      .channel(`checklist_run_${runId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checklist_run_items', filter: `run_id=eq.${runId}` },
        () => {
          qc.invalidateQueries({ queryKey: ['checklistRun', shift, todayAmman()] });
          qc.invalidateQueries({ queryKey: ['runSummary', shift, todayAmman()] });
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'checklist_runs', filter: `id=eq.${runId}` },
        () => {
          qc.invalidateQueries({ queryKey: ['checklistRun', shift, todayAmman()] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [runId, shift, qc]);
}
