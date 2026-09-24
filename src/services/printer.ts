import type { OrderLine, StudentOrder, RestaurantSettings } from "@/types";
import { formatSar } from "@/utils/money";
import { formatDate, formatTime } from "@/utils/date";
import { invoiceQrPayload } from "@/lib/invoiceQr";

export interface PrinterAdapter {
  name: string;
  print(html: string): Promise<void>;
}

export class BrowserPrinter implements PrinterAdapter {
  name = "browser";

  async print(html: string): Promise<void> {
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc) {
      document.body.removeChild(frame);
      throw new Error("Unable to open print frame");
    }
    doc.open();
    doc.write(html);
    doc.close();
    await new Promise((resolve) => setTimeout(resolve, 250));
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => document.body.removeChild(frame), 1000);
  }
}

export class PrinterService {
  constructor(private adapter: PrinterAdapter = new BrowserPrinter()) {}

  setAdapter(adapter: PrinterAdapter) {
    this.adapter = adapter;
  }

  async printHtml(html: string) {
    await this.adapter.print(html);
  }
}

export const printerService = new PrinterService();

export function studentReceiptHtml(
  order: StudentOrder,
  settings: RestaurantSettings,
): string {
  const lines = order.lines
    .map(
      (line) =>
        `<tr><td>${line.name} x${line.quantity}</td><td class="right">${formatSar(line.unit_price_halalas)}</td><td class="right">${formatSar(line.total_halalas)}</td></tr>`,
    )
    .join("");
  const vat = order.vat_amount_halalas ?? 0;
  const ex = order.subtotal_ex_vat_halalas ?? order.subtotal_halalas;
  const total = order.total_inc_vat_halalas ?? order.total_halalas;
  const sellerEn = settings.seller_legal_name_en || settings.restaurant_name;
  const sellerAr = settings.seller_legal_name_ar || settings.restaurant_name;
  const vatNo = settings.vat_registration_number || "";
  const issued = new Date(order.created_at).toISOString();
  const qr = invoiceQrPayload({
    sellerName: sellerEn,
    vatNumber: vatNo,
    timestampIso: issued,
    totalIncVat: (total / 100).toFixed(2),
    vatAmount: (vat / 100).toFixed(2),
  });
  return `<!doctype html>
<html>
<head>
  <title>${order.order_number}</title>
  <meta charset="utf-8" />
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    body { font-family: "Segoe UI", Tahoma, ui-monospace, Consolas, monospace; width: 72mm; color: #111; }
    h1, h2, p { margin: 0; text-align: center; }
    h1 { font-size: 16px; letter-spacing: 1px; }
    h2 { font-size: 12px; margin-bottom: 8px; }
    table { width: 100%; font-size: 12px; border-collapse: collapse; }
    td.right { text-align: right; }
    .line { border-top: 1px dashed #333; margin: 8px 0; }
    .total { font-size: 14px; font-weight: bold; }
    .small { font-size: 11px; }
  </style>
</head>
<body>
  <h1>${sellerAr}</h1>
  <h1>${sellerEn.toUpperCase()}</h1>
  <h2>فاتورة ضريبية مبسطة</h2>
  <h2>SIMPLIFIED TAX INVOICE</h2>
  <p>Invoice ${order.order_number}</p>
  <p class="small">${settings.address_ar || ""}</p>
  <p class="small">${settings.address_en || ""}</p>
  ${vatNo ? `<p>VAT / الرقم الضريبي: ${vatNo}</p>` : `<p class="small">VAT number not set in Settings</p>`}
  <div class="line"></div>
  <table>
    <tr><td>Item</td><td class="right">Price</td><td class="right">Total</td></tr>
    ${lines}
  </table>
  <div class="line"></div>
  <table>
    <tr><td>Subtotal before VAT</td><td class="right" colspan="2">${formatSar(ex)}</td></tr>
    <tr><td>Discount</td><td class="right" colspan="2">${formatSar(order.discount_halalas)}</td></tr>
    <tr><td>VAT</td><td class="right" colspan="2">${formatSar(vat)}</td></tr>
    <tr class="total"><td>TOTAL including VAT</td><td class="right" colspan="2">${formatSar(total)}</td></tr>
  </table>
  <div class="line"></div>
  <p>Payment: ${order.payment_method}</p>
  <p>Cashier: ${order.cashier_name}</p>
  <p>Date: ${formatDate(order.created_at)} ${formatTime(order.created_at)}</p>
  ${qr ? `<p class="small">Tax QR payload (not Fatoora-certified yet)</p><p class="small">${qr.replace(/</g, "")}</p>` : ""}
  <div class="line"></div>
  <p>شكراً لكم</p>
  <p>${settings.receipt_footer || "Thank You"}</p>
</body>
</html>`;
}

export function groupReceiptHtml(input: {
  order_number: string;
  group_name: string;
  contact_number: string;
  location: string;
  food_description: string;
  lines?: OrderLine[];
  quantity: number;
  total_halalas?: number;
  pickup_time: number;
  payment_status: string;
  settings: RestaurantSettings;
}): string {
  const itemRows =
    input.lines && input.lines.length > 0
      ? input.lines
          .map(
            (line) =>
              `<tr><td>${line.name} x${line.quantity}</td><td class="right">${formatSar(line.total_halalas)}</td></tr>`,
          )
          .join("")
      : `<tr><td>${input.food_description}</td><td class="right">x${input.quantity}</td></tr>`;
  return `<!doctype html>
<html>
<head>
  <title>${input.order_number}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    body { font-family: ui-monospace, Consolas, monospace; width: 72mm; color: #111; }
    p, h1 { margin: 4px 0; text-align: center; }
    h1 { font-size: 16px; }
    table { width: 100%; font-size: 12px; border-collapse: collapse; }
    td.right { text-align: right; }
    .line { border-top: 1px dashed #333; margin: 8px 0; }
    .total { font-weight: bold; }
  </style>
</head>
<body>
  <h1>${input.settings.restaurant_name.toUpperCase()}</h1>
  <p>Malaysian Food</p>
  <p>Order: ${input.order_number}</p>
  <p>${input.group_name}</p>
  <p>Contact: ${input.contact_number}</p>
  <p>Location: ${input.location}</p>
  <div class="line"></div>
  <table>${itemRows}</table>
  <div class="line"></div>
  <table>
    <tr class="total"><td>TOTAL</td><td class="right">${formatSar(input.total_halalas ?? 0)}</td></tr>
  </table>
  <p>Time: ${formatTime(input.pickup_time)}</p>
  <p>Payment: ${input.payment_status === "paid" ? "Paid" : "Not Paid"}</p>
  <p>${input.settings.receipt_footer}</p>
</body>
</html>`;
}

export const testReceiptHtml = `<!doctype html>
<html><head><title>Test Print</title>
<style>@page{size:80mm auto;margin:4mm}body{font-family:monospace;width:72mm;text-align:center}</style>
</head><body><h1>KAK YAH MADINA</h1><p>Malaysian Food</p><p>TEST PRINT</p><p>80mm receipt</p></body></html>`;
