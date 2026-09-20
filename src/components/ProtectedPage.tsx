"use client";

import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import type { UserRole } from "@/types";

export function ProtectedPage({
  allow,
  requireInventory = false,
  children,
}: {
  allow: UserRole[];
  requireInventory?: boolean;
  children: React.ReactNode;
}) {
  return (
    <RoleGate allow={allow} requireInventory={requireInventory}>
      <AppShell>{children}</AppShell>
    </RoleGate>
  );
}
