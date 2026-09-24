/** Isolated ZATCA QR hook. Do not label output as compliant until Fatoora is live. */

export function invoiceQrPayload(input: {
  sellerName: string;
  vatNumber: string;
  timestampIso: string;
  totalIncVat: string;
  vatAmount: string;
}): string {
  if (!input.vatNumber.trim()) return "";
  return [
    input.sellerName,
    input.vatNumber,
    input.timestampIso,
    input.totalIncVat,
    input.vatAmount,
  ].join("|");
}
