import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { InventoryItem, StockOrder, StockOrderItem } from '@/types/database';

export interface OrderWithItems extends StockOrder {
  items: Array<
    StockOrderItem & {
      item: Pick<InventoryItem, 'id' | 'name' | 'name_ar' | 'unit'>;
    }
  >;
}

export function useOrders() {
  return useQuery({
    queryKey: ['stockOrders'],
    queryFn: async (): Promise<OrderWithItems[]> => {
      const { data, error } = await supabase
        .from('stock_orders')
        .select(
          '*, items:stock_order_items(*, item:inventory_items(id, name, name_ar, unit))',
        )
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as OrderWithItems[];
    },
  });
}

export function useCreateOrderFromLowStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<string> => {
      const { data, error } = await supabase.rpc('create_order_from_low_stock');
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stockOrders'] });
    },
  });
}

export function useMarkOrderReceived() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.rpc('receive_stock_order', { p_order_id: orderId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stockOrders'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['lowStockCount'] });
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { orderId: string; status: 'sent' | 'cancelled' }) => {
      const patch: Record<string, unknown> = { status: args.status };
      if (args.status === 'sent') patch.sent_at = new Date().toISOString();
      const { error } = await supabase
        .from('stock_orders')
        .update(patch)
        .eq('id', args.orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stockOrders'] });
    },
  });
}
