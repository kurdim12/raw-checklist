import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Minus, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useApplyMovement, useInventory } from '@/features/inventory/queries';
import { cn } from '@/lib/utils';
import type { MovementReason } from '@/types/database';

const REASONS: MovementReason[] = ['restock', 'daily_use', 'waste', 'correction', 'order_received'];

export function InventoryLogRoute() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();

  const { data: items, isLoading } = useInventory();
  const apply = useApplyMovement();

  const presetItemId = params.get('item') ?? '';
  const [itemId, setItemId] = useState(presetItemId);
  const [delta, setDelta] = useState<string>('');
  const [reason, setReason] = useState<MovementReason>('daily_use');
  const [note, setNote] = useState('');

  const isAr = i18n.language.startsWith('ar');

  useEffect(() => {
    if (presetItemId && !itemId) setItemId(presetItemId);
  }, [presetItemId, itemId]);

  const selected = useMemo(
    () => items?.find((i) => i.id === itemId) ?? null,
    [items, itemId],
  );

  const numericDelta = Number(delta);
  const canSave =
    !!itemId && !Number.isNaN(numericDelta) && numericDelta !== 0 && !apply.isPending;

  async function handleSave() {
    if (!canSave) return;
    try {
      // Restock + order_received default to positive; daily_use/waste/correction can be negative.
      // Sign of delta is whatever the user typed — we don't auto-flip.
      await apply.mutateAsync({
        itemId,
        delta: numericDelta,
        reason,
        note: note.trim() || null,
      });
      toast({ title: t('inventory.log.saved') });
      navigate('/inventory');
    } catch (e) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: (e as Error).message,
      });
    }
  }

  return (
    <div className="space-y-4 pb-24">
      <header className="space-y-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="tap-target -ml-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          {t('common.back')}
        </button>
        <h1 className="text-2xl font-bold tracking-tight">{t('inventory.log.title')}</h1>
      </header>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="item">{t('inventory.log.item')}</Label>
            {isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <Select value={itemId} onValueChange={setItemId}>
                <SelectTrigger id="item">
                  <SelectValue placeholder={t('inventory.log.item')} />
                </SelectTrigger>
                <SelectContent>
                  {(items ?? []).map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {isAr ? i.name_ar : i.name} ({i.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selected && (
              <p className="text-xs text-muted-foreground tabular-nums">
                {t('inventory.quantity')}: {selected.quantity ?? '—'} {selected.unit}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="delta">{t('inventory.log.delta')}</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setDelta(String((Number(delta) || 0) - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                id="delta"
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="0"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                className="text-center text-lg tabular-nums"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setDelta(String((Number(delta) || 0) + 1))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {numericDelta > 0
                ? `+${numericDelta} ${selected?.unit ?? ''}`
                : numericDelta < 0
                  ? `${numericDelta} ${selected?.unit ?? ''}`
                  : ''}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t('inventory.log.reason')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {REASONS.map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setReason(r)}
                  className={cn(
                    'tap-target rounded-md border px-3 py-2.5 text-sm font-medium transition-colors',
                    reason === r
                      ? 'border-accent bg-accent/15 text-accent'
                      : 'border-border bg-card hover:bg-secondary/60',
                  )}
                >
                  {t(`inventory.log.reasons.${r}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">{t('inventory.log.note')}</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('inventory.log.note')}
            />
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-20 left-0 right-0 z-20 px-4 safe-bottom">
        <Button
          size="lg"
          className="w-full shadow-lg"
          disabled={!canSave}
          onClick={handleSave}
        >
          {t('inventory.log.save')}
        </Button>
      </div>
    </div>
  );
}
