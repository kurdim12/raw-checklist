import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { isManager } from '@/lib/rls';
import {
  useAllStaff,
  useSettings,
  useToggleStaffActive,
  useUpdateSetting,
} from '@/features/admin/queries';
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

  if (staff.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
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
  );
}

function StaffRow({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const toggle = useToggleStaffActive();

  async function handleToggle(active: boolean) {
    try {
      await toggle.mutateAsync({ id: profile.id, active });
    } catch (e) {
      toast({ variant: 'destructive', title: t('common.error'), description: (e as Error).message });
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{profile.display_name}</span>
          <Badge variant={profile.role === 'manager' ? 'accent' : 'outline'}>
            {profile.role}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {profile.active ? t('admin.staff.activate') : t('admin.staff.deactivate')}
        </p>
      </div>
      <Switch
        checked={profile.active}
        onCheckedChange={handleToggle}
        aria-label={profile.display_name}
      />
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
