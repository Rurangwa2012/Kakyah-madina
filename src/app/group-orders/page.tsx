"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { createGroupOrder, listenGroupOrders, updateGroupOrderStatus } from "@/services/orders";
import { getSettings } from "@/services/catalog";
import { groupReceiptHtml, printerService } from "@/services/printer";
import { sarToHalalas } from "@/utils/money";
import { formatDateTime } from "@/utils/date";
import { useI18n } from "@/i18n/I18nProvider";
import type { GroupFulfillment, GroupOrder, GroupPaymentStatus } from "@/types";

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
  const [orders, setOrders] = useState<GroupOrder[]>([]);
  const [filter, setFilter] = useState<"today" | "upcoming" | "completed">("upcoming");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState({
    group_name: "",
    contact_number: "",
    location: "",
    food_description: "Nasi Kandar Set",
    quantity: 40,
    fulfillment: "pickup" as GroupFulfillment,
    pickup_local: "",
    payment_status: "not_paid" as GroupPaymentStatus,
    total_sar: 0,
  });

  useEffect(() => listenGroupOrders(setOrders), []);

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

  async function save(print: boolean, complete = false) {
    if (!profile) return;
    if (formRef.current && !formRef.current.reportValidity()) return;
    setBusy(true);
    setError("");
    try {
      const settings = await getSettings();
      const pickup_time = form.pickup_local ? new Date(form.pickup_local).getTime() : Date.now();
      const order = await createGroupOrder({
        group_name: form.group_name,
        contact_number: form.contact_number,
        location: form.location,
        food_description: form.food_description,
        quantity: form.quantity,
        fulfillment: form.fulfillment,
        pickup_time,
        payment_status: form.payment_status,
        total_halalas: sarToHalalas(form.total_sar),
        actor: profile,
        groupPrefix: settings.group_order_prefix,
      });
      if (complete) {
        await updateGroupOrderStatus(order, "completed", profile);
      }
      if (print) {
        await printerService.printHtml(
          groupReceiptHtml({ ...order, settings }),
        );
      }
      setForm((current) => ({ ...current, group_name: "", contact_number: "", location: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("somethingWrong"));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await save(false);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <div>
        <PageHeader title={t("group.title")} subtitle={t("group.subtitle")} />
        <Card>
          <form ref={formRef} onSubmit={onSubmit} className="space-y-3">
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
            <div>
              <label>{t("group.location")}</label>
              <input
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div>
              <label>{t("group.food")}</label>
              <input
                required
                value={form.food_description}
                onChange={(e) => setForm({ ...form, food_description: e.target.value })}
              />
            </div>
            <div>
              <label>{t("group.qty")}</label>
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
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
              <select
                value={form.fulfillment}
                onChange={(e) => setForm({ ...form, fulfillment: e.target.value as GroupFulfillment })}
              >
                <option value="pickup">{t("group.pickup")}</option>
                <option value="delivery">{t("group.delivery")}</option>
              </select>
            </div>
            <div>
              <label>{t("group.amount")}</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.total_sar}
                onChange={(e) => setForm({ ...form, total_sar: Number(e.target.value) })}
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
            <div className="grid gap-2">
              <Button type="submit" disabled={busy}>
                {t("save")}
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => void save(true)}>
                {t("group.savePrint")}
              </Button>
              <Button variant="pay" disabled={busy} onClick={() => void save(true, true)}>
                {t("group.complete")}
              </Button>
            </div>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
          </form>
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
                  ].map((h) => (
                    <th key={h} className="px-3 py-3">
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
                    <td className="px-3 py-3">{order.food_description}</td>
                    <td className="px-3 py-3">{order.quantity}</td>
                    <td className="px-3 py-3">{formatDateTime(order.pickup_time)}</td>
                    <td className="px-3 py-3">{order.payment_status === "paid" ? t("group.paid") : t("group.notPaid")}</td>
                    <td className="px-3 py-3">{order.status === "completed" ? t("group.completed") : order.status}</td>
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
