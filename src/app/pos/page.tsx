"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button, Card, PageHeader } from "@/components/ui";
import { MenuPicker } from "@/components/MenuPicker";
import { useAuth } from "@/hooks/useAuth";
import { useMenu } from "@/hooks/useMenu";
import { createStudentOrder } from "@/services/orders";
import { studentReceiptHtml } from "@/services/printer";
import { issueReceipt } from "@/services/receipts";
import { getSettings } from "@/services/catalog";
import { getOpenShift } from "@/services/shifts";
import type { MenuItem, OrderLine, PaymentMethod, RestaurantSettings } from "@/types";
import { applyDiscount, formatSar, lineTotal, orderSubtotal } from "@/utils/money";
import { vatSplit } from "@/utils/tax";
import { useI18n } from "@/i18n/I18nProvider";
import Link from "next/link";

const POS_METHODS: PaymentMethod[] = ["cash", "mada", "card", "apple_pay"];

export default function PosPage() {
  return (
    <ProtectedPage allow={["owner", "cashier"]}>
      <StudentPos />
    </ProtectedPage>
  );
}

function StudentPos() {
  const { items } = useMenu();
  const { profile, online } = useAuth();
  const { t } = useI18n();
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [printFailed, setPrintFailed] = useState(false);
  const [lastOrderHtml, setLastOrderHtml] = useState("");
  const [lastOrderNumber, setLastOrderNumber] = useState("");
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [shiftOpen, setShiftOpen] = useState(true);
  const [clock, setClock] = useState("");
  const idempotency = useRef(crypto.randomUUID());

  const subtotal = orderSubtotal(lines);
  const afterDiscount = applyDiscount(subtotal, discount);
  const tax = settings ? vatSplit(afterDiscount, settings) : { exVat: afterDiscount, vat: 0, total: afterDiscount };
  const total = tax.total;

  useEffect(() => {
    void getSettings().then(setSettings);
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Riyadh", hour: "2-digit", minute: "2-digit" }),
      );
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!profile) return;
    void getOpenShift(profile.id).then((shift) => {
      const required = settings?.require_open_shift !== false && profile.role === "cashier";
      setShiftOpen(!required || Boolean(shift));
    });
  }, [profile, settings]);

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
    if (!profile || lines.length === 0 || busy) return;
    if (!online) {
      setMessage(t("pos.needOnline"));
      return;
    }
    if (!shiftOpen) {
      setMessage(t("pos.needShift"));
      return;
    }
    setBusy(true);
    setMessage("");
    setPrintFailed(false);
    try {
      const restaurant = settings ?? (await getSettings());
      const preview = vatSplit(applyDiscount(orderSubtotal(lines), discount), restaurant);
      const order = await createStudentOrder({
        items: lines.map((line) => ({ menu_id: line.menu_id, quantity: line.quantity })),
        discount_halalas: discount,
        payments: [{ method: payment, amount_halalas: preview.total }],
        actor: profile,
        idempotency_key: idempotency.current,
        terminal_id: restaurant.default_terminal_id,
      });
      const html = studentReceiptHtml(order, restaurant);
      setLastOrderHtml(html);
      setLastOrderNumber(order.order_number);
      setLines([]);
      setDiscount(0);
      idempotency.current = crypto.randomUUID();
      try {
        await issueReceipt(html, order.order_number, { print: true, kind: "student" });
        setMessage(`${order.order_number} ${t("pos.paid")}`);
      } catch {
        setPrintFailed(true);
        setMessage(`${order.order_number} ${t("pos.paidPrintFail")}`);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("pos.saveFail"));
    } finally {
      setBusy(false);
    }
  }

  const methods = useMemo(
    () => (settings?.payment_methods?.length ? settings.payment_methods.filter((m) => POS_METHODS.includes(m)) : POS_METHODS),
    [settings],
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[var(--panel)] px-4 py-3 text-sm font-semibold">
        <span>Kak Yah · {profile?.name}</span>
        <span>{online ? t("online") : t("offline")}</span>
        <span>POS-01 · {shiftOpen ? t("pos.shiftOpen") : t("pos.shiftClosed")}</span>
        <span>{clock} Asia/Riyadh</span>
      </div>
      {!shiftOpen ? (
        <Card className="mb-4">
          <p className="font-semibold">{t("pos.needShift")}</p>
          <Link href="/shifts" className="mt-2 inline-block text-[var(--spice)]">
            {t("pos.openShiftLink")}
          </Link>
        </Card>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div>
          <PageHeader title={t("pos.title")} subtitle={t("pos.subtitle")} />
          <MenuPicker items={items} onPick={addItem} layout="rail" />
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
            <div className="flex justify-between text-[var(--muted)]">
              <span>{t("pos.vat")}</span>
              <span>{formatSar(tax.vat)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>{t("total")}</span>
              <span>{formatSar(total)}</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {methods.map((method) => (
              <Button
                key={method}
                variant={payment === method ? "secondary" : "ghost"}
                onClick={() => setPayment(method)}
              >
                {t(method)}
              </Button>
            ))}
          </div>
          <Button className="mt-4 w-full" variant="pay" disabled={busy || lines.length === 0 || !shiftOpen} onClick={() => void payAndPrint()}>
            {busy ? t("pos.processing") : t("payPrint")}
          </Button>
          {printFailed ? (
            <div className="mt-3 space-y-2">
              <p className="font-semibold">{t("pos.paidPrintFail")}</p>
              <Button
                variant="ghost"
                onClick={() => {
                  void issueReceipt(lastOrderHtml, lastOrderNumber, { print: true, kind: "student" });
                }}
              >
                {t("reprint")}
              </Button>
            </div>
          ) : null}
          {message ? <p className="mt-3 text-sm">{message}</p> : null}
        </Card>
      </div>
    </div>
  );
}
