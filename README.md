# Kak Yah Madina

POS and restaurant management for **Kak Yah Nasi kandar** — a small Malaysian buffet and takeaway restaurant serving students and outside group/Umrah orders.

System name: **Kak Yah Nasi kandar**  
Brand display: **KAK YAH MADINA · Malaysian Food**  
Currency: **SAR**, stored as integer **halalas** (SAR 8.00 = 800).

GitHub repository: https://github.com/Rurangwa2012/Kakyah-madina.git

## Features

- Fast cashier **Student POS** with large touch cards
- Student order numbers `S-0001` via Firestore transactions
- 80mm browser receipt print, reprint, and test print
- Simple **Group / Umrah orders** with `U-0001` numbers
- Inventory, stock movements, waste, and low-stock warnings
- Buffet prepared / sold / waste tracking
- Owner dashboard with live listeners, expenses, reports, employees, audit logs, and settings
- Role-based access: **owner** and **cashier**
- PWA installable as **Kak Yah Madina** / **Kak Yah**
- Online / offline status and Firestore persistent cache
- Vercel-ready Next.js App Router app

## Technology

- Next.js (App Router) + TypeScript strict mode + Tailwind CSS
- Firebase Authentication
- Cloud Firestore + Security Rules + indexes
- Firebase Storage for menu images
- Progressive Web App manifest

Do not use Supabase.

## Local Setup

1. Clone or open this repository.
2. Copy environment variables:

```bash
copy .env.example .env.local
```

3. Paste your Firebase **web app** values into `.env.local`.
4. Install and run.

## Install Dependencies

```bash
npm install
```

## Environment Variables

`.env.example` contains placeholders only:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Where to paste values:

1. Open [Firebase Console](https://console.firebase.google.com)
2. Select your existing project
3. Project settings → Your apps → Web app
4. Copy the Firebase SDK config into `.env.local`

Never commit `.env.local`, service accounts, or private keys.

## Firebase Setup

1. Enable **Authentication → Email/Password**.
2. Create **Firestore** in production mode, then deploy rules from this repo.
3. Enable **Storage** if you will upload menu photos.
4. Deploy rules and indexes:

```bash
npx firebase-tools login
npx firebase-tools use --add
npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage
```

## Firebase Authentication Setup

Create two Email/Password users in Firebase Authentication:

- Owner account
- Cashier account

Then create matching documents in the `users` collection (same document ID as the Auth UID).

## Firestore Setup

Collections used:

- `users`
- `menu`
- `orders`
- `group_orders`
- `inventory`
- `stock_movements`
- `buffet_tracking`
- `expenses`
- `audit_logs`
- `daily_summaries`
- `settings`
- `counters`

Optional development seed (never runs in production automatically):

```bash
node --env-file=.env.local --import tsx scripts/seed.ts
```

Until the first owner user document exists, you may need to temporarily allow that write from the Firebase console, or deploy rules after creating the owner document by hand.

## Firestore Security Rules

Rules live in `firestore.rules`.

Roles are read from `users/{uid}` on the server. The app never trusts a role sent only from the client.

- Owner: full authorized access
- Cashier: orders, group orders, inventory updates, stock movements
- Cashier cannot read expenses, daily summaries, audit logs, buffet tracking, or settings writes
- Audit logs and stock movements cannot be deleted by cashiers

## Creating Owner Account

1. Firebase Authentication → Add user (email + password).
2. Copy the UID.
3. Create `users/{UID}`:

```json
{
  "name": "Owner",
  "email": "owner@example.com",
  "role": "owner",
  "inventory_access": true,
  "active": true,
  "created_at": 0,
  "updated_at": 0
}
```

Set `created_at` / `updated_at` to the current Unix milliseconds.

After login, the owner lands on **Dashboard**.

## Creating Cashier Account

Same as owner, with `"role": "cashier"` and `"active": true`.

After login, the cashier lands on **Student POS**.

You can also add/enable/disable people later on the owner **Employees** page (UID required).

## Running Locally

```bash
npm run dev
```

Open http://localhost:3000

## Building Production Version

```bash
npm run lint
npm run build
```

## GitHub Repository

Use only:

https://github.com/Rurangwa2012/Kakyah-madina.git

```bash
git remote add origin https://github.com/Rurangwa2012/Kakyah-madina.git
git push -u origin master
```

Do not force-push and do not create a second repository.

## Vercel Deployment

1. Push this repository to GitHub.
2. In Vercel, **Import** `Rurangwa2012/Kakyah-madina`.
3. Add the same `NEXT_PUBLIC_FIREBASE_*` environment variables.
4. Deploy.
5. Copy the Vercel production domain into Firebase Authentication → Authorized domains.
6. Test owner login.
7. Test cashier login.
8. Confirm Firestore reads/writes (create a student order).

## Receipt Printer Notes

The first version prints through the **browser print dialog** with an 80mm layout.

`src/services/printer.ts` is an adapter:

- `BrowserPrinter` (current)
- Future USB / Bluetooth / LAN adapters can be plugged in without hard-coding a printer model

Settings include printer type placeholders and a **Test Print** button.

## Owner Permissions

Dashboard, Student POS, Group Orders, Orders, Menu, Inventory, Buffet Tracking, Expenses, Reports, Employees, Activity Logs, Settings.

Owner can change prices, archive menu items, manage employees, cancel/refund orders, and view profit.

## Cashier Permissions

Student POS, Group Orders, Today's Orders, Inventory.

Cashier can sell, print, create group orders, add stock, record waste, and view movement history.

Cashier cannot see profit, full expenses, monthly financial reports, employee management, settings, menu price edits, inventory deletion, or audit deletion.

## Troubleshooting

- **Login works but unauthorized:** the Auth user has no `users/{uid}` document, or `active` is false.
- **Firebase is not configured:** `.env.local` is missing or empty. Copy from `.env.example`.
- **Missing index:** deploy `firestore.indexes.json` or click the index link in the browser console.
- **Permission denied:** deploy `firestore.rules` and confirm the user role document.
- **Receipts do not print:** allow pop-ups / print dialog; use Test Print on Settings.
- **Duplicate order numbers:** counters use transactions; do not edit `counters` by hand while selling.
- **Offline:** the header shows OFFLINE. Firestore persistence queues writes; wait for ONLINE before assuming a sale synced.
