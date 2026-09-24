import { GROUP_COUNTER_ID } from "@/lib/collections";
import { bumpDailySummary, nextOrderNumber, writeAuditLog } from "@/lib/firestore";
import { listenQuery, type Unsubscribe } from "@/lib/listen";
import { getSupabase, throwIfError } from "@/lib/supabase";
import { toDateKey } from "@/utils/date";
import type {
  AppUser,
  GroupOrder,
  GroupOrderStatus,
  GroupPaymentStatus,
  OrderLine,
  PaymentMethod,
  StudentOrder,
} from "@/types";

function mapOrder(row: Record<string, unknown>): StudentOrder {
  return {
    id: String(row.id),
    order_number: String(row.order_number),
    type: "student",
    lines: Array.isArray(row.lines) ? (row.lines as OrderLine[]) : [],
    subtotal_halalas: Number(row.subtotal_halalas ?? 0),
    discount_halalas: Number(row.discount_halalas ?? 0),
    total_halalas: Number(row.total_halalas ?? 0),
    payment_method: row.payment_method as PaymentMethod,
    status: row.status as StudentOrder["status"],
    cashier_id: String(row.cashier_id ?? ""),
    cashier_name: String(row.cashier_name ?? ""),
    created_at: Number(row.created_at ?? 0),
    updated_at: Number(row.updated_at ?? 0),
    date_key: String(row.date_key ?? ""),
    vat_amount_halalas: Number(row.vat_amount_halalas ?? 0),
    vat_rate_basis_points: Number(row.vat_rate_basis_points ?? 0),
    subtotal_ex_vat_halalas: Number(row.subtotal_ex_vat_halalas ?? 0),
    total_inc_vat_halalas: Number(row.total_inc_vat_halalas ?? row.total_halalas ?? 0),
    terminal_id: String(row.terminal_id ?? "POS-01"),
    shift_id: row.shift_id ? String(row.shift_id) : "",
    invoice_uuid: row.invoice_uuid ? String(row.invoice_uuid) : "",
    zatca_status: String(row.zatca_status ?? "not_required"),
  };
}

function mapGroup(row: Record<string, unknown>): GroupOrder {
  return {
    id: String(row.id),
    order_number: String(row.order_number),
    type: "group",
    group_name: String(row.group_name ?? ""),
    contact_number: String(row.contact_number ?? ""),
    location: String(row.location ?? ""),
    food_description: String(row.food_description ?? ""),
    lines: Array.isArray(row.lines) ? (row.lines as OrderLine[]) : [],
    quantity: Number(row.quantity ?? 0),
    fulfillment: row.fulfillment as GroupOrder["fulfillment"],
    pickup_time: Number(row.pickup_time ?? 0),
    payment_status: row.payment_status as GroupPaymentStatus,
    status: row.status as GroupOrderStatus,
    total_halalas: Number(row.total_halalas ?? 0),
    cashier_id: String(row.cashier_id ?? ""),
    cashier_name: String(row.cashier_name ?? ""),
    created_at: Number(row.created_at ?? 0),
    updated_at: Number(row.updated_at ?? 0),
    date_key: String(row.date_key ?? ""),
  };
}

export function listenTodayOrders(cb: (orders: StudentOrder[]) => void): Unsubscribe {
  const today = toDateKey();
  return listenQuery(
    "orders",
    async () => {
      const { data, error } = await getSupabase()
        .from("orders")
        .select("*")
        .eq("date_key", today)
        .order("created_at", { ascending: false });
      throwIfError(error);
      return (data ?? []).map((row) => mapOrder(row as Record<string, unknown>));
    },
    cb,
  );
}

export function listenRecentOrders(cb: (orders: StudentOrder[]) => void): Unsubscribe {
  return listenQuery(
    "orders",
    async () => {
      const { data, error } = await getSupabase()
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);
      throwIfError(error);
      return (data ?? []).map((row) => mapOrder(row as Record<string, unknown>));
    },
    cb,
  );
}

export async function createStudentOrder(input: {
  items: Array<{ menu_id: string; quantity: number }>;
  discount_halalas: number;
  payments: Array<{ method: PaymentMethod; amount_halalas: number; provider?: string; transaction_reference?: string }>;
  actor: AppUser;
  idempotency_key: string;
  terminal_id?: string;
  discount_reason?: string;
}): Promise<StudentOrder> {
  const { data, error } = await getSupabase().rpc("finalize_sale", {
    p_items: input.items,
    p_payments: input.payments.map((pay) => ({
      method: pay.method,
      amount_halalas: Math.round(pay.amount_halalas),
      provider: pay.provider ?? "",
      transaction_reference: pay.transaction_reference ?? "",
    })),
    p_discount_halalas: Math.round(input.discount_halalas),
    p_idempotency_key: input.idempotency_key,
    p_terminal_id: input.terminal_id ?? "POS-01",
    p_discount_reason: input.discount_reason ?? "",
  });
  throwIfError(error);
  if (!data) throw new Error("Could not save order");
  return mapOrder(data as Record<string, unknown>);
}

export async function requestRefund(
  order: StudentOrder,
  amountHalalas: number,
  reasonCode: string,
  reasonNote: string,
  paymentMethod: PaymentMethod,
): Promise<void> {
  const { error } = await getSupabase().rpc("create_refund", {
    p_order_id: order.id,
    p_amount_halalas: Math.round(amountHalalas),
    p_reason_code: reasonCode,
    p_reason_note: reasonNote,
    p_payment_method: paymentMethod,
  });
  throwIfError(error);
}

export async function approveRefund(refundId: string): Promise<void> {
  const { error } = await getSupabase().rpc("approve_refund", { p_refund_id: refundId });
  throwIfError(error);
}

export async function cancelStudentOrder(
  order: StudentOrder,
  actor: AppUser,
  refund = false,
): Promise<void> {
  if (refund) {
    await requestRefund(order, order.total_halalas, "other", "Owner refund", order.payment_method);
    return;
  }
  if (order.status === "completed" || order.status === "paid") {
    throw new Error("Paid orders must be refunded. They cannot be deleted.");
  }
  void actor;
}

export function listenGroupOrders(cb: (orders: GroupOrder[]) => void): Unsubscribe {
  return listenQuery(
    "group_orders",
    async () => {
      const { data, error } = await getSupabase().from("group_orders").select("*");
      throwIfError(error);
      return (data ?? [])
        .map((row) => mapGroup(row as Record<string, unknown>))
        .sort((a, b) => a.pickup_time - b.pickup_time);
    },
    cb,
  );
}

export async function createGroupOrder(input: {
  group_name: string;
  contact_number: string;
  location: string;
  food_description: string;
  lines: OrderLine[];
  quantity: number;
  fulfillment: GroupOrder["fulfillment"];
  pickup_time: number;
  payment_status: GroupPaymentStatus;
  total_halalas: number;
  actor: AppUser;
  groupPrefix?: string;
}): Promise<GroupOrder> {
  const order_number = await nextOrderNumber(GROUP_COUNTER_ID, input.groupPrefix ?? "U");
  const now = Date.now();
  const payload = {
    order_number,
    type: "group" as const,
    group_name: input.group_name,
    contact_number: input.contact_number,
    location: input.location,
    food_description: input.food_description,
    lines: input.lines,
    quantity: Math.round(input.quantity),
    fulfillment: input.fulfillment,
    pickup_time: input.pickup_time,
    payment_status: input.payment_status,
    status: "pending" as const,
    total_halalas: Math.round(input.total_halalas),
    cashier_id: input.actor.id,
    cashier_name: input.actor.name,
    created_at: now,
    updated_at: now,
    date_key: toDateKey(new Date(input.pickup_time)),
  };
  let { data, error } = await getSupabase().from("group_orders").insert(payload).select("id").single();
  if (error && /lines/i.test(error.message)) {
    const withoutLines = { ...payload };
    delete (withoutLines as { lines?: OrderLine[] }).lines;
    const retry = await getSupabase().from("group_orders").insert(withoutLines).select("id").single();
    data = retry.data;
    error = retry.error;
  }
  throwIfError(error);
  if (!data) throw new Error("Could not save group order");
  if (input.payment_status === "paid" && input.total_halalas > 0) {
    await bumpDailySummary({
      dateKey: payload.date_key,
      totalSales: payload.total_halalas,
      groupSales: payload.total_halalas,
      orderCount: 1,
      groupOrderCount: 1,
    });
  } else {
    await bumpDailySummary({
      dateKey: payload.date_key,
      orderCount: 1,
      groupOrderCount: 1,
    });
  }
  await writeAuditLog({
    action: "GROUP_ORDER_CREATED",
    message: `${input.actor.name} created ${order_number}`,
    actor_id: input.actor.id,
    actor_name: input.actor.name,
    actor_role: input.actor.role,
  });
  return { id: String(data.id), ...payload };
}

export async function updateGroupOrderStatus(
  order: GroupOrder,
  status: GroupOrderStatus,
  actor: AppUser,
): Promise<void> {
  const { error } = await getSupabase()
    .from("group_orders")
    .update({ status, updated_at: Date.now() })
    .eq("id", order.id);
  throwIfError(error);
  await writeAuditLog({
    action: status === "completed" ? "GROUP_ORDER_COMPLETED" : "GROUP_ORDER_CANCELLED",
    message: `${actor.name} marked ${order.order_number} ${status}`,
    actor_id: actor.id,
    actor_name: actor.name,
    actor_role: actor.role,
  });
}
