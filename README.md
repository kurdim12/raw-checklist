# Raw Smith Ops

Internal web app for the Raw Smith cafe in Amman — replaces the Excel sheet that currently holds the opening/closing checklist, ~70-SKU inventory, and weekly schedule. Phone-first, bilingual (EN/AR), PWA-installable, zero paid APIs.

## Stack

- React 18 + Vite + TypeScript (strict)
- Tailwind + shadcn/ui
- Supabase (Postgres + Auth + Realtime + Edge Functions)
- TanStack Query, Zustand, react-hook-form + zod
- react-i18next with full RTL support
- vite-plugin-pwa

## Setup — 5 steps

```bash
# 1. install
npm install

# 2. env
cp .env.example .env
#    then fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
#    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# 3. push schema + static seed (categories, items, templates)
supabase link --project-ref <your-project-ref>
supabase db push

# 4. create the 5 staff accounts + sample week of shifts
npm run seed:users
npm run seed:shifts

# 5. dev server
npm run dev
```

## First login

These accounts are pre-created in step 4 above. **Change all passwords on first login via `/admin → Staff → Reset password`.**

| Name    | Email                       | Password            | Role    |
|---------|-----------------------------|---------------------|---------|
| Manager | `manager@rawsmith.local`    | `Manager@Raw2026!`  | manager |
| Obida   | `obida@rawsmith.local`      | `Obida@Raw2026`     | barista |
| Ahmad   | `ahmad@rawsmith.local`      | `Ahmad@Raw2026`     | barista |
| Samaher | `samaher@rawsmith.local`    | `Samaher@Raw2026`   | barista |
| Muneeb  | `muneeb@rawsmith.local`     | `Muneeb@Raw2026`    | barista |

The `.local` TLD is intentional — it won't trigger Supabase's email-confirmation flow and won't send invites to real inboxes.

## Inviting more staff

`/admin → Staff → Invite` (manager-only). Or via Supabase Dashboard → Authentication → Users → Invite, then add a matching row in `public.profiles` with the right `role`.

## WhatsApp low-stock alerts (free)

The simplest free route is [CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/):

1. Add `+34 644 51 22 22` to WhatsApp contacts and send "I allow callmebot to send me messages".
2. You'll receive an `apikey`.
3. Set `WHATSAPP_WEBHOOK_URL` to:
   `https://api.callmebot.com/whatsapp.php?phone=<owner-phone>&apikey=<apikey>&text=`
4. In the Supabase dashboard → Database → Webhooks, create a webhook on `public.low_stock_alerts` (INSERT) that calls the `low-stock-alert` Edge Function.
5. Deploy the function: `supabase functions deploy low-stock-alert`.

The function debounces per item via the `low_stock_debounce_hours` setting (default 12h).

## Production deploy — Cloudflare Pages

1. Push the repo to GitHub (you already have the branch on `kurdim12/raw-checklist`).
2. In Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**, pick the repo and the branch.
3. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** *(leave blank)*
   - **Node version:** `20`
4. **Environment variables** (Production *and* Preview):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - *(do **not** add `SUPABASE_SERVICE_ROLE_KEY` here — it's not used by the client; it would just sit in env. Only the seed scripts and Edge Function need it, and those run elsewhere.)*
5. Deploy. SPA deep links work because Cloudflare's Workers + Static Assets wizard auto-generates a `wrangler.jsonc` with `not_found_handling: "single-page-application"` on first deploy.
6. PWA install: open the deployed URL on iOS/Android → "Add to Home Screen".

> If you're on classic Cloudflare Pages (not Workers + Static Assets), add a `public/_redirects` file with `/*  /index.html  200` instead — but don't have both, or the deploy fails with "Infinite loop detected" (error 10021).

The Supabase project is the source of truth for the schema — keep migrations in this repo and apply them via `psql -f` or `supabase db push`.

## Layout

```
rawsmith-ops/
├── supabase/
│   ├── migrations/
│   │   ├── 0001_init.sql        # tables + RLS + RPCs + triggers
│   │   └── 0002_seed.sql        # categories, items, templates
│   └── functions/low-stock-alert/index.ts
├── scripts/
│   ├── seed-users.ts            # 5 staff accounts + profile rows
│   └── seed-shifts.ts           # sample week of shifts
├── src/
│   ├── lib/                     # supabase, i18n, date, rls helpers
│   ├── components/ui/           # shadcn primitives
│   ├── features/                # auth, checklist, inventory, orders, schedule, admin
│   ├── locales/en.json + ar.json
│   └── routes/
├── tailwind.config.ts
└── vite.config.ts
```
