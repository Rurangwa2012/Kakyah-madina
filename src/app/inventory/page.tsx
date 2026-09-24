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
import { useI18n } from "@/i18n/I18nProvider";
import type { InventoryItem, StockMovement, StockMovementType } from "@/types";

export default function InventoryPage() {
  return (
    <ProtectedPage allow={["owner", "cashier"]} requireInventory>
      <InventoryView />
    </ProtectedPage>
  );
}

function InventoryView() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [qty, setQty] = useState(0);
  const [counted, setCounted] = useState(0);
  const [note, setNote] = useState("");
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
      note: note.trim() || t("inventory.defaultNote"),
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
      <PageHeader title={t("inventory.title")} subtitle={t("inventory.subtitle")} />
      {items.length === 0 ? (
        <EmptyState title={t("inventory.empty")} body={t("inventory.emptyBody")} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-white">
          <table className="min-w-full text-start text-sm">
            <thead className="bg-[var(--paper)]">
              <tr>
                {[
                  t("inventory.item"),
                  t("inventory.qty"),
                  t("inventory.unit"),
                  t("inventory.min"),
                  t("inventory.status"),
                  t("inventory.updated"),
                ].map((h) => (
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
                      {item.status === "good"
                        ? t("inventory.good")
                        : item.status === "low"
                          ? t("inventory.low")
                          : t("inventory.out")}
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
          <h3 className="font-display text-2xl">{t("inventory.addRecord")}</h3>
          {selected ? (
            <p className="mb-3 text-sm text-[var(--muted)]">
              {selected.name} {t("inventory.current")}: {selected.quantity} {selected.unit}
            </p>
          ) : (
            <p className="mb-3 text-sm text-[var(--muted)]">{t("inventory.select")}</p>
          )}
          <form onSubmit={onMove} className="space-y-3">
            <div>
              <label>{t("inventory.type")}</label>
              <select value={type} onChange={(e) => setType(e.target.value as StockMovementType)}>
                <option value="stock_in">{t("inventory.stockIn")}</option>
                <option value="waste">{t("inventory.waste")}</option>
                <option value="stock_out">{t("inventory.stockOut")}</option>
                <option value="buffet_use">{t("inventory.buffetUse")}</option>
                {profile?.role === "owner" ? <option value="correction">{t("inventory.correction")}</option> : null}
              </select>
            </div>
            <div>
              <label>{t("inventory.qtyReceived")}</label>
              <input type="number" min={0} step="0.01" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            </div>
            <div>
              <label>{t("inventory.note")}</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("inventory.defaultNote")} />
            </div>
            <Button type="submit" disabled={!selected}>
              {t("save")}
            </Button>
            {selected ? (
              <div className="space-y-2">
                <label>{t("inventory.count")}</label>
                <input type="number" step="0.01" value={counted} onChange={(e) => setCounted(Number(e.target.value))} />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    selected &&
                    profile &&
                    void applyStockChange({
                      inventoryId: selected.id,
                      type: "count_adjustment",
                      quantity: counted,
                      note: note.trim() || "count",
                      actor: profile,
                    })
                  }
                >
                  {t("inventory.saveCount")}
                </Button>
              </div>
            ) : null}
            {selected ? (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => void markInventoryStatus(selected, "low")}
                >
                  {t("inventory.markLow")}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => void markInventoryStatus(selected, "out")}
                >
                  {t("inventory.markOut")}
                </Button>
              </div>
            ) : null}
          </form>
        </Card>
        <Card>
          <h3 className="font-display text-2xl">{t("inventory.history")}</h3>
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
          <h3 className="font-display text-2xl">{t("inventory.addItem")}</h3>
          <form onSubmit={createItem} className="mt-3 grid gap-3 md:grid-cols-4">
            <input
              placeholder={t("inventory.itemName")}
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              required
            />
            <input
              placeholder={t("inventory.unit")}
              value={newItem.unit}
              onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
            />
            <input
              type="number"
              placeholder={t("inventory.qty")}
              value={newItem.quantity}
              onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
            />
            <Button type="submit">{t("menu.addItem")}</Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
