"use client";

import { FormEvent, useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import {
  applyStockChange,
  listenInventory,
  listenStockMovements,
  markInventoryStatus,
  saveInventoryItem,
} from "@/services/inventory";
import { formatDateTime } from "@/utils/date";
import { cn } from "@/utils/format";
import type { InventoryItem, StockMovement, StockMovementType } from "@/types";

export default function InventoryPage() {
  return (
    <ProtectedPage allow={["owner", "cashier"]}>
      <InventoryView />
    </ProtectedPage>
  );
}

function InventoryView() {
  const { profile } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [qty, setQty] = useState(0);
  const [note, setNote] = useState("Supplier delivery");
  const [type, setType] = useState<StockMovementType>("stock_in");
  const [newItem, setNewItem] = useState({ name: "", unit: "kg", quantity: 0, min_stock: 5 });

  useEffect(() => listenInventory(setItems), []);
  useEffect(() => listenStockMovements(selected?.id ?? null, setHistory), [selected?.id]);

  async function onMove(event: FormEvent) {
    event.preventDefault();
    if (!profile || !selected) return;
    await applyStockChange({
      inventoryId: selected.id,
      type,
      quantity: qty,
      note,
      actor: profile,
    });
    setQty(0);
  }

  async function createItem(event: FormEvent) {
    event.preventDefault();
    if (!profile || profile.role !== "owner") return;
    await saveInventoryItem(newItem, profile);
    setNewItem({ name: "", unit: "kg", quantity: 0, min_stock: 5 });
  }

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Stock changes always write a movement history record." />
      {items.length === 0 ? (
        <EmptyState title="No stock items" body="Owner can add rice, chicken, oil, boxes and more." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--paper)]">
              <tr>
                {["Item", "Quantity", "Unit", "Minimum", "Status", "Last Updated"].map((h) => (
                  <th key={h} className="px-3 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    "cursor-pointer border-t border-[var(--line)]",
                    selected?.id === item.id && "bg-[var(--paper)]",
                  )}
                  onClick={() => setSelected(item)}
                >
                  <td className="px-3 py-3 font-semibold">{item.name}</td>
                  <td className="px-3 py-3">{item.quantity}</td>
                  <td className="px-3 py-3">{item.unit}</td>
                  <td className="px-3 py-3">{item.min_stock}</td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-bold",
                        item.status === "good" && "bg-emerald-100 text-emerald-800",
                        item.status === "low" && "bg-amber-100 text-amber-800",
                        item.status === "out" && "bg-red-100 text-red-800",
                      )}
                    >
                      {item.status === "good" ? "Good" : item.status === "low" ? "Low Stock" : "Out of Stock"}
                    </span>
                  </td>
                  <td className="px-3 py-3">{formatDateTime(item.last_updated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="font-display text-2xl">Add / record stock</h3>
          {selected ? (
            <p className="mb-3 text-sm text-[var(--muted)]">
              {selected.name} current: {selected.quantity} {selected.unit}
            </p>
          ) : (
            <p className="mb-3 text-sm text-[var(--muted)]">Select a row first.</p>
          )}
          <form onSubmit={onMove} className="space-y-3">
            <div>
              <label>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as StockMovementType)}>
                <option value="stock_in">Stock in</option>
                <option value="waste">Waste</option>
                <option value="stock_out">Stock out</option>
                <option value="buffet_use">Buffet use</option>
                {profile?.role === "owner" ? <option value="correction">Correction</option> : null}
              </select>
            </div>
            <div>
              <label>Quantity received / used</label>
              <input type="number" min={0} step="0.01" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            </div>
            <div>
              <label>Note</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <Button type="submit" disabled={!selected}>
              SAVE
            </Button>
            {selected ? (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => void markInventoryStatus(selected, "low")}
                >
                  Mark low
                </Button>
                <Button
                  variant="danger"
                  onClick={() => void markInventoryStatus(selected, "out")}
                >
                  Mark out
                </Button>
              </div>
            ) : null}
          </form>
        </Card>
        <Card>
          <h3 className="font-display text-2xl">Movement history</h3>
          <div className="mt-3 max-h-80 space-y-2 overflow-auto text-sm">
            {history.map((row) => (
              <p key={row.id}>
                {formatDateTime(row.created_at)} — {row.created_by_name} {row.type} {row.quantity} {row.unit}{" "}
                {row.item_name} ({row.previous_quantity} → {row.new_quantity})
              </p>
            ))}
          </div>
        </Card>
      </div>
      {profile?.role === "owner" ? (
        <Card className="mt-4">
          <h3 className="font-display text-2xl">Add inventory item</h3>
          <form onSubmit={createItem} className="mt-3 grid gap-3 md:grid-cols-4">
            <input
              placeholder="Name"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              required
            />
            <input
              placeholder="Unit"
              value={newItem.unit}
              onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
            />
            <input
              type="number"
              placeholder="Qty"
              value={newItem.quantity}
              onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
            />
            <Button type="submit">Add item</Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
