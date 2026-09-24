"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button, EmptyState, PageHeader } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { cancelStudentOrder, listenRecentOrders, listenTodayOrders } from "@/services/orders";
import { getSettings } from "@/services/catalog";
import { studentReceiptHtml } from "@/services/printer";
import { issueReceipt } from "@/services/receipts";
import { writeAuditLog } from "@/lib/firestore";
import { formatDateTime } from "@/utils/date";
import { formatSar } from "@/utils/money";
import { useI18n } from "@/i18n/I18nProvider";
import type { StudentOrder } from "@/types";

export default function OrdersPage() {
  return (
    <ProtectedPage allow={["owner", "cashier"]}>
      <OrdersView />
    </ProtectedPage>
  );
}

function OrdersView() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [orders, setOrders] = useState<StudentOrder[]>([]);
  const [busyId, setBusyId] = useState("");
  const isOwner = profile?.role === "owner";

  useEffect(() => {
    return isOwner ? listenRecentOrders(setOrders) : listenTodayOrders(setOrders);
  }, [isOwner]);

  async function reprint(order: StudentOrder) {
    if (!profile) return;
    setBusyId(order.id);
    try {
      const settings = await getSettings();
      await issueReceipt(studentReceiptHtml(order, settings), order.order_number, { print: true, kind: "student" });
      await writeAuditLog({
        action: "RECEIPT_REPRINTED",
        message: `${profile.name} reprinted ${order.order_number}`,
        actor_id: profile.id,
        actor_name: profile.name,
        actor_role: profile.role,
      });
    } finally {
      setBusyId("");
    }
  }

  async function saveReceipt(order: StudentOrder) {
    setBusyId(order.id);
    try {
      const settings = await getSettings();
      await issueReceipt(studentReceiptHtml(order, settings), order.order_number, { print: false, kind: "student" });
    } finally {
      setBusyId("");
    }
  }

  async function closeOrder(order: StudentOrder, refund: boolean) {
    if (!profile) return;
    setBusyId(order.id);
    try {
      await cancelStudentOrder(order, profile, refund);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : t("somethingWrong"));
    } finally {
      setBusyId("");
    }
  }

  return (
    <div>
      <PageHeader
        title={isOwner ? t("orders.title") : t("orders.todayTitle")}
        subtitle={t("orders.subtitle")}
      />
      {orders.length === 0 ? (
        <EmptyState title={t("orders.empty")} body={t("orders.emptyBody")} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-white">
          <table className="min-w-full text-start text-sm">
            <thead className="bg-[var(--paper)]">
              <tr>
                {[
                  t("orders.number"),
                  t("orders.items"),
                  t("orders.total"),
                  t("orders.payment"),
                  t("orders.cashier"),
                  t("orders.time"),
                  t("orders.status"),
                  "",
                ].map((h) => (
                  <th key={h || "actions"} className="px-3 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-[var(--line)]">
                  <td className="px-3 py-3 font-bold">{order.order_number}</td>
                  <td className="px-3 py-3">
                    {order.lines.map((line) => `${line.name} x${line.quantity}`).join(", ")}
                  </td>
                  <td className="px-3 py-3">{formatSar(order.total_halalas)}</td>
                  <td className="px-3 py-3 uppercase">{order.payment_method}</td>
                  <td className="px-3 py-3">{order.cashier_name}</td>
                  <td className="px-3 py-3">{formatDateTime(order.created_at)}</td>
                  <td className="px-3 py-3">{order.status}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="ghost"
                        className="min-h-10 text-sm"
                        disabled={busyId === order.id}
                        onClick={() => void reprint(order)}
                      >
                        {t("reprint")}
                      </Button>
                      <Button
                        variant="secondary"
                        className="min-h-10 text-sm"
                        disabled={busyId === order.id}
                        onClick={() => void saveReceipt(order)}
                      >
                        {t("saveReceipt")}
                      </Button>
                      {order.status === "completed" || order.status === "paid" ? (
                        <Button
                          variant="secondary"
                          className="min-h-10 text-sm"
                          disabled={busyId === order.id}
                          onClick={() => void closeOrder(order, true)}
                        >
                          {t("refund")}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
