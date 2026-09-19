"use client";

import { FormEvent, useMemo, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { createGroupOrder, listenGroupOrders, updateGroupOrderStatus } from "@/services/orders";
import { getSettings } from "@/services/catalog";
import { groupReceiptHtml, printerService } from "@/services/printer";
import { sarToHalalas } from "@/utils/money";
import { formatDateTime } from "@/utils/date";
import type { GroupFulfillment, GroupOrder, GroupPaymentStatus } from "@/types";
import { useEffect } from "react";

export default function GroupOrdersPage() {
  return (
    <ProtectedPage allow={["owner", "cashier"]}>
      <GroupOrders />
    </ProtectedPage>
  );
}

function GroupOrders() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<GroupOrder[]>([]);
  const [filter, setFilter] = useState<"today" | "upcoming" | "completed">("upcoming");
  const [busy, setBusy] = useState(false);
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
    const now = Date.now();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return orders.filter((order) => {
      if (filter === "completed") return order.status === "completed";
      if (filter === "today") return order.pickup_time >= start.getTime() && order.pickup_time <= end.getTime();
      return order.status === "pending" && order.pickup_time >= now - 60 * 60 * 1000;
    });
  }, [orders, filter]);

  async function save(print: boolean, complete = false) {
    if (!profile) return;
    setBusy(true);
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
        <PageHeader title="Group / Umrah Orders" subtitle="Simple bulk orders. U- prefix." />
        <Card>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label>Customer / Group Name</label>
              <input
                required
                value={form.group_name}
                onChange={(e) => setForm({ ...form, group_name: e.target.value })}
              />
            </div>
            <div>
              <label>Contact Number</label>
              <input
                required
                value={form.contact_number}
                onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
              />
            </div>
            <div>
              <label>Location</label>
              <input
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div>
              <label>Food / Order</label>
              <input
                required
                value={form.food_description}
                onChange={(e) => setForm({ ...form, food_description: e.target.value })}
              />
            </div>
            <div>
              <label>Quantity</label>
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              />
            </div>
            <div>
              <label>Pickup or Delivery Time</label>
              <input
                type="datetime-local"
                value={form.pickup_local}
                onChange={(e) => setForm({ ...form, pickup_local: e.target.value })}
              />
            </div>
            <div>
              <label>Amount (SAR)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.total_sar}
                onChange={(e) => setForm({ ...form, total_sar: Number(e.target.value) })}
              />
            </div>
            <div>
              <label>Payment Status</label>
              <select
                value={form.payment_status}
                onChange={(e) =>
                  setForm({ ...form, payment_status: e.target.value as GroupPaymentStatus })
                }
              >
                <option value="paid">Paid</option>
                <option value="not_paid">Not Paid</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Button type="submit" disabled={busy}>
                Save
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => void save(true)}>
                Save & Print
              </Button>
              <Button variant="pay" disabled={busy} onClick={() => void save(true, true)}>
                Complete Order
              </Button>
            </div>
          </form>
        </Card>
      </div>
      <div>
        <div className="mb-3 flex gap-2">
          {(["today", "upcoming", "completed"] as const).map((key) => (
            <Button key={key} variant={filter === key ? "primary" : "ghost"} onClick={() => setFilter(key)}>
              {key}
            </Button>
          ))}
        </div>
        {shown.length === 0 ? (
          <EmptyState title="No group orders" body="Create an Umrah or bulk order on the left." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--paper)]">
                <tr>
                  {["Order Number", "Name", "Contact", "Location", "Order", "Qty", "Time", "Payment", "Status"].map(
                    (h) => (
                      <th key={h} className="px-3 py-3">
                        {h}
                      </th>
                    ),
                  )}
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
                    <td className="px-3 py-3">{order.payment_status === "paid" ? "Paid" : "Not Paid"}</td>
                    <td className="px-3 py-3">{order.status}</td>
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
