"use client";

import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import type { UserRole } from "@/types";

export function ProtectedPage({
  allow,
  children,
}: {
  allow: UserRole[];
  children: React.ReactNode;
}) {
  return (
    <RoleGate allow={allow}>
      <AppShell>{children}</AppShell>
    </RoleGate>
  );
}
