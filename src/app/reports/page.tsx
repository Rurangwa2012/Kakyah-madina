"use client";

import { useEffect, useMemo, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button, Card, PageHeader } from "@/components/ui";
import { emptySummary, listenAuditLogs, listenDailySummaries, listenExpenses } from "@/services/finance";
import { listenStockMovements } from "@/services/inventory";
import { listenRecentOrders } from "@/services/orders";
import { formatSar } from "@/utils/money";
import { rangeForFilter, toDateKey, type DateFilter } from "@/utils/date";
import type { AuditLog, DailySummary, Expense, StockMovement, StudentOrder } from "@/types";

export default function ReportsPage() {
  return (
    <ProtectedPage allow={["owner"]}>
      <Reports />
    </ProtectedPage>
  );
}

function Reports() {
  const [filter, setFilter] = useState<DateFilter>("month");
  const [customStart, setCustomStart] = useState(toDateKey());
  const [customEnd, setCustomEnd] = useState(toDateKey());
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [orders, setOrders] = useState<StudentOrder[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const range = rangeForFilter(filter, customStart, customEnd);
  const startKey = toDateKey(new Date(range.start));
  const endKey = toDateKey(new Date(range.end));

  useEffect(() => listenDailySummaries(startKey, endKey, setSummaries), [startKey, endKey]);
  useEffect(() => listenRecentOrders(setOrders), []);
  useEffect(() => listenExpenses(setExpenses), []);
  useEffect(() => listenStockMovements(null, setMovements), []);
  useEffect(() => listenAuditLogs(setLogs), []);

  const totals = useMemo(
    () =>
      summaries.reduce((acc, row) => {
        acc.total_sales_halalas += row.total_sales_halalas;
        acc.student_sales_halalas += row.student_sales_halalas;
        acc.group_sales_halalas += row.group_sales_halalas;
        acc.cash_sales_halalas += row.cash_sales_halalas;
        acc.card_sales_halalas += row.card_sales_halalas;
        acc.mobile_sales_halalas += row.mobile_sales_halalas;
        acc.expenses_halalas += row.expenses_halalas;
        acc.order_count += row.order_count;
        return acc;
      }, emptySummary()),
    [summaries],
  );

  const best = useMemo(() => {
    const map = new Map<string, number>();
    for (const order of orders) {
      if (order.created_at < range.start || order.created_at > range.end) continue;
      for (const line of order.lines) map.set(line.name, (map.get(line.name) ?? 0) + line.quantity);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [orders, range]);

  return (
    <div>
      <PageHeader title="Reports" subtitle="Built from daily summaries so the dashboard stays fast." />
      <div className="mb-4 flex flex-wrap gap-2">
        {(["today", "yesterday", "week", "month", "custom"] as DateFilter[]).map((key) => (
          <Button key={key} variant={filter === key ? "primary" : "ghost"} onClick={() => setFilter(key)}>
            {key}
          </Button>
        ))}
        {filter === "custom" ? (
          <>
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          </>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Card>Daily / period sales: {formatSar(totals.total_sales_halalas)}</Card>
        <Card>Student sales: {formatSar(totals.student_sales_halalas)}</Card>
        <Card>Group sales: {formatSar(totals.group_sales_halalas)}</Card>
        <Card>Cash: {formatSar(totals.cash_sales_halalas)}</Card>
        <Card>Card: {formatSar(totals.card_sales_halalas)}</Card>
        <Card>Mobile: {formatSar(totals.mobile_sales_halalas)}</Card>
        <Card>Expenses: {formatSar(totals.expenses_halalas)}</Card>
        <Card>Estimated profit: {formatSar(totals.total_sales_halalas - totals.expenses_halalas)}</Card>
        <Card>Orders: {totals.order_count}</Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="font-display text-xl">Best selling items</h3>
          {best.map(([name, qty]) => (
            <p key={name}>
              {name}: {qty}
            </p>
          ))}
        </Card>
        <Card>
          <h3 className="font-display text-xl">Stock movements</h3>
          {movements.slice(0, 12).map((row) => (
            <p key={row.id} className="text-sm">
              {row.item_name} {row.type} {row.quantity}
            </p>
          ))}
        </Card>
        <Card>
          <h3 className="font-display text-xl">Cashier activity</h3>
          {logs.slice(0, 12).map((log) => (
            <p key={log.id} className="text-sm">
              {log.message}
            </p>
          ))}
        </Card>
        <Card>
          <h3 className="font-display text-xl">Expense count</h3>
          <p>{expenses.filter((row) => row.date_key >= startKey && row.date_key <= endKey).length} records in range</p>
        </Card>
      </div>
    </div>
  );
}
