"use client";

import { FormEvent, useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button, Card, PageHeader } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { listenBuffet, saveBuffetRow } from "@/services/inventory";
import { toDateKey } from "@/utils/date";
import type { BuffetTracking } from "@/types";

export default function BuffetPage() {
  return (
    <ProtectedPage allow={["owner"]}>
      <BuffetView />
    </ProtectedPage>
  );
}

function BuffetView() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<BuffetTracking[]>([]);
  const [form, setForm] = useState({
    date_key: toDateKey(),
    food: "Fried Chicken",
    prepared: 80,
    sold: 65,
    waste: 5,
  });

  useEffect(() => listenBuffet(setRows), []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    await saveBuffetRow(form, profile);
  }

  return (
    <div>
      <PageHeader title="Buffet tracking" subtitle="Prepared, sold, waste and remaining for each food." />
      <Card className="mb-4">
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-5">
          <input type="date" value={form.date_key} onChange={(e) => setForm({ ...form, date_key: e.target.value })} />
          <input value={form.food} onChange={(e) => setForm({ ...form, food: e.target.value })} />
          <input type="number" value={form.prepared} onChange={(e) => setForm({ ...form, prepared: Number(e.target.value) })} />
          <input type="number" value={form.sold} onChange={(e) => setForm({ ...form, sold: Number(e.target.value) })} />
          <input type="number" value={form.waste} onChange={(e) => setForm({ ...form, waste: Number(e.target.value) })} />
          <Button type="submit">Save tracking</Button>
        </form>
      </Card>
      <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--paper)]">
            <tr>
              {["Date", "Food", "Prepared", "Sold", "Waste", "Remaining"].map((h) => (
                <th key={h} className="px-3 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[var(--line)]">
                <td className="px-3 py-3">{row.date_key}</td>
                <td className="px-3 py-3">{row.food}</td>
                <td className="px-3 py-3">{row.prepared}</td>
                <td className="px-3 py-3">{row.sold}</td>
                <td className="px-3 py-3">{row.waste}</td>
                <td className="px-3 py-3">{row.remaining}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
