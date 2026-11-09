# ARCHITECTURE DECISION RECORD (ADR)
**Project:** Watech-BI Enterprise Multi-Tenant SaaS  
**Report Directory:** `E:\watech-bi\reports\prompt-06\`  
**Date:** November 9, 2026  
**Status:** Approved & Implemented

---

## ADR 001: Centralized Relational Database — PostgreSQL + Prisma ORM

### Context
Watech-BI originally stored lead intelligence, technical audits, contacts, and CRM records inside Dexie (client-side IndexedDB). While fast for single-user prototyping, IndexedDB cannot support multi-user collaboration, server-side cron triggers, shared pipelines, or commercial multi-tenant SaaS licensing.

### Decision
Adopt **PostgreSQL** accessed via **Prisma ORM** as the authoritative central database for all organizational, operational, and customer records.

### Trade-offs & Alternatives Considered
1. **MongoDB / Document Store:**
   - *Pros:* Flexible schemaless JSON storage.
   - *Cons:* Weak relational integrity across 10+ pipeline entities; difficult cascading foreign key deletes; lack of robust ACID multi-table guarantees needed for financial proposals and lead deduplication.
2. **PostgreSQL + Prisma (Chosen):**
   - *Pros:* Strict relational foreign keys with `onDelete: Cascade` eliminate orphan records; transactional ACID guarantees across batch pipeline writes; native support for JSON columns when schemas vary; widespread hosting options (AWS RDS, Supabase, Neon, Railway).
   - *Cons:* Schema migrations required when entity models change.

---

## ADR 002: Authentication & Session Strategy — JWT + HttpOnly Cookies + Bearer Fallback

### Context
The platform requires secure authentication that works seamlessly with both Next.js App Router Server Components / API Route Handlers and client-side single-page applications, while preventing XSS token theft.

### Decision
Use **stateless JSON Web Tokens (JWT)** signed via HMAC-SHA256 (`jsonwebtoken`) and store them in **HttpOnly, Secure, SameSite=Lax cookies** (`watech_auth_token`), with secondary support for `Authorization: Bearer <token>` in API calls. Passwords hashed using `bcryptjs` with salt rounds = 10.

### Trade-offs & Alternatives Considered
1. **Database Session Table (Stateful):**
   - *Pros:* Instant revocation of individual sessions.
   - *Cons:* Database roundtrip on every single server request and static asset fetch, increasing database connection pressure on serverless platforms.
2. **Stateless JWT with HttpOnly Cookie (Chosen):**
   - *Pros:* High throughput; zero database queries for authentication validation; complete protection against JavaScript XSS token extraction; works effortlessly in edge middleware.
   - *Cons:* Revocation requires token expiration or maintaining a small revocation denylist.

---

## ADR 003: Multi-Tenancy Model — Organization-Scoped Tenant Partitioning

### Context
Commercial SaaS licensing requires serving multiple independent companies (agencies, consultants, enterprise clients) on a single infrastructure footprint while guaranteeing that one customer can never view, mutate, or leak another customer's leads, projects, or CRM data.

### Decision
Implement **Logical Organization-Based Tenancy** where every customer entity is tagged with an immutable `tenantId` foreign key referencing the `Tenant` table. All database queries execute through a server-side repository (`ServerTenantRepository`) enforcing `where: { tenantId }`. Untrusted client-supplied tenant IDs are rejected.

### Trade-offs & Alternatives Considered
1. **Database-per-Tenant:**
   - *Pros:* Physical data isolation; individual backups per client.
   - *Cons:* High infrastructure overhead; migration orchestration becomes complex for dozens of databases; costly for small agency tiers.
2. **Schema-per-Tenant (PostgreSQL Schemas):**
   - *Pros:* Strong schema isolation within single DB.
   - *Cons:* Prisma migration tooling has limited support for dynamic multi-schema environments; connection pooling overhead.
3. **Shared Database, Shared Schema with Tenant ID (Chosen):**
   - *Pros:* Standardized Prisma models; fast global migrations; cost-effective; highest query performance; easily backed up.
   - *Cons:* Requires rigorous enforcement in data access layer and automated cross-tenant security tests.

---

## ADR 004: Concurrency & Lock Coordination — Database-Backed Distributed Locks

### Context
In Prompt 05, an in-memory process mutex (`acquirePipelineLock` / `releasePipelineLock`) was implemented. While effective within a single Node.js process, in a modern multi-tenant deployment running across multiple serverless functions (e.g. Vercel / AWS Lambda), an in-memory map cannot prevent two requests hitting separate lambdas from executing duplicate runs on the same project concurrently.

### Decision
Implement a **Database-Backed Distributed Lock** table (`PipelineLock`) with atomic reservation semantics (`tenantId`, `projectId`, `lockedBy`, `lockedAt`, `expiresAt`) and automatic TTL expiration.

### Trade-offs & Alternatives Considered
1. **Redis / Redlock:**
   - *Pros:* Extremely fast in-memory locking.
   - *Cons:* Requires provisioning, paying for, and maintaining a separate Redis cluster.
2. **Database-Backed Lock Table (Chosen):**
   - *Pros:* Zero additional infrastructure; leverages existing PostgreSQL ACID transaction primitives; atomic upsert with timestamp comparisons guarantees cross-server safety.
   - *Cons:* Slight database transaction overhead when acquiring and releasing locks (negligible for pipeline jobs).

---

## ADR 005: Dexie IndexedDB Role — Transition to Client Read Cache & Offline Mirror

### Context
Extensive UI components currently read from Dexie. Completely rewriting every UI component to fetch from REST endpoints in a single refactor would risk UI regression and downtime.

### Decision
Retain **Dexie IndexedDB** strictly as a client-side performance cache and offline mirror. The server-side centralized PostgreSQL database becomes the single source of truth. When the client loads, it hydrates Dexie from the server; when mutations occur, they are executed on the server first and synced down.

### Trade-offs & Alternatives Considered
1. **Immediate Total Deprecation of Dexie:**
   - *Pros:* Single data path.
   - *Cons:* High risk of breaking working UI components; breaks offline viewing capability.
2. **Dual-Role Mirroring (Chosen):**
   - *Pros:* 100% backward compatibility for all existing UI widgets; instant offline access; central cloud persistence for team collaboration.
   - *Cons:* Cache invalidation logic required.
