import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronLeft, CheckCircle2, Lock, Info } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { isManager } from '@/lib/rls';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import {
  useChecklistRealtime,
  useChecklistRun,
  useCloseRun,
  useToggleRunItem,
  type RunItemWithTemplate,
} from '@/features/checklist/queries';
import { formatAmmanTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { ShiftType } from '@/types/database';

type SectionKey = RunItemWithTemplate['template']['section'];

const SECTION_ORDER: Record<SectionKey, number> = {
  handover: 0,
  outside: 1,
  inside: 2,
  operation: 3,
  end_shift: 4,
};

export function ChecklistRoute() {
  const { shift } = useParams<{ shift: ShiftType }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const validShift = shift === 'opening' || shift === 'closing' ? shift : 'opening';
  const isAr = i18n.language.startsWith('ar');
  const manager = isManager(profile);

  const runQuery = useChecklistRun(validShift);
  const toggle = useToggleRunItem(validShift);
  const close = useCloseRun(validShift);

  useChecklistRealtime(runQuery.data?.run.id, validShift);

  const grouped = useMemo(() => {
    if (!runQuery.data) return [] as Array<{ section: SectionKey; items: RunItemWithTemplate[] }>;
    const map = new Map<SectionKey, RunItemWithTemplate[]>();
    for (const item of runQuery.data.items) {
      const s = item.template.section as SectionKey;
      if (!map.has(s)) map.set(s, []);
      map.get(s)!.push(item);
    }
    return Array.from(map.entries())
      .sort((a, b) => (SECTION_ORDER[a[0]] ?? 99) - (SECTION_ORDER[b[0]] ?? 99))
      .map(([section, items]) => ({ section, items }));
  }, [runQuery.data]);

  const stats = useMemo(() => {
    const items = runQuery.data?.items ?? [];
    return { total: items.length, done: items.filter((i) => i.done).length };
  }, [runQuery.data]);

  const allDone = stats.total > 0 && stats.done === stats.total;
  const closed = !!runQuery.data?.run.closed_at;

  async function handleClose() {
    if (!runQuery.data) return;
    try {
      await close.mutateAsync({ runId: runQuery.data.run.id });
      toast({ title: t('home.done') });
    } catch (e) {
      const msg = (e as Error).message;
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: msg.includes('not scheduled') ? t('checklist.notScheduled') : msg,
      });
    }
  }

  return (
    <div className="space-y-4 pb-32">
      <header className="space-y-2">
        <button
          onClick={() => navigate('/')}
          className="tap-target -ml-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          {t('common.back')}
        </button>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {t(`checklist.shift.${validShift}`)}
          </h1>
          <div className="text-sm text-muted-foreground tabular-nums">
            {t('home.tickedOf', { done: stats.done, total: stats.total })}
          </div>
        </div>
        {closed && runQuery.data && (
          <div className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm">
            <Lock className="h-4 w-4" />
            <span>
              {t('checklist.alreadyClosed', {
                time: formatAmmanTime(runQuery.data.run.closed_at),
                name: runQuery.data.run.closed_by ?? '',
              })}
            </span>
          </div>
        )}
      </header>

      {runQuery.isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {runQuery.isError && (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            {(runQuery.error as Error).message}
          </CardContent>
        </Card>
      )}

      {grouped.map(({ section, items }) => (
        <section key={section} className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t(`checklist.section.${section}`)}
          </h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {items.map((item) => (
                <ChecklistRow
                  key={item.id}
                  item={item}
                  disabled={closed}
                  isAr={isAr}
                  onToggle={(done) => toggle.mutate({ runItemId: item.id, done })}
                />
              ))}
            </CardContent>
          </Card>
        </section>
      ))}

      {!runQuery.isLoading && !closed && (
        <div className="fixed bottom-20 left-0 right-0 z-20 px-4 safe-bottom">
          <Button
            size="lg"
            className="w-full gap-2 shadow-lg"
            disabled={!allDone || close.isPending || (!manager && !runQuery.data)}
            onClick={handleClose}
          >
            <CheckCircle2 className="h-5 w-5" />
            {t('checklist.markComplete')}
          </Button>
          {!allDone && stats.total > 0 && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {stats.total - stats.done} {t('checklist.empty').toLowerCase()}…
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ChecklistRow({
  item,
  disabled,
  isAr,
  onToggle,
}: {
  item: RunItemWithTemplate;
  disabled: boolean;
  isAr: boolean;
  onToggle: (done: boolean) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const title = isAr ? item.template.title_ar : item.template.title;
  const instructions = isAr ? item.template.instructions_ar : item.template.instructions;
  const isConditional = item.template.frequency === 'mon_thu_fri';

  return (
    <div className={cn('flex items-start gap-3 p-4', item.done && 'bg-secondary/40')}>
      <div className="mt-0.5 flex-shrink-0 text-sm font-mono text-muted-foreground">
        {item.template.code}
      </div>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="block w-full text-start"
        >
          <div className={cn('font-medium leading-snug', item.done && 'line-through opacity-60')}>
            {title}
          </div>
          {isConditional && (
            <div className="mt-1 inline-flex items-center gap-1 rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
              {t('checklist.frequencyOnly')}
            </div>
          )}
          {instructions && (
            <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              {t('checklist.showInstructions')}
              <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
            </div>
          )}
        </button>
        {expanded && instructions && (
          <div
            className={cn(
              'mt-2 rounded-md bg-secondary/60 p-2 text-xs leading-relaxed text-muted-foreground',
              isAr && 'font-arabic text-right',
            )}
          >
            {instructions}
          </div>
        )}
      </div>
      <div className="flex-shrink-0">
        <Switch
          checked={item.done}
          disabled={disabled}
          onCheckedChange={onToggle}
          aria-label={title}
        />
      </div>
    </div>
  );
}
