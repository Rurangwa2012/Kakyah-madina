import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { receiptFileName } from "@/utils/receipt";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Missing service role key." },
      { status: 500 },
    );
  }

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const { data: actor } = await admin
    .from("profiles")
    .select("active")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (!actor?.active) {
    return NextResponse.json({ error: "Staff profile required." }, { status: 403 });
  }

  const body = (await req.json()) as { orderNumber?: string; html?: string; kind?: string };
  const orderNumber = String(body.orderNumber ?? "").trim();
  const html = String(body.html ?? "");
  const kind = body.kind === "group" ? "group" : "student";
  if (!orderNumber || html.length < 20 || html.length > 400_000) {
    return NextResponse.json({ error: "Invalid receipt." }, { status: 400 });
  }

  const path = receiptFileName(orderNumber);
  const bytes = Buffer.from(html, "utf8");
  const { error: storageError } = await admin.storage.from("receipts").upload(path, bytes, {
    upsert: true,
    contentType: "text/html;charset=utf-8",
  });
  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  const now = Date.now();
  const { error: rowError } = await admin.from("receipts").upsert(
    {
      order_number: orderNumber,
      kind,
      html,
      storage_path: path,
      updated_at: now,
      created_at: now,
    },
    { onConflict: "order_number" },
  );
  if (rowError && rowError.code !== "PGRST205" && !/could not find the table/i.test(rowError.message)) {
    return NextResponse.json({ error: rowError.message }, { status: 500 });
  }

  return NextResponse.json({ path, stored: true, table: !rowError });
}
