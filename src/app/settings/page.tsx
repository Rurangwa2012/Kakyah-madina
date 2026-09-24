"use client";

import { FormEvent, useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button, Card, PageHeader } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { getSettings, saveSettings } from "@/services/catalog";
import { useI18n } from "@/i18n/I18nProvider";
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
  const { t } = useI18n();
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);

  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!profile || !settings) return;
    await saveSettings(settings, profile);
  }

  if (!settings) return <p>{t("settings.loading")}</p>;

  return (
    <div>
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />
      <Card>
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
          <div>
            <label>{t("settings.restaurant")}</label>
            <input
              value={settings.restaurant_name}
              onChange={(e) => setSettings({ ...settings, restaurant_name: e.target.value })}
            />
          </div>
          <div>
            <label>{t("settings.currency")}</label>
            <input value={settings.currency} readOnly />
          </div>
          <div className="md:col-span-2">
            <label>{t("settings.footer")}</label>
            <input
              value={settings.receipt_footer}
              onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
            />
          </div>
          <div>
            <label>{t("settings.studentPrefix")}</label>
            <input
              value={settings.student_order_prefix}
              onChange={(e) => setSettings({ ...settings, student_order_prefix: e.target.value })}
            />
          </div>
          <div>
            <label>{t("settings.groupPrefix")}</label>
            <input
              value={settings.group_order_prefix}
              onChange={(e) => setSettings({ ...settings, group_order_prefix: e.target.value })}
            />
          </div>
          <div>
            <label>{t("settings.printer")}</label>
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
            {t("settings.lowStock")}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.owner_approval_required}
              onChange={(e) => setSettings({ ...settings, owner_approval_required: e.target.checked })}
            />
            {t("settings.approval")}
          </label>
          <label className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              checked={settings.vat_enabled}
              onChange={(e) => setSettings({ ...settings, vat_enabled: e.target.checked })}
            />
            {t("settings.vatEnabled")}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.vat_inclusive}
              onChange={(e) => setSettings({ ...settings, vat_inclusive: e.target.checked })}
            />
            {t("settings.vatInclusive")}
          </label>
          <div>
            <label>{t("settings.vatBps")}</label>
            <input
              type="number"
              value={settings.vat_rate_basis_points}
              onChange={(e) => setSettings({ ...settings, vat_rate_basis_points: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label>{t("settings.vatNo")}</label>
            <input
              value={settings.vat_registration_number}
              onChange={(e) => setSettings({ ...settings, vat_registration_number: e.target.value })}
            />
          </div>
          <div>
            <label>{t("settings.legalAr")}</label>
            <input
              value={settings.seller_legal_name_ar}
              onChange={(e) => setSettings({ ...settings, seller_legal_name_ar: e.target.value })}
            />
          </div>
          <div>
            <label>{t("settings.legalEn")}</label>
            <input
              value={settings.seller_legal_name_en}
              onChange={(e) => setSettings({ ...settings, seller_legal_name_en: e.target.value })}
            />
          </div>
          <div>
            <label>{t("settings.addressAr")}</label>
            <input value={settings.address_ar} onChange={(e) => setSettings({ ...settings, address_ar: e.target.value })} />
          </div>
          <div>
            <label>{t("settings.addressEn")}</label>
            <input value={settings.address_en} onChange={(e) => setSettings({ ...settings, address_en: e.target.value })} />
          </div>
          <div>
            <label>{t("settings.lockMinutes")}</label>
            <input
              type="number"
              min={1}
              value={settings.lock_minutes}
              onChange={(e) => setSettings({ ...settings, lock_minutes: Number(e.target.value) || 10 })}
            />
          </div>
          <div>
            <label>{t("settings.cashierDiscount")}</label>
            <input
              type="number"
              min={0}
              value={settings.cashier_max_discount_halalas}
              onChange={(e) => setSettings({ ...settings, cashier_max_discount_halalas: Number(e.target.value) || 0 })}
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.require_open_shift}
              onChange={(e) => setSettings({ ...settings, require_open_shift: e.target.checked })}
            />
            {t("settings.requireShift")}
          </label>
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit">{t("settings.save")}</Button>
            <Button variant="ghost" onClick={() => void printerService.printHtml(testReceiptHtml)}>
              {t("settings.testPrint")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
