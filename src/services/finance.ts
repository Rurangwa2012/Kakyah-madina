import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/collections";
import { getDb } from "@/lib/firebase";
import { bumpDailySummary, writeAuditLog } from "@/lib/firestore";
import { toDateKey } from "@/utils/date";
import type { AppUser, AuditLog, DailySummary, Expense } from "@/types";

export function listenExpenses(cb: (rows: Expense[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(getDb(), COLLECTIONS.expenses), orderBy("created_at", "desc")),
    (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Expense, "id">) })));
    },
  );
}

export async function createExpense(
  input: Omit<Expense, "id" | "created_at">,
  actor: AppUser,
): Promise<void> {
  await addDoc(collection(getDb(), COLLECTIONS.expenses), {
    ...input,
    amount_halalas: Math.round(input.amount_halalas),
    created_at: Date.now(),
    server_created_at: serverTimestamp(),
  });
  await bumpDailySummary({
    dateKey: input.date_key,
    expenses: Math.round(input.amount_halalas),
  });
  await writeAuditLog({
    action: "EXPENSE_CREATED",
    message: `${actor.name} recorded expense ${input.description}`,
    actor_id: actor.id,
    actor_name: actor.name,
    actor_role: actor.role,
  });
}

export function listenAuditLogs(cb: (rows: AuditLog[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(getDb(), COLLECTIONS.auditLogs), orderBy("created_at", "desc")),
    (snap) => {
      cb(
        snap.docs
          .slice(0, 200)
          .map((d) => ({ id: d.id, ...(d.data() as Omit<AuditLog, "id">) })),
      );
    },
  );
}

export function listenDailySummaries(
  startDate: string,
  endDate: string,
  cb: (rows: DailySummary[]) => void,
): Unsubscribe {
  const q = query(
    collection(getDb(), COLLECTIONS.dailySummaries),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "asc"),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DailySummary, "id">) })));
  });
}

export function emptySummary(date = toDateKey()): DailySummary {
  return {
    id: date,
    date,
    total_sales_halalas: 0,
    student_sales_halalas: 0,
    group_sales_halalas: 0,
    cash_sales_halalas: 0,
    card_sales_halalas: 0,
    mobile_sales_halalas: 0,
    order_count: 0,
    student_order_count: 0,
    group_order_count: 0,
    expenses_halalas: 0,
    updated_at: Date.now(),
  };
}
