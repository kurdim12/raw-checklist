import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { Button } from './ui/button';

export function LangSwitch() {
  const { i18n } = useTranslation();
  const next = i18n.language.startsWith('ar') ? 'en' : 'ar';

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => i18n.changeLanguage(next)}
      aria-label={`Switch language to ${next === 'ar' ? 'Arabic' : 'English'}`}
      className="gap-1.5"
    >
      <Languages className="h-4 w-4" />
      <span className="text-xs font-semibold uppercase tracking-wide">{next}</span>
    </Button>
  );
}
