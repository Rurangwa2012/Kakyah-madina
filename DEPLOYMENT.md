# Vercel deployment

Repository: https://github.com/Rurangwa2012/Kakyah-madina.git

## Environment variables

Vercel will warn if a `NEXT_PUBLIC_` name is saved as **Sensitive**. Use the types below.

| Name | Vercel type | Why |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Config** | Must be in the browser. Safe. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Config** | Publishable/anon key. Safe in the browser; RLS protects data. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Sensitive** | Server only. No `NEXT_PUBLIC_` prefix. |

Do not rename the first two. Removing `NEXT_PUBLIC_` hides them from the POS and login will fail.

Remove any leftover `NEXT_PUBLIC_FIREBASE_*` keys, then **Redeploy**.
