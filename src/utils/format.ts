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

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
