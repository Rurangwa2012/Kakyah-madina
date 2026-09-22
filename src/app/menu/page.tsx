"use client";

import { FormEvent, useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button, Card, PageHeader } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import {
  deleteMenuItem,
  listenMenu,
  saveMenuItem,
  uploadMenuImage,
} from "@/services/catalog";
import { MENU_CATEGORIES, type MenuItem } from "@/types";
import { formatSar, sarToHalalas } from "@/utils/money";
import { useI18n } from "@/i18n/I18nProvider";

const emptyForm = {
  id: "",
  name: "",
  category: "Rice",
  customCategory: "",
  price: 8,
  available: true,
  sold_out: false,
  sort_order: 10,
  image_url: "",
  is_extra: false,
};

export default function MenuPage() {
  return (
    <ProtectedPage allow={["owner"]}>
      <MenuManager />
    </ProtectedPage>
  );
}

function MenuManager() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fileKey, setFileKey] = useState(0);

  const [preview, setPreview] = useState("");

  useEffect(() => listenMenu(setItems), []);

  useEffect(() => {
    if (!file) {
      setPreview(form.image_url);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, form.image_url]);

  function resetForm() {
    setForm(emptyForm);
    setFile(null);
    setFileKey((key) => key + 1);
    setError("");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    const name = form.name.trim();
    if (!name) {
      setError(t("menu.enterName"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const id = form.id || crypto.randomUUID();
      const category = form.customCategory.trim() || form.category;
      let image_url = form.image_url;
      if (file) {
        image_url = await uploadMenuImage(file, id);
      }
      await saveMenuItem(
        {
          id,
          name,
          category,
          price_halalas: sarToHalalas(form.price),
          image_url,
          available: form.available,
          sold_out: form.sold_out,
          sort_order: form.sort_order,
          archived: false,
          is_extra: form.is_extra,
        },
        profile,
      );
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save menu item.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(item: MenuItem) {
    if (!profile) return;
    if (!window.confirm(t("menu.confirmDelete", { name: item.name }))) return;
    setError("");
    setItems((current) => current.filter((row) => row.id !== item.id));
    if (form.id === item.id) resetForm();
    try {
      await deleteMenuItem(item.id, profile, item.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete item. Publish updated firestore.rules.");
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <div>
        <PageHeader
          title={t("menu.title")}
          subtitle={t("menu.subtitle")}
          actions={
            <Button variant="ghost" onClick={resetForm}>
              {t("menu.newItem")}
            </Button>
          }
        />
        <Card>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label htmlFor="item-name">{t("menu.foodName")}</label>
              <input
                id="item-name"
                placeholder="Nasi Kandar"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="item-category">{t("menu.category")}</label>
              <select
                id="item-category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {MENU_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {t(`cats.${cat}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="item-new-category">{t("menu.newCategory")}</label>
              <input
                id="item-new-category"
                placeholder="Soup"
                value={form.customCategory}
                onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="item-price">{t("menu.price")}</label>
              <input
                id="item-price"
                type="number"
                step="0.01"
                min={0}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              />
            </div>
            <div>
              <label htmlFor="item-sort">{t("menu.sort")}</label>
              <input
                id="item-sort"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
            <div>
              <label htmlFor="item-image">{t("menu.photo")}</label>
              <input
                key={fileKey}
                id="item-image"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-32 w-full rounded-xl object-cover" />
            ) : null}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_extra}
                onChange={(e) => setForm({ ...form, is_extra: e.target.checked })}
              />
              {t("menu.extraFlag")}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.available}
                onChange={(e) => setForm({ ...form, available: e.target.checked })}
              />
              {t("menu.available")}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.sold_out}
                onChange={(e) => setForm({ ...form, sold_out: e.target.checked })}
              />
              {t("menu.soldOut")}
            </label>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? t("saving") : form.id ? t("menu.updateItem") : t("menu.addItem")}
            </Button>
          </form>
        </Card>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <Card>
            <p className="text-[var(--muted)]">{t("menu.empty")}</p>
          </Card>
        ) : null}
        {items.map((item) => (
          <Card key={item.id} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[var(--paper)]">
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl">🍛</div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold">{item.name}</p>
                <p className="text-sm text-[var(--muted)]">
                  {t(`cats.${item.category}`) === `cats.${item.category}` ? item.category : t(`cats.${item.category}`)} · {formatSar(item.price_halalas)}
                  {item.is_extra || item.category === "Extras" ? ` · ${t("menu.extraBadge")}` : ""} ·{" "}
                  {item.archived
                    ? t("menu.archived")
                    : item.sold_out
                      ? t("menu.soldOut")
                      : item.available
                        ? t("menu.available")
                        : t("menu.hidden")}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setForm({
                    id: item.id,
                    name: item.name,
                    category: MENU_CATEGORIES.includes(item.category as (typeof MENU_CATEGORIES)[number])
                      ? item.category
                      : "Extras",
                    customCategory: MENU_CATEGORIES.includes(item.category as (typeof MENU_CATEGORIES)[number])
                      ? ""
                      : item.category,
                    price: item.price_halalas / 100,
                    available: item.available,
                    sold_out: item.sold_out,
                    sort_order: item.sort_order,
                    image_url: item.image_url,
                    is_extra: item.is_extra || item.category === "Extras",
                  });
                  setFile(null);
                  setFileKey((key) => key + 1);
                }}
              >
                {t("edit")}
              </Button>
              <Button variant="danger" onClick={() => void onDelete(item)}>
                {t("delete")}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
