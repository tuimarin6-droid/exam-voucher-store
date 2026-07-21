# EduPass GH \u2014 Exam Voucher Store

A secure, automated Next.js web application for selling digital examination
vouchers (WASSCE, Private WASSCE, BECE) and handling university admission form
inquiries. Payments are processed and **verified server-side** with Paystack;
voucher codes are dispensed atomically and emailed automatically; university
forms route buyers to a pre-filled WhatsApp message.

---

## 1. Tech stack

| Concern            | Choice                                             |
| ------------------ | -------------------------------------------------- |
| Framework          | Next.js 14 (App Router) + TypeScript               |
| UI                 | Tailwind CSS, custom design system, inline SVG icons |
| Database / ORM     | Prisma + SQLite (swap to Postgres/MySQL for prod)  |
| Payments           | Paystack (initialize + verify + webhook)           |
| Email              | SendGrid                                           |
| Fulfilment (forms) | WhatsApp deep link (wa.me)                          |

> **On the design:** The UI applies the design intelligence from the
> **UI UX Pro Max** skill repo you shared (trust-forward pattern: hero + social
> proof + trust badges, Soft-UI/minimalist style, education/fintech palette, no
> AI purple gradients, SVG icons, 44px tap targets, WCAG-AA contrast, responsive
> at 375/768/1024/1440px).
>
> **On "MCP tools":** the backend logic is implemented directly in the codebase
> (`src/lib/*` + API routes) rather than through an external MCP server, so it
> runs anywhere with no extra services to install.

---

## 2. Project structure

```
exam-voucher-store/
├─ prisma/
│  ├─ schema.prisma          # Voucher + Order models, enums
│  └─ seed.ts                # optional: load sample codes
├─ data/
│  └─ sample-vouchers.csv    # example bulk-upload file
├─ scripts/
│  ├─ upload-vouchers.ts     # MANUAL bulk upload of codes (CSV/TXT)
│  └─ stock-report.ts        # CLI stock levels per type
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx          # fonts + globals
│  │  ├─ page.tsx            # storefront (product display)
│  │  ├─ checkout/page.tsx   # checkout page
│  │  ├─ success/page.tsx    # post-payment: voucher reveal OR WhatsApp button
│  │  ├─ globals.css
│  │  └─ api/
│  │     ├─ paystack/initialize/route.ts  # create order + hosted checkout URL
│  │     ├─ paystack/verify/route.ts      # redirect verify (idempotent)
│  │     ├─ paystack/webhook/route.ts     # signed webhook (primary fulfilment)
│  │     ├─ stock/route.ts                # admin-only stock JSON
│  │     └─ admin/overview/route.ts       # admin-only KPIs + stock + recent orders
│  │  └─ admin/page.tsx      # admin dashboard (token-gated)
│  ├─ components/            # Navbar, Footer, ProductCard, icons
│  └─ lib/
│     ├─ products.ts         # catalog (prices in pesewas) \u2014 SOURCE OF TRUTH
│     ├─ paystack.ts         # initialize, verify, HMAC signature check
│     ├─ inventory.ts        # atomic dispense + stock queries
│     ├─ fulfilment.ts       # shared idempotent fulfilment routine
│     ├─ email.ts            # SendGrid voucher email
│     ├─ whatsapp.ts         # wa.me deep link builder
│     └─ db.ts               # Prisma client singleton
├─ preview/index.html        # static design preview (for quick visual review)
├─ .env.example
└─ package.json
```

---

## 3. Getting started

```bash
npm install
cp .env.example .env          # then fill in real keys
npx prisma migrate dev --name init
npx tsx prisma/seed.ts        # optional: load sample codes
npm run dev                   # http://localhost:3000
```

---

## 4. The "manual upload, automatic dispensing" system

**Manual upload (you):** drop a CSV/TXT of codes and import them.

```bash
# one type for the whole file
npm run vouchers:upload -- --type WASSCE --file ./data/wassce-batch.csv
# or a per-row "type" column (see data/sample-vouchers.csv)
npm run vouchers:upload -- --file ./data/mixed-batch.csv
```

Re-running is safe \u2014 `code` is unique and duplicates are skipped.

**Automatic dispensing (system):** after a verified payment,
`inventory.dispenseVoucher()` claims exactly one `AVAILABLE` code using a
conditional `UPDATE ... WHERE status = 'AVAILABLE'`. This is:

- **Race-safe** \u2014 two concurrent buyers can never get the same code.
- **Idempotent** \u2014 replays for the same Paystack reference return the same code.
- **No over-selling** \u2014 empty stock raises `OutOfStockError` and the order is
  flagged `OUT_OF_STOCK` instead of charging silently.

Check levels anytime: `npm run vouchers:stock`.

---

## 5. Payment + security flow

1. **Checkout** \u2192 `POST /api/paystack/initialize` creates a `PENDING` order using
   the **server-side price** (never trusts the client) and returns Paystack's
   hosted checkout URL.
2. Buyer pays on Paystack and is redirected to `/success?reference=...`.
3. **Two independent fulfilment triggers**, both calling the same idempotent
   `fulfilByReference()`:
   - **Webhook** (`/api/paystack/webhook`) \u2014 primary. Verifies the
     `x-paystack-signature` HMAC-SHA512 over the raw body, then re-verifies the
     transaction via the Paystack API before releasing anything.
   - **Redirect verify** (`/api/paystack/verify`) \u2014 gives the buyer instant
     on-screen feedback.
4. Fulfilment re-verifies **status = success** and that the **amount + currency
   match** the order (anti-tampering) before dispensing.
5. **Voucher** \u2192 dispense + email + show on screen. **Form** \u2192 mark paid + show
   pre-filled WhatsApp button.

### Configure the Paystack webhook
Dashboard \u2192 Settings \u2192 API Keys & Webhooks \u2192 set the webhook URL to:
```
https://YOUR_DOMAIN/api/paystack/webhook
```

---

## 6. Admin dashboard

Visit `/admin` and sign in with your `ADMIN_API_TOKEN`. You get:

- **KPIs:** fulfilled revenue, fulfilled/pending counts, failed/out-of-stock, total codes in stock.
- **Voucher stock** per type, with a **Low** badge when ≤ 5 remain.
- **Recent orders** table (date, product, email, amount, status, dispensed code).
- **Revenue chart** (dependency-free SVG bar chart of fulfilled revenue) with a
  **Daily / Weekly** toggle, respecting the date + product filters.
- **Filters:** date range (From / To), **product**, and **status** — all applied
  consistently to the orders table, its count, and the CSV export.
- **Export CSV** of the orders in the current range — RFC-4180 quoted, UTF-8 with
  BOM so Excel renders GH₵ and accents correctly. Served by
  `GET /api/admin/export?from=&to=&product=&status=` (admin only).

- **Export summary** — a revenue-summary CSV with three sections: revenue by
  product, orders by status, and revenue by day/week. Served by
  `GET /api/admin/summary?from=&to=&product=&status=&bucket=` (admin only).

Filter logic is centralised in `src/lib/adminFilters.ts` (including day/week
bucketing) so the table, chart, and both CSV exports stay perfectly in sync.

The token is sent as a Bearer header and cached in the browser session only.

## 7. Switching to PostgreSQL (production)

SQLite is the zero-config default. For production, use Postgres:

1. Copy `prisma/schema.postgres.prisma` over `prisma/schema.prisma`.
2. Set `DATABASE_URL` to your Postgres URL, e.g.
   `postgresql://user:pass@host:5432/edupass?schema=public`.
3. Run `npx prisma migrate dev --name init`.

All application logic (atomic dispensing, idempotency, webhooks) is unchanged.

## 8. Going to production

- Switch Prisma `provider` to `postgresql` and set `DATABASE_URL`.
- Set all `.env` values (use **live** Paystack keys).
- Verify a SendGrid sender/domain for `MAIL_FROM_EMAIL`.
- Set `NEXT_PUBLIC_WHATSAPP_NUMBER` (international format, no `+`).
- Deploy (Vercel, Render, a VPS, etc.) and register the webhook URL.

## 9. Security notes

- Secret keys are server-only; the browser only sees the public Paystack key.
- Money is **only** released after a server-side verify \u2014 the redirect alone is
  never trusted.
- Webhook signature is checked with a timing-safe comparison.
- Prices come from the server catalog, so a tampered client cannot underpay.
- The admin stock endpoint requires a bearer token (`ADMIN_API_TOKEN`).
