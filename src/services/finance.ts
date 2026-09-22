import { bumpDailySummary, writeAuditLog } from "@/lib/firestore";
import { listenQuery, type Unsubscribe } from "@/lib/listen";
import { getSupabase, throwIfError } from "@/lib/supabase";
import { toDateKey } from "@/utils/date";
import type { AppUser, AuditLog, DailySummary, Expense } from "@/types";

export function listenExpenses(cb: (rows: Expense[]) => void): Unsubscribe {
  return listenQuery(
    "expenses",
    async () => {
      const { data, error } = await getSupabase().from("expenses").select("*");
      throwIfError(error);
      return (data ?? [])
        .map((row) => ({ id: String(row.id), ...(row as Omit<Expense, "id">) }))
        .sort((a, b) => b.created_at - a.created_at);
    },
    cb,
  );
}

export async function createExpense(
  input: Omit<Expense, "id" | "created_at">,
  actor: AppUser,
): Promise<void> {
  const { error } = await getSupabase().from("expenses").insert({
    ...input,
    amount_halalas: Math.round(input.amount_halalas),
    created_at: Date.now(),
  });
  throwIfError(error);
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
  return listenQuery(
    "audit_logs",
    async () => {
      const { data, error } = await getSupabase()
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      throwIfError(error);
      return (data ?? []).map((row) => ({
        id: String(row.id),
        ...(row as Omit<AuditLog, "id">),
      }));
    },
    cb,
  );
}

export function listenDailySummaries(
  startDate: string,
  endDate: string,
  cb: (rows: DailySummary[]) => void,
): Unsubscribe {
  return listenQuery(
    "daily_summaries",
    async () => {
      const { data, error } = await getSupabase()
        .from("daily_summaries")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true });
      throwIfError(error);
      return (data ?? []).map((row) => ({
        id: String(row.id),
        ...(row as Omit<DailySummary, "id">),
      }));
    },
    cb,
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
