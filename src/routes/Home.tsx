import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, ChevronRight, Sun, Moon, AlertTriangle, Calendar as CalIcon, Plus } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTodayRunSummary } from '@/features/checklist/queries';
import { useLowStockCount } from '@/features/inventory/queries';
import { useMyNextShift } from '@/features/schedule/queries';
import { formatDate, shortTime, todayAmman } from '@/lib/date';
import { cn } from '@/lib/utils';

export function HomeRoute() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const today = todayAmman();

  const opening = useTodayRunSummary('opening');
  const closing = useTodayRunSummary('closing');
  const low = useLowStockCount();
  const next = useMyNextShift(profile?.id);

  const isAr = i18n.language.startsWith('ar');
  const todayLabel = formatDate(today, isAr ? 'EEEE d MMMM yyyy' : 'EEEE, d MMM yyyy');

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('home.todayIs')}</p>
        <h1 className="text-2xl font-bold tracking-tight">{todayLabel}</h1>
      </header>

      <ShiftCard
        shift="opening"
        icon={<Sun className="h-5 w-5" />}
        title={t('home.openingShift')}
        loading={opening.isLoading}
        summary={opening.data}
      />
      <ShiftCard
        shift="closing"
        icon={<Moon className="h-5 w-5" />}
        title={t('home.closingShift')}
        loading={closing.isLoading}
        summary={closing.data}
      />

      <Link to="/inventory?filter=low" className="block">
        <Card className={cn(low.data && low.data > 0 ? 'border-stock-out/50' : undefined)}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className={cn('h-5 w-5', low.data && low.data > 0 ? 'text-stock-out' : 'text-muted-foreground')} />
              <CardTitle className="text-base">{t('home.lowStock')}</CardTitle>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground rtl:rotate-180" />
          </CardHeader>
          <CardContent>
            {low.isLoading ? (
              <Skeleton className="h-5 w-24" />
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('home.lowStockCount', { count: low.data ?? 0 })}
              </p>
            )}
          </CardContent>
        </Card>
      </Link>

      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <CalIcon className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">{t('home.nextShift')}</CardTitle>
        </CardHeader>
        <CardContent>
          {next.isLoading ? (
            <Skeleton className="h-5 w-40" />
          ) : next.data ? (
            <p className="text-sm">
              {formatDate(next.data.shift_date, isAr ? 'EEEE d MMM' : 'EEE, d MMM')}{' '}
              {next.data.start_time && (
                <span className="text-muted-foreground">
                  · {shortTime(next.data.start_time)}{next.data.end_time ? `–${shortTime(next.data.end_time)}` : ''}
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">{t('home.noUpcomingShift')}</p>
          )}
        </CardContent>
      </Card>

      <Link to="/recipes" className="block">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">{t('home.recipes')}</CardTitle>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground rtl:rotate-180" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t('home.recipesSubtitle')}</p>
          </CardContent>
        </Card>
      </Link>

      <Link to="/inventory/log" className="fixed bottom-20 right-4 z-20 rtl:right-auto rtl:left-4">
        <Button size="lg" className="rounded-full shadow-lg gap-2">
          <Plus className="h-5 w-5" />
          {t('home.quickLog')}
        </Button>
      </Link>
    </div>
  );
}

function ShiftCard({
  shift,
  icon,
  title,
  loading,
  summary,
}: {
  shift: 'opening' | 'closing';
  icon: React.ReactNode;
  title: string;
  loading: boolean;
  summary?: { run: { closed_at: string | null } | null; total: number; done: number };
}) {
  const { t } = useTranslation();

  let statusKey: 'notStarted' | 'inProgress' | 'done' = 'notStarted';
  if (summary?.run?.closed_at) statusKey = 'done';
  else if (summary?.run) statusKey = 'inProgress';

  return (
    <Link to={`/checklist/today/${shift}`} className="block">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground rtl:rotate-180" />
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <Skeleton className="h-5 w-32" />
          ) : (
            <>
              <p className="text-sm font-medium">{t(`home.${statusKey}`)}</p>
              <p className="text-xs text-muted-foreground">
                {t('home.tickedOf', { done: summary?.done ?? 0, total: summary?.total ?? 0 })}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
