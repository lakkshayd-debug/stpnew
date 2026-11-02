# Free deployment — the 100% free setup (no card, no disk)

## What the Render error meant
`services[0] disks are not supported for free tier services`
→ the old `render.yaml` asked for a 1 GB disk to keep uploaded photos. Free services don't get one.

**Fixed:** the disk is gone, and the app now stores uploaded photos **inside the Postgres database**
(`STORAGE_DRIVER=db`). Photos survive restarts and redeploys, and it costs nothing.
Just re-upload the new folder to GitHub (or copy the new `render.yaml`, `server/prisma/schema.prisma`,
`server/src/providers/storage.ts`, `server/src/app.ts`, `server/src/config/env.ts`) and click **Apply** again.

---

## Option 1 — Everything on Render (simplest, free)
Use `render.yaml` exactly as shipped. Blueprint → Apply. Done.
Caveats of the free plan: the API sleeps after 15 idle minutes (~30 s wake-up),
and **Render's free Postgres is deleted after 30 days** — see Option 2 for a permanent free database.

## Option 2 — Website on Vercel + API on Render + database on Neon (recommended, free, permanent)

### A. Database — Neon (free forever, no card)
1. neon.tech → sign up with GitHub → **Create project** (region: Singapore/Mumbai).
2. Copy the **Connection string** (`postgresql://...@...neon.tech/neondb?sslmode=require`).

### B. API — Render (free web service)
1. Rename `render-api-only.yaml` → `render.yaml` **or** create it manually:
   Render → **New + → Web Service** → your repo → Runtime **Docker**,
   Dockerfile path `./server/Dockerfile`, Docker context `.`, Plan **Free**.
2. Add environment variables:
   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | the Neon connection string |
   | `JWT_ACCESS_SECRET` | any 32+ random characters |
   | `JWT_REFRESH_SECRET` | another 32+ random characters |
   | `COOKIE_SECURE` | `true` |
   | `STORAGE_DRIVER` | `db` |
   | `OTP_PROVIDER` | `console` |
   | `PUBLIC_URL` | your Render URL, e.g. `https://shyam-timber-api.onrender.com` |
   | `CLIENT_URL` | your Vercel URL (fill in after step C, then redeploy) |
3. Deploy. Check `https://<api>/api/v1/health` → `{"ok":true}`.

### C. Website — Vercel (free)
1. vercel.com → **Add New → Project** → import the same GitHub repo.
2. Vercel reads `vercel.json`: build `cd client && npm install && npm run build`, output `client/dist`.
   (If it asks: Framework preset **Other**, Root directory **leave at repo root**.)
3. Environment variable: `VITE_API_URL` = your Render API URL.
4. Deploy → you get `https://shyam-timber.vercel.app`.
5. Go back to Render → set `CLIENT_URL` to that Vercel URL → **Manual Deploy**.
   (This matters: cookies and the WhatsApp share page use it.)

### D. Use it
Open the Vercel link on your phone → log in `6385340555` / OTP `782751` (test mode) →
Chrome ⋮ → *Add to Home screen* (iPhone: Share → *Add to Home Screen*).

---

## Why the backend can't also live on Vercel
Vercel is built for websites and short serverless functions: no always-on server, no database,
and uploaded files vanish immediately. This app needs a running Express server with Postgres,
so the free combination above (Vercel = screen, Render = brain, Neon = memory) is the right one.
Everything stays free.

## Free-tier reality check
| Thing | Free limit | What you'll notice |
|---|---|---|
| Render free web service | sleeps after 15 min idle | first visitor waits ~30 s |
| Neon free Postgres | 0.5 GB | thousands of posts/customers — plenty |
| Photos in Postgres | each ~100–200 KB after compression | ~2,500 photos within 0.5 GB |
| Vercel free | 100 GB bandwidth/month | nothing |

When the shop grows: Render Starter ($7/mo) removes sleeping; Cloudinary's free tier (or S3)
can take over photos via the `StorageAdapter` interface already in the code.
