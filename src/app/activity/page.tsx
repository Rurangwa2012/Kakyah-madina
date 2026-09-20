"use client";

import { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Card, PageHeader } from "@/components/ui";
import { listenAuditLogs } from "@/services/finance";
import { formatDateTime } from "@/utils/date";
import type { AuditLog } from "@/types";
import { useI18n } from "@/i18n/I18nProvider";

export default function ActivityPage() {
  return (
    <ProtectedPage allow={["owner"]}>
      <Activity />
    </ProtectedPage>
  );
}

function Activity() {
  const { t } = useI18n();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  useEffect(() => listenAuditLogs(setLogs), []);
  return (
    <div>
      <PageHeader title={t("activity.title")} subtitle={t("activity.subtitle")} />
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
