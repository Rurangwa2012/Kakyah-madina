/** All money is stored as integer halalas. SAR 1.00 = 100. */

export function sarToHalalas(amount: number): number {
  return Math.round(amount * 100);
}

export function halalasToSar(halalas: number): number {
  return Math.round(halalas) / 100;
}

export function formatSar(halalas: number): string {
  const value = halalasToSar(Math.round(halalas));
  return `SAR ${value.toFixed(2)}`;
}

export function addHalalas(...values: number[]): number {
  return values.reduce((sum, value) => sum + Math.round(value), 0);
}

export function multiplyHalalas(unitHalalas: number, quantity: number): number {
  return Math.round(unitHalalas) * Math.round(quantity);
}

export function applyDiscount(subtotalHalalas: number, discountHalalas: number): number {
  const subtotal = Math.round(subtotalHalalas);
  const discount = Math.max(0, Math.round(discountHalalas));
  return Math.max(0, subtotal - discount);
}

export function lineTotal(unitHalalas: number, quantity: number): number {
  return multiplyHalalas(unitHalalas, quantity);
}

export function orderSubtotal(
  lines: Array<{ unit_price_halalas: number; quantity: number }>,
): number {
  return lines.reduce(
    (sum, line) => addHalalas(sum, lineTotal(line.unit_price_halalas, line.quantity)),
    0,
  );
}
