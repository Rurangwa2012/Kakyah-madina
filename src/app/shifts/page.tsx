"use client";

import { FormEvent, useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button, Card, PageHeader } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import {
  closeShift,
  getOpenShift,
  listCashMovements,
  listShifts,
  openShift,
  recordCashMovement,
  type CashMovement,
  type Shift,
} from "@/services/shifts";
import { formatSar, sarToHalalas } from "@/utils/money";
import { formatDateTime } from "@/utils/date";
import { useI18n } from "@/i18n/I18nProvider";

export default function ShiftsPage() {
  return (
    <ProtectedPage allow={["owner", "cashier"]}>
      <ShiftsView />
    </ProtectedPage>
  );
}

function ShiftsView() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState<Shift | null>(null);
  const [history, setHistory] = useState<Shift[]>([]);
  const [moves, setMoves] = useState<CashMovement[]>([]);
  const [openingSar, setOpeningSar] = useState("0");
  const [actualSar, setActualSar] = useState("0");
  const [note, setNote] = useState("");
  const [moveType, setMoveType] = useState<"cash_in" | "cash_out">("cash_in");
  const [moveSar, setMoveSar] = useState("0");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  async function refresh() {
    if (!profile) return;
    const current = await getOpenShift(profile.id);
    setOpen(current);
    setHistory(await listShifts());
    if (current) setMoves(await listCashMovements(current.id));
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  async function onOpen(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      await openShift(sarToHalalas(Number(openingSar)), "POS-01");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("somethingWrong"));
    }
  }

  async function onClose(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    try {
      await closeShift(sarToHalalas(Number(actualSar)), note);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("somethingWrong"));
    }
  }

  async function onMove(event: FormEvent) {
    event.preventDefault();
    try {
      await recordCashMovement(moveType, sarToHalalas(Number(moveSar)), reason);
      setReason("");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("somethingWrong"));
    }
  }

  return (
    <div>
      <PageHeader title={t("shifts.title")} subtitle={t("shifts.subtitle")} />
      {message ? <p className="mb-3 text-sm text-[var(--spice)]">{message}</p> : null}
      {!open ? (
        <Card>
          <h3 className="font-display text-2xl">{t("shifts.openTitle")}</h3>
          <p className="text-sm text-[var(--muted)]">
            {profile?.name} · POS-01
          </p>
          <form onSubmit={onOpen} className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label>{t("shifts.openingCash")}</label>
              <input value={openingSar} onChange={(e) => setOpeningSar(e.target.value)} type="number" min={0} step="0.01" />
            </div>
            <div className="flex items-end">
              <Button type="submit">{t("shifts.open")}</Button>
            </div>
          </form>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h3 className="font-display text-2xl">{t("shifts.openTitle")}</h3>
            <p>
              {t("shifts.opened")}: {formatDateTime(open.opened_at)}
            </p>
            <p>
              {t("shifts.openingCash")}: {formatSar(open.opening_cash_halalas)}
            </p>
            <form onSubmit={onMove} className="mt-3 space-y-2">
              <select value={moveType} onChange={(e) => setMoveType(e.target.value as "cash_in" | "cash_out")}>
                <option value="cash_in">{t("shifts.cashIn")}</option>
                <option value="cash_out">{t("shifts.cashOut")}</option>
              </select>
              <input type="number" min={0} step="0.01" value={moveSar} onChange={(e) => setMoveSar(e.target.value)} />
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("shifts.reason")} />
              <Button type="submit">{t("save")}</Button>
            </form>
            <div className="mt-3 text-sm">
              {moves.map((row) => (
                <p key={row.id}>
                  {row.type} {formatSar(row.amount_halalas)} · {row.reason}
                </p>
              ))}
            </div>
          </Card>
          <Card>
            <h3 className="font-display text-2xl">{t("shifts.closeTitle")}</h3>
            <form onSubmit={onClose} className="space-y-3">
              <div>
                <label>{t("shifts.actualCash")}</label>
                <input type="number" min={0} step="0.01" value={actualSar} onChange={(e) => setActualSar(e.target.value)} />
              </div>
              <div>
                <label>{t("shifts.note")}</label>
                <input value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <Button type="submit">{t("shifts.close")}</Button>
            </form>
          </Card>
        </div>
      )}
      {profile?.role === "owner" ? (
        <Card className="mt-4">
          <h3 className="font-display text-2xl">{t("shifts.history")}</h3>
          {history.map((row) => (
            <p key={row.id} className="text-sm">
              {row.cashier_name} · {row.status} · {formatSar(row.opening_cash_halalas)}
              {row.cash_difference_halalas != null ? ` · Δ ${formatSar(row.cash_difference_halalas)}` : ""}
            </p>
          ))}
        </Card>
      ) : null}
    </div>
  );
}
