import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Save, AlertCircle, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { isManager } from '@/lib/rls';
import {
  stockState,
  useInventory,
  useBulkUpdateInventory,
  type BulkUpdateRow,
  type InventoryItemRow,
} from '@/features/inventory/queries';
import { cn } from '@/lib/utils';

export function StockCountRoute() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isAr = i18n.language.startsWith('ar');

  const { data: items, isLoading } = useInventory();
  const bulk = useBulkUpdateInventory();

  // Local typed values, keyed by item id. A missing key means "untouched".
  const [draft, setDraft] = useState<Record<string, string>>({});

  if (!isManager(profile)) {
    return <Navigate to="/inventory" replace />;
  }

  const grouped = useMemo(() => {
    if (!items) return [] as Array<{ catId: string; catName: string; rows: InventoryItemRow[] }>;
    const map = new Map<string, { catId: string; catName: string; rows: InventoryItemRow[] }>();
    for (const it of items) {
      const key = it.category.id;
      if (!map.has(key)) {
        map.set(key, {
          catId: key,
          catName: isAr ? it.category.name_ar : it.category.name,
          rows: [],
        });
      }
      map.get(key)!.rows.push(it);
    }
    return Array.from(map.values()).sort((a, b) => {
      const ai = items.find((i) => i.category.id === a.catId)!.category.order_index;
      const bi = items.find((i) => i.category.id === b.catId)!.category.order_index;
      return ai - bi;
    });
  }, [items, isAr]);

  const pending = useMemo<BulkUpdateRow[]>(() => {
    if (!items) return [];
    const out: BulkUpdateRow[] = [];
    for (const it of items) {
      const raw = draft[it.id];
      if (raw === undefined || raw === '') continue;
      const n = Number(raw);
      if (Number.isNaN(n) || n < 0) continue;
      if (it.quantity != null && n === it.quantity) continue;
      out.push({ item_id: it.id, quantity: n });
    }
    return out;
  }, [items, draft]);

  const nullCount = items?.filter((i) => i.quantity == null).length ?? 0;

  async function handleSave() {
    if (pending.length === 0) return;
    try {
      await bulk.mutateAsync(pending);
      toast({
        title: t('stockCount.saved', { count: pending.length }),
      });
      setDraft({});
      navigate('/inventory');
    } catch (e) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: (e as Error).message,
      });
    }
  }

  return (
    <div className="space-y-4 pb-32">
      <header className="space-y-2">
        <button
          type="button"
          onClick={() => navigate('/inventory')}
          className="tap-target -ml-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          {t('common.back')}
        </button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('stockCount.title')}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{t('stockCount.subtitle')}</p>
          </div>
          {Object.keys(draft).length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDraft({})}
              className="gap-1.5 shrink-0"
            >
              <RotateCcw className="h-4 w-4" />
              {t('common.reset')}
            </Button>
          )}
        </div>
      </header>

      {nullCount > 0 && (
        <Card className="border-stock-low/40 bg-stock-low/5">
          <CardContent className="flex items-start gap-3 p-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-stock-low" />
            <p>
              <span className="font-medium">{nullCount}</span> {t('stockCount.nullHint')}
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {grouped.map(({ catId, catName, rows }) => (
        <section key={catId} className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {catName}
          </h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {rows.map((it) => (
                <CountRow
                  key={it.id}
                  item={it}
                  isAr={isAr}
                  value={draft[it.id] ?? ''}
                  onChange={(v) => setDraft((d) => ({ ...d, [it.id]: v }))}
                />
              ))}
            </CardContent>
          </Card>
        </section>
      ))}

      <div className="fixed bottom-20 left-0 right-0 z-20 px-4 safe-bottom">
        <Button
          size="lg"
          className="w-full shadow-lg gap-2"
          disabled={pending.length === 0 || bulk.isPending}
          onClick={handleSave}
        >
          <Save className="h-4 w-4" />
          {pending.length === 0
            ? t('stockCount.noChanges')
            : t('stockCount.saveCta', { count: pending.length })}
        </Button>
      </div>
    </div>
  );
}

function CountRow({
  item,
  isAr,
  value,
  onChange,
}: {
  item: InventoryItemRow;
  isAr: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation();
  const state = stockState(item);
  const name = isAr ? item.name_ar : item.name;
  const isNullQty = item.quantity == null;
  const typedNum = value === '' ? null : Number(value);
  const isChanged =
    value !== '' &&
    typedNum !== null &&
    !Number.isNaN(typedNum) &&
    typedNum >= 0 &&
    (item.quantity == null || typedNum !== item.quantity);

  return (
    <div className="flex items-center gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate font-medium">{name}</div>
          {isNullQty && (
            <Badge variant="low" className="shrink-0 text-[10px]">
              {t('stockCount.firstCount')}
            </Badge>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
          <span>
            {t('stockCount.systemSays')}:{' '}
            <span className={cn(state !== 'ok' && 'text-stock-low')}>
              {item.quantity == null ? '—' : item.quantity} {item.unit}
            </span>
          </span>
          <span className="text-muted-foreground/60">·</span>
          <span>
            min {item.min_level} / par {item.par_level}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          placeholder={item.quantity == null ? '0' : String(item.quantity)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-20 text-right text-base tabular-nums',
            isChanged && 'border-accent ring-1 ring-accent/40',
          )}
        />
        <span className="w-10 text-xs text-muted-foreground">{item.unit}</span>
      </div>
    </div>
  );
}
