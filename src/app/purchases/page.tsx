"use client";

import { FormEvent, useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button, Card, PageHeader } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { listenInventory } from "@/services/inventory";
import { createPurchase, listSuppliers, saveSupplier, type Supplier } from "@/services/purchases";
import { sarToHalalas } from "@/utils/money";
import { useI18n } from "@/i18n/I18nProvider";
import type { InventoryItem } from "@/types";

export default function PurchasesPage() {
  return (
    <ProtectedPage allow={["owner"]}>
      <PurchasesView />
    </ProtectedPage>
  );
}

function PurchasesView() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stock, setStock] = useState<InventoryItem[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [inventoryId, setInventoryId] = useState("");
  const [qty, setQty] = useState("1");
  const [cost, setCost] = useState("0");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void listSuppliers().then(setSuppliers);
    return listenInventory(setStock);
  }, []);

  async function addSupplier(event: FormEvent) {
    event.preventDefault();
    await saveSupplier({ name, phone, contact: name, notes: "" });
    setName("");
    setSuppliers(await listSuppliers());
  }

  async function receive(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setMessage("");
    try {
      await createPurchase({
        supplier_id: supplierId,
        inventory_id: inventoryId,
        quantity: Number(qty),
        unit_cost_halalas: sarToHalalas(Number(cost)),
        actor: profile,
      });
      setMessage(t("purchases.received"));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("somethingWrong"));
    }
  }

  return (
    <div>
      <PageHeader title={t("purchases.title")} subtitle={t("purchases.subtitle")} />
      {message ? <p className="mb-3">{message}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="font-display text-2xl">{t("purchases.suppliers")}</h3>
          <form onSubmit={addSupplier} className="mt-3 space-y-2">
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("purchases.supplierName")} />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("purchases.phone")} />
            <Button type="submit">{t("add")}</Button>
          </form>
          <div className="mt-3 text-sm">
            {suppliers.map((row) => (
              <p key={row.id}>
                {row.name} {row.phone}
              </p>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-display text-2xl">{t("purchases.receive")}</h3>
          <form onSubmit={receive} className="mt-3 space-y-2">
            <select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">{t("purchases.chooseSupplier")}</option>
              {suppliers.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
            <select required value={inventoryId} onChange={(e) => setInventoryId(e.target.value)}>
              <option value="">{t("purchases.chooseStock")}</option>
              {stock.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
            <input type="number" min={0} step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} />
            <input type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
            <Button type="submit">{t("purchases.receive")}</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
