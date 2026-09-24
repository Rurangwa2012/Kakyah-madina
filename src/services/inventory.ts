import { writeAuditLog } from "@/lib/firestore";
import { listenQuery, type Unsubscribe } from "@/lib/listen";
import { getSupabase, throwIfError } from "@/lib/supabase";
import { inventoryStatus } from "@/utils/format";
import type { AppUser, BuffetTracking, InventoryItem, StockMovement, StockMovementType } from "@/types";

function mapInv(row: Record<string, unknown>): InventoryItem {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    quantity: Number(row.quantity ?? 0),
    unit: String(row.unit ?? ""),
    min_stock: Number(row.min_stock ?? 0),
    reorder_level: Number(row.reorder_level ?? row.min_stock ?? 0),
    status: row.status as InventoryItem["status"],
    cost_halalas: Number(row.cost_halalas ?? 0),
    last_updated: Number(row.last_updated ?? 0),
    created_at: Number(row.created_at ?? 0),
  };
}

function mapMove(row: Record<string, unknown>): StockMovement {
  return {
    id: String(row.id),
    inventory_id: String(row.inventory_id ?? ""),
    item_name: String(row.item_name ?? ""),
    type: row.type as StockMovementType,
    quantity: Number(row.quantity ?? 0),
    unit: String(row.unit ?? ""),
    previous_quantity: Number(row.previous_quantity ?? 0),
    new_quantity: Number(row.new_quantity ?? 0),
    note: String(row.note ?? ""),
    created_by: String(row.created_by ?? ""),
    created_by_name: String(row.created_by_name ?? ""),
    created_at: Number(row.created_at ?? 0),
  };
}

function mapBuffet(row: Record<string, unknown>): BuffetTracking {
  return {
    id: String(row.id),
    date_key: String(row.date_key ?? ""),
    food: String(row.food ?? ""),
    prepared: Number(row.prepared ?? 0),
    sold: Number(row.sold ?? 0),
    waste: Number(row.waste ?? 0),
    remaining: Number(row.remaining ?? 0),
    created_by: String(row.created_by ?? ""),
    created_by_name: String(row.created_by_name ?? ""),
    created_at: Number(row.created_at ?? 0),
    updated_at: Number(row.updated_at ?? 0),
  };
}

export function listenInventory(cb: (items: InventoryItem[]) => void): Unsubscribe {
  return listenQuery(
    "inventory",
    async () => {
      const { data, error } = await getSupabase().from("inventory").select("*");
      throwIfError(error);
      return (data ?? [])
        .map((row) => mapInv(row as Record<string, unknown>))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    cb,
  );
}

export function listenStockMovements(
  inventoryId: string | null,
  cb: (rows: StockMovement[]) => void,
): Unsubscribe {
  return listenQuery(
    "stock_movements",
    async () => {
      const query = inventoryId
        ? getSupabase()
            .from("stock_movements")
            .select("*")
            .eq("inventory_id", inventoryId)
            .order("created_at", { ascending: false })
            .limit(100)
        : getSupabase()
            .from("stock_movements")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100);
      const { data, error } = await query;
      throwIfError(error);
      return (data ?? []).map((row) => mapMove(row as Record<string, unknown>));
    },
    cb,
  );
}

export async function applyStockChange(input: {
  inventoryId: string;
  type: StockMovementType | "receive" | "count_adjustment" | "purchase";
  quantity: number;
  note: string;
  actor: AppUser;
}): Promise<void> {
  const { error } = await getSupabase().rpc("record_stock_change", {
    p_inventory_id: input.inventoryId,
    p_type: input.type,
    p_quantity: input.quantity,
    p_note: input.note,
  });
  throwIfError(error);
  void input.actor;
}

export async function markInventoryStatus(
  item: InventoryItem,
  status: InventoryItem["status"],
): Promise<void> {
  const { error } = await getSupabase()
    .from("inventory")
    .update({ status, last_updated: Date.now() })
    .eq("id", item.id);
  throwIfError(error);
}

export async function saveInventoryItem(
  item: Partial<InventoryItem> & { name: string; unit: string },
  actor: AppUser,
): Promise<void> {
  const id = item.id || crypto.randomUUID();
  const { data: existing } = await getSupabase().from("inventory").select("*").eq("id", id).maybeSingle();
  const quantity = Number(item.quantity ?? existing?.quantity ?? 0);
  const min = Number(item.min_stock ?? existing?.min_stock ?? 0);
  const { error } = await getSupabase().from("inventory").upsert({
    id,
    name: item.name,
    unit: item.unit,
    quantity,
    min_stock: min,
    status: inventoryStatus(quantity, min),
    cost_halalas: actor.role === "owner" ? Math.round(item.cost_halalas ?? 0) : Number(existing?.cost_halalas ?? 0),
    last_updated: Date.now(),
    created_at: existing ? Number(existing.created_at ?? Date.now()) : Date.now(),
  });
  throwIfError(error);
}

export function listenBuffet(cb: (rows: BuffetTracking[]) => void): Unsubscribe {
  return listenQuery(
    "buffet_tracking",
    async () => {
      const { data, error } = await getSupabase().from("buffet_tracking").select("*");
      throwIfError(error);
      return (data ?? [])
        .map((row) => mapBuffet(row as Record<string, unknown>))
        .sort((a, b) => b.created_at - a.created_at);
    },
    cb,
  );
}

export async function saveBuffetRow(
  row: {
    id?: string;
    date_key: string;
    food: string;
    prepared: number;
    sold: number;
    waste: number;
  },
  actor: AppUser,
): Promise<void> {
  const remaining = Math.max(0, row.prepared - row.sold - row.waste);
  const id = row.id ?? `${row.date_key}-${row.food}`.replace(/\s+/g, "-").toLowerCase();
  const { data: existing } = await getSupabase().from("buffet_tracking").select("created_at").eq("id", id).maybeSingle();
  const { error } = await getSupabase().from("buffet_tracking").upsert({
    id,
    date_key: row.date_key,
    food: row.food,
    prepared: row.prepared,
    sold: row.sold,
    waste: row.waste,
    remaining,
    created_by: actor.id,
    created_by_name: actor.name,
    created_at: existing ? Number(existing.created_at ?? Date.now()) : Date.now(),
    updated_at: Date.now(),
  });
  throwIfError(error);
  await writeAuditLog({
    action: "BUFFET_UPDATED",
    message: `${actor.name} updated buffet tracking for ${row.food}`,
    actor_id: actor.id,
    actor_name: actor.name,
    actor_role: actor.role,
  });
}
