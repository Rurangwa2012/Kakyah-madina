"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { MenuPicker } from "@/components/MenuPicker";
import { useAuth } from "@/hooks/useAuth";
import { useMenu } from "@/hooks/useMenu";
import { createGroupOrder, listenGroupOrders, updateGroupOrderStatus } from "@/services/orders";
import { getSettings } from "@/services/catalog";
import { groupReceiptHtml } from "@/services/printer";
import { issueReceipt } from "@/services/receipts";
import { formatDateTime } from "@/utils/date";
import { linesSummary } from "@/utils/format";
import { formatSar, lineTotal, orderSubtotal } from "@/utils/money";
import { useI18n } from "@/i18n/I18nProvider";
import type { GroupFulfillment, GroupOrder, GroupPaymentStatus, MenuItem, OrderLine } from "@/types";

export default function GroupOrdersPage() {
  return (
    <ProtectedPage allow={["owner", "cashier"]}>
      <GroupOrders />
    </ProtectedPage>
  );
}

function GroupOrders() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const { items } = useMenu();
  const [orders, setOrders] = useState<GroupOrder[]>([]);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [filter, setFilter] = useState<"today" | "upcoming" | "completed">("upcoming");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState({
    group_name: "",
    contact_number: "",
    location: "",
    fulfillment: "pickup" as GroupFulfillment,
    pickup_local: "",
    payment_status: "not_paid" as GroupPaymentStatus,
  });

  useEffect(() => listenGroupOrders(setOrders), []);

  const total = useMemo(() => orderSubtotal(lines), [lines]);
  const quantity = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);
  const foodDescription = useMemo(() => linesSummary(lines), [lines]);

  const shown = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return orders.filter((order) => {
      if (filter === "completed") return order.status === "completed";
      if (filter === "today") return order.pickup_time >= start.getTime() && order.pickup_time <= end.getTime();
      return order.status === "pending";
    });
  }, [orders, filter]);

  function addItem(item: MenuItem) {
    if (!item.available) return;
    setLines((current) => {
      const existing = current.find((line) => line.menu_id === item.id);
      if (!existing) {
        return [
          ...current,
          {
            menu_id: item.id,
            name: item.name,
            quantity: 1,
            unit_price_halalas: item.price_halalas,
            total_halalas: item.price_halalas,
          },
        ];
      }
      const nextQty = existing.quantity + 1;
      return current.map((line) =>
        line.menu_id === item.id
          ? { ...line, quantity: nextQty, total_halalas: lineTotal(line.unit_price_halalas, nextQty) }
          : line,
      );
    });
  }

  function changeQty(menuId: string, delta: number) {
    setLines((current) =>
      current
        .map((line) => {
          if (line.menu_id !== menuId) return line;
          const nextQty = line.quantity + delta;
          return { ...line, quantity: nextQty, total_halalas: lineTotal(line.unit_price_halalas, nextQty) };
        })
        .filter((line) => line.quantity > 0),
    );
  }

  async function save(print: boolean, complete = false) {
    if (!profile) return;
    if (formRef.current && !formRef.current.reportValidity()) return;
    if (lines.length === 0) {
      setError(t("group.needItems"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const settings = await getSettings();
      const pickup_time = form.pickup_local ? new Date(form.pickup_local).getTime() : Date.now();
      const order = await createGroupOrder({
        group_name: form.group_name,
        contact_number: form.contact_number,
        location: form.location,
        food_description: foodDescription,
        lines,
        quantity,
        fulfillment: form.fulfillment,
        pickup_time,
        payment_status: form.payment_status,
        total_halalas: total,
        actor: profile,
        groupPrefix: settings.group_order_prefix,
      });
      if (complete) {
        await updateGroupOrderStatus(order, "completed", profile);
      }
      const html = groupReceiptHtml({ ...order, settings });
      await issueReceipt(html, order.order_number, { print, kind: "group" });
      setForm({
        group_name: "",
        contact_number: "",
        location: "",
        fulfillment: "pickup",
        pickup_local: "",
        payment_status: "not_paid",
      });
      setLines([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("somethingWrong"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("group.title")} subtitle={t("group.subtitle")} />
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <form ref={formRef} className="grid gap-3 md:grid-cols-2">
              <div>
                <label>{t("group.name")}</label>
                <input
                  required
                  value={form.group_name}
                  onChange={(e) => setForm({ ...form, group_name: e.target.value })}
                />
              </div>
              <div>
                <label>{t("group.contact")}</label>
                <input
                  required
                  value={form.contact_number}
                  onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label>{t("group.location")}</label>
                <input
                  required
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div>
                <label>{t("group.time")}</label>
                <input
                  type="datetime-local"
                  value={form.pickup_local}
                  onChange={(e) => setForm({ ...form, pickup_local: e.target.value })}
                />
              </div>
              <div>
                <label>{t("group.payment")}</label>
                <select
                  value={form.payment_status}
                  onChange={(e) =>
                    setForm({ ...form, payment_status: e.target.value as GroupPaymentStatus })
                  }
                >
                  <option value="paid">{t("group.paid")}</option>
                  <option value="not_paid">{t("group.notPaid")}</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <select
                  value={form.fulfillment}
                  onChange={(e) => setForm({ ...form, fulfillment: e.target.value as GroupFulfillment })}
                >
                  <option value="pickup">{t("group.pickup")}</option>
                  <option value="delivery">{t("group.delivery")}</option>
                </select>
              </div>
            </form>
          </Card>
          <div>
            <h3 className="mb-3 font-display text-2xl">{t("group.menu")}</h3>
            <MenuPicker items={items} onPick={addItem} allowSoldOut />
          </div>
        </div>
        <Card className="h-fit xl:sticky xl:top-4">
          <h3 className="font-display text-2xl">{t("group.items")}</h3>
          <div className="mt-3 space-y-2">
            {lines.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">{t("group.tap")}</p>
            ) : (
              lines.map((line) => (
                <div key={line.menu_id} className="rounded-xl bg-[var(--paper)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{line.name}</p>
                      <p className="text-sm text-[var(--muted)]">
                        {formatSar(line.unit_price_halalas)} × {line.quantity}
                      </p>
                    </div>
                    <p className="font-bold">{formatSar(line.total_halalas)}</p>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button variant="ghost" className="min-h-11 px-4" onClick={() => changeQty(line.menu_id, 1)}>
                      +
                    </Button>
                    <Button variant="ghost" className="min-h-11 px-4" onClick={() => changeQty(line.menu_id, -1)}>
                      -
                    </Button>
                    <Button
                      variant="danger"
                      className="min-h-11 px-4"
                      onClick={() => setLines((current) => current.filter((row) => row.menu_id !== line.menu_id))}
                    >
                      {t("remove")}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 flex justify-between text-lg font-bold">
            <span>{t("total")}</span>
            <span>{formatSar(total)}</span>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {t("group.qty")}: {quantity}
          </p>
          <div className="mt-4 grid gap-2">
            <Button disabled={busy} onClick={() => void save(false)}>
              {t("save")}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => void save(true)}>
              {t("group.savePrint")}
            </Button>
            <Button variant="pay" disabled={busy} onClick={() => void save(true, true)}>
              {t("group.complete")}
            </Button>
          </div>
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        </Card>
      </div>
      <div>
        <div className="mb-3 flex gap-2">
          {(["today", "upcoming", "completed"] as const).map((key) => (
            <Button key={key} variant={filter === key ? "primary" : "ghost"} onClick={() => setFilter(key)}>
              {key === "today" ? t("group.today") : key === "upcoming" ? t("group.upcoming") : t("group.completed")}
            </Button>
          ))}
        </div>
        {shown.length === 0 ? (
          <EmptyState title={t("group.empty")} body={t("group.emptyBody")} />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-white">
            <table className="min-w-full text-start text-sm">
              <thead className="bg-[var(--paper)]">
                <tr>
                  {[
                    t("group.columns.number"),
                    t("group.columns.name"),
                    t("group.columns.contact"),
                    t("group.columns.location"),
                    t("group.columns.order"),
                    t("group.columns.qty"),
                    t("group.columns.time"),
                    t("group.columns.payment"),
                    t("group.columns.status"),
                    "",
                  ].map((h) => (
                    <th key={h || "actions"} className="px-3 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((order) => (
                  <tr key={order.id} className="border-t border-[var(--line)]">
                    <td className="px-3 py-3 font-bold text-[var(--spice)]">{order.order_number}</td>
                    <td className="px-3 py-3">{order.group_name}</td>
                    <td className="px-3 py-3">{order.contact_number}</td>
                    <td className="px-3 py-3">{order.location}</td>
                    <td className="px-3 py-3">
                      {order.lines?.length
                        ? linesSummary(order.lines)
                        : order.food_description}
                    </td>
                    <td className="px-3 py-3">{order.quantity}</td>
                    <td className="px-3 py-3">{formatDateTime(order.pickup_time)}</td>
                    <td className="px-3 py-3">{order.payment_status === "paid" ? t("group.paid") : t("group.notPaid")}</td>
                    <td className="px-3 py-3">{order.status === "completed" ? t("group.completed") : t("group.pending")}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="ghost"
                          className="min-h-10 text-sm"
                          disabled={busy}
                          onClick={() =>
                            void getSettings().then((settings) =>
                              issueReceipt(groupReceiptHtml({ ...order, settings }), order.order_number, {
                                print: true,
                                kind: "group",
                              }),
                            )
                          }
                        >
                          {t("reprint")}
                        </Button>
                        <Button
                          variant="secondary"
                          className="min-h-10 text-sm"
                          disabled={busy}
                          onClick={() =>
                            void getSettings().then((settings) =>
                              issueReceipt(groupReceiptHtml({ ...order, settings }), order.order_number, {
                                print: false,
                                kind: "group",
                              }),
                            )
                          }
                        >
                          {t("saveReceipt")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
