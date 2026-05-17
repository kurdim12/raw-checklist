import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, ClipboardCheck, Package, Calendar, Settings } from 'lucide-react';
import { LangSwitch } from './LangSwitch';
import { useAuth } from '@/features/auth/AuthProvider';
import { isManager } from '@/lib/rls';
import { cn } from '@/lib/utils';

export function Layout() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const manager = isManager(profile);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur safe-top">
        <div className="container flex h-14 items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-accent text-accent-foreground text-xs font-bold grid place-items-center">RS</div>
            <span className="font-semibold tracking-tight">{t('app.name')}</span>
          </div>
          <div className="flex items-center gap-1">
            <LangSwitch />
          </div>
        </div>
      </header>

      <main className="container flex-1 pb-24 pt-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-border bg-card/95 backdrop-blur safe-bottom">
        <div className="container grid grid-cols-5">
          <TabLink to="/" icon={<Home className="h-5 w-5" />} label={t('nav.home')} end />
          <TabLink to="/checklist" icon={<ClipboardCheck className="h-5 w-5" />} label={t('nav.checklist')} />
          <TabLink to="/inventory" icon={<Package className="h-5 w-5" />} label={t('nav.inventory')} />
          <TabLink to="/schedule" icon={<Calendar className="h-5 w-5" />} label={t('nav.schedule')} />
          <TabLink
            to={manager ? '/admin' : '/profile'}
            icon={<Settings className="h-5 w-5" />}
            label={manager ? t('nav.admin') : t('auth.signedInAs')}
          />
        </div>
      </nav>
    </div>
  );
}

function TabLink({
  to,
  icon,
  label,
  end,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'tap-target flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium',
          isActive ? 'text-accent' : 'text-muted-foreground',
        )
      }
    >
      {icon}
      <span className="leading-none">{label}</span>
    </NavLink>
  );
}
