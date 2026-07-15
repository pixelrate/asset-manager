# Asset Manager

A multi-tenant, multi-user inventory app for cataloging everything in your garage, workshop, or shed — with a built-in resale workflow. Runs in any browser, installs as a PWA on your phone, and is built to deploy on [Railway](https://railway.app).

**Stack:** Next.js 15 (App Router, TypeScript) · Prisma (SQLite, Postgres-portable) · Tailwind CSS v4 · Recharts · bwip-js (Code-128) · qrcode · exceljs · @zxing/browser

## Features

- **Cataloging** — full item records (category, brand, model, serial, condition New→Parts-Only, quantity, owner, tags, notes, favorites), multiple photos with primary + manual ordering, arbitrary file attachments, voice-dictated descriptions (Web Speech API), soft-delete trash with restore, auto-generated sequential item numbers and unique barcodes.
- **Locations** — hierarchical tree (Area → Shelf/Cabinet/Bin/Workbench/…), per-location QR labels, and a visual **Garage Map**: upload a photo/diagram and tap to pin locations onto it.
- **Selling** — Keep/Sell/Donate/Trash decisions, a 7-stage selling pipeline (Not Listed → Sold), marketplace tracking (Facebook, eBay, Craigslist, OfferUp…), purchase/estimated/minimum prices, and a listing-copy generator driven by reusable templates.
- **Labels & scanning** — per-item QR + Code-128 barcodes, bulk printable label sheets, camera scan-to-lookup (`/scan`), public `/qr/[code]` redirects.
- **Search & bulk** — full-text search across name/description/notes/serial/barcode, filters (category, location, decision, status, condition, marketplace, tag, value range, date range, favorites), pagination, and bulk edit / trash / label printing.
- **Dashboard & reports** — inventory value, sales, pipeline, charts (category, location, value distribution, monthly sales), recently added/viewed, plus reports: valuation, realized profit, sold-this-month, by-location, items over $100, ready-to-sell, missing photos, uncategorized.
- **Export** — CSV and Excel of the (filtered) inventory.
- **Extras** — maintenance logs per item, user-defined custom fields, activity log data model, recently-viewed tracking.
- **Platform** — public signup with super-admin approval, invite codes for joining a workspace, per-tenant plans (Free/Pro item limits, Stripe-ready), PWA (installable, standalone), storage abstraction (local disk or Supabase Storage).

## Quick start

```bash
npm install
npx prisma db push     # creates the SQLite database
npm run seed           # optional: demo workspace with sample data
npm run dev
```

Open http://localhost:3000.

- **Demo login** (after seeding): `demo@assetmanager.local` / `demo1234` — this account is the platform super admin.
- **Fresh start** (no seed): the **first account you create through /signup becomes the super admin** automatically. Every later signup waits on the Admin page (`/admin`) for approval, or joins instantly with an invite code (Settings → Users).

> ⚠️ If you seed in production, change or remove the demo account.

## Environment

Copy `.env.example` to `.env`:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `file:./data/asset-manager.db` (SQLite) or a Postgres URL |
| `AUTH_SECRET` | long random string; signs session JWTs |
| `APP_URL` | public URL; default base for printed QR codes |
| `STORAGE_DRIVER` | `local` (default) or `supabase` |
| `UPLOADS_DIR` | local driver storage dir (default `./data/uploads`) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_BUCKET` | for the Supabase driver |

## Deploying to Railway

1. Push this repo to GitHub and create a Railway project from it (or `railway up`).
2. Set env vars: `AUTH_SECRET` (random), `APP_URL` (your Railway domain, e.g. `https://your-app.up.railway.app`).
3. **Storage** — pick one:
   - **Volume (simplest):** mount a Railway volume at `/data`, set `DATABASE_URL=file:/data/asset-manager.db` and `UPLOADS_DIR=/data/uploads`. SQLite + photos live on the volume.
   - **Postgres + Supabase:** add a Railway Postgres service; in `prisma/schema.prisma` change `provider = "sqlite"` → `"postgresql"`, set `DATABASE_URL` to the Postgres URL, and set `STORAGE_DRIVER=supabase` with your Supabase credentials. The schema uses no SQLite-specific features — `npx prisma db push` just works.
4. Build command: `npm run build` · Start command: `npm start`. Run `npx prisma db push` once on first deploy (Railway "deploy command" or a one-off shell).
5. Sign up — the first account is the super admin. Set Settings → General → *QR label base URL* to your public domain before printing labels.

## Phone / PWA

Open the deployed URL on your phone → browser menu → **Add to Home Screen**. The app runs standalone with a bottom tab bar (Home, Items, Add, Scan, More). The `/scan` page uses the camera for QR/barcode lookup; label QR codes also work from the native camera app via the public `/qr/[code]` redirect.

## Project layout

```
prisma/schema.prisma      data model (tenants, users, items, photos, locations, maps, tags,
                          templates, custom fields, maintenance, activity, invites, views)
prisma/seed.ts            demo data
src/middleware.ts         session gate (JWT cookie, jose)
src/lib/                  auth, storage drivers, item helpers, export, constants
src/app/(auth)/           login, signup, pending-approval
src/app/(app)/            dashboard, items, locations, map, scan, labels, reports,
                          trash, settings/*, admin, more
src/app/api/              uploads, file serving, QR/barcode PNGs, exports, lookup, maps
src/app/qr/[code]/        public QR redirect
scripts/                  PNG icon generator (no deps)
```

## Notes & roadmap hooks

- **Billing** — `Tenant.plan/planStatus/itemLimit` are enforced at item creation; wire Stripe checkout + webhooks to flip plans (admins can toggle Free/Pro manually today).
- **Activity log** — every significant action is recorded (`ActivityLog`); an audit-trail UI can be built on top without schema changes.
- **Future** — notifications, marketplace APIs, per-item history timeline, in-app barcode scanning improvements, and insurance-report PDF export are architecturally anticipated (see activity log, statuses, and storage abstraction).
