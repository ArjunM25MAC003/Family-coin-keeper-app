# FamCoin — Gamified Family Chores & Money App 🪙

live link: "https://family-coin-keeper--arjun15apps.replit.app"
A working MVP for the brief: kids earn coins for chores, teens track UPI-style
spending with streaks and goals, and parents get an approval queue plus
AI-style spending insights — with **receipt photo scanning that auto-categorizes
spend**, the differentiator vs. Greenlight/GoHenry for the Indian market.

Runs as a single Node.js app — **zero paid APIs, zero native DB binaries**, so
it deploys on Replit's free tier with one click.

---

## 1. Run it on Replit

1. Create a new Replit → **Import from GitHub** (push this folder to a repo first)
   or **Upload folder** if you're starting from this zip.
2. Replit auto-detects `.replit` / `replit.nix` → click **Run**.
3. First boot runs `npm install && npm start`. The app serves on the webview
   at port 3000 automatically.
4. That's it — no environment variables, no database setup, no API keys.

**Run locally instead:**
```bash
npm install
npm start
# open http://localhost:3000
```

---

## 2. What's implemented

| Feature | Where |
|---|---|
| Family creation + join-by-code, PIN login | `server.js` (`/api/family/*`, `/api/login`) |
| Chores → coins, with approval workflow & recurring (daily/weekly) chores | `/api/chores/*` |
| Chore streaks (consecutive days) | computed in `/api/chores/:id/approve` |
| Visual coin wallet + coin→cash conversion | `/api/wallet/*`, `wallet-hero` UI |
| Savings goals with an animated "coin jar" progress visual | `/api/goals/*` |
| Allowance / withdrawal requests with parent approval | `/api/requests/*` |
| Manual expense logging + category breakdown | `/api/expenses` |
| **Receipt photo scanning** — in-browser OCR (Tesseract.js) → rule-based categorizer | `/api/expenses/receipt`, `categorize.js` |
| Rule-based "AI" spending insights (week-over-week, category spikes, streak shoutouts) | `/api/insights/:familyId` |
| Gamified UI: coin jar SVG, streak flame chip, progress bars, bottom nav | `public/app.js`, `public/styles.css` |

Everything is a single Express server (`server.js`) + a JSON-file datastore
(`db.js`, stored at `data/db.json`) + a no-build vanilla-JS frontend
(`public/`). No React/webpack step, so there's nothing that can fail to build
on Replit.

---

## 3. The receipt-scanning pipeline (your UDoc angle)

This MVP swaps the full multimodal document-layout model (LayoutLMv3 /
Qwen2-VL from your thesis stack) for a two-stage pipeline that's *directly
upgradeable* to it later:

```
Photo → Tesseract.js OCR (runs client-side, free)
      → raw text posted to /api/expenses/receipt
      → categorize.js: line-item keyword rules + total-amount regex
      → structured {merchant, amount, category} saved as an expense
```

**Where UDoc plugs in for v2:** swap `categorize.js`'s keyword rules for a
call to your hosted LayoutLMv3/Qwen2-VL cascade (exactly the
DocLLM-Router pattern) — same request/response shape, so the frontend and
DB schema don't change. That's your interview story: "the MVP ships with a
zero-cost rule-based categorizer; the thesis model is a drop-in upgrade for
messier, longer, multi-item receipts."

---

## 4. Data model

Everything lives in one JSON file (`data/db.json`), auto-created on first
run:

```
families   { id, name, joinCode, coinToRupee }
users      { id, familyId, name, role: parent|kid, pin, avatar,
             coins, cashBalance, streak, lastChoreDoneDate }
chores     { id, familyId, title, coinValue, frequency, assignedTo,
             status: open|pending|approved }
goals      { id, userId, title, emoji, targetCoins, savedCoins }
requests   { id, userId, familyId, type: allowance|withdrawal, amount, status }
expenses   { id, userId, familyId, amount, category, merchant, source }
transactions { id, userId, type, amount, note, date }
```

This is intentionally file-based (not SQLite/Postgres) so there's no native
module compilation to fail on Replit's container. **Swap-in path for
production:** replace `db.js`'s `read()`/`write()` with a real Postgres
client (e.g. Supabase, Neon) — every route already calls those two functions
exclusively, so the migration is contained to one file.

---

## 5. Known MVP simplifications (call these out in interviews)

- **Auth** is a join-code + 4-digit PIN, no hashing — fine for a demo, not
  for production. Swap in bcrypt + JWT before any real users touch it.
- **"UPI-linked" spending** is manual entry + receipt scan today, not a real
  UPI/bank feed — that requires an AA (Account Aggregator) or PA-DSA
  partnership, which is a distinct, slower workstream (see monetization
  note below).
- **Insights** are rule-based (week-over-week deltas, category spikes,
  streak thresholds), not an LLM call — deliberately, so the app has zero
  per-request API cost. An LLM insight layer (Claude API) is a clean
  addition: feed it the same `/api/insights` aggregates and ask it to
  narrate them.
- **Concurrency:** the JSON datastore does last-write-wins with no locking —
  fine for a household-sized app, not for scale.

---

## 6. Roadmap toward the monetization plan

- **₹99–199/month family subscription:** gate multi-kid support, receipt
  scanning volume, or advanced insights behind a plan; a `plan` field on
  `families` is the natural extension point.
- **Bank/UPI revenue share:** requires becoming (or partnering with) an
  RBI-regulated Account Aggregator or a PA for the actual money movement —
  out of scope for the app layer, but the schema (`transactions`,
  `expenses`) is already shaped to ingest a real bank feed instead of manual
  entry once that partnership exists.

---

## 7. Suggested next build session

1. Swap PIN auth for hashed passwords + sessions.
2. Add a `plan` + Razorpay/Stripe checkout for the family subscription.
3. Replace `categorize.js` with a real call to your UDoc/DocLLM-Router
   endpoint for receipts with multiple line items.
4. Move `db.json` to Postgres once you have >1 real family testing it.
