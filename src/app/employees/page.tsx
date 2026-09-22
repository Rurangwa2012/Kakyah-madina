"use client";

import { FormEvent, useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button, Card, PageHeader } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { createStaffAccount, listenUsers, saveEmployee } from "@/services/catalog";
import type { AppUser, UserRole } from "@/types";
import { useI18n } from "@/i18n/I18nProvider";

export default function EmployeesPage() {
  return (
    <ProtectedPage allow={["owner"]}>
      <Employees />
    </ProtectedPage>
  );
}

function Employees() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "cashier" as UserRole,
    inventory_access: true,
    active: true,
  });

  useEffect(() => listenUsers(setUsers), []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setBusy(true);
    setError("");
    try {
      await createStaffAccount(form);
      setForm({
        name: "",
        email: "",
        password: "",
        role: "cashier",
        inventory_access: true,
        active: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create staff.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title={t("employees.title")} subtitle={t("employees.subtitle")} />
      <Card className="mb-4">
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
          {error ? <p className="md:col-span-2 text-sm text-red-700">{error}</p> : null}
          <input
            required
            placeholder={t("employees.name")}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            required
            type="email"
            placeholder={t("email")}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            required
            type="password"
            minLength={6}
            placeholder={t("password")}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
            <option value="cashier">{t("role.cashier")}</option>
            <option value="owner">{t("role.owner")}</option>
          </select>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.inventory_access}
              onChange={(e) => setForm({ ...form, inventory_access: e.target.checked })}
            />
            {t("employees.inventory")}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            {t("employees.active")}
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? t("saving") : t("employees.save")}
          </Button>
        </form>
      </Card>
      <div className="space-y-3">
        {users.map((user) => (
          <Card key={user.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold">
                {user.name} · {user.role === "owner" ? t("role.owner") : t("role.cashier")}
              </p>
              <p className="text-sm text-[var(--muted)]">
                {user.email} · {user.active ? t("employees.active") : t("employees.disable")}
              </p>
            </div>
            {profile ? (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() =>
                    void saveEmployee({ ...user, active: !user.active }, profile)
                  }
                >
                  {user.active ? t("employees.disable") : t("employees.enable")}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    void saveEmployee(
                      { ...user, role: user.role === "owner" ? "cashier" : "owner" },
                      profile,
                    )
                  }
                >
                  {t("employees.switchRole")}
                </Button>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
