import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Package, Plus, Send, CheckCheck, X, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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
  useAddOrderLine,
  useCreateOrderFromLowStock,
  useDeleteOrderLine,
  useMarkOrderReceived,
  useOrders,
  useUpdateOrderLine,
  useUpdateOrderStatus,
  type OrderWithItems,
} from '@/features/orders/queries';
import { useInventory } from '@/features/inventory/queries';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types/database';

const STATUS_VARIANT: Record<OrderStatus, 'accent' | 'ok' | 'outline' | 'low'> = {
  draft: 'outline',
  sent: 'accent',
  received: 'ok',
  cancelled: 'low',
};

export function OrdersRoute() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { toast } = useToast();
  const manager = isManager(profile);
  const orders = useOrders();
  const create = useCreateOrderFromLowStock();

  async function handleCreate() {
    try {
      await create.mutateAsync();
      toast({ title: t('inventory.log.saved') });
    } catch (e) {
      const msg = (e as Error).message;
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: msg.includes('no low-stock') ? t('orders.noLowStock') : msg,
      });
    }
  }

  return (
    <div className="space-y-4 pb-24">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t('orders.title')}</h1>
        {manager && (
          <Button size="sm" onClick={handleCreate} disabled={create.isPending} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {t('orders.createFromLow')}
          </Button>
        )}
      </header>

      {orders.isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!orders.isLoading && (orders.data?.length ?? 0) === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <p className="mt-3 text-sm text-muted-foreground">{t('orders.empty')}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {(orders.data ?? []).map((o) => (
          <OrderCard key={o.id} order={o} manager={manager} />
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order, manager }: { order: OrderWithItems; manager: boolean }) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(order.status === 'draft' || order.status === 'sent');
  const isAr = i18n.language.startsWith('ar');

  const updateStatus = useUpdateOrderStatus();
  const receive = useMarkOrderReceived();
  const updateLine = useUpdateOrderLine();
  const deleteLine = useDeleteOrderLine();
  const addLine = useAddOrderLine();

  const totalQty = order.items.reduce((sum, it) => sum + Number(it.quantity_ordered ?? 0), 0);
  const editable = manager && order.status === 'sent';
  const draftEditable = manager && order.status === 'draft';

  const [received, setReceived] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      order.items.map((it) => [
        it.id,
        String(it.quantity_received ?? it.quantity_ordered ?? 0),
      ]),
    ),
  );

  const partialPayload = useMemo(
    () =>
      order.items.map((it) => ({
        line_id: it.id,
        quantity_received: Number(received[it.id] ?? it.quantity_ordered ?? 0) || 0,
      })),
    [order.items, received],
  );

  const anyEdited = useMemo(
    () =>
      order.items.some(
        (it) =>
          Number(received[it.id] ?? it.quantity_ordered ?? 0) !==
          Number(it.quantity_ordered ?? 0),
      ),
    [order.items, received],
  );

  async function setStatus(status: 'sent' | 'cancelled') {
    try {
      await updateStatus.mutateAsync({ orderId: order.id, status });
    } catch (e) {
      toast({ variant: 'destructive', title: t('common.error'), description: (e as Error).message });
    }
  }

  async function markReceived() {
    try {
      await receive.mutateAsync({
        orderId: order.id,
        received: anyEdited ? partialPayload : undefined,
      });
      toast({ title: t('inventory.log.saved') });
    } catch (e) {
      toast({ variant: 'destructive', title: t('common.error'), description: (e as Error).message });
    }
  }

  async function saveLineQty(lineId: string, raw: string, original: number) {
    const next = Number(raw);
    if (!raw || Number.isNaN(next) || next <= 0 || next === original) return;
    try {
      await updateLine.mutateAsync({ lineId, quantity: next });
    } catch (e) {
      toast({ variant: 'destructive', title: t('common.error'), description: (e as Error).message });
    }
  }

  async function removeLine(lineId: string) {
    if (!window.confirm(t('orders.removeLineConfirm'))) return;
    try {
      await deleteLine.mutateAsync(lineId);
    } catch (e) {
      toast({ variant: 'destructive', title: t('common.error'), description: (e as Error).message });
    }
  }

  async function addItem(itemId: string, quantity: number) {
    try {
      await addLine.mutateAsync({ orderId: order.id, itemId, quantity });
    } catch (e) {
      toast({ variant: 'destructive', title: t('common.error'), description: (e as Error).message });
    }
  }

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-start"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_VARIANT[order.status]}>
              {t(`orders.status.${order.status}`)}
            </Badge>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatDate(order.created_at.slice(0, 10), isAr ? 'd MMM' : 'd MMM yyyy')}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            {order.items.length} {t('inventory.title').toLowerCase()} · {totalQty}
          </p>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <CardContent className="border-t border-border pt-3">
          {editable && (
            <p className="mb-2 text-xs text-muted-foreground">{t('orders.partialHint')}</p>
          )}
          {draftEditable && (
            <p className="mb-2 text-xs text-muted-foreground">{t('orders.draftHint')}</p>
          )}
          <ul className="space-y-1.5 text-sm">
            {order.items.map((it) => (
              <li key={it.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate">
                  {isAr ? it.item.name_ar : it.item.name}
                </span>
                {editable ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0"
                      className="h-8 w-20 text-end font-mono tabular-nums"
                      value={received[it.id] ?? ''}
                      onChange={(e) =>
                        setReceived((r) => ({ ...r, [it.id]: e.target.value }))
                      }
                      aria-label={t('orders.receivedQty')}
                    />
                    <span className="w-12 text-xs text-muted-foreground">
                      / {it.quantity_ordered} {it.item.unit}
                    </span>
                  </div>
                ) : draftEditable ? (
                  <DraftLineEditor
                    line={it}
                    onSave={(raw) => saveLineQty(it.id, raw, Number(it.quantity_ordered))}
                    onRemove={() => removeLine(it.id)}
                    busy={updateLine.isPending || deleteLine.isPending}
                  />
                ) : (
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {order.status === 'received' && it.quantity_received != null
                      ? `${it.quantity_received} / ${it.quantity_ordered}`
                      : it.quantity_ordered}{' '}
                    {it.item.unit}
                  </span>
                )}
              </li>
            ))}
          </ul>

          {draftEditable && (
            <AddLineForm
              existingItemIds={order.items.map((it) => it.item.id)}
              onAdd={addItem}
              busy={addLine.isPending}
            />
          )}

          {manager && (
            <div className="mt-4 flex flex-wrap gap-2">
              {order.status === 'draft' && (
                <>
                  <Button size="sm" onClick={() => setStatus('sent')} className="gap-1.5">
                    <Send className="h-4 w-4" />
                    {t('orders.sendOrder')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setStatus('cancelled')} className="gap-1.5">
                    <X className="h-4 w-4" />
                    {t('orders.cancel')}
                  </Button>
                </>
              )}
              {order.status === 'sent' && (
                <Button size="sm" onClick={markReceived} disabled={receive.isPending} className="gap-1.5">
                  <CheckCheck className="h-4 w-4" />
                  {t('orders.markReceived')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

type OrderLine = OrderWithItems['items'][number];

function DraftLineEditor({
  line,
  onSave,
  onRemove,
  busy,
}: {
  line: OrderLine;
  onSave: (raw: string) => void;
  onRemove: () => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(String(line.quantity_ordered ?? 0));

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        inputMode="decimal"
        step="any"
        min="0"
        className="h-8 w-20 text-end font-mono tabular-nums"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => onSave(value)}
        aria-label={t('orders.orderedQty')}
      />
      <span className="w-8 text-xs text-muted-foreground">{line.item.unit}</span>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-destructive hover:text-destructive"
        onClick={onRemove}
        disabled={busy}
        aria-label={t('orders.removeLine')}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function AddLineForm({
  existingItemIds,
  onAdd,
  busy,
}: {
  existingItemIds: string[];
  onAdd: (itemId: string, quantity: number) => Promise<void> | void;
  busy: boolean;
}) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const inventory = useInventory();
  const [itemId, setItemId] = useState<string>('');
  const [qty, setQty] = useState<string>('');

  const available = useMemo(() => {
    const existing = new Set(existingItemIds);
    return (inventory.data ?? []).filter((i) => !existing.has(i.id));
  }, [inventory.data, existingItemIds]);

  async function submit() {
    const n = Number(qty);
    if (!itemId || !qty || Number.isNaN(n) || n <= 0) return;
    await onAdd(itemId, n);
    setItemId('');
    setQty('');
  }

  if (available.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border p-2">
      <Select value={itemId} onValueChange={setItemId}>
        <SelectTrigger className="h-8 flex-1 min-w-[10rem]">
          <SelectValue placeholder={t('orders.addItemPlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          {available.map((i) => (
            <SelectItem key={i.id} value={i.id}>
              {isAr ? i.name_ar : i.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="number"
        inputMode="decimal"
        step="any"
        min="0"
        placeholder={t('orders.qty')}
        className="h-8 w-20 text-end font-mono tabular-nums"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
      />
      <Button size="sm" onClick={submit} disabled={busy || !itemId || !qty} className="gap-1">
        <Plus className="h-4 w-4" />
        {t('common.add')}
      </Button>
    </div>
  );
}
