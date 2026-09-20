"use client";

import { Button } from "@/components/ui";
import { useI18n } from "@/i18n/I18nProvider";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>
        <h1 className="font-display text-3xl">{t("somethingWrong")}</h1>
        <p className="mt-2 max-w-md text-[var(--muted)]">{error.message}</p>
        <Button className="mt-4" onClick={() => reset()}>
          {t("tryAgain")}
        </Button>
      </div>
    </div>
  );
}
