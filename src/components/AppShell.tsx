"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/utils/format";

const ownerNav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pos", label: "Student POS" },
  { href: "/group-orders", label: "Group Orders" },
  { href: "/orders", label: "Orders" },
  { href: "/menu", label: "Menu" },
  { href: "/inventory", label: "Inventory" },
  { href: "/buffet", label: "Buffet Tracking" },
  { href: "/expenses", label: "Expenses" },
  { href: "/reports", label: "Reports" },
  { href: "/employees", label: "Employees" },
  { href: "/activity", label: "Activity Logs" },
  { href: "/settings", label: "Settings" },
];

const cashierNav = [
  { href: "/pos", label: "Student POS" },
  { href: "/group-orders", label: "Group Orders" },
  { href: "/orders", label: "Today's Orders" },
  { href: "/inventory", label: "Inventory" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, logout, online } = useAuth();
  const pathname = usePathname();
  const nav = profile?.role === "owner" ? ownerNav : cashierNav;

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-[var(--line)] bg-[var(--panel)] md:border-b-0 md:border-r">
        <div className="px-5 py-5">
          <p className="text-xs tracking-[0.25em] text-[var(--gold)]">KAK YAH MADINA</p>
          <h1 className="font-display text-2xl text-[var(--ink)]">Nasi Kandar</h1>
          <p className="text-sm text-[var(--muted)]">Malaysian Food</p>
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
              {item.label}
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
            {online ? "ONLINE" : "OFFLINE"}
          </span>
          <button type="button" onClick={() => void logout()} className="text-[var(--muted)]">
            Logout
          </button>
        </div>
      </aside>
      <main className="min-h-screen p-4 md:p-6">{children}</main>
    </div>
  );
}
