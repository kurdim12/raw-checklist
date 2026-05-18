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

export interface BulkUpdateRow {
  item_id: string;
  quantity: number;
}

export function useBulkUpdateInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: BulkUpdateRow[]) => {
      if (updates.length === 0) return { count: 0 };
      const { error } = await supabase.rpc('admin_bulk_update_inventory', {
        p_updates: updates,
      });
      if (error) throw error;
      return { count: updates.length };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['lowStockCount'] });
    },
  });
}

export function useAllInventoryItems() {
  return useQuery({
    queryKey: ['inventoryAll'],
    queryFn: async (): Promise<InventoryItemRow[]> => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*, category:inventory_categories(id,name,name_ar,icon,order_index)')
        .order('active', { ascending: false })
        .order('name');
      if (error) throw error;
      return (data ?? []) as unknown as InventoryItemRow[];
    },
  });
}

export function useInventoryCategories() {
  return useQuery({
    queryKey: ['inventoryCategories'],
    queryFn: async (): Promise<InventoryCategory[]> => {
      const { data, error } = await supabase
        .from('inventory_categories')
        .select('*')
        .order('order_index');
      if (error) throw error;
      return (data ?? []) as InventoryCategory[];
    },
    staleTime: 60_000,
  });
}

export interface UpsertItemArgs {
  id?: string;
  category_id: string;
  name: string;
  name_ar: string;
  unit: string;
  min_level: number;
  par_level: number;
  supplier?: string | null;
  cost_per_unit?: number | null;
  notes?: string | null;
  active: boolean;
}

export function useUpsertInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: UpsertItemArgs) => {
      const payload = {
        category_id: args.category_id,
        name: args.name,
        name_ar: args.name_ar,
        unit: args.unit,
        min_level: args.min_level,
        par_level: args.par_level,
        supplier: args.supplier ?? null,
        cost_per_unit: args.cost_per_unit ?? null,
        notes: args.notes ?? null,
        active: args.active,
      };
      if (args.id) {
        const { error } = await supabase
          .from('inventory_items')
          .update(payload)
          .eq('id', args.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('inventory_items').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventoryAll'] });
      qc.invalidateQueries({ queryKey: ['lowStockCount'] });
    },
  });
}
