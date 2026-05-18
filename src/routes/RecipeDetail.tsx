import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Coffee, Milk, Snowflake } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecipe } from '@/features/recipes/queries';
import { cn } from '@/lib/utils';

export function RecipeDetailRoute() {
  const { code } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useRecipe(code);

  const isAr = i18n.language.startsWith('ar');

  if (isLoading) {
    return (
      <div className="space-y-6 pb-24">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4 pb-24">
        <BackLink onClick={() => navigate('/recipes')} label={t('common.back')} />
        <p className="text-sm italic text-cream/60">{t('recipes.notFound')}</p>
      </div>
    );
  }

  const name = isAr && data.name_ar ? data.name_ar : data.name;
  const CategoryIcon = data.category === 'black' ? Coffee : Milk;

  const specs = [
    data.ratio && { label: t('recipes.ratio'), value: data.ratio },
    data.grind && { label: t('recipes.grind'), value: data.grind },
    data.time_target && { label: t('recipes.time'), value: data.time_target },
    data.glassware && { label: t('recipes.glassware'), value: data.glassware },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="space-y-8 pb-24">
      <BackLink onClick={() => navigate('/recipes')} label={t('common.back')} />

      {/* Hero */}
      <header className="space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-cream/50">
          <CategoryIcon className="h-3 w-3" />
          <span>{t(`recipes.tabs.${data.category}`)}</span>
          {data.is_iced && (
            <>
              <span className="text-cream/25">·</span>
              <span className="inline-flex items-center gap-1">
                <Snowflake className="h-3 w-3" />
                {t('recipes.iced')}
              </span>
            </>
          )}
        </div>
        <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-cream-50">
          {name}
        </h1>
        {data.glassware && (
          <p className="text-sm italic text-cream/60">— {data.glassware}</p>
        )}
        <div className="flex items-center gap-3 pt-1">
          <span className="h-px flex-1 bg-cream/15" />
          <span className="text-cream/30">◦</span>
          <span className="h-px flex-1 bg-cream/15" />
        </div>
      </header>

      {/* Specs strip */}
      {specs.length > 0 && (
        <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-cream/10 bg-cream/10">
          {specs.map((s) => (
            <div key={s.label} className="space-y-1.5 bg-card px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cream/45">
                {s.label}
              </p>
              <p className="text-sm font-medium leading-snug text-cream-50 tabular-nums">
                {s.value}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* Build / steps */}
      <section className="space-y-5">
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-cream/50">
            {t('recipes.build')}
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-cream-50">
            {t('recipes.steps')}
          </h2>
        </div>

        <ol className="space-y-0 overflow-hidden rounded-2xl border border-cream/10 bg-card">
          {data.steps.map((step, idx) => (
            <li
              key={idx}
              className={cn(
                'flex gap-5 px-5 py-5',
                idx !== 0 && 'border-t border-cream/10',
              )}
            >
              <span className="select-none pt-0.5 text-xl font-light italic leading-none text-cream/35 tabular-nums">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <p className="flex-1 text-[15px] leading-relaxed text-cream/90">
                {step}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Notes */}
      {data.notes && (
        <section className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-cream/50">
            {t('recipes.notes')}
          </p>
          <blockquote className="border-s-2 border-cream/30 ps-4 text-sm italic leading-relaxed text-cream/70">
            {data.notes}
          </blockquote>
        </section>
      )}

      {/* Brand footer mark */}
      <footer className="pt-4">
        <div className="flex items-center justify-center gap-3 opacity-50">
          <span className="h-px w-10 bg-cream/30" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.4em] text-cream/50">
            Raw Smith · Amman
          </span>
          <span className="h-px w-10 bg-cream/30" />
        </div>
      </footer>
    </div>
  );
}

function BackLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap-target -ms-2 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-[0.2em] text-cream/50 transition-colors hover:text-cream/80"
    >
      <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />
      {label}
    </button>
  );
}
