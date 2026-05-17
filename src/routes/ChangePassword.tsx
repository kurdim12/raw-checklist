import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';

export function ChangePasswordRoute() {
  const { t } = useTranslation();
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const forced = !!profile?.must_change_password;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('auth.passwordMinLength'),
      });
      return;
    }
    if (password !== confirm) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('auth.passwordMismatch'),
      });
      return;
    }
    setSubmitting(true);
    try {
      const { error: authErr } = await supabase.auth.updateUser({ password });
      if (authErr) throw authErr;

      if (profile) {
        const { error: profErr } = await supabase
          .from('profiles')
          .update({ must_change_password: false })
          .eq('id', profile.id);
        if (profErr) throw profErr;
      }

      await refreshProfile();
      toast({ title: t('auth.passwordChanged') });
      navigate('/', { replace: true });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: (err as Error).message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 safe-top safe-bottom">
      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="h-14 w-14 rounded-full bg-cream text-olive-700 grid place-items-center shadow-lg">
          <KeyRound className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('auth.changePasswordTitle')}
        </h1>
        {forced && (
          <p className="max-w-sm text-center text-sm text-muted-foreground">
            {t('auth.changePasswordForced')}
          </p>
        )}
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{profile?.display_name ?? ''}</CardTitle>
          <CardDescription>{t('auth.changePasswordHelp')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="new-pass">{t('auth.newPassword')}</Label>
              <Input
                id="new-pass"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pass">{t('auth.confirmPassword')}</Label>
              <Input
                id="confirm-pass"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? t('auth.loading') : t('common.save')}
            </Button>
            {!forced && (
              <Button
                type="button"
                variant="link"
                className="w-full"
                onClick={() => navigate(-1)}
              >
                {t('common.cancel')}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
