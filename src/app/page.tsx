"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n/I18nProvider";

export default function HomePage() {
  const { loading, profile, firebaseUser } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }
    if (!profile?.active) {
      router.replace("/unauthorized");
      return;
    }
    router.replace(profile.role === "owner" ? "/dashboard" : "/pos");
  }, [loading, firebaseUser, profile, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-[var(--muted)]">
      {t("opening")}
    </div>
  );
}
