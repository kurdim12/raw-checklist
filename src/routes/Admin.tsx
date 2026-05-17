import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, LogOut, UserPlus, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { isManager } from '@/lib/rls';
import {
  useAllStaff,
  useSettings,
  useToggleStaffActive,
  useUpdateSetting,
} from '@/features/admin/queries';
import { useInviteUser, useResetPassword } from '@/features/admin/users';
import type { Profile } from '@/types/database';

export function AdminRoute() {
  const { t } = useTranslation();
  const { profile, signOut } = useAuth();

  if (!isManager(profile)) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">{t('admin.title')}</h1>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t('admin.managerOnly')}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{t('admin.title')}</h1>
        <Button variant="outline" size="sm" onClick={() => signOut()} className="gap-1.5">
          <LogOut className="h-4 w-4" />
          {t('auth.signOut')}
        </Button>
      </div>

      <Tabs defaultValue="staff">
        <TabsList className="w-full">
          <TabsTrigger value="staff" className="flex-1">
            {t('admin.tabs.staff')}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex-1">
            {t('admin.tabs.settings')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff">
          <StaffTab />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StaffTab() {
  const { t } = useTranslation();
  const staff = useAllStaff();
  const [inviteOpen, setInviteOpen] = useState(false);

  if (staff.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant={inviteOpen ? 'outline' : 'default'}
          onClick={() => setInviteOpen((o) => !o)}
          className="gap-1.5"
        >
          {inviteOpen ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {inviteOpen ? t('common.cancel') : t('admin.staff.invite')}
        </Button>
      </div>

      {inviteOpen && <InviteForm onDone={() => setInviteOpen(false)} />}

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {(staff.data ?? []).map((p) => (
            <StaffRow key={p.id} profile={p} />
          ))}
          {(staff.data ?? []).length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">{t('checklist.empty')}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InviteForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const invite = useInviteUser();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'barista' | 'manager'>('barista');
  const [password, setPassword] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await invite.mutateAsync({ email, display_name: displayName, role, password });
      toast({ title: t('admin.staff.invited') });
      setEmail('');
      setDisplayName('');
      setPassword('');
      setRole('barista');
      onDone();
    } catch (err) {
      toast({ variant: 'destructive', title: t('common.error'), description: (err as Error).message });
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="inv-name">{t('admin.staff.displayName')}</Label>
            <Input
              id="inv-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="inv-email">{t('admin.staff.email')}</Label>
            <Input
              id="inv-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>{t('admin.staff.role')}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'barista' | 'manager')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="barista">{t('admin.staff.roleBarista')}</SelectItem>
                <SelectItem value="manager">{t('admin.staff.roleManager')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="inv-pass">{t('admin.staff.newPassword')}</Label>
            <Input
              id="inv-pass"
              type="text"
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={invite.isPending} className="w-full">
            {t('admin.staff.inviteSubmit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function StaffRow({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const toggle = useToggleStaffActive();
  const reset = useResetPassword();
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  async function handleToggle(active: boolean) {
    try {
      await toggle.mutateAsync({ id: profile.id, active });
    } catch (e) {
      toast({ variant: 'destructive', title: t('common.error'), description: (e as Error).message });
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    try {
      await reset.mutateAsync({ user_id: profile.id, password: newPassword });
      toast({ title: t('admin.staff.passwordChanged') });
      setNewPassword('');
      setResetOpen(false);
    } catch (err) {
      toast({ variant: 'destructive', title: t('common.error'), description: (err as Error).message });
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{profile.display_name}</span>
            <Badge variant={profile.role === 'manager' ? 'accent' : 'outline'}>
              {profile.role}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {profile.active ? t('admin.staff.statusActive') : t('admin.staff.statusInactive')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setResetOpen((o) => !o)}
            aria-label={t('admin.staff.resetPassword')}
            className="gap-1.5"
          >
            <KeyRound className="h-4 w-4" />
          </Button>
          <Switch
            checked={profile.active}
            onCheckedChange={handleToggle}
            aria-label={profile.display_name}
          />
        </div>
      </div>

      {resetOpen && (
        <form onSubmit={submitReset} className="mt-3 space-y-2 rounded-md border border-border bg-secondary/40 p-3">
          <div className="text-xs text-muted-foreground">{t('admin.staff.resetPasswordHelp')}</div>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              autoComplete="new-password"
              minLength={6}
              placeholder={t('admin.staff.newPassword')}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Button type="submit" size="sm" disabled={reset.isPending}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function SettingsTab() {
  const { t } = useTranslation();
  const settings = useSettings();
  const update = useUpdateSetting();
  const { toast } = useToast();

  type State = { hoursOpen: string; hoursClose: string; debounce: string; webhook: string };
  const [draft, setDraft] = useState<State | null>(null);

  useEffect(() => {
    if (!settings.data) return;
    const get = (k: string) => settings.data.find((s) => s.key === k)?.value;
    const hours = (get('cafe_open_hours') as { open?: string; close?: string } | undefined) ?? {};
    setDraft({
      hoursOpen: hours.open ?? '06:00',
      hoursClose: hours.close ?? '22:00',
      debounce: String(get('low_stock_debounce_hours') ?? 12),
      webhook: String(get('whatsapp_webhook_url') ?? ''),
    });
  }, [settings.data]);

  if (settings.isLoading || !draft) {
    return <Skeleton className="h-64 w-full" />;
  }

  async function save() {
    if (!draft) return;
    try {
      await Promise.all([
        update.mutateAsync({
          key: 'cafe_open_hours',
          value: { open: draft.hoursOpen, close: draft.hoursClose },
        }),
        update.mutateAsync({
          key: 'low_stock_debounce_hours',
          value: Number(draft.debounce) || 12,
        }),
        update.mutateAsync({
          key: 'whatsapp_webhook_url',
          value: draft.webhook,
        }),
      ]);
      toast({ title: t('inventory.log.saved') });
    } catch (e) {
      toast({ variant: 'destructive', title: t('common.error'), description: (e as Error).message });
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <Label>{t('admin.settings.openHours')}</Label>
          <div className="flex items-center gap-2">
            <Input
              type="time"
              value={draft.hoursOpen}
              onChange={(e) => setDraft({ ...draft, hoursOpen: e.target.value })}
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="time"
              value={draft.hoursClose}
              onChange={(e) => setDraft({ ...draft, hoursClose: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="debounce">{t('admin.settings.lowStockDebounce')}</Label>
          <Input
            id="debounce"
            type="number"
            min="1"
            value={draft.debounce}
            onChange={(e) => setDraft({ ...draft, debounce: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="webhook">{t('admin.settings.whatsappWebhook')}</Label>
          <Input
            id="webhook"
            type="url"
            placeholder="https://"
            value={draft.webhook}
            onChange={(e) => setDraft({ ...draft, webhook: e.target.value })}
          />
        </div>

        <Button onClick={save} disabled={update.isPending} className="w-full">
          {t('common.save')}
        </Button>
      </CardContent>
    </Card>
  );
}
