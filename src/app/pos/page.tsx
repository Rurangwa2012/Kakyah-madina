"use client";

import { useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button, Card, PageHeader } from "@/components/ui";
import { MenuPicker } from "@/components/MenuPicker";
import { useAuth } from "@/hooks/useAuth";
import { useMenu } from "@/hooks/useMenu";
import { createStudentOrder } from "@/services/orders";
import { studentReceiptHtml } from "@/services/printer";
import { issueReceipt } from "@/services/receipts";
import { getSettings } from "@/services/catalog";
import type { MenuItem, OrderLine, PaymentMethod } from "@/types";
import { applyDiscount, formatSar, lineTotal, orderSubtotal, payableTotal } from "@/utils/money";
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
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const subtotal = orderSubtotal(lines);
  const afterDiscount = applyDiscount(subtotal, discount);
  const total = payableTotal(afterDiscount, payment);

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
      const html = studentReceiptHtml(order, settings);
      await issueReceipt(html, order.order_number, { print: true, kind: "student" });
      setLines([]);
      setDiscount(0);
      setMessage(`${order.order_number} saved. Receipt stored in Supabase.`);
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
        <MenuPicker items={items} onPick={addItem} />
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
          {payment === "card" ? (
            <div className="flex justify-between text-[var(--muted)]">
              <span>{t("pos.cardOff")}</span>
              <span>{formatSar(afterDiscount - total)}</span>
            </div>
          ) : null}
          <div className="flex justify-between font-bold">
            <span>{t("total")}</span>
            <span>{formatSar(total)}</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {(["cash", "card"] as PaymentMethod[]).map((method) => (
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
