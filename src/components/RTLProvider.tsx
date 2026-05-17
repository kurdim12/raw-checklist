import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { isRTL } from '@/lib/i18n';

export function RTLProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const rtl = isRTL(i18n.language);

  useEffect(() => {
    const html = document.documentElement;
    html.lang = i18n.language;
    html.dir = rtl ? 'rtl' : 'ltr';
  }, [i18n.language, rtl]);

  return <>{children}</>;
}
