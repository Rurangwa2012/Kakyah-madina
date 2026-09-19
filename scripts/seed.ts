import { initializeApp } from "firebase/app";
import {
  collection,
  doc,
  getDocs,
  initializeFirestore,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

const required = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing ${key}. Run: node --env-file=.env.local --import tsx scripts/seed.ts`);
  }
}

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const db = initializeFirestore(app, {});

const menu = [
  { name: "Nasi Kandar", category: "Rice", price_halalas: 1500, sort_order: 1 },
  { name: "Nasi Lemak", category: "Rice", price_halalas: 1200, sort_order: 2 },
  { name: "Nasi Tomato", category: "Rice", price_halalas: 1200, sort_order: 3 },
  { name: "Fried Chicken", category: "Chicken", price_halalas: 800, sort_order: 4 },
  { name: "Chicken Curry", category: "Curry", price_halalas: 900, sort_order: 5 },
  { name: "Beef Curry", category: "Beef", price_halalas: 1000, sort_order: 6 },
  { name: "Egg", category: "Sides", price_halalas: 200, sort_order: 7 },
  { name: "Vegetables", category: "Vegetables", price_halalas: 300, sort_order: 8 },
  { name: "Teh Tarik", category: "Drinks", price_halalas: 300, sort_order: 9 },
  { name: "Water", category: "Drinks", price_halalas: 100, sort_order: 10 },
];

const inventory = [
  { name: "Rice", quantity: 40, unit: "kg", min_stock: 10 },
  { name: "Chicken", quantity: 8, unit: "kg", min_stock: 5 },
  { name: "Beef", quantity: 6, unit: "kg", min_stock: 4 },
  { name: "Cooking Oil", quantity: 12, unit: "L", min_stock: 4 },
  { name: "Egg", quantity: 60, unit: "pcs", min_stock: 20 },
  { name: "Vegetables", quantity: 15, unit: "kg", min_stock: 5 },
  { name: "Coconut Milk", quantity: 10, unit: "L", min_stock: 3 },
  { name: "Drinks", quantity: 48, unit: "bottles", min_stock: 12 },
  { name: "Takeaway Boxes", quantity: 100, unit: "pcs", min_stock: 20 },
  { name: "Plastic Bags", quantity: 200, unit: "pcs", min_stock: 40 },
  { name: "Cups", quantity: 80, unit: "pcs", min_stock: 20 },
];

async function seed() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed in production.");
  }
  const existing = await getDocs(collection(db, "menu"));
  if (!existing.empty) {
    console.log("Menu already has documents. Seed skipped to avoid duplicates.");
    return;
  }
  const now = Date.now();
  for (const item of menu) {
    const id = item.name.toLowerCase().replace(/\s+/g, "-");
    await setDoc(doc(db, "menu", id), {
      ...item,
      image_url: "",
      available: true,
      sold_out: false,
      archived: false,
      created_at: now,
      updated_at: now,
    });
  }
  for (const item of inventory) {
    const id = item.name.toLowerCase().replace(/\s+/g, "-");
    const status = item.quantity <= 0 ? "out" : item.quantity <= item.min_stock ? "low" : "good";
    await setDoc(doc(db, "inventory", id), {
      ...item,
      status,
      cost_halalas: 0,
      last_updated: now,
      created_at: now,
    });
  }
  await setDoc(doc(db, "settings", "restaurant"), {
    restaurant_name: "Kak Yah Madina",
    currency: "SAR",
    receipt_footer: "Thank You",
    student_order_prefix: "S",
    group_order_prefix: "U",
    payment_methods: ["cash", "card", "mobile"],
    low_stock_alert: true,
    printer: { type: "browser", paper_width_mm: 80 },
    owner_approval_required: false,
    updated_at: now,
    server_updated_at: serverTimestamp(),
  });
  await setDoc(doc(db, "counters", "student_orders"), { value: 0, prefix: "S", updated_at: now });
  await setDoc(doc(db, "counters", "group_orders"), { value: 0, prefix: "U", updated_at: now });
  console.log("Development seed complete.");
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
