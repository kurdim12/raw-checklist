/**
 * Hand-written Database types matching supabase/migrations/0001_init.sql.
 * Replace with the generated types once you wire up `supabase gen types typescript`.
 */

export type ShiftType = 'opening' | 'closing';
export type ChecklistSection = 'outside' | 'inside' | 'operation' | 'end_shift' | 'handover';
export type ChecklistFrequency = 'every_shift' | 'mon_thu_fri' | 'weekly';
export type StaffRole = 'manager' | 'barista';
export type ShiftRole = 'artist' | 'assistant' | 'free';
export type MovementReason = 'restock' | 'daily_use' | 'waste' | 'correction' | 'order_received';
export type OrderStatus = 'draft' | 'sent' | 'received' | 'cancelled';

export interface Profile {
  id: string;
  display_name: string;
  role: StaffRole;
  phone: string | null;
  active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChecklistTemplate {
  id: string;
  shift: ShiftType;
  section: ChecklistSection;
  code: string;
  title: string;
  title_ar: string;
  instructions: string | null;
  instructions_ar: string | null;
  order_index: number;
  frequency: ChecklistFrequency;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChecklistRun {
  id: string;
  shift_date: string;
  shift: ShiftType;
  opened_by: string | null;
  closed_by: string | null;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistRunItem {
  id: string;
  run_id: string;
  template_id: string;
  done: boolean;
  done_by: string | null;
  done_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  name_ar: string;
  icon: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  category_id: string;
  name: string;
  name_ar: string;
  unit: string;
  quantity: number | null;
  min_level: number;
  par_level: number;
  supplier: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  item_id: string;
  delta: number;
  reason: MovementReason;
  note: string | null;
  by_user: string | null;
  created_at: string;
}

export interface Shift {
  id: string;
  staff_id: string;
  shift_date: string;
  start_time: string | null;
  end_time: string | null;
  role: ShiftRole;
  is_off: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockOrder {
  id: string;
  status: OrderStatus;
  created_by: string | null;
  sent_at: string | null;
  received_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockOrderItem {
  id: string;
  order_id: string;
  item_id: string;
  quantity_ordered: number;
  quantity_received: number | null;
  notes: string | null;
  created_at: string;
}

export interface LowStockAlert {
  id: string;
  item_id: string;
  quantity_at_alert: number;
  min_level_at_alert: number;
  sent_at: string | null;
  webhook_response: string | null;
  created_at: string;
}

export type RecipeCategory = 'black' | 'white';

export interface Recipe {
  id: string;
  code: string;
  category: RecipeCategory;
  is_iced: boolean;
  name: string;
  name_ar: string | null;
  glassware: string | null;
  ratio: string | null;
  grind: string | null;
  time_target: string | null;
  steps: string[];
  notes: string | null;
  order_index: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

type TableShape<TRow, TInsert = Partial<TRow>, TUpdate = Partial<TRow>> = {
  Row: TRow;
  Insert: TInsert;
  Update: TUpdate;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableShape<Profile, Partial<Profile> & Pick<Profile, 'id' | 'display_name' | 'role'>>;
      checklist_templates: TableShape<ChecklistTemplate>;
      checklist_runs: TableShape<ChecklistRun>;
      checklist_run_items: TableShape<ChecklistRunItem>;
      inventory_categories: TableShape<InventoryCategory>;
      inventory_items: TableShape<InventoryItem>;
      inventory_movements: TableShape<InventoryMovement>;
      shifts: TableShape<Shift>;
      stock_orders: TableShape<StockOrder>;
      stock_order_items: TableShape<StockOrderItem>;
      low_stock_alerts: TableShape<LowStockAlert>;
      recipes: TableShape<Recipe>;
    };
    Views: Record<string, never>;
    Functions: {
      apply_inventory_movement: { Args: { p_item_id: string; p_delta: number; p_reason: MovementReason; p_note?: string | null }; Returns: string };
      open_checklist_run: { Args: { p_shift: ShiftType }; Returns: string };
      set_run_item_done: { Args: { p_run_item_id: string; p_done: boolean; p_note?: string | null }; Returns: void };
      close_checklist_run: { Args: { p_run_id: string; p_notes?: string | null }; Returns: void };
      create_order_from_low_stock: { Args: Record<string, never>; Returns: string };
      receive_stock_order: { Args: { p_order_id: string }; Returns: void };
      today_amman: { Args: Record<string, never>; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
