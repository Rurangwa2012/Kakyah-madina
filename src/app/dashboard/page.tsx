"use client";

import { useEffect, useMemo, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button, Card, PageHeader } from "@/components/ui";
import { listenDailySummaries, emptySummary } from "@/services/finance";
import { listenInventory, listenBuffet } from "@/services/inventory";
import { listenRecentOrders, listenGroupOrders } from "@/services/orders";
import { listenAuditLogs } from "@/services/finance";
import { listenMenu } from "@/services/catalog";
import { formatSar } from "@/utils/money";
import { formatDateTime, rangeForFilter, toDateKey, type DateFilter } from "@/utils/date";
import type { AuditLog, BuffetTracking, DailySummary, GroupOrder, InventoryItem, MenuItem, StudentOrder } from "@/types";

export default function DashboardPage() {
  return (
    <ProtectedPage allow={["owner"]}>
      <Dashboard />
    </ProtectedPage>
  );
}

function Dashboard() {
  const [filter, setFilter] = useState<DateFilter>("today");
  const [customStart, setCustomStart] = useState(toDateKey());
  const [customEnd, setCustomEnd] = useState(toDateKey());
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<StudentOrder[]>([]);
  const [groups, setGroups] = useState<GroupOrder[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [buffet, setBuffet] = useState<BuffetTracking[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);

  const range = rangeForFilter(filter, customStart, customEnd);
  const startKey = toDateKey(new Date(range.start));
  const endKey = toDateKey(new Date(range.end));

  useEffect(() => listenDailySummaries(startKey, endKey, setSummaries), [startKey, endKey]);
  useEffect(() => listenInventory(setInventory), []);
  useEffect(() => listenRecentOrders(setOrders), []);
  useEffect(() => listenGroupOrders(setGroups), []);
  useEffect(() => listenAuditLogs(setLogs), []);
  useEffect(() => listenBuffet(setBuffet), []);
  useEffect(() => listenMenu(setMenu), []);

  const totals = useMemo(() => {
    return summaries.reduce((acc, row) => {
      acc.total_sales_halalas += row.total_sales_halalas;
      acc.student_sales_halalas += row.student_sales_halalas;
      acc.group_sales_halalas += row.group_sales_halalas;
      acc.cash_sales_halalas += row.cash_sales_halalas;
      acc.card_sales_halalas += row.card_sales_halalas;
      acc.mobile_sales_halalas += row.mobile_sales_halalas;
      acc.order_count += row.order_count;
      acc.student_order_count += row.student_order_count;
      acc.group_order_count += row.group_order_count;
      acc.expenses_halalas += row.expenses_halalas;
      return acc;
    }, emptySummary(startKey));
  }, [summaries, startKey]);

  const profit = totals.total_sales_halalas - totals.expenses_halalas;
  const low = inventory.filter((item) => item.status !== "good");
  const upcoming = groups.filter((g) => g.status === "pending").slice(0, 5);
  const best = useMemo(() => {
    const counts = new Map<string, number>();
    for (const order of orders) {
      for (const line of order.lines) {
        counts.set(line.name, (counts.get(line.name) ?? 0) + line.quantity);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [orders]);

  const maxSales = Math.max(totals.cash_sales_halalas, totals.card_sales_halalas, totals.mobile_sales_halalas, 1);

  return (
    <div>
      <PageHeader title="Owner dashboard" subtitle="Live view of Kak Yah Madina" />
      <div className="mb-4 flex flex-wrap gap-2">
        {(["today", "yesterday", "week", "month", "custom"] as DateFilter[]).map((key) => (
          <Button key={key} variant={filter === key ? "primary" : "ghost"} onClick={() => setFilter(key)}>
            {key === "week" ? "This Week" : key === "month" ? "This Month" : key}
          </Button>
        ))}
        {filter === "custom" ? (
          <>
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          </>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total Sales" value={formatSar(totals.total_sales_halalas)} />
        <Stat label="Total Orders" value={String(totals.order_count)} />
        <Stat label="Student Orders" value={String(totals.student_order_count)} />
        <Stat label="Group Orders" value={String(totals.group_order_count)} />
        <Stat label="Cash Sales" value={formatSar(totals.cash_sales_halalas)} />
        <Stat label="Card Sales" value={formatSar(totals.card_sales_halalas)} />
        <Stat label="Mobile Payment" value={formatSar(totals.mobile_sales_halalas)} />
        <Stat label="Today's Expenses" value={formatSar(totals.expenses_halalas)} />
        <Stat label="Estimated Profit" value={formatSar(profit)} />
      </div>
      <Card className="mt-4">
        <h3 className="font-display text-xl">Payment mix</h3>
        <Bar label="Cash" value={totals.cash_sales_halalas} max={maxSales} />
        <Bar label="Card" value={totals.card_sales_halalas} max={maxSales} />
        <Bar label="Mobile" value={totals.mobile_sales_halalas} max={maxSales} />
      </Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="font-display text-xl">Low stock</h3>
          {low.length === 0 ? <p className="text-sm text-[var(--muted)]">All good.</p> : null}
          {low.map((item) => (
            <p key={item.id}>
              {item.name}: {item.quantity} {item.unit} ({item.status})
            </p>
          ))}
        </Card>
        <Card>
          <h3 className="font-display text-xl">Upcoming group orders</h3>
          {upcoming.map((order) => (
            <p key={order.id}>
              {order.order_number} · {order.group_name} · {order.quantity}
            </p>
          ))}
        </Card>
        <Card>
          <h3 className="font-display text-xl">Recent orders</h3>
          {orders.slice(0, 8).map((order) => (
            <p key={order.id}>
              {order.order_number} · {formatSar(order.total_halalas)}
            </p>
          ))}
        </Card>
        <Card>
          <h3 className="font-display text-xl">Recent employee activity</h3>
          {logs.slice(0, 8).map((log) => (
            <p key={log.id} className="text-sm">
              {formatDateTime(log.created_at)} — {log.message}
            </p>
          ))}
        </Card>
        <Card>
          <h3 className="font-display text-xl">Best selling items</h3>
          {best.map(([name, qty]) => (
            <p key={name}>
              {name}: {qty}
            </p>
          ))}
          {menu.length === 0 ? <p className="text-sm text-[var(--muted)]">No sales yet.</p> : null}
        </Card>
        <Card>
          <h3 className="font-display text-xl">Buffet waste</h3>
          {buffet.slice(0, 8).map((row) => (
            <p key={row.id}>
              {row.food}: waste {row.waste}, remaining {row.remaining}
            </p>
          ))}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="font-display text-2xl">{value}</p>
    </Card>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="mt-2">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span>{formatSar(value)}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[var(--paper)]">
        <div className="h-full bg-[var(--spice)]" style={{ width: `${Math.round((value / max) * 100)}%` }} />
      </div>
    </div>
  );
}
