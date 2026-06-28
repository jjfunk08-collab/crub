# Crew Hub

A private hub for you and your friends — shared calendar, a Northeast events guide
(RI / MA / CT / NY), and a Splitwise-style money tracker where settling a debt needs
**both people to approve**. Plus a group chat and quick polls.

Built with Next.js. Data is shared live through an Upstash Redis database.

---

## Deploy it (all in a web browser — no terminal needed)

You'll need a free **GitHub** account and a free **Vercel** account.

### 1. Put this code on GitHub
1. Go to **github.com** → **New repository**.
2. Name it `crew-hub`, keep it Private, click **Create repository**.
3. On the next page click **"uploading an existing file"**.
4. Drag in **everything inside this folder** (the `app` folder, `public` folder,
   `package.json`, etc. — but NOT a `node_modules` folder if one exists).
5. Click **Commit changes**.

### 2. Import into Vercel
1. Go to **vercel.com** → **Sign up** → **Continue with GitHub**.
2. Click **Add New… → Project**.
3. Find `crew-hub` and click **Import**. Vercel auto-detects Next.js — leave all
   settings as-is. **Don't click Deploy yet** — do step 3 first.

### 3. Add the database
1. In your new project, open the **Storage** tab.
2. **Create Database** → choose **Upstash → Redis** (Free plan) → **Continue**.
3. Connect it to this project. Vercel adds the connection keys automatically as
   environment variables — you don't copy anything.

### 4. Deploy
Go to the **Deployments** (or **Overview**) tab and **Deploy** / **Redeploy**.
In under a minute you'll get a live link like `crew-hub.vercel.app`.

> If you happened to deploy before adding the database, just **Redeploy** once after
> step 3 so the app picks up the new keys.

### 5. Share it
Send the link + passcode to your friends.
On iPhone: open in **Safari → Share → Add to Home Screen** for an app icon.

---

## Customize

Open **`app/page.js`** and edit the top few lines:

```js
const PASSCODE = "1250";                                   // your passcode
const SEED_NAMES = ["Alex", "Sam", "Jordan", "Casey", "Riley"];  // starter names
const APP_NAME = "Crew Hub";                               // app title
```

New friends can also add their own name on the lock screen.
To change region events, edit the `CURATED` list further down in the same file.
After any edit, upload the changed file to GitHub again and Vercel redeploys automatically.

---

## Good to know

- **The passcode is a soft gate, not real security** — anyone with the link and code
  can get in. Don't store anything sensitive.
- **"Who am I" lives on each device** (your name choice is remembered locally). All the
  shared stuff — plans, expenses, chat, polls — lives in the database so everyone sees it.
- **Updates refresh every few seconds** while the app is open, so changes show up for
  everyone within moments rather than truly instantly.
- **Free tiers are plenty** for a friend group. If two people happen to save at the exact
  same instant, the last save wins — fine in practice for this kind of app.
- **Events are a curated guide**, not a live feed. Dates shift yearly, so confirm before
  committing. A true live events feed would need a paid events API — easy to add later.

---

## Run it on your own computer first (optional)

If you have Node.js installed and want to preview locally:

```bash
npm install
# create a file named .env.local with two lines from your Upstash database:
# UPSTASH_REDIS_REST_URL=...
# UPSTASH_REDIS_REST_TOKEN=...
npm run dev
```

Then open http://localhost:3000
