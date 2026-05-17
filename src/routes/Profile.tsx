import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/AuthProvider';

export function ProfileRoute() {
  const { t } = useTranslation();
  const { profile, signOut } = useAuth();

  return (
    <div className="space-y-4 pb-24">
      <h1 className="text-2xl font-bold tracking-tight">{profile?.display_name ?? '—'}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('auth.signedInAs')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{profile?.role ?? '—'}</p>
          <Button variant="outline" onClick={() => signOut()}>
            {t('auth.signOut')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
