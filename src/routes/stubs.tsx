import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/AuthProvider';
import { isManager } from '@/lib/rls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function StubRoute({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">{body}</CardContent>
      </Card>
    </div>
  );
}

export function ChecklistIndexRoute() {
  const { t } = useTranslation();
  return <StubRoute title={t('nav.checklist')} body="Pick a shift card from Home — full checklist view ships next chunk." />;
}

export function InventoryRoute() {
  const { t } = useTranslation();
  return <StubRoute title={t('inventory.title')} body="Inventory list ships in the next chunk." />;
}

export function InventoryLogRoute() {
  const { t } = useTranslation();
  return <StubRoute title={t('inventory.log.title')} body="Quick-log form ships in the next chunk." />;
}

export function OrdersRoute() {
  const { t } = useTranslation();
  return <StubRoute title={t('orders.title')} body="Orders ship after inventory." />;
}

export function ScheduleRoute() {
  const { t } = useTranslation();
  return <StubRoute title={t('schedule.title')} body="Schedule grid ships after orders." />;
}

export function AdminRoute() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  if (!isManager(profile)) {
    return <StubRoute title={t('admin.title')} body={t('admin.managerOnly')} />;
  }
  return <StubRoute title={t('admin.title')} body="Admin tabs ship after schedule." />;
}

export function ProfileRoute() {
  const { t } = useTranslation();
  const { profile, signOut } = useAuth();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{profile?.display_name ?? '—'}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('auth.signedInAs')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {profile?.role ?? '—'}
          </p>
          <Button variant="outline" onClick={() => signOut()}>
            {t('auth.signOut')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
