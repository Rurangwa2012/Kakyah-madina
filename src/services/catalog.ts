import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { COLLECTIONS, SETTINGS_DOC_ID } from "@/lib/collections";
import { getDb, getFirebaseStorage } from "@/lib/firebase";
import { writeAuditLog } from "@/lib/firestore";
import type { AppUser, MenuItem, RestaurantSettings } from "@/types";

export function listenMenu(cb: (items: MenuItem[]) => void): Unsubscribe {
  const q = query(collection(getDb(), COLLECTIONS.menu), orderBy("sort_order", "asc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MenuItem, "id">) })));
  });
}

export async function saveMenuItem(
  item: Partial<MenuItem> & { name: string; category: string; price_halalas: number },
  actor: AppUser,
): Promise<string> {
  const id = item.id ?? doc(collection(getDb(), COLLECTIONS.menu)).id;
  const refDoc = doc(getDb(), COLLECTIONS.menu, id);
  const existing = await getDoc(refDoc);
  const payload = {
    name: item.name,
    category: item.category,
    price_halalas: Math.round(item.price_halalas),
    image_url: item.image_url ?? "",
    available: item.available ?? true,
    sold_out: item.sold_out ?? false,
    archived: item.archived ?? false,
    sort_order: item.sort_order ?? 100,
    updated_at: Date.now(),
    server_updated_at: serverTimestamp(),
  };
  if (existing.exists()) {
    await updateDoc(refDoc, payload);
    const prev = existing.data() as MenuItem;
    if (prev.price_halalas !== payload.price_halalas) {
      await writeAuditLog({
        action: "MENU_PRICE_CHANGED",
        message: `${actor.name} changed ${item.name} price`,
        actor_id: actor.id,
        actor_name: actor.name,
        actor_role: actor.role,
      });
    } else {
      await writeAuditLog({
        action: "MENU_UPDATED",
        message: `${actor.name} updated menu item ${item.name}`,
        actor_id: actor.id,
        actor_name: actor.name,
        actor_role: actor.role,
      });
    }
  } else {
    await setDoc(refDoc, { ...payload, created_at: Date.now() });
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
  await updateDoc(doc(getDb(), COLLECTIONS.menu, id), {
    archived: true,
    available: false,
    updated_at: Date.now(),
  });
  await writeAuditLog({
    action: "MENU_ARCHIVED",
    message: `${actor.name} archived ${name}`,
    actor_id: actor.id,
    actor_name: actor.name,
    actor_role: actor.role,
  });
}

export async function uploadMenuImage(file: File, itemId: string): Promise<string> {
  const storageRef = ref(getFirebaseStorage(), `menu/${itemId}/${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function getSettings(): Promise<RestaurantSettings> {
  const snap = await getDoc(doc(getDb(), COLLECTIONS.settings, SETTINGS_DOC_ID));
  if (snap.exists()) {
    return { id: snap.id, ...(snap.data() as Omit<RestaurantSettings, "id">) };
  }
  return {
    id: SETTINGS_DOC_ID,
    restaurant_name: "Kak Yah Madina",
    currency: "SAR",
    receipt_footer: "Thank You",
    student_order_prefix: "S",
    group_order_prefix: "U",
    payment_methods: ["cash", "card", "mobile"],
    low_stock_alert: true,
    printer: { type: "browser", paper_width_mm: 80 },
    owner_approval_required: false,
    updated_at: Date.now(),
  };
}

export async function saveSettings(settings: RestaurantSettings, actor: AppUser): Promise<void> {
  await setDoc(doc(getDb(), COLLECTIONS.settings, SETTINGS_DOC_ID), {
    ...settings,
    updated_at: Date.now(),
  });
  await writeAuditLog({
    action: "SETTINGS_UPDATED",
    message: `${actor.name} updated restaurant settings`,
    actor_id: actor.id,
    actor_name: actor.name,
    actor_role: actor.role,
  });
}

export function listenUsers(cb: (users: AppUser[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(getDb(), COLLECTIONS.users), orderBy("created_at", "desc")),
    (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AppUser, "id">) })));
    },
  );
}

export async function saveEmployee(
  user: Partial<AppUser> & { id: string; name: string; email: string; role: AppUser["role"] },
  actor: AppUser,
): Promise<void> {
  const refDoc = doc(getDb(), COLLECTIONS.users, user.id);
  const existing = await getDoc(refDoc);
  await setDoc(
    refDoc,
    {
      name: user.name,
      email: user.email,
      role: user.role,
      inventory_access: user.inventory_access ?? true,
      active: user.active ?? true,
      updated_at: Date.now(),
      created_at: existing.exists()
        ? (existing.data()?.created_at ?? Date.now())
        : Date.now(),
    },
    { merge: true },
  );
  await writeAuditLog({
    action: existing.exists() ? "EMPLOYEE_UPDATED" : "EMPLOYEE_CREATED",
    message: `${actor.name} ${existing.exists() ? "updated" : "added"} employee ${user.name}`,
    actor_id: actor.id,
    actor_name: actor.name,
    actor_role: actor.role,
  });
}
