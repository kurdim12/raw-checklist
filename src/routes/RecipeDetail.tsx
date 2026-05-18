import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Coffee, Milk, Snowflake, Wine } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useRecipe } from '@/features/recipes/queries';

export function RecipeDetailRoute() {
  const { code } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useRecipe(code);

  const isAr = i18n.language.startsWith('ar');

  if (isLoading) {
    return (
      <div className="space-y-4 pb-24">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4 pb-24">
        <button
          type="button"
          onClick={() => navigate('/recipes')}
          className="tap-target -ms-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          {t('common.back')}
        </button>
        <p className="text-sm text-muted-foreground">{t('recipes.notFound')}</p>
      </div>
    );
  }

  const name = isAr && data.name_ar ? data.name_ar : data.name;
  const CategoryIcon = data.category === 'black' ? Coffee : Milk;

  return (
    <div className="space-y-4 pb-24">
      <button
        type="button"
        onClick={() => navigate('/recipes')}
        className="tap-target -ms-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        {t('common.back')}
      </button>

      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <CategoryIcon className="h-5 w-5 text-muted-foreground" />
          <Badge variant="outline" className="text-[10px]">
            {t(`recipes.tabs.${data.category}`)}
          </Badge>
          {data.is_iced && (
            <Badge variant="outline" className="gap-0.5 text-[10px]">
              <Snowflake className="h-3 w-3" />
              {t('recipes.iced')}
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
      </header>

      {(data.glassware || data.ratio || data.grind || data.time_target) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('recipes.specs')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {data.glassware && (
              <Spec icon={<Wine className="h-4 w-4" />} label={t('recipes.glassware')} value={data.glassware} />
            )}
            {data.ratio && (
              <Spec label={t('recipes.ratio')} value={data.ratio} />
            )}
            {data.grind && (
              <Spec label={t('recipes.grind')} value={data.grind} />
            )}
            {data.time_target && (
              <Spec label={t('recipes.time')} value={data.time_target} />
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('recipes.steps')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {data.steps.map((step, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cream text-xs font-semibold text-olive-700 tabular-nums">
                  {idx + 1}
                </span>
                <p className="flex-1 text-sm leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {data.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('recipes.notes')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{data.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Spec({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
