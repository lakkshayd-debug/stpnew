# START HERE — put the app online for FREE (no credit card)

Three free pieces work together:

| Piece | Where | Cost |
|---|---|---|
| Database (memory) | **Neon** (neon.tech) | free forever |
| Backend (brain) | **Render** | free |
| Website (what people see) | **Vercel** | free |

You will not type any code. ~20 minutes.

---------------------------------------------------------------
## STEP 1 — Upload the folder to GitHub
---------------------------------------------------------------
1. github.com -> sign up / log in.
2. Top-right **+** -> **New repository** -> name `shyam-timber` -> **Private** -> **Create repository**.
3. Click the link **"uploading an existing file"**.
4. Drag the whole unzipped `shyam-timber` folder into the browser. Wait.
5. Click the green **Commit changes**.

---------------------------------------------------------------
## STEP 2 — Free database on Neon (2 min)
---------------------------------------------------------------
(Render's own free database is deleted after 30 days, Neon's is not — so we use Neon.)
1. Go to **neon.tech** -> Sign up with GitHub -> **Create project** (any name, region Singapore/Mumbai).
2. It shows a **Connection string** like
   `postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
3. Click **Copy**. Keep it in Notepad - you need it once.

---------------------------------------------------------------
## STEP 3 — Backend on Render (10 min)
---------------------------------------------------------------
1. **render.com** -> Sign in with GitHub -> **New +** -> **Blueprint** -> pick `shyam-timber` -> **Apply**.
   (The blueprint has NO disk, so the free plan accepts it. Photos are saved inside the database.)
2. Render starts building `shyam-timber-api`. While it builds, open that service -> **Environment**:
   - `DATABASE_URL` -> paste the **Neon** connection string from Step 2 (replace whatever is there).
   - Leave `STORAGE_DRIVER = db` and `COOKIE_SECURE = true`.
3. Click **Save changes**. Render redeploys. Wait for the green **Live**.
4. Copy the address at the top, e.g. `https://shyam-timber-api.onrender.com`.
5. Test it: open `https://<your-api-address>/api/v1/health` in a browser — you should see `{"ok":true,...}`.

> If you prefer NOT to use Neon: in the blueprint Render also creates `shyam-timber-db` (free for 30 days).
> Then just leave `DATABASE_URL` alone. You can switch to Neon later by pasting a new value.

---------------------------------------------------------------
## STEP 4 — Website on Vercel (5 min)
---------------------------------------------------------------
1. **vercel.com** -> Sign up with GitHub -> **Add New… -> Project** -> import `shyam-timber`.
2. Important: set **Root Directory** to **`client`** (click *Edit* next to Root Directory and choose the
   `client` folder). Framework shows **Vite** automatically.
3. Open **Environment Variables** and add:
   - Name: `VITE_API_URL`
   - Value: your Render API address from Step 3, e.g. `https://shyam-timber-api.onrender.com`
4. Click **Deploy**. After ~2 minutes you get an address like `https://shyam-timber.vercel.app`.

---------------------------------------------------------------
## STEP 5 — Introduce the two halves (1 min, very important)
---------------------------------------------------------------
Back on **Render** -> `shyam-timber-api` -> **Environment**:
- `CLIENT_URL` = your Vercel address (`https://shyam-timber.vercel.app`)
- `PUBLIC_URL` = your Render address (`https://shyam-timber-api.onrender.com`)
Save -> it redeploys. Done. (Without this, login cookies and WhatsApp previews won't work.)

---------------------------------------------------------------
## STEP 6 — Open on your phone and install it
---------------------------------------------------------------
1. Open the **Vercel address** on your phone.
2. Log in: phone **6385340555**, OTP **782751** -> you are the owner (gold **Admin** button appears).
   Any customer number logs in with OTP **123455**.
3. Install as an app:
   - Android/Chrome: ⋮ menu -> **Add to Home screen**
   - iPhone/Safari: Share -> **Add to Home Screen**
4. Share the Vercel link with customers on WhatsApp.

---------------------------------------------------------------
## STEP 7 — Make it your shop
---------------------------------------------------------------
Admin ->
- **Settings**: opening hours, reward amounts
- **Posts**: delete the 12 "Sample" posts, add your real photos and prices
- **Moderation**: approve customer comments
- **Referrals**: enter invoice number + bill amount -> rewards are created automatically
- **Rewards**: "Mark as used" when a customer redeems at the counter

---------------------------------------------------------------
## STEP 5b — Turn on REAL OTP by SMS (do this before sharing with customers)
---------------------------------------------------------------
Until you do this, the app runs in test mode (owner 782751 / customers 123455). For real SMS codes:

1. Sign up at **msg91.com**, verify your email/phone, add about Rs.500 to the wallet
   (roughly 20 paise per SMS).
2. **Sender ID**: dashboard -> *Sender ID* -> request a 6-letter name, e.g. `SHYTMB`.
3. **DLT registration** (compulsory in India, done from inside MSG91 -> *DLT*):
   register the business and this exact template text —

       ##OTP## is your OTP for Shyam Timber and Plywoods. Valid for 5 minutes. Do not share it with anyone.

   Approval takes a few hours to 2 days.
4. MSG91 -> *Flow / OTP* -> create the OTP template -> copy the **Template ID**.
   MSG91 -> *Settings -> API* -> copy the **Auth Key**.
5. Render -> **shyam-timber-api** -> **Environment** -> set these and click Save:

   | Key | Value |
   |---|---|
   | `OWNER_PHONE` | `+916385340555` |
   | `OTP_PROVIDER` | `msg91` |
   | `MSG91_AUTH_KEY` | your auth key |
   | `MSG91_TEMPLATE_ID` | your template id |
   | `MSG91_SENDER_ID` | `SHYTMB` |
   | `OTP_MODE` | `real` |

6. **Manual Deploy -> Deploy latest commit**. Now every login gets a fresh code by SMS.

*Alternatives already coded:* `OTP_PROVIDER=twilio` (`TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM`)
or `OTP_PROVIDER=fast2sms` (`FAST2SMS_API_KEY`).

*While waiting for DLT approval:* keep `OTP_MODE=fake` - the owner logs in with 782751 and
customers with 123455, so you can demo the whole app without paying for SMS.

---------------------------------------------------------------
## Who is the owner, who is a customer
---------------------------------------------------------------
* **Owner = 6385340555 only.** That is the `OWNER_PHONE` setting. Logging in with it shows the gold
  **Admin** button (posts, moderation, customers, referrals, rewards, settings).
* **Every other number** that signs up automatically becomes a normal customer — there is no way
  to become owner from the app. Changing the owner later = change `OWNER_PHONE` on Render and
  redeploy; the old number is demoted to customer automatically at its next login.
* The shop's public contact number (the WhatsApp/Call buttons) is separate and editable in
  **Admin -> Settings**; it is set to 093421 94431 out of the box.

---------------------------------------------------------------
## Good to know
---------------------------------------------------------------
* **Free Render sleeps** after 15 idle minutes; the next visitor waits ~30 seconds. Vercel never sleeps,
  so the app opens instantly and only the first data load is slow. $7/month on Render removes it.
* **Real OTP**: every login gets a fresh random 6-digit code by SMS once Step 5b is done. The code is
  stored only as a bcrypt hash, dies after 5 minutes, allows 5 wrong attempts, and 5 requests per 10 minutes.
* **Photos** are stored in the database (free, survives restarts). A 1 GB free database holds
  thousands of compressed photos. Later you can switch `STORAGE_DRIVER=s3`.
* **Costs you nothing** in this setup: Neon free + Render free + Vercel free.

---------------------------------------------------------------
## Want to try it on your own laptop first?
---------------------------------------------------------------
Install Docker Desktop, open this folder in a terminal and run:

    docker compose up --build

then open http://localhost:8080 and log in as **6385340555** with OTP **782751**
(test mode: no SMS is sent and the code is also printed in the terminal).
Stop with Ctrl+C.

Test logins: owner **6385340555** -> OTP **782751**; every other number (including the demo customers **9000000001 … 9000000006**) -> OTP **123455**.
On the live site those demo numbers cannot log in (they are not real phones) — that is intentional;
set `SEED_DEMO=false` on Render to create the owner account only.

---------------------------------------------------------------------
## If a Render build ever fails
---------------------------------------------------------------------
The app is set up so that deploys do **not** run the TypeScript checker
(`server/Dockerfile` runs the code with `tsx`, and the website builds with plain `vite build`).
If you see a build error mentioning `tsc`, `TS2345` or `noUncheckedIndexedAccess`,
you are on an older copy — replace these three files with the ones in this zip:

* `server/tsconfig.json`   (no `noUncheckedIndexedAccess`)
* `server/Dockerfile`      (no `npx tsc` line; starts with `tsx`)
* `client/package.json`    (`"build": "vite build"`)

Then in Render click **Manual Deploy → Deploy latest commit**.
