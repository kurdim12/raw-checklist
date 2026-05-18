import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Coffee, Milk, Search, Snowflake } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useRecipes } from '@/features/recipes/queries';
import { cn } from '@/lib/utils';
import type { RecipeCategory } from '@/types/database';

type Filter = 'all' | RecipeCategory;

export function RecipesRoute() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useRecipes();
  const [filter, setFilter] = useState<Filter>('all');
  const [icedOnly, setIcedOnly] = useState(false);
  const [search, setSearch] = useState('');

  const isAr = i18n.language.startsWith('ar');

  const filtered = useMemo(() => {
    const list = data ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((r) => {
      if (filter !== 'all' && r.category !== filter) return false;
      if (icedOnly && !r.is_iced) return false;
      if (!q) return true;
      const hay = `${r.name} ${r.name_ar ?? ''} ${r.glassware ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [data, filter, icedOnly, search]);

  return (
    <div className="space-y-4 pb-24">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{t('recipes.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('recipes.subtitle')}</p>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:end-3 rtl:start-auto" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('recipes.searchPlaceholder')}
          className="ps-9 rtl:pe-9 rtl:ps-3"
          inputMode="search"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">{t('recipes.tabs.all')}</TabsTrigger>
            <TabsTrigger value="black" className="gap-1">
              <Coffee className="h-3.5 w-3.5" />
              {t('recipes.tabs.black')}
            </TabsTrigger>
            <TabsTrigger value="white" className="gap-1">
              <Milk className="h-3.5 w-3.5" />
              {t('recipes.tabs.white')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <button
          type="button"
          onClick={() => setIcedOnly((v) => !v)}
          className={cn(
            'tap-target inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors',
            icedOnly
              ? 'border-accent bg-accent/15 text-accent'
              : 'border-border bg-card text-muted-foreground hover:bg-secondary/60',
          )}
          aria-pressed={icedOnly}
        >
          <Snowflake className="h-3.5 w-3.5" />
          {t('recipes.iced')}
        </button>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {t('recipes.empty')}
          </p>
        ) : (
          filtered.map((r) => {
            const name = isAr && r.name_ar ? r.name_ar : r.name;
            return (
              <Link key={r.id} to={`/recipes/${r.code}`} className="block">
                <Card>
                  <CardContent className="flex items-center justify-between gap-3 py-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{name}</span>
                        {r.is_iced && (
                          <Badge variant="outline" className="gap-0.5 text-[10px]">
                            <Snowflake className="h-3 w-3" />
                            {t('recipes.iced')}
                          </Badge>
                        )}
                      </div>
                      {r.glassware && (
                        <p className="text-xs text-muted-foreground">{r.glassware}</p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground rtl:rotate-180" />
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
