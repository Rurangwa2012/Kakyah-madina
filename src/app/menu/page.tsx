"use client";

import { FormEvent, useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button, Card, PageHeader } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { archiveMenuItem, listenMenu, saveMenuItem, uploadMenuImage } from "@/services/catalog";
import { MENU_CATEGORIES, type MenuItem } from "@/types";
import { formatSar, sarToHalalas } from "@/utils/money";

export default function MenuPage() {
  return (
    <ProtectedPage allow={["owner"]}>
      <MenuManager />
    </ProtectedPage>
  );
}

function MenuManager() {
  const { profile } = useAuth();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [form, setForm] = useState({
    id: "",
    name: "",
    category: "Rice",
    price: 8,
    available: true,
    sold_out: false,
    sort_order: 10,
    image_url: "",
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => listenMenu(setItems), []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    const id = await saveMenuItem(
      {
        id: form.id || undefined,
        name: form.name,
        category: form.category,
        price_halalas: sarToHalalas(form.price),
        available: form.available,
        sold_out: form.sold_out,
        sort_order: form.sort_order,
        image_url: form.image_url,
      },
      profile,
    );
    if (file) {
      const url = await uploadMenuImage(file, id);
      await saveMenuItem(
        {
          id,
          name: form.name,
          category: form.category,
          price_halalas: sarToHalalas(form.price),
          image_url: url,
          available: form.available,
          sold_out: form.sold_out,
          sort_order: form.sort_order,
        },
        profile,
      );
    }
    setForm({
      id: "",
      name: "",
      category: "Rice",
      price: 8,
      available: true,
      sold_out: false,
      sort_order: 10,
      image_url: "",
    });
    setFile(null);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <div>
        <PageHeader title="Menu" subtitle="Owner can change prices, availability and photos." />
        <Card>
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {MENU_CATEGORIES.map((cat) => (
                <option key={cat}>{cat}</option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              min={0}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            />
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
            />
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.available}
                onChange={(e) => setForm({ ...form, available: e.target.checked })}
              />
              Available
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.sold_out}
                onChange={(e) => setForm({ ...form, sold_out: e.target.checked })}
              />
              Sold out
            </label>
            <Button type="submit">{form.id ? "Update item" : "Create item"}</Button>
          </form>
        </Card>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.id} className="flex items-center justify-between gap-3">
            <div>
              <p className="font-bold">{item.name}</p>
              <p className="text-sm text-[var(--muted)]">
                {item.category} · {formatSar(item.price_halalas)} ·{" "}
                {item.sold_out ? "Sold out" : item.available ? "Available" : "Hidden"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() =>
                  setForm({
                    id: item.id,
                    name: item.name,
                    category: item.category,
                    price: item.price_halalas / 100,
                    available: item.available,
                    sold_out: item.sold_out,
                    sort_order: item.sort_order,
                    image_url: item.image_url,
                  })
                }
              >
                Edit
              </Button>
              {profile ? (
                <Button variant="danger" onClick={() => void archiveMenuItem(item.id, profile, item.name)}>
                  Archive
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
