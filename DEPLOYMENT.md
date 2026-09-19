# Vercel deployment

Use the existing GitHub repository only:

https://github.com/Rurangwa2012/Kakyah-madina.git

Do not invent Vercel project IDs or Firebase credentials.

## Checklist before deploy

1. `npm run lint` and `npm run build` succeed locally.
2. `.env.local` is not committed.
3. Firebase values exist only as `NEXT_PUBLIC_FIREBASE_*` in Vercel.
4. `firestore.rules` and `firestore.indexes.json` are ready to deploy from Firebase.
5. Git remote is `https://github.com/Rurangwa2012/Kakyah-madina.git`.

## Steps

1. Push `master` (or `main`) to GitHub.
2. Vercel → Add New → Project → Import that GitHub repo.
3. Framework preset: Next.js (auto).
4. Environment variables: paste the six Firebase web keys from `.env.example` / `.env.local`.
5. Deploy.
6. Firebase Authentication → Settings → Authorized domains → add the Vercel production domain.
7. Log in as owner, then cashier, then create one student order to confirm Firestore.

If the Vercel CLI is already authenticated:

```bash
npx vercel
```

Link to the existing Vercel project when prompted. Do not create a second GitHub repository.
