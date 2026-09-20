"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALES } from "@/i18n/messages";
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/utils/format";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = LOCALES.find((item) => item.id === locale)?.id.toUpperCase() ?? "EN";

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={rootRef} className="no-print fixed top-3 end-3 z-50">
      <button
        type="button"
        aria-label={t("settings.language")}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 min-w-11 items-center justify-center gap-1 rounded-full border border-[var(--line)] bg-[var(--panel)] px-2 text-[var(--ink)] shadow-md"
      >
        <GlobeIcon />
        <span className="text-xs font-bold">{current === "MS" ? "MS" : current}</span>
      </button>
      {open ? (
        <div
          role="listbox"
          aria-label={t("settings.language")}
          className="absolute end-0 mt-2 min-w-44 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-lg"
        >
          {LOCALES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={locale === item.id}
              onClick={() => {
                setLocale(item.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between px-4 py-3 text-start text-sm font-semibold",
                locale === item.id ? "bg-[var(--spice)] text-white" : "hover:bg-[var(--paper)]",
              )}
            >
              <span>{item.label}</span>
              <span className="text-xs opacity-70">{item.id.toUpperCase()}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.8 3.2 2.8 14.8 0 18" />
      <path d="M12 3c-2.8 3.2-2.8 14.8 0 18" />
    </svg>
  );
}
