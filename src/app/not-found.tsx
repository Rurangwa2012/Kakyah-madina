"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>
        <h1 className="font-display text-3xl">{t("notFound")}</h1>
        <p className="mt-2 text-[var(--muted)]">{t("notFoundBody")}</p>
        <Link href="/login" className="mt-4 inline-block font-bold text-[var(--spice)]">
          {t("goLogin")}
        </Link>
      </div>
    </div>
  );
}
