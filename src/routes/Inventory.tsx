import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Plus, AlertTriangle, ChevronRight, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { stockState, useInventory, type InventoryItemRow } from '@/features/inventory/queries';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'low';

export function InventoryRoute() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const initialFilter: Filter = params.get('filter') === 'low' ? 'low' : 'all';
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [search, setSearch] = useState('');

  const isAr = i18n.language.startsWith('ar');
  const { data, isLoading } = useInventory();

  const grouped = useMemo(() => {
    if (!data) return [] as Array<{ category: InventoryItemRow['category']; items: InventoryItemRow[] }>;
    const needle = search.trim().toLowerCase();
    const filtered = data.filter((item) => {
      if (filter === 'low' && stockState(item) === 'ok') return false;
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) ||
        item.name_ar.toLowerCase().includes(needle)
      );
    });
    const map = new Map<string, { category: InventoryItemRow['category']; items: InventoryItemRow[] }>();
    for (const item of filtered) {
      const key = item.category.id;
      if (!map.has(key)) map.set(key, { category: item.category, items: [] });
      map.get(key)!.items.push(item);
    }
    return Array.from(map.values()).sort(
      (a, b) => a.category.order_index - b.category.order_index,
    );
  }, [data, search, filter]);

  function handleFilter(next: string) {
    const f = next as Filter;
    setFilter(f);
    const np = new URLSearchParams(params);
    if (f === 'low') np.set('filter', 'low');
    else np.delete('filter');
    setParams(np, { replace: true });
  }

  return (
    <div className="space-y-4 pb-24">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{t('inventory.title')}</h1>
        <div className="flex items-center gap-2">
          <Link to="/orders">
            <Button size="sm" variant="outline" className="gap-1">
              <Package className="h-4 w-4" />
              {t('orders.title')}
            </Button>
          </Link>
          <Link to="/inventory/log">
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              {t('home.quickLog')}
            </Button>
          </Link>
        </div>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={t('inventory.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-9"
        />
      </div>

      <Tabs value={filter} onValueChange={handleFilter}>
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">{t('inventory.filter.all')}</TabsTrigger>
          <TabsTrigger value="low" className="flex-1 gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            {t('inventory.filter.low')}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {!isLoading && grouped.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {filter === 'low' ? t('orders.noLowStock') : t('checklist.empty')}
          </CardContent>
        </Card>
      )}

      {grouped.map(({ category, items }) => (
        <section key={category.id} className="space-y-2">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {category.icon && <span aria-hidden>{category.icon}</span>}
            <span>{isAr ? category.name_ar : category.name}</span>
            <span className="ms-auto tabular-nums">{items.length}</span>
          </h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {items.map((item) => (
                <InventoryRow key={item.id} item={item} isAr={isAr} />
              ))}
            </CardContent>
          </Card>
        </section>
      ))}
    </div>
  );
}

function InventoryRow({ item, isAr }: { item: InventoryItemRow; isAr: boolean }) {
  const { t } = useTranslation();
  const state = stockState(item);
  const verify = item.notes?.toLowerCase().includes('verify quantity');
  const name = isAr ? item.name_ar : item.name;

  return (
    <Link
      to={`/inventory/log?item=${item.id}`}
      className="flex items-center gap-3 p-4 hover:bg-secondary/40"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <div className="truncate font-medium leading-snug">{name}</div>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {item.quantity == null ? '—' : item.quantity}
          </span>
          <span>{item.unit}</span>
          <span className="text-muted-foreground/60">·</span>
          <span>
            min {item.min_level} / par {item.par_level}
          </span>
        </div>
        {verify && (
          <div className="mt-1 text-[11px] text-stock-low">
            {t('inventory.verifyQuantity')}
          </div>
        )}
      </div>
      <Badge variant={state} className={cn(state === 'out' && 'animate-pulse')}>
        {t(`inventory.state.${state}`)}
      </Badge>
      <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
    </Link>
  );
}
