# WATECH-BI — PROMPT 13: DEPLOYMENT REALITY AUDIT
**Document ID:** `WATECH-P13-DEP-001`  
**Date:** 2026-11-09  
**Status:** COMPLETE & VERIFIED  
**Auditor:** Principal SaaS Architect & Lead DevOps Production Engineer  

---

## 1. Executive Summary & Objective

This audit establishes the empirical reality of the WATECH-BI codebase, hosting architecture, runtime constraints, persistence layers, and deployment prerequisites before commercial release. Every finding is backed by source inspection of `package.json`, `vercel.json`, `.vercel/project.json`, server-side modules, and runtime behavior.

---

## 2. Technical Stack & Deployment Configuration

| Component | Verified Specification | Source File / Evidence | Notes / Constraints |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js 14.2.18 (App Router) | `package.json` | React 18.3.1, TypeScript 5.6.3 |
| **ORM / Data Layer** | Prisma 5.22.0 + Dexie 4.0.1 | `package.json`, `prisma/schema.prisma` | Dual data layer: client-side Dexie + server-side PostgreSQL via Prisma |
| **Active Config** | `vercel.json` | `vercel.json` | Build: `npx prisma generate && next build`, crons: `/api/cron/*` |
| **Linked Project** | `prj_AIE4X3dhtAtOhue6Ar9kjgDrGk24` | `.vercel/project.json` | Org: `team_AXz3KA762ZurWEzuiC7p14nW`, Project: `watech-bi` |
| **Node.js Target** | Node.js 18.x / 20.x | `next.config.mjs` | Standard ESM + CommonJS hybrid support |
| **Server Scripts** | `npm run build`, `npm run start` | `package.json` | Server starts on default port 3000 (`next start -p 3000`) |

---

## 3. Storage & Filesystem Architecture Reality

### 3.1 Local Filesystem Dependencies (`.watech/`)
The application currently persists operational runtime state in `.watech/`:
1. `.watech/integrations/connections.json` (Encrypted integration credentials)
2. `.watech/jobs/jobs.json` (Background job queue, retry metadata, dead-letter state)
3. `.watech/notifications/notifications.json` (System notifications and alerts)
4. `.watech/webhooks/endpoints.json` (Configured outbound webhook subscriptions)
5. `.watech/email/suppression_list.json` (Bounced/complaint email suppression)
6. `.watech/backups/` (Snapshot backups and restore verification metadata)

### 3.2 Ephemeral vs. Persistent Hosting Compatibility Analysis

| Hosting Architecture | Compatibility with `.watech/` Filesystem | Background Queue Behavior | Verdict |
| :--- | :--- | :--- | :--- |
| **Vercel Serverless (Multi-instance Lambda)** | **INCOMPATIBLE for local files** (Local files are ephemeral in `/tmp`, lost on cold start, not shared across lambdas). | Jobs enqueued in Lambda A are invisible to Lambda B; cron triggers must query remote database. | **Restricted / Requires Remote PostgreSQL + S3**. |
| **Persistent Container (Railway, Render, Fly.io, Docker)** | **FULLY COMPATIBLE** (Local volume or container disk persists across requests). | `JobQueue` processes jobs sequentially with atomic file lock; crash recovery and retry loops run as expected. | **RECOMMENDED TARGET (Zero Re-architecture).** |
| **Dedicated VPS / Virtual Machine (Ubuntu / Windows Server)** | **FULLY COMPATIBLE** (Direct disk persistence; systemd/PM2 process management). | Single-instance Node.js process handles API, UI, and background queue seamlessly. | **APPROVED FOR IMMEDIATE PILOT & PRODUCTION.** |

---

## 4. Database Type, Connection Method & Multi-Tenancy

1. **Dual Data Architecture:**
   - **Local / Single-User Mode:** Powered by IndexedDB / Dexie (`src/lib/db/repository.ts`) with client-side reactive state.
   - **Centralized Cloud SaaS Mode:** Powered by PostgreSQL via Prisma (`src/lib/server/db.ts` & `src/lib/server/tenantRepository.ts`).
2. **Serverless Connection Pooling:**
   - On Vercel or multi-instance platforms, `DATABASE_URL` must use a connection pooler (Supabase Pooler port 6543, Neon Pooled, or PgBouncer with `?pgbouncer=true&connection_limit=1`) to prevent connection exhaustion.
3. **Multi-Tenant Query Scoping:**
   - Every multi-tenant entity in `prisma/schema.prisma` includes `tenantId` and is indexed on `[tenantId]`.
   - `src/lib/server/tenantRepository.ts` and API routes strictly enforce `where: { tenantId }` checks extracted from verified JWT tokens.

---

## 5. Background Job Execution Reality

1. **Architecture:** `src/lib/server/jobQueue.ts` implements a priority queue (`critical > high > default > low`), bounded concurrency (`MAX_CONCURRENCY = 3`), exponential backoff (`2s * 2^(attempt - 1)`), crash recovery (`recoverStaleJobs()` after 5-minute timeout), and dead-letter queue.
2. **Deployment Constraints:**
   - In a **persistent Node.js container or VPS**, this engine is 100% self-contained and requires no third-party Redis/RabbitMQ infrastructure.
   - In **Vercel Serverless**, background jobs must be triggered by external cron invocations (`/api/cron/briefing`, `/api/cron/reminders`, `/api/cron/sync`), and persistent jobs must reside in the centralized PostgreSQL database.

---

## 6. Security, Authentication & Session Configuration

1. **Authentication:**
   - PBKDF2 password hashing (100,000 iterations with SHA-512 and 16-byte random salt).
   - HMAC-SHA256 JWT sessions with `tenantId`, `userId`, `role`, and expiration enforcement.
2. **Credential Encryption (Upgraded in Phase 2):**
   - Format: `enc:v2:<salt_hex>:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>`.
   - Unique 16-byte cryptographically secure random salt (`crypto.randomBytes(16)`).
   - Unique 12-byte random IV (`crypto.randomBytes(12)`).
   - Authenticated AES-256-GCM cipher with tag verification.
   - Backward-compatible decryption for legacy `enc:v1:` records.
3. **Rate Limiting:**
   - `src/lib/server/rateLimit.ts` uses sliding window in memory.
   - Valid for single-instance container/server deployments. Multi-instance Vercel edge deployments require Cloudflare or Vercel Edge rate limiting rules.

---

## 7. Billing & Payment Gateway Reality

1. **Provider:** Stripe API integration (`stripe` SDK) with test/sandbox vs. production separation.
2. **Current State:**
   - Server-side plan quotas (Leads: Starter 250, Professional 1,000, Enterprise Unlimited; Users: Starter 2, Professional 5, Enterprise 25).
   - Webhook signature verification implemented with replay defense (`t=timestamp` window < 300s) and buffer-length-safe `crypto.timingSafeEqual`.
3. **Production Readiness:**
   - Live Stripe keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) must be provided by the business owner.
   - Until live keys are supplied, live billing remains securely gated in sandbox mode.

---

## 8. Least-Disruptive Deployment Target Recommendation

Based on the empirical audit of the codebase:
- **Recommended Primary Target:** **Railway, Render, Fly.io, or VPS (Containerized Node.js Service)**.
  - *Why:* Zero architectural changes needed. Preserves the full working job queue, backup engine, rate limiter, and file storage without additional paid external dependencies.
- **Alternative Target:** **Vercel + Supabase/Neon PostgreSQL**.
  - *Why:* Vercel is already linked (`.vercel/project.json`), but requires setting `DATABASE_URL` to a pooled PostgreSQL instance and configuring S3/R2 storage for persistent files.

---

## 9. Conclusion & Audit Sign-Off

The codebase is technically sound and well-structured. The deployment blockers identified (credential salt, SSRF DNS rebinding, rate limit hosting clarity, and billing secret gates) have been resolved.

**Audit Verdict:** PASSED — READY FOR BLOCKER CLOSURE & REVISION RUNBOOKS.
