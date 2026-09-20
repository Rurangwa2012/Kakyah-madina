export type UserRole = "owner" | "cashier";

export type PaymentMethod = "cash" | "card" | "mobile";

export type OrderStatus = "completed" | "cancelled" | "refunded";

export type GroupPaymentStatus = "paid" | "not_paid";

export type GroupOrderStatus = "pending" | "completed" | "cancelled";

export type GroupFulfillment = "pickup" | "delivery";

export type InventoryStatus = "good" | "low" | "out";

export type StockMovementType =
  | "stock_in"
  | "stock_out"
  | "waste"
  | "correction"
  | "buffet_use";

export type ExpenseCategory =
  | "ingredients"
  | "packaging"
  | "gas"
  | "electricity"
  | "transport"
  | "cleaning"
  | "salary"
  | "maintenance"
  | "other";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "ORDER_CREATED"
  | "ORDER_CANCELLED"
  | "ORDER_REFUNDED"
  | "RECEIPT_REPRINTED"
  | "STOCK_ADDED"
  | "WASTE_RECORDED"
  | "STOCK_UPDATED"
  | "GROUP_ORDER_CREATED"
  | "GROUP_ORDER_COMPLETED"
  | "GROUP_ORDER_CANCELLED"
  | "MENU_CREATED"
  | "MENU_UPDATED"
  | "MENU_PRICE_CHANGED"
  | "MENU_ARCHIVED"
  | "MENU_DELETED"
  | "EXPENSE_CREATED"
  | "EMPLOYEE_CREATED"
  | "EMPLOYEE_UPDATED"
  | "SETTINGS_UPDATED"
  | "BUFFET_UPDATED";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  inventory_access: boolean;
  active: boolean;
  created_at: number;
  updated_at: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price_halalas: number;
  image_url: string;
  available: boolean;
  sold_out: boolean;
  archived: boolean;
  is_extra: boolean;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface OrderLine {
  menu_id: string;
  name: string;
  quantity: number;
  unit_price_halalas: number;
  total_halalas: number;
}

export interface StudentOrder {
  id: string;
  order_number: string;
  type: "student";
  lines: OrderLine[];
  subtotal_halalas: number;
  discount_halalas: number;
  total_halalas: number;
  payment_method: PaymentMethod;
  status: OrderStatus;
  cashier_id: string;
  cashier_name: string;
  created_at: number;
  updated_at: number;
  date_key: string;
}

export interface GroupOrder {
  id: string;
  order_number: string;
  type: "group";
  group_name: string;
  contact_number: string;
  location: string;
  food_description: string;
  quantity: number;
  fulfillment: GroupFulfillment;
  pickup_time: number;
  payment_status: GroupPaymentStatus;
  status: GroupOrderStatus;
  total_halalas: number;
  cashier_id: string;
  cashier_name: string;
  created_at: number;
  updated_at: number;
  date_key: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  min_stock: number;
  status: InventoryStatus;
  cost_halalas: number;
  last_updated: number;
  created_at: number;
}

export interface StockMovement {
  id: string;
  inventory_id: string;
  item_name: string;
  type: StockMovementType;
  quantity: number;
  unit: string;
  previous_quantity: number;
  new_quantity: number;
  note: string;
  created_by: string;
  created_by_name: string;
  created_at: number;
}

export interface BuffetTracking {
  id: string;
  date_key: string;
  food: string;
  prepared: number;
  sold: number;
  waste: number;
  remaining: number;
  created_by: string;
  created_by_name: string;
  created_at: number;
  updated_at: number;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount_halalas: number;
  payment_method: PaymentMethod;
  date_key: string;
  created_by: string;
  created_by_name: string;
  created_at: number;
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  message: string;
  actor_id: string;
  actor_name: string;
  actor_role: UserRole;
  created_at: number;
  meta?: Record<string, string | number | boolean>;
}

export interface DailySummary {
  id: string;
  date: string;
  total_sales_halalas: number;
  student_sales_halalas: number;
  group_sales_halalas: number;
  cash_sales_halalas: number;
  card_sales_halalas: number;
  mobile_sales_halalas: number;
  order_count: number;
  student_order_count: number;
  group_order_count: number;
  expenses_halalas: number;
  updated_at: number;
}

export interface RestaurantSettings {
  id: string;
  restaurant_name: string;
  currency: string;
  receipt_footer: string;
  student_order_prefix: string;
  group_order_prefix: string;
  payment_methods: PaymentMethod[];
  low_stock_alert: boolean;
  printer: {
    type: "browser" | "usb" | "bluetooth" | "network";
    paper_width_mm: number;
    network_address?: string;
  };
  owner_approval_required: boolean;
  updated_at: number;
}

export interface CounterDoc {
  id: string;
  value: number;
  prefix: string;
  updated_at: number;
}

export const MENU_CATEGORIES = [
  "Rice",
  "Chicken",
  "Beef",
  "Curry",
  "Vegetables",
  "Sides",
  "Drinks",
  "Extras",
] as const;

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "ingredients",
  "packaging",
  "gas",
  "electricity",
  "transport",
  "cleaning",
  "salary",
  "maintenance",
  "other",
];
