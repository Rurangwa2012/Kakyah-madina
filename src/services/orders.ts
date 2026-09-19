import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { GROUP_COUNTER_ID, STUDENT_COUNTER_ID, COLLECTIONS } from "@/lib/collections";
import { getDb } from "@/lib/firebase";
import { bumpDailySummary, nextOrderNumber, paymentIncrement, writeAuditLog } from "@/lib/firestore";
import { toDateKey } from "@/utils/date";
import { applyDiscount, orderSubtotal } from "@/utils/money";
import type {
  AppUser,
  GroupOrder,
  GroupOrderStatus,
  GroupPaymentStatus,
  OrderLine,
  PaymentMethod,
  StudentOrder,
} from "@/types";

export function listenTodayOrders(cb: (orders: StudentOrder[]) => void): Unsubscribe {
  const q = query(
    collection(getDb(), COLLECTIONS.orders),
    where("date_key", "==", toDateKey()),
    orderBy("created_at", "desc"),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StudentOrder, "id">) })));
  });
}

export function listenRecentOrders(cb: (orders: StudentOrder[]) => void): Unsubscribe {
  const q = query(collection(getDb(), COLLECTIONS.orders), orderBy("created_at", "desc"));
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs
        .slice(0, 20)
        .map((d) => ({ id: d.id, ...(d.data() as Omit<StudentOrder, "id">) })),
    );
  });
}

export async function createStudentOrder(input: {
  lines: OrderLine[];
  discount_halalas: number;
  payment_method: PaymentMethod;
  actor: AppUser;
  studentPrefix?: string;
}): Promise<StudentOrder> {
  const subtotal = orderSubtotal(input.lines);
  const total = applyDiscount(subtotal, input.discount_halalas);
  const order_number = await nextOrderNumber(
    STUDENT_COUNTER_ID,
    input.studentPrefix ?? "S",
  );
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
    server_created_at: serverTimestamp(),
    client_request_id: `${input.actor.id}-${now}`,
  };
  const ref = await addDoc(collection(getDb(), COLLECTIONS.orders), payload);
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
  return { id: ref.id, ...payload };
}

export async function cancelStudentOrder(
  order: StudentOrder,
  actor: AppUser,
  refund = false,
): Promise<void> {
  await updateDoc(doc(getDb(), COLLECTIONS.orders, order.id), {
    status: refund ? "refunded" : "cancelled",
    updated_at: Date.now(),
  });
  const reverse = -order.total_halalas;
  await bumpDailySummary({
    totalSales: reverse,
    studentSales: reverse,
    orderCount: -1,
    studentOrderCount: -1,
    ...paymentIncrement(order.payment_method, reverse),
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
  const q = query(
    collection(getDb(), COLLECTIONS.groupOrders),
    orderBy("pickup_time", "asc"),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GroupOrder, "id">) })));
  });
}

export async function createGroupOrder(input: {
  group_name: string;
  contact_number: string;
  location: string;
  food_description: string;
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
    server_created_at: serverTimestamp(),
  };
  const ref = await addDoc(collection(getDb(), COLLECTIONS.groupOrders), payload);
  if (input.payment_status === "paid" && input.total_halalas > 0) {
    await bumpDailySummary({
      totalSales: payload.total_halalas,
      groupSales: payload.total_halalas,
      orderCount: 1,
      groupOrderCount: 1,
      cashSales: payload.total_halalas,
    });
  } else {
    await bumpDailySummary({
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
  return { id: ref.id, ...payload };
}

export async function updateGroupOrderStatus(
  order: GroupOrder,
  status: GroupOrderStatus,
  actor: AppUser,
): Promise<void> {
  await updateDoc(doc(getDb(), COLLECTIONS.groupOrders, order.id), {
    status,
    updated_at: Date.now(),
  });
  await writeAuditLog({
    action: status === "completed" ? "GROUP_ORDER_COMPLETED" : "GROUP_ORDER_CANCELLED",
    message: `${actor.name} marked ${order.order_number} ${status}`,
    actor_id: actor.id,
    actor_name: actor.name,
    actor_role: actor.role,
  });
}
