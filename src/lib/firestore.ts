import { toDateKey } from "@/utils/date";
import { getSupabase, throwIfError } from "@/lib/supabase";
import type { AuditAction, PaymentMethod, UserRole } from "@/types";

export async function writeAuditLog(input: {
  action: AuditAction;
  message: string;
  actor_id: string;
  actor_name: string;
  actor_role: UserRole;
  meta?: Record<string, string | number | boolean>;
}): Promise<void> {
  const { error } = await getSupabase().from("audit_logs").insert({
    ...input,
    created_at: Date.now(),
  });
  throwIfError(error);
}

export async function bumpDailySummary(input: {
  dateKey?: string;
  totalSales?: number;
  studentSales?: number;
  groupSales?: number;
  cashSales?: number;
  cardSales?: number;
  mobileSales?: number;
  orderCount?: number;
  studentOrderCount?: number;
  groupOrderCount?: number;
  expenses?: number;
}): Promise<void> {
  const date = input.dateKey ?? toDateKey();
  const { error } = await getSupabase().rpc("bump_daily_summary", {
    p_date: date,
    p_total_sales: input.totalSales ?? 0,
    p_student_sales: input.studentSales ?? 0,
    p_group_sales: input.groupSales ?? 0,
    p_cash: input.cashSales ?? 0,
    p_card: input.cardSales ?? 0,
    p_mobile: input.mobileSales ?? 0,
    p_order_count: input.orderCount ?? 0,
    p_student_orders: input.studentOrderCount ?? 0,
    p_group_orders: input.groupOrderCount ?? 0,
    p_expenses: input.expenses ?? 0,
  });
  throwIfError(error);
}

export function paymentIncrement(
  method: PaymentMethod,
  amount: number,
): { cashSales?: number; cardSales?: number; mobileSales?: number } {
  if (method === "cash") return { cashSales: amount };
  if (method === "card" || method === "mada" || method === "apple_pay") return { cardSales: amount };
  return { mobileSales: amount };
}

export async function nextOrderNumber(counterId: string, prefix: string): Promise<string> {
  const { data, error } = await getSupabase().rpc("next_order_number", {
    p_id: counterId,
    p_prefix: prefix,
  });
  throwIfError(error);
  return String(data);
}

export async function createOwnProfile(input: {
  uid: string;
  email: string;
  name?: string;
  role: UserRole;
}): Promise<void> {
  const now = Date.now();
  const { error } = await getSupabase().from("profiles").upsert({
    id: input.uid,
    name: input.name ?? (input.role === "owner" ? "Owner" : "Cashier"),
    email: input.email,
    role: input.role,
    inventory_access: true,
    active: true,
    created_at: now,
    updated_at: now,
  });
  throwIfError(error);
}
