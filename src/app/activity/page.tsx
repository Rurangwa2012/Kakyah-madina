"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Card, PageHeader } from "@/components/ui";
import { listenAuditLogs } from "@/services/finance";
import { formatDateTime } from "@/utils/date";
import type { AuditLog } from "@/types";

export default function ActivityPage() {
  return (
    <ProtectedPage allow={["owner"]}>
      <Activity />
    </ProtectedPage>
  );
}

function Activity() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  useEffect(() => listenAuditLogs(setLogs), []);
  return (
    <div>
      <PageHeader title="Activity logs" subtitle="Cashiers cannot delete this history." />
      <Card>
        <div className="space-y-3">
          {logs.map((log) => (
            <p key={log.id}>
              {formatDateTime(log.created_at)} — {log.message}
            </p>
          ))}
        </div>
      </Card>
    </div>
  );
}
