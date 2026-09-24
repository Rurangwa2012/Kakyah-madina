# Kak Yah Madina

Production POS for **Kak Yah Nasi Kandar** — a Malaysian buffet and takeaway restaurant in Saudi Arabia (student till + Umrah/group orders).

Live app: https://kakyah-madina.vercel.app/  
GitHub: https://github.com/Rurangwa2012/Kakyah-madina.git

Currency is **SAR**, stored as integer **halalas** (SAR 8.00 = 800).

This is not a demo. Treat sales, inventory, and staff logins as real operational data.

## Architecture

- **Next.js** (App Router) + TypeScript + Tailwind CSS
- **Supabase Auth** (email/password)
- **Supabase PostgreSQL** with Row Level Security
- **Supabase Storage** (`menu` public photos, `receipts` private HTML)
- **Supabase Realtime** only for selected table listeners
- **Vercel** hosting

Firebase is not used. Do not add Firebase keys.

## What staff use

| Role | Access |
| --- | --- |
| **Owner** | Dashboard, POS, group orders, all orders, menu, inventory, purchases, buffet, expenses, reports, employees, activity, shifts, settings, VAT |
| **Cashier** | Student POS, group orders, today's orders, inventory (if allowed), own shift, receipts |

Student tickets stay `S-0001`. Group/Umrah tickets stay `U-0001`.

Cashiers cannot change selling prices, roles, VAT, or paid invoices. Paid sales are refunded, not deleted.

## Environment

Copy `.env.example` to `.env.local`. Never commit `.env.local`.

| Variable | Where | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server | Anon / publishable key. Safe with RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Creating staff and uploading receipts. Never `NEXT_PUBLIC_`. Prefer migrating later to the current Supabase secret key name if you adopt it. |

Create an owner and a cashier in **Supabase Auth**, then matching rows in `profiles` (`role` = `owner` or `cashier`, `active` = true). Enable MFA for the owner in the Supabase dashboard.

## Database

1. If this is a new project, run `supabase/schema.sql` in the SQL Editor.
2. Then run `supabase/migrations/202609240001_production_pos.sql` (same file as `supabase/upgrade.sql`).

That upgrade adds shifts, payments, refunds, suppliers, VAT/ZATCA-ready columns, tighter RLS, and RPCs:

- `finalize_sale` — official menu prices, VAT, payments, audit, idempotency
- `open_shift` / `close_shift` / `record_cash_movement`
- `record_stock_change`
- `create_refund` / `approve_refund`

Do not edit production tables by hand without adding a migration file.

## Shift and payment

Cashiers should **OPEN SHIFT** (POS-01 + opening cash) before selling.

PAY & PRINT sends item IDs and quantities only. The database calculates subtotal, discount permission, VAT, and total. Payments (`cash`, `mada`, `card`, `apple_pay`) must equal that total. Card PAN/CVV is never stored.

If print fails after payment, the sale remains. Use Reprint.

## Inventory

Receive, waste, use, and physical count go through `record_stock_change` so quantity and movement history succeed or fail together. Owner purchases can receive stock from a supplier.

Recipes tables exist for later buffet recipes. Automated per-plate deduction is not forced.

## VAT and ZATCA

Owner settings control VAT rate (basis points, default 1500 = 15%), inclusive/exclusive, registration number, and bilingual legal names.

Receipts are 80mm bilingual **simplified tax invoice** layouts. QR payload is prepared from invoice fields. **This is not Fatoora / ZATCA certified** until official integration is completed and tested against current ZATCA documentation. Do not advertise compliance yet.

## Backups

Use the Supabase plan's PITR / daily backups. Before go-live:

1. Confirm a backup exists and you can restore it.
2. Keep a known-good Vercel deployment to roll back to.
3. If internet fails, do not take card/mada payments that need online auth. Cash-only paper notes are safer than a fake offline “paid” sale.

## Local commands

```bash
npm install
copy .env.example .env.local
npm run dev
npx tsc --noEmit
npm run lint
npm run build
```

## Deploy

Push `main` to GitHub. Vercel builds from that branch.

Set the three environment variables (see `DEPLOYMENT.md`). Redeploy after changing `NEXT_PUBLIC_*` values.

Apply SQL migrations in Supabase **before** relying on shifts/VAT RPCs in production.
