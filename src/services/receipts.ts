import { getSupabase } from "@/lib/supabase";
import { printerService } from "@/services/printer";
import { receiptFileName } from "@/utils/receipt";

export { receiptFileName };

export type ReceiptKind = "student" | "group";

const CACHE_KEY = "kak-yah-receipts";

function cacheReceipt(orderNumber: string, html: string): void {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[orderNumber] = html;
    const keys = Object.keys(map);
    if (keys.length > 80) {
      for (const key of keys.slice(0, keys.length - 80)) delete map[key];
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    // quota / private mode
  }
}

export function downloadReceiptHtml(html: string, orderNumber: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = receiptFileName(orderNumber);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function uploadReceiptHtml(
  html: string,
  orderNumber: string,
  kind: ReceiptKind,
): Promise<void> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in.");
  const res = await fetch("/api/receipts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orderNumber, html, kind }),
  });
  const payload = (await res.json()) as { error?: string };
  if (!res.ok) {
    throw new Error(payload.error || "Could not save the receipt to Supabase.");
  }
}

export async function issueReceipt(
  html: string,
  orderNumber: string,
  options?: { print?: boolean; kind?: ReceiptKind },
): Promise<void> {
  cacheReceipt(orderNumber, html);
  downloadReceiptHtml(html, orderNumber);
  await uploadReceiptHtml(html, orderNumber, options?.kind ?? "student");
  if (options?.print) {
    await printerService.printHtml(html);
  }
}
