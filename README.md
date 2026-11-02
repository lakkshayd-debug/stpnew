# Shyam Timber and Plywoods — Community & Referral PWA

Mobile-first installable PWA for **Shyam Timber and Plywoods**, Porur, Chennai.
The owner posts products, offers and tips; customers like, save, comment (owner-approved)
and share them; customers refer friends and both sides earn rewards that the owner
confirms and redeems in the shop.

> **Not a developer? Open `START-HERE.md` instead.**

* **Shop:** Old No.98, 35A/107, New, Kundrathur Main Rd, Ramanatheswarar Nagar, Porur, Chennai 600125
* **Phone / WhatsApp:** +91 93421 94431 · **Web:** shyamtimber.co.in · **Opens 9 am** (configurable in Admin → Settings)

## Stack
React 18 + Vite + TypeScript, Tailwind, React Router, TanStack Query, react-i18next (English + Tamil),
vite-plugin-pwa (manifest + service worker) · Node + Express + TypeScript, Zod validation, JWT access/refresh
in httpOnly cookies, helmet, CORS, express-rate-limit, multer + sharp · PostgreSQL + Prisma ·
local `/uploads` storage behind a swappable `StorageAdapter` (S3/Cloudinary stub included).

## Folder tree
```
shyam-timber/
├─ START-HERE.md  README.md  render.yaml  docker-compose.yml  .env.example
├─ shared/types.ts                      # types shared by client and server
├─ server/
│  ├─ prisma/{schema.prisma, seed.ts}
│  ├─ src/{index,app}.ts
│  ├─ src/config/env.ts                 # zod-validated environment
│  ├─ src/lib/{prisma,errors,validate,phone}.ts
│  ├─ src/domain/{defaults,rewards}.ts  # pure, unit-tested referral/reward rules
│  ├─ src/providers/{otp,storage,notification}.ts   # swappable interfaces + stubs
│  ├─ src/middleware/{auth,errorHandler,rateLimit,upload}.ts
│  ├─ src/services/*.service.ts
│  ├─ src/routes/{auth,posts,me,admin,share}.ts
│  └─ tests/{rewards.unit,auth.int,moderation.int}.test.ts
└─ client/
   ├─ public/icons/*  index.html  vite.config.ts  tailwind.config.js
   └─ src/{main,App}.tsx, i18n/{en,ta}.json, api/*, lib/*, components/*, pages/*, admin/*
```

## Run locally (developer path)

```bash
cp .env.example .env            # set the two JWT secrets
docker run -d --name shyam-pg -e POSTGRES_USER=shyam -e POSTGRES_PASSWORD=shyam \
  -e POSTGRES_DB=shyam_timber -p 5432:5432 postgres:16-alpine
npm run setup                   # install + create tables (prisma db push) + seed demo data
npm run dev                     # API http://localhost:4000 · web http://localhost:5173
```
Want migration history instead of `db push`? `npm run prisma:migrate -w server -- --name init`.

**Accounts:** the OWNER role is locked to `OWNER_PHONE` (**+91 6385340555**); every other number that signs up
becomes a CUSTOMER automatically. With `OTP_MODE=fake` (default) no SMS is sent: the owner number logs in with `782751` and every other number with `123455`;
with `OTP_PROVIDER=msg91|twilio|fast2sms` a fresh random 6-digit code is sent by real SMS.

Everything at once: `docker compose up --build` → http://localhost:8080.

## OTP and roles
* `OWNER_PHONE` (default `+916385340555`) is the **only** number that can hold the OWNER role. On signup the role is
  assigned from it; if the value is ever changed, the old owner is demoted and the new number promoted at next login.
* Codes are generated with `crypto.randomInt`, stored only as a bcrypt hash, single-use, and deleted if the SMS fails
  (so the customer can retry immediately).
* Providers implement one `OtpProvider` interface: `Msg91OtpProvider` (DLT template), `TwilioOtpProvider`,
  `Fast2SmsOtpProvider`, and `ConsoleOtpProvider` for local work. Choose with `OTP_PROVIDER`.
* `OTP_MODE=fake` (default) → `OWNER_OTP` (782751) for `OWNER_PHONE`, `CUSTOMER_OTP` (123455) for everyone else, no SMS and nothing to pay. `OTP_MODE=real` → random 6-digit code sent through `OTP_PROVIDER`.
  A warning is logged if the fixed code is ever enabled in production.

## Environment
See `.env.example`: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ACCESS_TOKEN_TTL`,
`REFRESH_TOKEN_TTL_DAYS`, `CLIENT_URL`, `PUBLIC_URL`, `COOKIE_SECURE`, `UPLOAD_DIR`,
`STORAGE_DRIVER` (`local|db|s3`), `OTP_PROVIDER` (`console|msg91|twilio`), `REFERRAL_IP_THRESHOLD`;
client: `VITE_API_URL`. No secrets are committed.

## API (everything under `/api/v1`)
Errors are always `{ "error": { "code", "message", "details?" } }`.

| Method | Route | Notes |
|---|---|---|
| GET | `/health`, `/public/settings` | status; shop + reward settings |
| POST | `/auth/otp/request` | `{phone}` → `{isNewUser, expiresInSec, fixedCode}`; random 6-digit code sent by SMS, hashed with bcrypt, 5-minute expiry, 5 requests / 10 min, 5 wrong attempts max |
| POST | `/auth/otp/verify` | `{phone, code, profile?, deviceId?}` → httpOnly cookies. New user without `profile` → 400 `{needsProfile:true}` |
| POST | `/auth/refresh`, `/auth/logout` | refresh-token rotation / revoke |
| GET | `/auth/referral-code/:code` | `{valid, referrerName}` |
| GET | `/p/:id?ref=CODE` | server-rendered Open Graph page for WhatsApp previews |
| GET | `/posts?cursor&limit&category&type&q` | pinned first, infinite scroll |
| GET | `/posts/saved` · `/posts/:id` | bookmarks (auth) · single post |
| POST | `/posts/:id/like` · `/save` · `/share` | toggles (one like per user per post) |
| GET/POST | `/posts/:id/comments` | approved + own; create = PENDING, links blocked, 5 per 10 min |
| GET/PATCH | `/me` | profile |
| GET | `/referrals` · `/rewards` · `/notifications` · POST `/notifications/read` | customer data |
| GET/POST/PUT/PATCH/DELETE | `/admin/posts[...]` | posts manager, `/:id/pin` |
| GET/POST/DELETE | `/admin/comments[?status=]`, `/:id/approve|reject|reply` | moderation queue |
| GET/PATCH | `/admin/customers[?q&area&customerType]`, `/:id`, `/:id/block` | list, detail + referral tree, block |
| GET/POST | `/admin/referrals[?status=]`, `/:id/confirm-purchase`, `/:id/unflag` | purchase confirmation |
| GET/POST | `/admin/rewards[?status=]`, `/:id/use`, `/housekeeping` | redemption, expiry sweep |
| GET/PUT | `/admin/settings[/rewards|/shop]` | editable reward rules and shop details |
| GET | `/admin/analytics`, `/admin/audit`, `/admin/export/{customers,referrals,rewards}` | KPIs, audit log, CSV |

All `/admin/*` routes require the OWNER role.

## Referral & reward rules (Admin → Settings)
* Referee welcome **₹250** off a first purchase of **₹5,000+**
* Referrer **₹400** credit after the friend's first qualifying purchase
* Milestones **3 → +₹300**, **5 → +₹600 + Silver Referrer**, **10 → +₹1,500 + Gold Referrer** (once each)
* Rewards expire in **90 days**; credit usable on up to **10% of a bill**
* Flow `JOINED → PURCHASED → REWARDED` (`FLAGGED` = needs review). Both rewards are created in a single
  DB transaction when the owner confirms a qualifying purchase.

**Fraud prevention:** unique phone; no self-referral (by id and by phone); one referrer per customer
(`Referral.refereeId` is unique, locked at signup); repeat IP/device referrals auto-flagged above
`REFERRAL_IP_THRESHOLD`; unique invoice numbers; owner confirmation for every reward; full `AuditLog`.

## Tests
```bash
npm run test:unit -w server   # referral/reward logic, no database needed
npm test -w server            # + integration (needs DATABASE_URL and NODE_ENV=development)
```
Unit: qualifying purchase, self-referral blocked, milestone bonuses (once + back-fill), 90-day expiry, 10% cap.
Integration: OTP auth, referral signup, owner-only routes, comment moderation, purchase → rewards → redemption.

## Deployment
* **Free stack (recommended):** Postgres on **Neon**, API on **Render** (Blueprint → `render.yaml`,
  no disk because the free plan forbids it → `STORAGE_DRIVER=db` keeps images in Postgres),
  frontend on **Vercel** (root directory `client`, `VITE_API_URL` = API URL, `client/vercel.json`
  already contains the SPA rewrite). Finally set `CLIENT_URL`/`PUBLIC_URL` on the API. See `START-HERE.md`.
* The Docker image runs TypeScript directly with **tsx** (`npx prisma db push && tsx prisma/seed.ts && tsx src/index.ts`)
  so a type error can never block a deploy. Run `npm run typecheck -w server` / `npm run build:compiled -w server`
  locally if you prefer a compiled `dist/` build.
* **Manual:** backend on Render/Railway (`server/Dockerfile`, disk mounted at `UPLOAD_DIR`, `COOKIE_SECURE=true`);
  frontend on Vercel/Netlify (root `client`, build `npm run build`, output `dist`, SPA rewrite `/* → /index.html`).
* Going live: set `OWNER_PHONE`, `OTP_MODE=real`, `OTP_PROVIDER=msg91` + MSG91 keys, `SEED_DEMO=false`,
  replace the sample posts and `client/public/icons/*`, and set the real reward amounts and opening hours.

## Manual test checklist
0. **Real OTP** — request a code on a real number, confirm the SMS arrives, that a wrong code fails, that it expires after 5 minutes, and that only 6385340555 sees the Admin button.
1. **Signup via referral** — copy your link on Refer, open in a private window, sign up → referrer sees “Joined”.
2. **Comment approval** — customer comment shows “Waiting for approval”, invisible to others; owner approves/replies → customer gets alerts.
3. **Purchase confirmation** — Admin → Referrals → invoice + amount → status becomes Rewarded (below ₹5,000 → Purchased, no rewards).
4. **Reward creation** — referee ₹250, referrer ₹400, both with 90-day expiry and a 🎁 alert.
5. **Reward redemption** — Admin → Rewards → “Mark as used” with an invoice → status Used, liability drops, second attempt rejected.
6. **Milestone bonus** — 3 rewarded referrals → +₹300; 5 → +₹600 + Silver badge; 10 → +₹1,500 + Gold badge, never duplicated.
