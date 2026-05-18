import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Coffee, Milk, Search, Snowflake } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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
    <div className="space-y-8 pb-24">
      {/* Editorial header */}
      <header className="space-y-4 pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-cream/50">
          Raw Smith · 2025
        </p>
        <div className="space-y-2">
          <h1 className="font-bold tracking-tight text-4xl leading-[1.05]">
            {t('recipes.title')}
          </h1>
          <p className="max-w-[28ch] text-sm italic text-cream/60">
            {t('recipes.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <span className="h-px flex-1 bg-cream/15" />
          <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-cream/40">
            {filtered.length} {t('recipes.count')}
          </span>
          <span className="h-px flex-1 bg-cream/15" />
        </div>
      </header>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cream/40 rtl:end-3.5 rtl:start-auto" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('recipes.searchPlaceholder')}
          className="h-11 border-cream/15 bg-card/60 ps-10 text-sm placeholder:text-cream/40 focus-visible:border-cream/40 rtl:pe-10 rtl:ps-3"
          inputMode="search"
        />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          {t('recipes.tabs.all')}
        </FilterChip>
        <FilterChip active={filter === 'black'} onClick={() => setFilter('black')} icon={<Coffee className="h-3.5 w-3.5" />}>
          {t('recipes.tabs.black')}
        </FilterChip>
        <FilterChip active={filter === 'white'} onClick={() => setFilter('white')} icon={<Milk className="h-3.5 w-3.5" />}>
          {t('recipes.tabs.white')}
        </FilterChip>
        <span className="mx-1 h-4 w-px bg-cream/15" />
        <FilterChip
          active={icedOnly}
          onClick={() => setIcedOnly((v) => !v)}
          icon={<Snowflake className="h-3.5 w-3.5" />}
        >
          {t('recipes.iced')}
        </FilterChip>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm italic text-cream/50">
            {t('recipes.empty')}
          </p>
        ) : (
          filtered.map((r) => {
            const name = isAr && r.name_ar ? r.name_ar : r.name;
            return (
              <Link
                key={r.id}
                to={`/recipes/${r.code}`}
                className="group block overflow-hidden rounded-2xl border border-cream/10 bg-card transition-all hover:border-cream/25 hover:shadow-lg active:scale-[0.99]"
              >
                <div className="flex items-stretch">
                  {/* Category accent strip */}
                  <div
                    aria-hidden
                    className={cn(
                      'w-1 shrink-0',
                      r.category === 'black' ? 'bg-cream-200' : 'bg-olive-300',
                    )}
                  />

                  <div className="flex flex-1 items-center gap-3 px-5 py-4">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cream/45">
                          {t(`recipes.tabs.${r.category}`)}
                        </span>
                        {r.is_iced && (
                          <>
                            <span className="text-cream/25">·</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cream/45">
                              <Snowflake className="h-2.5 w-2.5" />
                              {t('recipes.iced')}
                            </span>
                          </>
                        )}
                      </div>
                      <h2 className="truncate text-lg font-semibold tracking-tight text-cream-50">
                        {name}
                      </h2>
                      {r.glassware && (
                        <p className="truncate text-xs italic text-cream/55">
                          {r.glassware}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-cream/30 transition-colors group-hover:text-cream/60 rtl:rotate-180" />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'tap-target inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all',
        active
          ? 'border-cream/60 bg-cream/15 text-cream-50'
          : 'border-cream/15 bg-transparent text-cream/55 hover:border-cream/30 hover:text-cream/80',
      )}
    >
      {icon}
      {children}
    </button>
  );
}
