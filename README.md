

# ClientFlow Pay

A full-stack client package checkout, Stripe payment processing, GoHighLevel (GHL) CRM sync, and admin order portal built with **Next.js**, **Prisma**, and **PostgreSQL**.

---

## Core Features

- **Package Checkout (`/checkout`):** Dynamic service package selection with client intake and hosted Stripe Checkout sessions.
- **Stripe Webhook Engine (`/api/webhooks/stripe`):** Verifies cryptographic Stripe webhook signatures, updates payment and order statuses in PostgreSQL, and records raw event audit logs.
- **Automated GoHighLevel (GHL) CRM Sync:** Automatically creates or updates client contacts in GHL after verified payment and triggers post-purchase onboarding workflows.
- **Admin Order & Webhook Portal (`/admin`):** Protected operations dashboard to inspect orders, payment states, GHL sync statuses, and incoming webhook logs.
- **Edge-Verified Session Security:** Stateless HMAC-SHA256 `HttpOnly` session cookies (`cfp_admin_session`) validated in Edge middleware via Web Crypto without Node-only dependencies.

---

## Architecture Decisions & Why Each Technology Was Chosen

### 1. Why Next.js (App Router + TypeScript) Instead of a Separate React Frontend & Express Backend?
- **Unified Full-Stack Architecture:** Next.js handles the public checkout UI, protected admin dashboard, and server-side API endpoints (`/api/checkout`, `/api/webhooks/stripe`, `/api/auth/*`) in a single repository and deployment pipeline.
- **Edge + Node.js Execution Split:** Lightweight authentication checks run at the Edge (`middleware.ts` + Web Crypto) before pages load, while database writes and Stripe SDK operations run securely in Node.js server routes.
- **End-to-End Type Safety:** TypeScript catches payload mismatches across frontend forms, API routes, Stripe webhooks, and database queries before deployment.

### 2. Why PostgreSQL Instead of MongoDB or NoSQL?
- **ACID Transactions & Financial Integrity:** Payment systems cannot afford partial writes or inconsistent states. PostgreSQL guarantees ACID compliance so order records, payment confirmations, and webhook logs stay strictly consistent.
- **Relational Data Modeling:** Orders, service packages, payment statuses, and webhook audit events are naturally relational—foreign keys and structured constraints prevent orphaned or duplicate financial records.
- **Idempotency & Concurrency:** Unique constraints on Stripe session/event IDs ensure duplicate webhook retries never double-process an order or trigger duplicate CRM workflows.

### 3. Why Prisma ORM Instead of Raw SQL or Mongoose?
- **Auto-Generated TypeScript Types:** Prisma generates exact types directly from `schema.prisma`, eliminating runtime query typos when handling order statuses (`PENDING`, `PAID`, `FAILED`) and sync states.
- **Safe Schema Migrations:** Database structure changes are version-controlled and reproducible across local development and production PostgreSQL (Neon) instances.
- **Clean, Readable Queries:** Complex relational reads and transactional updates remain concise, auditable, and resistant to SQL injection by default.

### 4. Why Stripe Checkout & Webhooks Instead of Custom Card Forms or Client-Side Confirmation?
- **PCI Compliance & Trust:** Using Stripe Checkout offloads sensitive card handling and global payment security to Stripe, increasing client conversion without building custom PCI infrastructure.
- **Webhook-Driven Source of Truth:** Browser redirects can fail if a client closes their tab early. Relying on cryptographically signed Stripe webhooks (`/api/webhooks/stripe`) guarantees orders are marked `PAID` and synced to the CRM only after verified payment settlement.

### 5. Why GoHighLevel (GHL) Instead of HubSpot, Salesforce, or Manual Spreadsheets?
- **Built for Agencies & Service Businesses:** GHL combines CRM pipelines, SMS/email follow-up sequences, calendar booking, and client onboarding workflows in one platform—matching how service agencies actually operate.
- **Instant Post-Payment Fulfillment:** Instead of forcing agencies to manually copy Stripe customer details into their CRM, ClientFlow Pay syncs contact data and triggers onboarding automations the second payment clears.
- **Decoupled Fault Tolerance:** Separating GHL sync tracking from payment capture ensures that even if an external CRM API experiences a temporary delay, the paid order and webhook audit log are already safely stored in PostgreSQL and visible in `/admin`.

### 6. Why Custom HMAC-SHA256 Edge Auth Instead of Heavy Third-Party Auth Providers?
- **Zero External Auth Latency:** For a dedicated single-tenant admin portal, signing `HttpOnly`, `SameSite=Lax` cookies with HMAC-SHA256 removes third-party auth dependencies and extra database lookups on every route transition.
- **Edge Runtime Compatibility:** Splitting verification into `lib/auth-edge.ts` using standard Web Crypto allows Next.js middleware to block unauthenticated requests to `/admin/*` immediately at the network edge.


### 7. Why OpenAI (`gpt-4o-mini`) with Deterministic Fallback for Onboarding?
- **Personalized Post-Purchase Experience:** Automatically transforms raw checkout intake (`businessName`, `businessGoal`, selected package, and add-ons) into a tailored 3-step `clientPlan` and an actionable `internalSteps` delivery checklist.
- **Zero-Downtime Resilience:** If the OpenAI API key is missing or an external API call fails, `generateOnboardingPlan` seamlessly falls back to structured templates so payment confirmation and CRM sync never break.

---

## Tech Stack

- **Framework:** Next.js (App Router), React, TypeScript, Tailwind CSS
- **Database & ORM:** PostgreSQL (Neon), Prisma ORM
- **Payments:** Stripe Checkout & Webhooks
- **CRM & Automation:** GoHighLevel Private Integration API
- **AI Onboarding:** OpenAI-compatible API integration
- **Deployment:** Vercel

---

## Project Structure

```text
├── app/
│   ├── admin/               # Protected admin dashboard & login UI
│   ├── api/
│   │   ├── auth/            # Login, logout, and session endpoints
│   │   ├── checkout/        # Stripe Checkout session creation
│   │   ├── health/          # Service health check endpoint
│   │   ├── orders/          # Admin order management endpoints
│   │   ├── packages/        # Service package endpoints
│   │   └── webhooks/stripe/ # Stripe webhook signature verification & handler
│   └── checkout/            # Public client package checkout page
├── lib/
│   ├── auth.ts              # Node.js server-side HMAC session signing & cookies
│   ├── auth-edge.ts         # Edge-compatible Web Crypto session verifier
│   ├── ghl-sync.ts          # GoHighLevel contact creation & workflow sync
│   ├── openai-onboarding.ts # AI-assisted client onboarding helper
│   ├── prisma.ts            # Prisma Client singleton
│   ├── seed-packages.ts     # Initial package seeding logic
│   └── stripe.ts            # Stripe SDK configuration
├── prisma/                  # Prisma schema & database migrations
└── middleware.ts            # Edge route guard for /admin/*