"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button, EmptyState, PageHeader } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { cancelStudentOrder, listenRecentOrders, listenTodayOrders } from "@/services/orders";
import { getSettings } from "@/services/catalog";
import { printerService, studentReceiptHtml } from "@/services/printer";
import { writeAuditLog } from "@/lib/firestore";
import { formatDateTime } from "@/utils/date";
import { formatSar } from "@/utils/money";
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
  const [orders, setOrders] = useState<StudentOrder[]>([]);
  const isOwner = profile?.role === "owner";

  useEffect(() => {
    return isOwner ? listenRecentOrders(setOrders) : listenTodayOrders(setOrders);
  }, [isOwner]);

  async function reprint(order: StudentOrder) {
    if (!profile) return;
    const settings = await getSettings();
    await printerService.printHtml(studentReceiptHtml(order, settings));
    await writeAuditLog({
      action: "RECEIPT_REPRINTED",
      message: `${profile.name} reprinted ${order.order_number}`,
      actor_id: profile.id,
      actor_name: profile.name,
      actor_role: profile.role,
    });
  }

  return (
    <div>
      <PageHeader
        title={isOwner ? "Orders" : "Today's Orders"}
        subtitle="Student orders use S- numbers. Group orders stay on the Group Orders page."
      />
      {orders.length === 0 ? (
        <EmptyState title="No student orders yet" body="Completed POS sales will appear here." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--paper)]">
              <tr>
                {["Number", "Items", "Total", "Payment", "Cashier", "Time", "Status", ""].map((h) => (
                  <th key={h} className="px-3 py-3">
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
                      <Button variant="ghost" className="min-h-10 text-sm" onClick={() => void reprint(order)}>
                        Reprint
                      </Button>
                      {isOwner && order.status === "completed" ? (
                        <>
                          <Button
                            variant="danger"
                            className="min-h-10 text-sm"
                            onClick={() => void cancelStudentOrder(order, profile, false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="secondary"
                            className="min-h-10 text-sm"
                            onClick={() => void cancelStudentOrder(order, profile, true)}
                          >
                            Refund
                          </Button>
                        </>
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
