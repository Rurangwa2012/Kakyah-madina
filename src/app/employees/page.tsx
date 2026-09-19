"use client";

import { FormEvent, useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button, Card, PageHeader } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { listenUsers, saveEmployee } from "@/services/catalog";
import type { AppUser, UserRole } from "@/types";

export default function EmployeesPage() {
  return (
    <ProtectedPage allow={["owner"]}>
      <Employees />
    </ProtectedPage>
  );
}

function Employees() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [form, setForm] = useState({
    id: "",
    name: "",
    email: "",
    role: "cashier" as UserRole,
    inventory_access: true,
    active: true,
  });

  useEffect(() => listenUsers(setUsers), []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    await saveEmployee(form, profile);
    setForm({
      id: "",
      name: "",
      email: "",
      role: "cashier",
      inventory_access: true,
      active: true,
    });
  }

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle="Create the person in Firebase Authentication first, then save their UID here."
      />
      <Card className="mb-4">
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
          <input
            required
            placeholder="Firebase UID"
            value={form.id}
            onChange={(e) => setForm({ ...form, id: e.target.value })}
          />
          <input
            required
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
            <option value="cashier">cashier</option>
            <option value="owner">owner</option>
          </select>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.inventory_access}
              onChange={(e) => setForm({ ...form, inventory_access: e.target.checked })}
            />
            Inventory access
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Active
          </label>
          <Button type="submit">Save employee</Button>
        </form>
      </Card>
      <div className="space-y-3">
        {users.map((user) => (
          <Card key={user.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold">
                {user.name} · {user.role}
              </p>
              <p className="text-sm text-[var(--muted)]">
                {user.email} · {user.active ? "Active" : "Disabled"}
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
                  {user.active ? "Disable" : "Enable"}
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
                  Switch role
                </Button>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
