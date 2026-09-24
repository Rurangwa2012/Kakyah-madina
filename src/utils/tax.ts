import type { RestaurantSettings } from "@/types";

export function vatSplit(
  netHalalas: number,
  settings: Pick<RestaurantSettings, "vat_enabled" | "vat_inclusive" | "vat_rate_basis_points">,
): { exVat: number; vat: number; total: number } {
  const net = Math.max(0, Math.round(netHalalas));
  const bps = Math.max(0, Math.round(settings.vat_rate_basis_points));
  if (!settings.vat_enabled || bps <= 0) {
    return { exVat: net, vat: 0, total: net };
  }
  if (settings.vat_inclusive) {
    const vat = Math.round((net * bps) / (10000 + bps));
    return { exVat: net - vat, vat, total: net };
  }
  const vat = Math.round((net * bps) / 10000);
  return { exVat: net, vat, total: net + vat };
}

export function calculateVAT(netHalalas: number, settings: RestaurantSettings): number {
  return vatSplit(netHalalas, settings).vat;
}

export function calculateSubtotal(lines: Array<{ unit_price_halalas: number; quantity: number }>): number {
  return lines.reduce((sum, line) => sum + Math.round(line.unit_price_halalas) * Math.round(line.quantity), 0);
}

export function calculateTotal(netHalalas: number, settings: RestaurantSettings): number {
  return vatSplit(netHalalas, settings).total;
}
