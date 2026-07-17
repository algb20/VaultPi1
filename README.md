# PiVault 🔐

A secure personal vault on **Pi Network** — store files, photos, videos, links
and **notes**, with a draggable, customizable edge shortcut. Built with
**Next.js 15 + React 19 + shadcn/ui** on the front, and **Supabase**
(Postgres + Storage + Edge Functions) on the back.

## Architecture

```
Pi Browser ──► Pi SDK auth ──► accessToken
      │
      ▼
  vaultpi-auth (Supabase Edge Function, verify_jwt=false)
      • verifies the Pi token via https://api.minepi.com/v2/me
      • creates/loads a Supabase Auth user bound to the Pi uid
      • upserts public.profiles
      • returns a real Supabase session
      │
      ▼
  Browser Supabase client (direct queries + RLS)
      • items / folders / tags / activity  → Postgres
      • files / photos / videos            → Storage bucket "vault" (private)
```

Every table has **row-level security** so a user can only ever read/write their
own data. Files live in a **private** Storage bucket under `{user_id}/…` and are
served through short-lived **signed URLs**.

## Project layout

```
app/                     Next.js app router (single-page shell)
components/pivault/       Feature screens: dashboard, files, notes, ai-organizer,
                         settings, privacy-dashboard, upload-modal, edge-dock,
                         header, bottom-nav
contexts/                pi-auth-context (Pi→Supabase bridge) + vault-context (data)
lib/vaultpi/             config, client, types, db  (the data layer)
supabase/functions/      vaultpi-auth edge function (Deno)
```

## Supabase backend (already provisioned)

- Project: **VaultPi** (`shsuznbuaxkkykvgbklb`, eu-central-1)
- Tables: `profiles, folders, items, tags, item_tags, activity_log`
- Storage: private bucket `vault`
- Edge function: `vaultpi-auth`
- Migrations live in `supabase/migrations` naming pattern `vaultpi_0N_*`.

Public config (URL + publishable key — safe to ship) is in
`lib/vaultpi/config.ts`. Override with env vars if desired:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Run locally

```bash
pnpm install
pnpm dev      # http://localhost:3000  (auth needs Pi Browser)
pnpm build    # production build
```

> Full login only works inside **Pi Browser** (or App Studio), because the
> Pi SDK must issue a real access token. Outside Pi Browser you'll see the
> "Pi Network Authentication" screen — that's expected.

## Deploying as a Pi app

1. Build and host the app on a stable HTTPS domain (Netlify/Vercel/any static host).
2. Keep `validation-key.txt` served at the site root.
3. Register the domain in the **Pi Developer Portal** and paste the validation key.
   This clears the ⚠️ badge in Pi Browser and enables payments.

## Security notes (honest status)

- ✅ Per-user isolation via RLS; private storage; signed URLs; Pi-verified sessions.
- ✅ Data encrypted **at rest** by Supabase.
- ⏳ True client-side / zero-knowledge encryption (encrypting bytes in the browser
  before upload) is **not yet** implemented — the "Encrypted" badge currently
  reflects the private+at-rest model. Tracked in `PROJECT_TRACKING.md`.
