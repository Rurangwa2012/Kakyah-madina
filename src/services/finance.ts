import {
  addDoc,
  collection,
  query,
  serverTimestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/collections";
import { getDb } from "@/lib/firebase";
import { bumpDailySummary, writeAuditLog } from "@/lib/firestore";
import { listenDocs } from "@/lib/listen";
import { toDateKey } from "@/utils/date";
import type { AppUser, AuditLog, DailySummary, Expense } from "@/types";

export function listenExpenses(cb: (rows: Expense[]) => void): Unsubscribe {
  return listenDocs(
    collection(getDb(), COLLECTIONS.expenses),
    (id, data) => ({ id, ...(data as Omit<Expense, "id">) }),
    (rows) => cb([...rows].sort((a, b) => b.created_at - a.created_at)),
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
  return listenDocs(
    collection(getDb(), COLLECTIONS.auditLogs),
    (id, data) => ({ id, ...(data as Omit<AuditLog, "id">) }),
    (rows) => cb([...rows].sort((a, b) => b.created_at - a.created_at).slice(0, 200)),
  );
}

export function listenDailySummaries(
  startDate: string,
  endDate: string,
  cb: (rows: DailySummary[]) => void,
): Unsubscribe {
  return listenDocs(
    query(
      collection(getDb(), COLLECTIONS.dailySummaries),
      where("date", ">=", startDate),
      where("date", "<=", endDate),
    ),
    (id, data) => ({ id, ...(data as Omit<DailySummary, "id">) }),
    (rows) => cb([...rows].sort((a, b) => a.date.localeCompare(b.date))),
  );
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
