"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { MENU_CATEGORIES, type MenuItem } from "@/types";
import { cn, isExtraItem } from "@/utils/format";
import { formatSar } from "@/utils/money";

export function MenuPicker({
  items,
  onPick,
  allowSoldOut = false,
  layout = "top",
}: {
  items: MenuItem[];
  onPick: (item: MenuItem) => void;
  allowSoldOut?: boolean;
  layout?: "top" | "rail";
}) {
  const { t } = useI18n();
  const [category, setCategory] = useState<string>("All");
  const extraItems = useMemo(() => items.filter(isExtraItem), [items]);
  const visible = useMemo(() => {
    if (category === "Extra") return extraItems;
    return items.filter((item) => category === "All" || item.category === category);
  }, [items, category, extraItems]);

  const cats = (
    <div className={layout === "rail" ? "flex flex-col gap-2" : "mb-4 flex gap-2 overflow-x-auto pb-1"}>
      <button
        type="button"
        onClick={() => setCategory("Extra")}
        className={cn(
          "min-h-14 shrink-0 rounded-2xl px-6 text-lg font-extrabold",
          category === "Extra" ? "bg-[var(--gold)] text-[var(--ink)]" : "bg-[var(--spice)] text-white",
        )}
      >
        {t("extra")}
      </button>
      {["All", ...MENU_CATEGORIES.filter((cat) => cat !== "Extras")].map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => setCategory(cat)}
          className={cn(
            "min-h-14 shrink-0 rounded-2xl px-4 font-semibold",
            category === cat ? "bg-[var(--ink)] text-white" : "bg-white text-[var(--ink)]",
          )}
        >
          {cat === "All" ? t("all") : t(`cats.${cat}`)}
        </button>
      ))}
    </div>
  );

  const grid =
    category === "Extra" && extraItems.length === 0 ? (
      <EmptyState title={t("pos.noExtras")} body={t("pos.noExtrasBody")} />
    ) : visible.length === 0 ? (
      <EmptyState title={t("pos.noItems")} body={t("pos.noItemsBody")} />
    ) : (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {visible.map((item) => {
          const disabled = !item.available || (!allowSoldOut && item.sold_out);
          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => onPick(item)}
              className={cn(
                "rounded-3xl border border-[var(--line)] bg-white p-2 text-start shadow-sm active:scale-[0.98] sm:p-3",
                disabled && "opacity-50",
              )}
            >
              <div className="mb-3 flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-[var(--paper)]">
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-6xl sm:text-7xl">🍛</span>
                )}
              </div>
              <p className="text-lg font-bold leading-tight sm:text-xl">{item.name}</p>
              <p className="text-base font-semibold text-[var(--spice)] sm:text-lg">{formatSar(item.price_halalas)}</p>
              <p className="text-xs text-[var(--muted)]">
                {item.sold_out ? t("pos.soldOut") : item.available ? t("pos.available") : t("pos.unavailable")}
              </p>
            </button>
          );
        })}
      </div>
    );

  if (layout === "rail") {
    return (
      <div className="grid gap-4 xl:grid-cols-[180px_1fr]">
        {cats}
        {grid}
      </div>
    );
  }

  return (
    <div>
      {cats}
      {grid}
    </div>
  );
}
