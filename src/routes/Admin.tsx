import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, LogOut, UserPlus, X, ChevronDown, ChevronRight } from 'lucide-react';
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
import { useAuditLog, useAuditActions, type AuditRow } from '@/features/admin/audit';
import { cn } from '@/lib/utils';
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
          <TabsTrigger value="audit" className="flex-1">
            {t('admin.tabs.audit')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff">
          <StaffTab />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
        <TabsContent value="audit">
          <AuditTab />
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

  type State = {
    hoursOpen: string;
    hoursClose: string;
    debounce: string;
    webhook: string;
    waEnabled: boolean;
    waRecipients: string[];
    noteOnUncheck: boolean;
    baristaInvEdit: boolean;
  };
  const [draft, setDraft] = useState<State | null>(null);
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    if (!settings.data) return;
    const get = (k: string) => settings.data.find((s) => s.key === k)?.value;
    const hours = (get('cafe_open_hours') as { open?: string; close?: string } | undefined) ?? {};
    const recipients = get('whatsapp_alert_recipients');
    setDraft({
      hoursOpen: hours.open ?? '06:00',
      hoursClose: hours.close ?? '22:00',
      debounce: String(get('low_stock_debounce_hours') ?? 12),
      webhook: String(get('whatsapp_webhook_url') ?? ''),
      waEnabled: get('whatsapp_alert_enabled') !== false,
      waRecipients: Array.isArray(recipients) ? (recipients as string[]) : [],
      noteOnUncheck: get('require_note_on_uncheck') !== false,
      baristaInvEdit: get('allow_barista_inventory_edit') === true,
    });
  }, [settings.data]);

  if (settings.isLoading || !draft) {
    return <Skeleton className="h-64 w-full" />;
  }

  function addRecipient() {
    const v = newPhone.trim();
    if (!v || !draft) return;
    if (draft.waRecipients.includes(v)) return;
    setDraft({ ...draft, waRecipients: [...draft.waRecipients, v] });
    setNewPhone('');
  }

  function removeRecipient(idx: number) {
    if (!draft) return;
    setDraft({
      ...draft,
      waRecipients: draft.waRecipients.filter((_, i) => i !== idx),
    });
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
        update.mutateAsync({ key: 'whatsapp_webhook_url', value: draft.webhook }),
        update.mutateAsync({ key: 'whatsapp_alert_enabled', value: draft.waEnabled }),
        update.mutateAsync({
          key: 'whatsapp_alert_recipients',
          value: draft.waRecipients,
        }),
        update.mutateAsync({ key: 'require_note_on_uncheck', value: draft.noteOnUncheck }),
        update.mutateAsync({
          key: 'allow_barista_inventory_edit',
          value: draft.baristaInvEdit,
        }),
      ]);
      toast({ title: t('admin.settings.saved') });
    } catch (e) {
      toast({ variant: 'destructive', title: t('common.error'), description: (e as Error).message });
    }
  }

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
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

        <div className="space-y-2 rounded-md border border-border bg-secondary/30 p-3">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="wa-enabled" className="cursor-pointer">
              {t('admin.settings.whatsappEnabled')}
            </Label>
            <Switch
              id="wa-enabled"
              checked={draft.waEnabled}
              onCheckedChange={(v) => setDraft({ ...draft, waEnabled: v })}
            />
          </div>

          <div className="space-y-2 pt-2">
            <Label htmlFor="webhook">{t('admin.settings.whatsappWebhook')}</Label>
            <Input
              id="webhook"
              type="url"
              placeholder="https://"
              value={draft.webhook}
              onChange={(e) => setDraft({ ...draft, webhook: e.target.value })}
            />
          </div>

          <div className="space-y-2 pt-2">
            <Label>{t('admin.settings.whatsappRecipients')}</Label>
            <p className="text-xs text-muted-foreground">
              {t('admin.settings.whatsappRecipientsHelp')}
            </p>
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder="+9627…"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addRecipient();
                  }
                }}
              />
              <Button type="button" size="sm" variant="outline" onClick={addRecipient}>
                {t('admin.settings.add')}
              </Button>
            </div>
            {draft.waRecipients.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {draft.waRecipients.map((p, i) => (
                  <Badge key={`${p}-${i}`} variant="outline" className="gap-1 pl-2 pr-1 py-1">
                    <span className="tabular-nums">{p}</span>
                    <button
                      type="button"
                      onClick={() => removeRecipient(i)}
                      className="ms-1 inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-secondary"
                      aria-label={t('common.delete')}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
          <div className="min-w-0">
            <Label className="cursor-pointer">{t('admin.settings.requireNoteOnUncheck')}</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('admin.settings.requireNoteOnUncheckHelp')}
            </p>
          </div>
          <Switch
            checked={draft.noteOnUncheck}
            onCheckedChange={(v) => setDraft({ ...draft, noteOnUncheck: v })}
          />
        </div>

        <div className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
          <div className="min-w-0">
            <Label className="cursor-pointer">{t('admin.settings.allowBaristaInvEdit')}</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('admin.settings.allowBaristaInvEditHelp')}
            </p>
          </div>
          <Switch
            checked={draft.baristaInvEdit}
            onCheckedChange={(v) => setDraft({ ...draft, baristaInvEdit: v })}
          />
        </div>

        <Button onClick={save} disabled={update.isPending} className="w-full">
          {t('common.save')}
        </Button>
      </CardContent>
    </Card>
  );
}

function AuditTab() {
  const { t } = useTranslation();
  const [action, setAction] = useState<string>('all');
  const [since, setSince] = useState<string>('');

  const actions = useAuditActions();
  const log = useAuditLog({
    action: action === 'all' ? undefined : action,
    since: since ? new Date(since).toISOString() : undefined,
    limit: 100,
  });

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="grid grid-cols-2 gap-2 pt-4">
          <div className="space-y-1">
            <Label className="text-xs">{t('admin.audit.action')}</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.audit.allActions')}</SelectItem>
                {(actions.data ?? []).map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('admin.audit.since')}</Label>
            <Input
              type="date"
              value={since}
              onChange={(e) => setSince(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {log.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (log.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {t('admin.audit.empty')}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {(log.data ?? []).map((row) => (
              <AuditRowView key={row.id} row={row} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AuditRowView({ row }: { row: AuditRow }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const hasDetail = row.before != null || row.after != null || !!row.note;
  const when = new Date(row.created_at).toLocaleString(i18n.language);

  return (
    <div className="p-3">
      <button
        type="button"
        onClick={() => hasDetail && setOpen((o) => !o)}
        className={cn(
          'flex w-full items-start gap-2 text-start',
          !hasDetail && 'cursor-default',
        )}
      >
        <div className="mt-0.5 shrink-0 text-muted-foreground">
          {hasDetail ? (
            open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          ) : (
            <span className="inline-block h-4 w-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-medium tabular-nums text-xs text-muted-foreground">{when}</span>
            <Badge variant="outline" className="text-[10px]">{row.action}</Badge>
          </div>
          <div className="mt-0.5 text-sm">
            <span className="font-medium">{row.actor?.display_name ?? t('admin.audit.unknownActor')}</span>
            {row.entity_type && (
              <>
                {' · '}
                <span className="text-muted-foreground">{row.entity_type}</span>
              </>
            )}
          </div>
          {row.note && (
            <p className="mt-0.5 text-xs text-muted-foreground">{row.note}</p>
          )}
        </div>
      </button>

      {open && hasDetail && (
        <div className="mt-2 space-y-2 pl-6">
          {row.before != null && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t('admin.audit.before')}
              </div>
              <pre className="mt-1 overflow-x-auto rounded bg-secondary/50 p-2 text-[11px] leading-relaxed">
                {JSON.stringify(row.before, null, 2)}
              </pre>
            </div>
          )}
          {row.after != null && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t('admin.audit.after')}
              </div>
              <pre className="mt-1 overflow-x-auto rounded bg-secondary/50 p-2 text-[11px] leading-relaxed">
                {JSON.stringify(row.after, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
