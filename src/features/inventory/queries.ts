import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { InventoryCategory, InventoryItem } from '@/types/database';

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
