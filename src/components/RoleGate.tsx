"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types";

export function RoleGate({
  allow,
  children,
}: {
  allow: UserRole[];
  children: React.ReactNode;
}) {
  const { loading, profile, firebaseUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }
    if (!profile || !profile.active || !allow.includes(profile.role)) {
      router.replace("/unauthorized");
    }
  }, [loading, firebaseUser, profile, allow, router]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-lg text-[var(--muted)]">
        Loading session…
      </div>
    );
  }
  if (!profile || !profile.active || !allow.includes(profile.role)) {
    return null;
  }
  return <>{children}</>;
}
