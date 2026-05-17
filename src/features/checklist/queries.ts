import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { todayAmman } from '@/lib/date';
import type { ChecklistRun, ChecklistRunItem, ChecklistTemplate, ShiftType } from '@/types/database';

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

export type RunItemWithTemplate = ChecklistRunItem & { template: ChecklistTemplate };

export interface RunDetail {
  run: ChecklistRun;
  items: RunItemWithTemplate[];
}
