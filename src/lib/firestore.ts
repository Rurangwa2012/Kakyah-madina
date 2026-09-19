import {
  addDoc,
  collection,
  doc,
  increment,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/collections";
import { getDb } from "@/lib/firebase";
import { toDateKey } from "@/utils/date";
import type { AuditAction, PaymentMethod, UserRole } from "@/types";

export async function writeAuditLog(input: {
  action: AuditAction;
  message: string;
  actor_id: string;
  actor_name: string;
  actor_role: UserRole;
  meta?: Record<string, string | number | boolean>;
}): Promise<void> {
  await addDoc(collection(getDb(), COLLECTIONS.auditLogs), {
    ...input,
    created_at: Date.now(),
    server_created_at: serverTimestamp(),
  });
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
  const ref = doc(getDb(), COLLECTIONS.dailySummaries, date);
  await setDoc(
    ref,
    {
      date,
      total_sales_halalas: increment(input.totalSales ?? 0),
      student_sales_halalas: increment(input.studentSales ?? 0),
      group_sales_halalas: increment(input.groupSales ?? 0),
      cash_sales_halalas: increment(input.cashSales ?? 0),
      card_sales_halalas: increment(input.cardSales ?? 0),
      mobile_sales_halalas: increment(input.mobileSales ?? 0),
      order_count: increment(input.orderCount ?? 0),
      student_order_count: increment(input.studentOrderCount ?? 0),
      group_order_count: increment(input.groupOrderCount ?? 0),
      expenses_halalas: increment(input.expenses ?? 0),
      updated_at: Date.now(),
    },
    { merge: true },
  );
}

export function paymentIncrement(
  method: PaymentMethod,
  amount: number,
): { cashSales?: number; cardSales?: number; mobileSales?: number } {
  if (method === "cash") return { cashSales: amount };
  if (method === "card") return { cardSales: amount };
  return { mobileSales: amount };
}

export async function nextOrderNumber(
  counterId: string,
  prefix: string,
): Promise<string> {
  const db = getDb();
  const counterRef = doc(db, COLLECTIONS.counters, counterId);
  const value = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? Number(snap.data().value ?? 0) : 0;
    const next = current + 1;
    tx.set(
      counterRef,
      {
        value: next,
        prefix,
        updated_at: Date.now(),
      },
      { merge: true },
    );
    return next;
  });
  return `${prefix}-${String(value).padStart(4, "0")}`;
}

export async function ensureUserProfile(input: {
  uid: string;
  email: string;
  name?: string;
}): Promise<void> {
  const ref = doc(getDb(), COLLECTIONS.users, input.uid);
  await updateDoc(ref, { email: input.email }).catch(async () => {
    await setDoc(ref, {
      name: input.name ?? input.email.split("@")[0],
      email: input.email,
      role: "cashier",
      inventory_access: true,
      active: false,
      created_at: Date.now(),
      updated_at: Date.now(),
    });
  });
}
