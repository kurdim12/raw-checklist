import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  InventoryCategory,
  InventoryItem,
  InventoryMovement,
  MovementReason,
} from '@/types/database';

export interface InventoryItemRow extends InventoryItem {
  category: Pick<InventoryCategory, 'id' | 'name' | 'name_ar' | 'icon' | 'order_index'>;
}

export async function fetchInventory(): Promise<InventoryItemRow[]> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*, category:inventory_categories(id,name,name_ar,icon,order_index)')
    .eq('active', true)
    .order('name');
  if (error) throw error;
  return (data ?? []) as unknown as InventoryItemRow[];
}

export function useInventory() {
  return useQuery({ queryKey: ['inventory'], queryFn: fetchInventory });
}

export function useLowStockCount() {
  return useQuery({
    queryKey: ['lowStockCount'],
    queryFn: async () => {
      const items = await fetchInventory();
      return items.filter((i) => (i.quantity ?? 0) <= i.min_level).length;
    },
    staleTime: 15_000,
  });
}

export function stockState(item: Pick<InventoryItem, 'quantity' | 'min_level'>): 'ok' | 'low' | 'out' {
  const q = item.quantity ?? 0;
  if (q <= 0) return 'out';
  if (q <= item.min_level) return 'low';
  return 'ok';
}

export function useItemMovements(itemId: string | undefined) {
  return useQuery({
    queryKey: ['inventoryMovements', itemId],
    enabled: !!itemId,
    queryFn: async (): Promise<InventoryMovement[]> => {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*')
        .eq('item_id', itemId!)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as InventoryMovement[];
    },
  });
}

export interface ApplyMovementArgs {
  itemId: string;
  delta: number;
  reason: MovementReason;
  note?: string | null;
}

export function useApplyMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: ApplyMovementArgs) => {
      const { error } = await supabase.rpc('apply_inventory_movement', {
        p_item_id: args.itemId,
        p_delta: args.delta,
        p_reason: args.reason,
        p_note: args.note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['lowStockCount'] });
      qc.invalidateQueries({ queryKey: ['inventoryMovements', vars.itemId] });
    },
  });
}
