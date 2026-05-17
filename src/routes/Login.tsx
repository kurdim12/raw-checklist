import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Droplet, Mail } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { LangSwitch } from '@/components/LangSwitch';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormValues = z.infer<typeof schema>;

export function LoginRoute() {
  const { t } = useTranslation();
  const { session, signIn, signInMagicLink } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [magicMode, setMagicMode] = useState(false);

  const { register, handleSubmit, formState, getValues } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  if (session) {
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';
    return <Navigate to={from} replace />;
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      await signIn(values.email, values.password);
      navigate('/', { replace: true });
    } catch (e) {
      toast({ variant: 'destructive', title: t('auth.wrongCredentials'), description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  async function onMagic() {
    const email = getValues('email');
    if (!email) {
      toast({ variant: 'destructive', title: t('auth.email') });
      return;
    }
    setSubmitting(true);
    try {
      await signInMagicLink(email);
      toast({ title: t('auth.magicLinkSent') });
    } catch (e) {
      toast({ variant: 'destructive', title: t('common.error'), description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 safe-top safe-bottom">
      <div className="absolute top-4 right-4"><LangSwitch /></div>

      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="h-14 w-14 rounded-full bg-cream text-olive-700 grid place-items-center shadow-lg">
          <Droplet className="h-7 w-7" fill="currentColor" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{t('app.name')}</h1>
        <p className="text-sm text-muted-foreground">{t('app.tagline')}</p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('auth.signIn')}</CardTitle>
          <CardDescription>rawsmith.local accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
              {formState.errors.email && (
                <p className="text-xs text-destructive">{formState.errors.email.message}</p>
              )}
            </div>

            {!magicMode && (
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
                {formState.errors.password && (
                  <p className="text-xs text-destructive">{formState.errors.password.message}</p>
                )}
              </div>
            )}

            {!magicMode ? (
              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? t('auth.loading') : t('auth.signIn')}
              </Button>
            ) : (
              <Button type="button" size="lg" className="w-full" disabled={submitting} onClick={onMagic}>
                <Mail className="h-4 w-4" /> {t('auth.magicLink')}
              </Button>
            )}

            <Button type="button" variant="link" className="w-full" onClick={() => setMagicMode((m) => !m)}>
              {magicMode ? t('auth.signIn') : t('auth.magicLink')}
            </Button>

            <p className="pt-2 text-center text-xs text-muted-foreground">
              {t('auth.forgotPasswordHelp')}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
