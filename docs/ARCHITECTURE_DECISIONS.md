# WATECH-BI — ARCHITECTURE DECISIONS REGISTER (ADR)
**Last Updated:** 2026-11-07  
**Status:** Approved & Implemented

---

## ADR-01: Dual-Layer Data Architecture (Local Dexie.js + Cloud PostgreSQL with RLS)
- **Context:** Prompts 01–25 built a rich local-first IndexedDB database using Dexie v16 across 68+ tables. Prompt 26 requires production multi-tenant cloud capability without destroying existing local user data.
- **Decision:** Implement a dual-layer data tier:
  1. Dexie.js v16 remains active on the client agent, providing zero-latency offline-first state and instant responsiveness.
  2. PostgreSQL with Prisma 5.22.0 provides authoritative server-side persistence, connection pooling, and multi-user concurrency.
  3. Row-Level Security (RLS) policies enforce cryptographic cross-tenant boundaries at the database level via transaction settings (`SET LOCAL app.current_tenant_id = $1`).
- **Consequences:** Existing browser data is 100% preserved. SaaS migration can be triggered on demand via `migrateDexieToPostgreSql()`.

---

## ADR-02: Stateless JWT Session Cookie Authentication
- **Context:** Next.js 14 App Router on Vercel Serverless requires secure session management across serverless functions without maintaining stateful in-memory sessions.
- **Decision:** Use signed JWTs stored in `HttpOnly`, `SameSite=Lax`, and `Secure` cookies (`watech_auth_token`) expiring in 7 days.
- **Consequences:** Eliminates database roundtrips for basic session verification, works seamlessly with edge middleware and server components, and resists XSS token theft.

---

## ADR-03: Vercel Serverless & Edge Cron Jobs
- **Context:** Automated reporting, briefings, and reminders cannot rely on an active browser tab.
- **Decision:** Implement bounded serverless cron endpoints (`/api/cron/briefing`, `/api/cron/reminders`, `/api/cron/sync`) scheduled via `vercel.json` and secured with `CRON_SECRET` authorization headers.
- **Consequences:** Zero server maintenance overhead, automated scaling, and strict multi-tenant boundary compliance.

---

## ADR-04: Strict HTTP Security Headers & SSRF Guard
- **Context:** White-label SaaS platforms handle multi-tenant uploads, custom branding, and web scraping.
- **Decision:** Enforce HSTS (1 year), X-Frame-Options (SAMEORIGIN), X-Content-Type-Options (nosniff), Referrer-Policy, and Permissions-Policy in `next.config.mjs`. Implement `isSafeTargetUrl` to block RFC1918 private IPs and cloud metadata IP ranges (`169.254.169.254`).
- **Consequences:** Defense against clickjacking, MIME-sniffing attacks, and server-side request forgery.