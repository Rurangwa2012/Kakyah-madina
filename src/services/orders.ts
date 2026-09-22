import { GROUP_COUNTER_ID, STUDENT_COUNTER_ID } from "@/lib/collections";
import { bumpDailySummary, nextOrderNumber, paymentIncrement, writeAuditLog } from "@/lib/firestore";
import { listenQuery, type Unsubscribe } from "@/lib/listen";
import { getSupabase, throwIfError } from "@/lib/supabase";
import { toDateKey } from "@/utils/date";
import { applyDiscount, orderSubtotal, payableTotal } from "@/utils/money";
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
  lines: OrderLine[];
  discount_halalas: number;
  payment_method: PaymentMethod;
  actor: AppUser;
  studentPrefix?: string;
}): Promise<StudentOrder> {
  const subtotal = orderSubtotal(input.lines);
  const total = payableTotal(applyDiscount(subtotal, input.discount_halalas), input.payment_method);
  const order_number = await nextOrderNumber(STUDENT_COUNTER_ID, input.studentPrefix ?? "S");
  const now = Date.now();
  const payload = {
    order_number,
    type: "student" as const,
    lines: input.lines,
    subtotal_halalas: subtotal,
    discount_halalas: Math.round(input.discount_halalas),
    total_halalas: total,
    payment_method: input.payment_method,
    status: "completed" as const,
    cashier_id: input.actor.id,
    cashier_name: input.actor.name,
    created_at: now,
    updated_at: now,
    date_key: toDateKey(),
  };
  const { data, error } = await getSupabase().from("orders").insert(payload).select("id").single();
  throwIfError(error);
  if (!data) throw new Error("Could not save order");
  await bumpDailySummary({
    totalSales: total,
    studentSales: total,
    orderCount: 1,
    studentOrderCount: 1,
    ...paymentIncrement(input.payment_method, total),
  });
  await writeAuditLog({
    action: "ORDER_CREATED",
    message: `${input.actor.name} created ${order_number}`,
    actor_id: input.actor.id,
    actor_name: input.actor.name,
    actor_role: input.actor.role,
    meta: { order_number, total },
  });
  return { id: String(data.id), ...payload };
}

export async function cancelStudentOrder(
  order: StudentOrder,
  actor: AppUser,
  refund = false,
): Promise<void> {
  const { data, error } = await getSupabase().from("orders").select("*").eq("id", order.id).single();
  throwIfError(error);
  const current = mapOrder(data as Record<string, unknown>);
  if (current.status !== "completed") throw new Error("Order already closed");
  const { error: upd } = await getSupabase()
    .from("orders")
    .update({ status: refund ? "refunded" : "cancelled", updated_at: Date.now() })
    .eq("id", order.id)
    .eq("status", "completed");
  throwIfError(upd);
  const reverse = -current.total_halalas;
  await bumpDailySummary({
    dateKey: current.date_key,
    totalSales: reverse,
    studentSales: reverse,
    orderCount: -1,
    studentOrderCount: -1,
    ...paymentIncrement(current.payment_method, reverse),
  });
  await writeAuditLog({
    action: refund ? "ORDER_REFUNDED" : "ORDER_CANCELLED",
    message: `${actor.name} ${refund ? "refunded" : "cancelled"} ${order.order_number}`,
    actor_id: actor.id,
    actor_name: actor.name,
    actor_role: actor.role,
  });
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
