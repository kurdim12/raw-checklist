import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  addDays,
  useStaff,
  useWeekShifts,
  weekStart,
} from '@/features/schedule/queries';
import { formatDate, shortTime, todayAmman } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { Profile, Shift } from '@/types/database';

export function ScheduleRoute() {
  const { t, i18n } = useTranslation();
  const today = todayAmman();
  const [start, setStart] = useState(() => weekStart(today));
  const isAr = i18n.language.startsWith('ar');

  const staff = useStaff();
  const shifts = useWeekShifts(start);
  const gridRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);

  const shiftsByStaffDay = useMemo(() => {
    const m = new Map<string, Shift[]>();
    for (const s of shifts.data ?? []) {
      const k = `${s.staff_id}|${s.shift_date}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    }
    return m;
  }, [shifts.data]);

  const baristas = useMemo(
    () => (staff.data ?? []).filter((p) => p.role === 'barista' && p.active),
    [staff.data],
  );

  async function exportImage() {
    if (!gridRef.current) return;
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(gridRef.current, {
      backgroundColor: '#6F6B40',
      scale: 2,
    });
    const link = document.createElement('a');
    link.download = `rawsmith-schedule-${start}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  const loading = staff.isLoading || shifts.isLoading;

  return (
    <div className="space-y-4 pb-24">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t('schedule.title')}</h1>
        <Button variant="outline" size="sm" onClick={exportImage} className="gap-1.5">
          <Download className="h-4 w-4" />
          {t('schedule.exportImage')}
        </Button>
      </header>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setStart((s) => addDays(s, -7))} className="gap-1">
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          {t('schedule.prevWeek')}
        </Button>
        <div className="text-sm font-medium text-muted-foreground">
          {formatDate(start, isAr ? 'd MMM' : 'd MMM')} – {formatDate(addDays(start, 6), isAr ? 'd MMM yyyy' : 'd MMM yyyy')}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setStart((s) => addDays(s, 7))} className="gap-1">
          {t('schedule.nextWeek')}
          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : baristas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {t('checklist.empty')}
          </CardContent>
        </Card>
      ) : (
        <div ref={gridRef} className="overflow-x-auto rounded-xl border border-border bg-card p-2">
          <table className="w-full min-w-[640px] border-separate border-spacing-1 text-sm">
            <thead>
              <tr>
                <th className="sticky start-0 z-10 rounded-md bg-card p-2 text-start text-xs uppercase tracking-wider text-muted-foreground">
                  {/* staff column */}
                </th>
                {days.map((d) => {
                  const isToday = d === today;
                  return (
                    <th
                      key={d}
                      className={cn(
                        'min-w-[88px] rounded-md p-2 text-center text-xs font-semibold',
                        isToday ? 'bg-accent/20 text-accent' : 'text-muted-foreground',
                      )}
                    >
                      <div>{formatDate(d, isAr ? 'EEEE' : 'EEE')}</div>
                      <div className="mt-0.5 text-[10px] font-normal tabular-nums opacity-70">
                        {formatDate(d, 'd MMM')}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {baristas.map((p) => (
                <ScheduleRow
                  key={p.id}
                  profile={p}
                  days={days}
                  today={today}
                  byDay={(d) => shiftsByStaffDay.get(`${p.id}|${d}`) ?? []}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ScheduleRow({
  profile,
  days,
  today,
  byDay,
}: {
  profile: Profile;
  days: string[];
  today: string;
  byDay: (d: string) => Shift[];
}) {
  const { t } = useTranslation();
  return (
    <tr>
      <td className="sticky start-0 z-10 rounded-md bg-card p-2 align-top font-semibold">
        {profile.display_name}
      </td>
      {days.map((d) => {
        const cellShifts = byDay(d);
        const isToday = d === today;
        return (
          <td
            key={d}
            className={cn(
              'rounded-md align-top',
              isToday ? 'bg-accent/10' : 'bg-secondary/30',
            )}
          >
            <div className="space-y-1 p-1.5">
              {cellShifts.length === 0 && (
                <span className="block text-center text-xs text-muted-foreground/60">—</span>
              )}
              {cellShifts.map((s) => {
                if (s.is_off) {
                  return (
                    <Badge key={s.id} variant="outline" className="w-full justify-center">
                      {t('schedule.off')}
                    </Badge>
                  );
                }
                if (s.role === 'free') {
                  return (
                    <div key={s.id} className="rounded bg-card px-1.5 py-1 text-center">
                      <div className="text-[10px] uppercase tracking-wider text-accent">
                        {t('schedule.free')}
                      </div>
                      <div className="font-mono text-xs tabular-nums">
                        {shortTime(s.start_time)}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={s.id} className="rounded bg-card px-1.5 py-1 text-center">
                    <div className="font-mono text-xs tabular-nums">
                      {shortTime(s.start_time)}–{shortTime(s.end_time)}
                    </div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t(`schedule.role.${s.role}`)}
                    </div>
                  </div>
                );
              })}
            </div>
          </td>
        );
      })}
    </tr>
  );
}
