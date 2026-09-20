"use client";

import { useEffect, useMemo, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button, Card, PageHeader } from "@/components/ui";
import { emptySummary, listenAuditLogs, listenDailySummaries } from "@/services/finance";
import { listenBuffet, listenInventory } from "@/services/inventory";
import { listenGroupOrders, listenRecentOrders } from "@/services/orders";
import { formatSar } from "@/utils/money";
import { formatDateTime, rangeForFilter, toDateKey, type DateFilter } from "@/utils/date";
import { useI18n } from "@/i18n/I18nProvider";
import type { AuditLog, BuffetTracking, DailySummary, GroupOrder, InventoryItem, StudentOrder } from "@/types";

export default function DashboardPage() {
  return (
    <ProtectedPage allow={["owner"]}>
      <Dashboard />
    </ProtectedPage>
  );
}

function Dashboard() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<DateFilter>("today");
  const [customStart, setCustomStart] = useState(toDateKey());
  const [customEnd, setCustomEnd] = useState(toDateKey());
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<StudentOrder[]>([]);
  const [groups, setGroups] = useState<GroupOrder[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [buffet, setBuffet] = useState<BuffetTracking[]>([]);

  const range = rangeForFilter(filter, customStart, customEnd);
  const startKey = toDateKey(new Date(range.start));
  const endKey = toDateKey(new Date(range.end));

  useEffect(() => listenDailySummaries(startKey, endKey, setSummaries), [startKey, endKey]);
  useEffect(() => listenInventory(setInventory), []);
  useEffect(() => listenRecentOrders(setOrders), []);
  useEffect(() => listenGroupOrders(setGroups), []);
  useEffect(() => listenAuditLogs(setLogs), []);
  useEffect(() => listenBuffet(setBuffet), []);

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
      if (order.created_at < range.start || order.created_at > range.end) continue;
      for (const line of order.lines) {
        counts.set(line.name, (counts.get(line.name) ?? 0) + line.quantity);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [orders, range]);
  const wasteRows = buffet.filter((row) => row.date_key >= startKey && row.date_key <= endKey).slice(0, 8);

  const maxSales = Math.max(totals.cash_sales_halalas, totals.card_sales_halalas, totals.mobile_sales_halalas, 1);

  return (
    <div>
      <PageHeader title={t("dashboard.title")} subtitle={t("dashboard.subtitle")} />
      <div className="mb-4 flex flex-wrap gap-2">
        {(["today", "yesterday", "week", "month", "custom"] as DateFilter[]).map((key) => (
          <Button key={key} variant={filter === key ? "primary" : "ghost"} onClick={() => setFilter(key)}>
            {t(key)}
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
        <Stat label={t("dashboard.totalSales")} value={formatSar(totals.total_sales_halalas)} />
        <Stat label={t("dashboard.totalOrders")} value={String(totals.order_count)} />
        <Stat label={t("dashboard.studentOrders")} value={String(totals.student_order_count)} />
        <Stat label={t("dashboard.groupOrders")} value={String(totals.group_order_count)} />
        <Stat label={t("dashboard.cashSales")} value={formatSar(totals.cash_sales_halalas)} />
        <Stat label={t("dashboard.cardSales")} value={formatSar(totals.card_sales_halalas)} />
        <Stat label={t("dashboard.mobileSales")} value={formatSar(totals.mobile_sales_halalas)} />
        <Stat label={t("dashboard.expenses")} value={formatSar(totals.expenses_halalas)} />
        <Stat label={t("dashboard.profit")} value={formatSar(profit)} />
      </div>
      <Card className="mt-4">
        <h3 className="font-display text-xl">{t("dashboard.mix")}</h3>
        <Bar label={t("cash")} value={totals.cash_sales_halalas} max={maxSales} />
        <Bar label={t("card")} value={totals.card_sales_halalas} max={maxSales} />
        <Bar label={t("mobile")} value={totals.mobile_sales_halalas} max={maxSales} />
      </Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="font-display text-xl">{t("dashboard.lowStock")}</h3>
          {low.length === 0 ? <p className="text-sm text-[var(--muted)]">{t("dashboard.allGood")}</p> : null}
          {low.map((item) => (
            <p key={item.id}>
              {item.name}: {item.quantity} {item.unit} ({item.status})
            </p>
          ))}
        </Card>
        <Card>
          <h3 className="font-display text-xl">{t("dashboard.upcoming")}</h3>
          {upcoming.map((order) => (
            <p key={order.id}>
              {order.order_number} · {order.group_name} · {order.quantity}
            </p>
          ))}
        </Card>
        <Card>
          <h3 className="font-display text-xl">{t("dashboard.recent")}</h3>
          {orders.slice(0, 8).map((order) => (
            <p key={order.id}>
              {order.order_number} · {formatSar(order.total_halalas)}
            </p>
          ))}
        </Card>
        <Card>
          <h3 className="font-display text-xl">{t("dashboard.activity")}</h3>
          {logs.slice(0, 8).map((log) => (
            <p key={log.id} className="text-sm">
              {formatDateTime(log.created_at)} — {log.message}
            </p>
          ))}
        </Card>
        <Card>
          <h3 className="font-display text-xl">{t("dashboard.best")}</h3>
          {best.map(([name, qty]) => (
            <p key={name}>
              {name}: {qty}
            </p>
          ))}
          {best.length === 0 ? <p className="text-sm text-[var(--muted)]">{t("dashboard.noSales")}</p> : null}
        </Card>
        <Card>
          <h3 className="font-display text-xl">{t("dashboard.waste")}</h3>
          {wasteRows.map((row) => (
            <p key={row.id}>
              {row.food}: {t("buffet.waste")} {row.waste}, {t("buffet.remaining")} {row.remaining}
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
