import { getSupabase, throwIfError } from "@/lib/supabase";

export type ShiftStatus = "open" | "closed" | "reviewed";

export interface Shift {
  id: string;
  cashier_id: string;
  cashier_name: string;
  terminal_id: string;
  opened_at: number;
  opening_cash_halalas: number;
  closed_at: number | null;
  expected_cash_halalas: number | null;
  actual_cash_halalas: number | null;
  cash_difference_halalas: number | null;
  status: ShiftStatus;
  closing_note: string;
}

export interface CashMovement {
  id: string;
  shift_id: string;
  amount_halalas: number;
  type: "cash_in" | "cash_out";
  reason: string;
  created_by_name: string;
  created_at: number;
}

function mapShift(row: Record<string, unknown>): Shift {
  return {
    id: String(row.id),
    cashier_id: String(row.cashier_id),
    cashier_name: String(row.cashier_name ?? ""),
    terminal_id: String(row.terminal_id ?? "POS-01"),
    opened_at: Number(row.opened_at ?? 0),
    opening_cash_halalas: Number(row.opening_cash_halalas ?? 0),
    closed_at: row.closed_at == null ? null : Number(row.closed_at),
    expected_cash_halalas: row.expected_cash_halalas == null ? null : Number(row.expected_cash_halalas),
    actual_cash_halalas: row.actual_cash_halalas == null ? null : Number(row.actual_cash_halalas),
    cash_difference_halalas: row.cash_difference_halalas == null ? null : Number(row.cash_difference_halalas),
    status: row.status as ShiftStatus,
    closing_note: String(row.closing_note ?? ""),
  };
}

export async function getOpenShift(cashierId: string): Promise<Shift | null> {
  const { data, error } = await getSupabase()
    .from("shifts")
    .select("*")
    .eq("cashier_id", cashierId)
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(error);
  return data ? mapShift(data as Record<string, unknown>) : null;
}

export async function listShifts(): Promise<Shift[]> {
  const { data, error } = await getSupabase()
    .from("shifts")
    .select("*")
    .order("opened_at", { ascending: false })
    .limit(50);
  throwIfError(error);
  return (data ?? []).map((row) => mapShift(row as Record<string, unknown>));
}

export async function listCashMovements(shiftId: string): Promise<CashMovement[]> {
  const { data, error } = await getSupabase()
    .from("cash_movements")
    .select("*")
    .eq("shift_id", shiftId)
    .order("created_at", { ascending: false });
  throwIfError(error);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    shift_id: String(row.shift_id),
    amount_halalas: Number(row.amount_halalas),
    type: row.type as CashMovement["type"],
    reason: String(row.reason ?? ""),
    created_by_name: String(row.created_by_name ?? ""),
    created_at: Number(row.created_at ?? 0),
  }));
}

export async function openShift(openingCashHalalas: number, terminalId = "POS-01"): Promise<string> {
  const { data, error } = await getSupabase().rpc("open_shift", {
    p_opening_cash_halalas: Math.round(openingCashHalalas),
    p_terminal_id: terminalId,
  });
  throwIfError(error);
  return String(data);
}

export async function closeShift(actualCashHalalas: number, note: string): Promise<void> {
  const { error } = await getSupabase().rpc("close_shift", {
    p_actual_cash_halalas: Math.round(actualCashHalalas),
    p_note: note,
  });
  throwIfError(error);
}

export async function recordCashMovement(
  type: "cash_in" | "cash_out",
  amountHalalas: number,
  reason: string,
): Promise<void> {
  const { error } = await getSupabase().rpc("record_cash_movement", {
    p_type: type,
    p_amount_halalas: Math.round(amountHalalas),
    p_reason: reason,
  });
  throwIfError(error);
}
