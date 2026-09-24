import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeRole } from "@/lib/userProfile";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!rateLimit(`employees:${token.slice(0, 24)}`, 8, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Wait a moment." }, { status: 429 });
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server is missing the service role key." },
      { status: 500 },
    );
  }

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const { data: actor, error: actorError } = await admin
    .from("profiles")
    .select("id, name, role, active")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (actorError) {
    return NextResponse.json({ error: actorError.message }, { status: 500 });
  }
  if (!actor || actor.role !== "owner" || actor.active !== true) {
    return NextResponse.json({ error: "Only an active owner can add staff." }, { status: 403 });
  }

  const body = (await req.json()) as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    inventory_access?: boolean;
    active?: boolean;
  };

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const role = normalizeRole(body.role);
  if (!name || !email || password.length < 6) {
    return NextResponse.json(
      { error: "Name, email, and a password of at least 6 characters are required." },
      { status: 400 },
    );
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Could not create the login." },
      { status: 400 },
    );
  }

  const now = Date.now();
  const { error: profileError } = await admin.from("profiles").upsert({
    id: created.user.id,
    name,
    email,
    role,
    inventory_access: body.inventory_access !== false,
    active: body.active !== false,
    created_at: now,
    updated_at: now,
  });
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  await admin.from("audit_logs").insert({
    action: "EMPLOYEE_CREATED",
    message: `${actor.name} added ${role} ${name}`,
    actor_id: actor.id,
    actor_name: actor.name,
    actor_role: "owner",
    created_at: now,
  });

  return NextResponse.json({ id: created.user.id, email, role });
}
