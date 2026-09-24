# Vercel deployment

Repository: https://github.com/Rurangwa2012/Kakyah-madina.git  
Production URL: https://kakyah-madina.vercel.app/

## Environment variables

Vercel will warn if a `NEXT_PUBLIC_` name is saved as **Sensitive**. Use the types below.

| Name | Vercel type | Public? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Config** | Yes. Browser needs it. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Config** | Yes. Anon/publishable key. RLS protects data. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Sensitive** | No. Server only. Employee create + receipt upload. |

Do not add `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`. Remove leftover `NEXT_PUBLIC_FIREBASE_*` keys.

After changing `NEXT_PUBLIC_*`, click **Redeploy** (variables are inlined at build time).

## Steps

1. Push `main` to GitHub (no force-push).
2. In Supabase SQL Editor run, in order if needed:
   - `supabase/schema.sql` (first-time project)
   - `supabase/migrations/202609240001_production_pos.sql`
3. Confirm Auth email/password, owner + cashier profiles, Storage buckets `menu` and `receipts`.
4. Confirm Vercel env vars, then redeploy.
5. Smoke-test owner login, cashier login, open shift, one cash sale, reprint, refund request.

## Rollback

- **App:** in Vercel, promote the previous successful deployment.
- **Database:** restore from the Supabase backup / PITR for the project plan. Schema migrations are additive; rolling back SQL is not automatic.
- **Git:** `git revert` the bad commit on `main`. Do not force-push.

## Recovery checklist (restaurant)

- Bad Vercel build → previous deployment.
- Bad data → Supabase backup restore (practice this before opening day).
- Internet down → lock card/mada; do not mark paid unless the provider confirmed. Paper cash notes until the POS is online again.
- Forgotten owner password → Supabase Auth password recovery (rate-limited). Enable MFA on the owner account.
