"use client";

import { useMemo, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useMenu } from "@/hooks/useMenu";
import { createStudentOrder } from "@/services/orders";
import { printerService, studentReceiptHtml } from "@/services/printer";
import { getSettings } from "@/services/catalog";
import { MENU_CATEGORIES, type MenuItem, type OrderLine, type PaymentMethod } from "@/types";
import { applyDiscount, formatSar, lineTotal, orderSubtotal } from "@/utils/money";
import { cn, isExtraItem } from "@/utils/format";
import { useI18n } from "@/i18n/I18nProvider";

export default function PosPage() {
  return (
    <ProtectedPage allow={["owner", "cashier"]}>
      <StudentPos />
    </ProtectedPage>
  );
}

function StudentPos() {
  const { items } = useMenu();
  const { profile } = useAuth();
  const { t } = useI18n();
  const [category, setCategory] = useState<string>("All");
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const extraItems = useMemo(() => items.filter(isExtraItem), [items]);

  const visible = useMemo(() => {
    if (category === "Extra") return extraItems;
    return items.filter((item) => category === "All" || item.category === category);
  }, [items, category, extraItems]);

  const subtotal = orderSubtotal(lines);
  const total = applyDiscount(subtotal, discount);

  function addItem(item: MenuItem) {
    if (!item.available || item.sold_out) return;
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
      const quantity = existing.quantity + 1;
      return current.map((line) =>
        line.menu_id === item.id
          ? { ...line, quantity, total_halalas: lineTotal(line.unit_price_halalas, quantity) }
          : line,
      );
    });
  }

  function changeQty(menuId: string, delta: number) {
    setLines((current) =>
      current
        .map((line) => {
          if (line.menu_id !== menuId) return line;
          const quantity = line.quantity + delta;
          return { ...line, quantity, total_halalas: lineTotal(line.unit_price_halalas, quantity) };
        })
        .filter((line) => line.quantity > 0),
    );
  }

  async function payAndPrint() {
    if (!profile || lines.length === 0) return;
    setBusy(true);
    setMessage("");
    try {
      const settings = await getSettings();
      const order = await createStudentOrder({
        lines,
        discount_halalas: discount,
        payment_method: payment,
        actor: profile,
        studentPrefix: settings.student_order_prefix,
      });
      await printerService.printHtml(studentReceiptHtml(order, settings));
      setLines([]);
      setDiscount(0);
      setMessage(`${order.order_number} saved`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save order");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div>
        <PageHeader title={t("pos.title")} subtitle={t("pos.subtitle")} />
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategory("Extra")}
            className={cn(
              "min-h-14 shrink-0 rounded-2xl px-6 text-lg font-extrabold",
              category === "Extra" ? "bg-[var(--gold)] text-[var(--ink)]" : "bg-[var(--spice)] text-white",
            )}
          >
            {t("extra")}
          </button>
          {["All", ...MENU_CATEGORIES.filter((cat) => cat !== "Extras")].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                "min-h-14 shrink-0 rounded-2xl px-4 font-semibold",
                category === cat ? "bg-[var(--ink)] text-white" : "bg-white text-[var(--ink)]",
              )}
            >
              {cat === "All" ? t("all") : t(`cats.${cat}`)}
            </button>
          ))}
        </div>
        {category === "Extra" && extraItems.length === 0 ? (
          <EmptyState title={t("pos.noExtras")} body={t("pos.noExtrasBody")} />
        ) : visible.length === 0 ? (
          <EmptyState title={t("pos.noItems")} body={t("pos.noItemsBody")} />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {visible.map((item) => {
              const disabled = !item.available || item.sold_out;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => addItem(item)}
                  className={cn(
                    "min-h-36 rounded-2xl border border-[var(--line)] bg-white p-3 text-start shadow-sm",
                    disabled && "opacity-50",
                  )}
                >
                  <div className="mb-2 flex h-20 items-center justify-center overflow-hidden rounded-xl bg-[var(--paper)]">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-3xl">🍛</span>
                    )}
                  </div>
                  <p className="font-bold">{item.name}</p>
                  <p className="text-[var(--spice)]">{formatSar(item.price_halalas)}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {item.sold_out ? t("pos.soldOut") : item.available ? t("pos.available") : t("pos.unavailable")}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <Card className="h-fit xl:sticky xl:top-4">
        <h3 className="font-display text-2xl">{t("pos.current")}</h3>
        <div className="mt-3 space-y-2">
          {lines.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">{t("pos.tap")}</p>
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
        <label className="mt-4" htmlFor="discount">
          {t("pos.discountHalalas")}
        </label>
        <input
          id="discount"
          type="number"
          min={0}
          value={discount}
          onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
        />
        <div className="mt-4 space-y-1 text-lg">
          <div className="flex justify-between">
            <span>{t("subtotal")}</span>
            <span>{formatSar(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t("discount")}</span>
            <span>{formatSar(discount)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>{t("total")}</span>
            <span>{formatSar(total)}</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(["cash", "card", "mobile"] as PaymentMethod[]).map((method) => (
            <Button
              key={method}
              variant={payment === method ? "secondary" : "ghost"}
              onClick={() => setPayment(method)}
            >
              {t(method)}
            </Button>
          ))}
        </div>
        <Button className="mt-4 w-full" variant="pay" disabled={busy || lines.length === 0} onClick={() => void payAndPrint()}>
          {t("payPrint")}
        </Button>
        {message ? <p className="mt-3 text-sm">{message}</p> : null}
      </Card>
    </div>
  );
}
