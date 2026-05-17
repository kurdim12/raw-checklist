import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Sun, Moon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTodayRunSummary } from '@/features/checklist/queries';
import { formatDate, todayAmman } from '@/lib/date';

export function ChecklistIndexRoute() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const today = todayAmman();
  const opening = useTodayRunSummary('opening');
  const closing = useTodayRunSummary('closing');

  return (
    <div className="space-y-4 pb-24">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('home.todayIs')}</p>
        <h1 className="text-2xl font-bold tracking-tight">
          {formatDate(today, isAr ? 'EEEE d MMMM yyyy' : 'EEEE, d MMM yyyy')}
        </h1>
      </header>

      <ShiftCard
        shift="opening"
        icon={<Sun className="h-5 w-5" />}
        title={t('home.openingShift')}
        loading={opening.isLoading}
        done={opening.data?.done ?? 0}
        total={opening.data?.total ?? 0}
        closed={!!opening.data?.run?.closed_at}
      />
      <ShiftCard
        shift="closing"
        icon={<Moon className="h-5 w-5" />}
        title={t('home.closingShift')}
        loading={closing.isLoading}
        done={closing.data?.done ?? 0}
        total={closing.data?.total ?? 0}
        closed={!!closing.data?.run?.closed_at}
      />
    </div>
  );
}

function ShiftCard({
  shift,
  icon,
  title,
  loading,
  done,
  total,
  closed,
}: {
  shift: 'opening' | 'closing';
  icon: React.ReactNode;
  title: string;
  loading: boolean;
  done: number;
  total: number;
  closed: boolean;
}) {
  const { t } = useTranslation();
  const statusKey = closed ? 'done' : total === 0 ? 'notStarted' : done > 0 ? 'inProgress' : 'notStarted';

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
              <p className="text-xs text-muted-foreground tabular-nums">
                {t('home.tickedOf', { done, total })}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
