import { getSupabase, throwIfError } from "@/lib/supabase";
import type { AppUser } from "@/types";

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  notes: string;
  active: boolean;
}

export async function listSuppliers(): Promise<Supplier[]> {
  const { data, error } = await getSupabase().from("suppliers").select("*").order("name");
  throwIfError(error);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    contact: String(row.contact ?? ""),
    phone: String(row.phone ?? ""),
    notes: String(row.notes ?? ""),
    active: row.active !== false,
  }));
}

export async function saveSupplier(input: { id?: string; name: string; contact: string; phone: string; notes: string }): Promise<void> {
  const { error } = await getSupabase().from("suppliers").upsert({
    id: input.id || crypto.randomUUID(),
    name: input.name,
    contact: input.contact,
    phone: input.phone,
    notes: input.notes,
    active: true,
  });
  throwIfError(error);
}

export async function createPurchase(input: {
  supplier_id: string;
  inventory_id: string;
  quantity: number;
  unit_cost_halalas: number;
  actor: AppUser;
}): Promise<void> {
  const now = Date.now();
  const qty = Number(input.quantity);
  const unit = Math.round(input.unit_cost_halalas);
  const total = Math.round(qty * unit);
  const purchaseId = crypto.randomUUID();
  const { error } = await getSupabase().from("purchases").insert({
    id: purchaseId,
    purchase_number: `P-${now}`,
    supplier_id: input.supplier_id,
    date_key: new Date().toISOString().slice(0, 10),
    subtotal_halalas: total,
    vat_halalas: 0,
    total_halalas: total,
    payment_status: "unpaid",
    created_by: input.actor.id,
    created_at: now,
  });
  throwIfError(error);
  const { error: itemErr } = await getSupabase().from("purchase_items").insert({
    purchase_id: purchaseId,
    inventory_id: input.inventory_id,
    quantity: qty,
    unit_cost_halalas: unit,
    total_halalas: total,
  });
  throwIfError(itemErr);
  const { error: stockErr } = await getSupabase().rpc("record_stock_change", {
    p_inventory_id: input.inventory_id,
    p_type: "purchase",
    p_quantity: qty,
    p_note: `Purchase ${purchaseId}`,
  });
  throwIfError(stockErr);
}
