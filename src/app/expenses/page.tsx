"use client";

import { FormEvent, useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button, Card, PageHeader } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { createExpense, listenExpenses } from "@/services/finance";
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory, type PaymentMethod } from "@/types";
import { formatSar, sarToHalalas } from "@/utils/money";
import { toDateKey } from "@/utils/date";

export default function ExpensesPage() {
  return (
    <ProtectedPage allow={["owner"]}>
      <ExpensesView />
    </ProtectedPage>
  );
}

function ExpensesView() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Expense[]>([]);
  const [form, setForm] = useState({
    category: "ingredients" as ExpenseCategory,
    description: "",
    amount: 0,
    payment_method: "cash" as PaymentMethod,
    date_key: toDateKey(),
  });

  useEffect(() => listenExpenses(setRows), []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    await createExpense(
      {
        category: form.category,
        description: form.description,
        amount_halalas: sarToHalalas(form.amount),
        payment_method: form.payment_method,
        date_key: form.date_key,
        created_by: profile.id,
        created_by_name: profile.name,
      },
      profile,
    );
    setForm({ ...form, description: "", amount: 0 });
  }

  return (
    <div>
      <PageHeader title="Expenses" subtitle="Owner-only costs used for estimated profit." />
      <Card className="mb-4">
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-3">
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
          >
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Amount SAR"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
          />
          <select
            value={form.payment_method}
            onChange={(e) => setForm({ ...form, payment_method: e.target.value as PaymentMethod })}
          >
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="mobile">Mobile</option>
          </select>
          <input type="date" value={form.date_key} onChange={(e) => setForm({ ...form, date_key: e.target.value })} />
          <Button type="submit">Save expense</Button>
        </form>
      </Card>
      <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--paper)]">
            <tr>
              {["Date", "Category", "Description", "Amount", "Method", "By"].map((h) => (
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
                <td className="px-3 py-3">{row.category}</td>
                <td className="px-3 py-3">{row.description}</td>
                <td className="px-3 py-3">{formatSar(row.amount_halalas)}</td>
                <td className="px-3 py-3">{row.payment_method}</td>
                <td className="px-3 py-3">{row.created_by_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
