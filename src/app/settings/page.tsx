"use client";

import { FormEvent, useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button, Card, PageHeader } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { getSettings, saveSettings } from "@/services/catalog";
import { printerService, testReceiptHtml } from "@/services/printer";
import type { RestaurantSettings } from "@/types";

export default function SettingsPage() {
  return (
    <ProtectedPage allow={["owner"]}>
      <SettingsView />
    </ProtectedPage>
  );
}

function SettingsView() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);

  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!profile || !settings) return;
    await saveSettings(settings, profile);
  }

  if (!settings) return <p>Loading settings…</p>;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Restaurant, receipt and printer options." />
      <Card>
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
          <div>
            <label>Restaurant Name</label>
            <input
              value={settings.restaurant_name}
              onChange={(e) => setSettings({ ...settings, restaurant_name: e.target.value })}
            />
          </div>
          <div>
            <label>Currency</label>
            <input value={settings.currency} readOnly />
          </div>
          <div className="md:col-span-2">
            <label>Receipt Footer</label>
            <input
              value={settings.receipt_footer}
              onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
            />
          </div>
          <div>
            <label>Student Order Prefix</label>
            <input
              value={settings.student_order_prefix}
              onChange={(e) => setSettings({ ...settings, student_order_prefix: e.target.value })}
            />
          </div>
          <div>
            <label>Group Order Prefix</label>
            <input
              value={settings.group_order_prefix}
              onChange={(e) => setSettings({ ...settings, group_order_prefix: e.target.value })}
            />
          </div>
          <div>
            <label>Printer type</label>
            <select
              value={settings.printer.type}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  printer: {
                    ...settings.printer,
                    type: e.target.value as RestaurantSettings["printer"]["type"],
                  },
                })
              }
            >
              <option value="browser">Browser</option>
              <option value="usb">USB (later)</option>
              <option value="bluetooth">Bluetooth (later)</option>
              <option value="network">LAN / network (later)</option>
            </select>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.low_stock_alert}
              onChange={(e) => setSettings({ ...settings, low_stock_alert: e.target.checked })}
            />
            Low stock alert
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.owner_approval_required}
              onChange={(e) => setSettings({ ...settings, owner_approval_required: e.target.checked })}
            />
            Owner approval settings
          </label>
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit">Save settings</Button>
            <Button variant="ghost" onClick={() => void printerService.printHtml(testReceiptHtml)}>
              Test Print
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
