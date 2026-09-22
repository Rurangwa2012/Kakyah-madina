import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dspwrfcjdcowuymjazze.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!key) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

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
  const { count, error: countError } = await supabase.from("menu").select("*", { count: "exact", head: true });
  if (countError) throw countError;
  if ((count ?? 0) > 0) {
    console.log("Menu already has rows. Seed skipped.");
    return;
  }
  const now = Date.now();
  const { error: menuError } = await supabase.from("menu").insert(
    menu.map((item) => ({
      ...item,
      image_url: "",
      available: true,
      sold_out: false,
      archived: false,
      is_extra: false,
      created_at: now,
      updated_at: now,
    })),
  );
  if (menuError) throw menuError;
  const { error: invError } = await supabase.from("inventory").insert(
    inventory.map((item) => ({
      ...item,
      status: item.quantity <= item.min_stock ? "low" : "good",
      cost_halalas: 0,
      last_updated: now,
      created_at: now,
    })),
  );
  if (invError) throw invError;
  console.log("Development seed complete.");
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
