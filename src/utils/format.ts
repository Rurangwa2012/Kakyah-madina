import type { MenuItem } from "@/types";

export function inventoryStatus(
  quantity: number,
  minStock: number,
): "good" | "low" | "out" {
  if (quantity <= 0) return "out";
  if (quantity <= minStock) return "low";
  return "good";
}

export function formatOrderNumber(prefix: string, value: number): string {
  return `${prefix}-${String(value).padStart(4, "0")}`;
}

export function isExtraItem(item: Pick<MenuItem, "category"> & { is_extra?: boolean }): boolean {
  return item.is_extra === true || item.category === "Extras";
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
