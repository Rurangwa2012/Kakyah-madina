"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/utils/format";
import { SessionLock } from "@/components/SessionLock";
import { getSettings } from "@/services/catalog";

const ownerNav = [
  { href: "/dashboard", key: "nav.dashboard" },
  { href: "/pos", key: "nav.pos" },
  { href: "/group-orders", key: "nav.groupOrders" },
  { href: "/orders", key: "nav.orders" },
  { href: "/shifts", key: "nav.shifts" },
  { href: "/menu", key: "nav.menu" },
  { href: "/inventory", key: "nav.inventory" },
  { href: "/purchases", key: "nav.purchases" },
  { href: "/buffet", key: "nav.buffet" },
  { href: "/expenses", key: "nav.expenses" },
  { href: "/reports", key: "nav.reports" },
  { href: "/employees", key: "nav.employees" },
  { href: "/activity", key: "nav.activity" },
  { href: "/settings", key: "nav.settings" },
];

const cashierNav = [
  { href: "/pos", key: "nav.pos" },
  { href: "/group-orders", key: "nav.groupOrders" },
  { href: "/orders", key: "nav.todayOrders" },
  { href: "/shifts", key: "nav.shifts" },
  { href: "/inventory", key: "nav.inventory" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, logout, online } = useAuth();
  const { t } = useI18n();
  const pathname = usePathname();
  const [lockMinutes, setLockMinutes] = useState(10);
  const nav =
    profile?.role === "owner"
      ? ownerNav
      : cashierNav.filter((item) => item.href !== "/inventory" || profile?.inventory_access);

  useEffect(() => {
    void getSettings().then((settings) => setLockMinutes(settings.lock_minutes || 10));
  }, []);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-[var(--line)] bg-[var(--panel)] md:border-b-0 md:border-e">
        <div className="px-5 py-5">
          <p className="text-xs tracking-[0.25em] text-[var(--gold)]">KAK YAH MADINA</p>
          <h1 className="font-display text-2xl text-[var(--ink)]">Nasi Kandar</h1>
          <p className="text-sm text-[var(--muted)]">{t("malaysianFood")}</p>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "min-h-11 shrink-0 rounded-xl px-4 py-3 text-sm font-semibold",
                pathname === item.href
                  ? "bg-[var(--spice)] text-white"
                  : "text-[var(--ink)] hover:bg-[var(--paper)]",
              )}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-between gap-3 px-5 py-4 text-sm">
          <span
            className={cn(
              "rounded-full px-3 py-1 font-semibold",
              online ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800",
            )}
          >
            {online ? t("online") : t("offline")}
          </span>
          <button type="button" onClick={() => window.dispatchEvent(new Event("kak-yah-lock"))} className="text-[var(--muted)]">
            {t("lock.lock")}
          </button>
          <button type="button" onClick={() => void logout()} className="text-[var(--muted)]">
            {t("logout")}
          </button>
        </div>
      </aside>
      <main className="min-h-screen p-4 md:p-6">
        <SessionLock minutes={lockMinutes}>{children}</SessionLock>
      </main>
    </div>
  );
}
