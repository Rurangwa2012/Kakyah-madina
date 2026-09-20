"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n/I18nProvider";
import type { UserRole } from "@/types";

export function RoleGate({
  allow,
  requireInventory = false,
  children,
}: {
  allow: UserRole[];
  requireInventory?: boolean;
  children: React.ReactNode;
}) {
  const { loading, profile, firebaseUser } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const inventoryDenied =
    requireInventory && profile?.role !== "owner" && profile?.inventory_access !== true;

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }
    if (!profile || !profile.active || !allow.includes(profile.role) || inventoryDenied) {
      router.replace("/unauthorized");
    }
  }, [loading, firebaseUser, profile, allow, router, inventoryDenied]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-lg text-[var(--muted)]">
        {t("loadingSession")}
      </div>
    );
  }
  if (!profile || !profile.active || !allow.includes(profile.role) || inventoryDenied) {
    return null;
  }
  return <>{children}</>;
}
