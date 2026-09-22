import { SETTINGS_DOC_ID } from "@/lib/collections";
import { writeAuditLog } from "@/lib/firestore";
import { listenQuery, type Unsubscribe } from "@/lib/listen";
import { getSupabase, throwIfError } from "@/lib/supabase";
import { profileFromDoc } from "@/lib/userProfile";
import type { AppUser, MenuItem, PaymentMethod, RestaurantSettings } from "@/types";

function mapMenu(row: Record<string, unknown>): MenuItem {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    category: String(row.category ?? "Rice"),
    price_halalas: Number(row.price_halalas ?? 0),
    image_url: String(row.image_url ?? ""),
    available: row.available !== false,
    sold_out: Boolean(row.sold_out),
    archived: Boolean(row.archived),
    is_extra: Boolean(row.is_extra) || row.category === "Extras",
    sort_order: Number(row.sort_order ?? 100),
    created_at: Number(row.created_at ?? Date.now()),
    updated_at: Number(row.updated_at ?? Date.now()),
  };
}

export function listenMenu(cb: (items: MenuItem[]) => void): Unsubscribe {
  return listenQuery(
    "menu",
    async () => {
      const { data, error } = await getSupabase().from("menu").select("*").eq("archived", false);
      throwIfError(error);
      return (data ?? [])
        .map((row) => mapMenu(row as Record<string, unknown>))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    },
    cb,
  );
}

export async function saveMenuItem(
  item: Partial<MenuItem> & { name: string; category: string; price_halalas: number },
  actor: AppUser,
): Promise<string> {
  const id = item.id || crypto.randomUUID();
  const { data: existing } = await getSupabase().from("menu").select("*").eq("id", id).maybeSingle();
  const payload = {
    id,
    name: item.name,
    category: item.category,
    price_halalas: Math.round(item.price_halalas),
    image_url: item.image_url ?? "",
    available: item.available ?? true,
    sold_out: item.sold_out ?? false,
    archived: item.archived ?? false,
    is_extra: item.is_extra ?? item.category === "Extras",
    sort_order: item.sort_order ?? 100,
    updated_at: Date.now(),
  };
  if (existing) {
    const { error } = await getSupabase().from("menu").update(payload).eq("id", id);
    throwIfError(error);
    const prev = mapMenu(existing as Record<string, unknown>);
    await writeAuditLog({
      action: prev.price_halalas !== payload.price_halalas ? "MENU_PRICE_CHANGED" : "MENU_UPDATED",
      message:
        prev.price_halalas !== payload.price_halalas
          ? `${actor.name} changed ${item.name} price`
          : `${actor.name} updated menu item ${item.name}`,
      actor_id: actor.id,
      actor_name: actor.name,
      actor_role: actor.role,
    });
  } else {
    const { error } = await getSupabase().from("menu").insert({ ...payload, created_at: Date.now() });
    throwIfError(error);
    await writeAuditLog({
      action: "MENU_CREATED",
      message: `${actor.name} created menu item ${item.name}`,
      actor_id: actor.id,
      actor_name: actor.name,
      actor_role: actor.role,
    });
  }
  return id;
}

export async function archiveMenuItem(id: string, actor: AppUser, name: string): Promise<void> {
  const { error } = await getSupabase()
    .from("menu")
    .update({ archived: true, available: false, updated_at: Date.now() })
    .eq("id", id);
  throwIfError(error);
  await writeAuditLog({
    action: "MENU_ARCHIVED",
    message: `${actor.name} archived ${name}`,
    actor_id: actor.id,
    actor_name: actor.name,
    actor_role: actor.role,
  });
}

export async function deleteMenuItem(id: string, actor: AppUser, name: string): Promise<void> {
  const { error } = await getSupabase().from("menu").delete().eq("id", id);
  if (error) {
    await archiveMenuItem(id, actor, name);
    return;
  }
  await writeAuditLog({
    action: "MENU_DELETED",
    message: `${actor.name} deleted menu item ${name}`,
    actor_id: actor.id,
    actor_name: actor.name,
    actor_role: actor.role,
  });
}

export async function uploadMenuImage(file: File, itemId: string): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-]/g, "_") || "photo.jpg";
  const path = `${itemId}/${Date.now()}-${safeName}`;
  const { error } = await getSupabase().storage.from("menu").upload(path, file, {
    contentType: file.type.startsWith("image/") ? file.type : "image/jpeg",
    upsert: true,
  });
  if (error) {
    throw new Error(
      error.message.includes("row-level") || error.message.toLowerCase().includes("policy")
        ? "Photo upload blocked. Run supabase/schema.sql in the SQL Editor, including the Storage policies."
        : error.message,
    );
  }
  const { data } = getSupabase().storage.from("menu").getPublicUrl(path);
  return data.publicUrl;
}

const defaultSettings = (): RestaurantSettings => ({
  id: SETTINGS_DOC_ID,
  restaurant_name: "Kak Yah Madina",
  currency: "SAR",
  receipt_footer: "Thank You",
  student_order_prefix: "S",
  group_order_prefix: "U",
  payment_methods: ["cash", "card"],
  low_stock_alert: true,
  printer: { type: "browser", paper_width_mm: 80 },
  owner_approval_required: false,
  updated_at: Date.now(),
});

export async function getSettings(): Promise<RestaurantSettings> {
  const { data, error } = await getSupabase()
    .from("settings")
    .select("*")
    .eq("id", SETTINGS_DOC_ID)
    .maybeSingle();
  throwIfError(error);
  if (!data) return defaultSettings();
  return {
    id: String(data.id),
    restaurant_name: String(data.restaurant_name),
    currency: String(data.currency),
    receipt_footer: String(data.receipt_footer),
    student_order_prefix: String(data.student_order_prefix),
    group_order_prefix: String(data.group_order_prefix),
    payment_methods: (Array.isArray(data.payment_methods) ? data.payment_methods : (["cash", "card"] as PaymentMethod[])).filter(
      (method: unknown): method is PaymentMethod => method === "cash" || method === "card",
    ),
    low_stock_alert: Boolean(data.low_stock_alert),
    printer:
      data.printer && typeof data.printer === "object"
        ? (data.printer as RestaurantSettings["printer"])
        : { type: "browser", paper_width_mm: 80 },
    owner_approval_required: Boolean(data.owner_approval_required),
    updated_at: Number(data.updated_at ?? Date.now()),
  };
}

export async function saveSettings(settings: RestaurantSettings, actor: AppUser): Promise<void> {
  const { error } = await getSupabase()
    .from("settings")
    .upsert({
      ...settings,
      payment_methods: settings.payment_methods,
      printer: settings.printer,
      updated_at: Date.now(),
    });
  throwIfError(error);
  await writeAuditLog({
    action: "SETTINGS_UPDATED",
    message: `${actor.name} updated restaurant settings`,
    actor_id: actor.id,
    actor_name: actor.name,
    actor_role: actor.role,
  });
}

export function listenUsers(cb: (users: AppUser[]) => void): Unsubscribe {
  return listenQuery(
    "profiles",
    async () => {
      const { data, error } = await getSupabase().from("profiles").select("*");
      throwIfError(error);
      return (data ?? [])
        .map((row) => profileFromDoc(String(row.id), row as Record<string, unknown>))
        .sort((a, b) => b.created_at - a.created_at);
    },
    cb,
  );
}

export async function createStaffAccount(input: {
  name: string;
  email: string;
  password: string;
  role: AppUser["role"];
  inventory_access: boolean;
  active: boolean;
}): Promise<void> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in.");
  const res = await fetch("/api/employees", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(payload.error || "Could not create staff login.");
}

export async function saveEmployee(
  user: Partial<AppUser> & { id: string; name: string; email: string; role: AppUser["role"] },
  actor: AppUser,
): Promise<void> {
  const { data: existing } = await getSupabase().from("profiles").select("id, created_at").eq("id", user.id).maybeSingle();
  const { error } = await getSupabase().from("profiles").upsert({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    inventory_access: user.inventory_access ?? true,
    active: user.active ?? true,
    updated_at: Date.now(),
    created_at: existing ? Number(existing.created_at ?? Date.now()) : Date.now(),
  });
  throwIfError(error);
  await writeAuditLog({
    action: existing ? "EMPLOYEE_UPDATED" : "EMPLOYEE_CREATED",
    message: `${actor.name} ${existing ? "updated" : "added"} employee ${user.name}`,
    actor_id: actor.id,
    actor_name: actor.name,
    actor_role: actor.role,
  });
}
