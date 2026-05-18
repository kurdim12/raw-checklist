import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Plus, Edit, Power } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
  useAllInventoryItems,
  useInventoryCategories,
  useUpsertInventoryItem,
  type InventoryItemRow,
  type UpsertItemArgs,
} from '@/features/inventory/queries';

type FormState = {
  category_id: string;
  name: string;
  name_ar: string;
  unit: string;
  min_level: string;
  par_level: string;
  cost_per_unit: string;
  supplier: string;
  notes: string;
  active: boolean;
};

function emptyForm(categoryId: string): FormState {
  return {
    category_id: categoryId,
    name: '',
    name_ar: '',
    unit: '',
    min_level: '0',
    par_level: '0',
    cost_per_unit: '',
    supplier: '',
    notes: '',
    active: true,
  };
}

function itemToForm(item: InventoryItemRow): FormState {
  return {
    category_id: item.category.id,
    name: item.name,
    name_ar: item.name_ar,
    unit: item.unit,
    min_level: String(item.min_level),
    par_level: String(item.par_level),
    cost_per_unit: item.cost_per_unit == null ? '' : String(item.cost_per_unit),
    supplier: item.supplier ?? '',
    notes: item.notes ?? '',
    active: item.active,
  };
}

export function InventoryItemsRoute() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isAr = i18n.language.startsWith('ar');

  const items = useAllInventoryItems();
  const categories = useInventoryCategories();
  const upsert = useUpsertInventoryItem();

  const [editing, setEditing] = useState<InventoryItemRow | 'new' | null>(null);
  const [search, setSearch] = useState('');

  if (!isManager(profile)) {
    return <Navigate to="/inventory" replace />;
  }

  const filtered = useMemo(() => {
    const list = items.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (i) => i.name.toLowerCase().includes(q) || i.name_ar.toLowerCase().includes(q),
    );
  }, [items.data, search]);

  async function handleSave(form: FormState, id?: string) {
    const payload: UpsertItemArgs = {
      id,
      category_id: form.category_id,
      name: form.name.trim(),
      name_ar: form.name_ar.trim(),
      unit: form.unit.trim(),
      min_level: Number(form.min_level) || 0,
      par_level: Number(form.par_level) || 0,
      supplier: form.supplier.trim() || null,
      cost_per_unit: form.cost_per_unit === '' ? null : Number(form.cost_per_unit),
      notes: form.notes.trim() || null,
      active: form.active,
    };
    try {
      await upsert.mutateAsync(payload);
      toast({ title: t('items.saved') });
      setEditing(null);
    } catch (e) {
      toast({ variant: 'destructive', title: t('common.error'), description: (e as Error).message });
    }
  }

  async function toggleActive(item: InventoryItemRow) {
    try {
      await upsert.mutateAsync({
        id: item.id,
        category_id: item.category.id,
        name: item.name,
        name_ar: item.name_ar,
        unit: item.unit,
        min_level: item.min_level,
        par_level: item.par_level,
        supplier: item.supplier,
        cost_per_unit: item.cost_per_unit,
        notes: item.notes,
        active: !item.active,
      });
    } catch (e) {
      toast({ variant: 'destructive', title: t('common.error'), description: (e as Error).message });
    }
  }

  if (editing) {
    const initial =
      editing === 'new'
        ? emptyForm(categories.data?.[0]?.id ?? '')
        : itemToForm(editing);
    return (
      <ItemForm
        initial={initial}
        title={editing === 'new' ? t('items.new') : t('items.edit')}
        saving={upsert.isPending}
        onCancel={() => setEditing(null)}
        onSave={(form) => handleSave(form, editing === 'new' ? undefined : editing.id)}
      />
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <header className="space-y-2">
        <button
          type="button"
          onClick={() => navigate('/inventory')}
          className="tap-target -ml-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          {t('common.back')}
        </button>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{t('items.title')}</h1>
          <Button size="sm" onClick={() => setEditing('new')} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {t('items.new')}
          </Button>
        </div>
      </header>

      <Input
        type="search"
        placeholder={t('inventory.search')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {items.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {t('checklist.empty')}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {filtered.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium">{isAr ? item.name_ar : item.name}</span>
                    {!item.active && (
                      <Badge variant="outline" className="text-[10px]">
                        {t('items.inactive')}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {isAr ? item.category.name_ar : item.category.name}
                    {' · '}
                    {t('items.minPar', { min: item.min_level, par: item.par_level })}
                    {' '}
                    {item.unit}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleActive(item)}
                  aria-label={item.active ? t('items.deactivate') : t('items.activate')}
                  title={item.active ? t('items.deactivate') : t('items.activate')}
                >
                  <Power className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(item)}
                  aria-label={t('common.edit')}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ItemForm({
  initial,
  title,
  saving,
  onCancel,
  onSave,
}: {
  initial: FormState;
  title: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (form: FormState) => void;
}) {
  const { t } = useTranslation();
  const categories = useInventoryCategories();
  const [form, setForm] = useState<FormState>(initial);

  const canSave =
    form.name.trim().length > 0 &&
    form.name_ar.trim().length > 0 &&
    form.unit.trim().length > 0 &&
    form.category_id.length > 0;

  return (
    <div className="space-y-4 pb-24">
      <header className="space-y-2">
        <button
          type="button"
          onClick={onCancel}
          className="tap-target -ml-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          {t('common.back')}
        </button>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      </header>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1">
            <Label htmlFor="it-name">{t('items.nameEn')}</Label>
            <Input
              id="it-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="it-name-ar">{t('items.nameAr')}</Label>
            <Input
              id="it-name-ar"
              dir="rtl"
              value={form.name_ar}
              onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t('items.category')}</Label>
              <Select
                value={form.category_id}
                onValueChange={(v) => setForm({ ...form, category_id: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(categories.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="it-unit">{t('items.unit')}</Label>
              <Input
                id="it-unit"
                placeholder="kg / L / pcs"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="it-min">{t('items.min')}</Label>
              <Input
                id="it-min"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={form.min_level}
                onChange={(e) => setForm({ ...form, min_level: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="it-par">{t('items.par')}</Label>
              <Input
                id="it-par"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={form.par_level}
                onChange={(e) => setForm({ ...form, par_level: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="it-cost">{t('items.costPerUnit')}</Label>
              <Input
                id="it-cost"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                placeholder={t('items.costOptional')}
                value={form.cost_per_unit}
                onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="it-sup">{t('items.supplier')}</Label>
              <Input
                id="it-sup"
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="it-notes">{t('items.notes')}</Label>
            <Textarea
              id="it-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
            <Label className="cursor-pointer">{t('items.activeLabel')}</Label>
            <Switch
              checked={form.active}
              onCheckedChange={(v) => setForm({ ...form, active: v })}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
            <Button
              className="flex-1"
              disabled={!canSave || saving}
              onClick={() => onSave(form)}
            >
              {t('common.save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
