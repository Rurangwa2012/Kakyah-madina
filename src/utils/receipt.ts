export function receiptFileName(orderNumber: string): string {
  return `${orderNumber.replace(/[^\w.-]+/g, "_")}-receipt.html`;
}
