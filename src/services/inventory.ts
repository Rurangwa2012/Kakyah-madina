import {
  collection,
  doc,
  getDoc,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/collections";
import { getDb } from "@/lib/firebase";
import { writeAuditLog } from "@/lib/firestore";
import { listenDocs } from "@/lib/listen";
import { inventoryStatus } from "@/utils/format";
import type {
  AppUser,
  BuffetTracking,
  InventoryItem,
  StockMovement,
  StockMovementType,
} from "@/types";

export function listenInventory(cb: (items: InventoryItem[]) => void): Unsubscribe {
  return listenDocs(
    collection(getDb(), COLLECTIONS.inventory),
    (id, data) => ({ id, ...(data as Omit<InventoryItem, "id">) }),
    (items) => cb([...items].sort((a, b) => a.name.localeCompare(b.name))),
  );
}

export function listenStockMovements(
  inventoryId: string | null,
  cb: (rows: StockMovement[]) => void,
): Unsubscribe {
  const base = collection(getDb(), COLLECTIONS.stockMovements);
  const q = inventoryId ? query(base, where("inventory_id", "==", inventoryId)) : query(base);
  return listenDocs(
    q,
    (id, data) => ({ id, ...(data as Omit<StockMovement, "id">) }),
    (rows) => cb([...rows].sort((a, b) => b.created_at - a.created_at).slice(0, 100)),
  );
}

export async function applyStockChange(input: {
  inventoryId: string;
  type: StockMovementType;
  quantity: number;
  note: string;
  actor: AppUser;
}): Promise<void> {
  const db = getDb();
  const invRef = doc(db, COLLECTIONS.inventory, input.inventoryId);
  const movementRef = doc(collection(db, COLLECTIONS.stockMovements));
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(invRef);
    if (!snap.exists()) throw new Error("Inventory item not found");
    const item = snap.data() as InventoryItem;
    const delta =
      input.type === "correction"
        ? input.quantity
        : input.type === "stock_in"
          ? Math.abs(input.quantity)
          : -Math.abs(input.quantity);
    const previous = Number(item.quantity ?? 0);
    const nextQty = Math.max(0, previous + delta);
    tx.update(invRef, {
      quantity: nextQty,
      status: inventoryStatus(nextQty, Number(item.min_stock ?? 0)),
      last_updated: Date.now(),
    });
    tx.set(movementRef, {
      inventory_id: input.inventoryId,
      item_name: item.name,
      type: input.type,
      quantity: Math.abs(input.quantity),
      unit: item.unit,
      previous_quantity: previous,
      new_quantity: nextQty,
      note: input.note,
      created_by: input.actor.id,
      created_by_name: input.actor.name,
      created_at: Date.now(),
      server_created_at: serverTimestamp(),
    });
  });
  const action =
    input.type === "waste"
      ? "WASTE_RECORDED"
      : input.type === "stock_in"
        ? "STOCK_ADDED"
        : "STOCK_UPDATED";
  await writeAuditLog({
    action,
    message: `${input.actor.name} ${input.type.replace("_", " ")} ${input.quantity} on inventory`,
    actor_id: input.actor.id,
    actor_name: input.actor.name,
    actor_role: input.actor.role,
  });
}

export async function markInventoryStatus(
  item: InventoryItem,
  status: InventoryItem["status"],
): Promise<void> {
  await updateDoc(doc(getDb(), COLLECTIONS.inventory, item.id), {
    status,
    last_updated: Date.now(),
  });
}

export async function saveInventoryItem(
  item: Partial<InventoryItem> & { name: string; unit: string },
  actor: AppUser,
): Promise<void> {
  const id = item.id ?? doc(collection(getDb(), COLLECTIONS.inventory)).id;
  const ref = doc(getDb(), COLLECTIONS.inventory, id);
  const existing = await getDoc(ref);
  const quantity = Number(item.quantity ?? existing.data()?.quantity ?? 0);
  const min = Number(item.min_stock ?? existing.data()?.min_stock ?? 0);
  await setDoc(
    ref,
    {
      name: item.name,
      unit: item.unit,
      quantity,
      min_stock: min,
      status: inventoryStatus(quantity, min),
      cost_halalas: actor.role === "owner" ? Math.round(item.cost_halalas ?? 0) : (existing.data()?.cost_halalas ?? 0),
      last_updated: Date.now(),
      created_at: existing.exists() ? existing.data()?.created_at ?? Date.now() : Date.now(),
    },
    { merge: true },
  );
}

export function listenBuffet(cb: (rows: BuffetTracking[]) => void): Unsubscribe {
  return listenDocs(
    collection(getDb(), COLLECTIONS.buffetTracking),
    (id, data) => ({ id, ...(data as Omit<BuffetTracking, "id">) }),
    (rows) => cb([...rows].sort((a, b) => b.created_at - a.created_at)),
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
  const ref = doc(getDb(), COLLECTIONS.buffetTracking, id);
  const existing = await getDoc(ref);
  await setDoc(
    ref,
    {
      date_key: row.date_key,
      food: row.food,
      prepared: row.prepared,
      sold: row.sold,
      waste: row.waste,
      remaining,
      created_by: actor.id,
      created_by_name: actor.name,
      created_at: existing.exists() ? (existing.data()?.created_at ?? Date.now()) : Date.now(),
      updated_at: Date.now(),
    },
    { merge: true },
  );
  await writeAuditLog({
    action: "BUFFET_UPDATED",
    message: `${actor.name} updated buffet tracking for ${row.food}`,
    actor_id: actor.id,
    actor_name: actor.name,
    actor_role: actor.role,
  });
}
