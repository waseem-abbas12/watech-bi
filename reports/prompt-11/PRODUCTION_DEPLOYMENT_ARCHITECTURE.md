# WATECH-BI — PROMPT 11: PRODUCTION DEPLOYMENT ARCHITECTURE
**Project:** `E:\watech-bi`  
**Auditor:** Principal Cloud Architect  

---

## 1. TARGET PRODUCTION INFRASTRUCTURE STACK

```
               +--------------------------------------------+
               |        GLOBAL CLOUDFLARE EDGE / CDN        |
               |  - TLS 1.3 Termination (Zero-Trust WAF)    |
               |  - DDoS Mitigation & Rate Limiting         |
               |  - Edge Caching for Static Next.js Bundles |
               +--------------------------------------------+
                                     |
                                     v
               +--------------------------------------------+
               |      VERCEL / NODE.JS PRODUCTION SERVER    |
               |  - Next.js 14 App Router (SSR + Static)    |
               |  - API Gateway (/api/...)                  |
               |  - Background Queue Worker Ticks           |
               +--------------------------------------------+
                    |                      |            |
                    |                      |            v
                    v                      v      +-------------------+
        +-----------------------+ +-------------+ |  INTEGRATION VAULT|
        | SUPABASE / NEON POSTGRES| | S3 STORAGE  | | - Resend / SMTP   |
        | - PgBouncer Connection| | - Audits    | | - Twilio SendGrid |
        |   Pooling (Max: 100)  | | - Invoices  | | - Webhook Outbox  |
        | - Row-Level Security  | | - CSV Files | +-------------------+
        | - Daily Automated PITR| +-------------+
        +-----------------------+
```

---

## 2. COMPONENT SELECTION RATIONALE

1. **Application Runtime (Next.js 14 on Vercel / Docker Container):**
   - High performance, automatic static optimization, instant rollbacks, zero cold-boot overhead for edge assets.
2. **Database (Managed PostgreSQL with PgBouncer):**
   - Full ACID transaction compliance, Prisma schema compatibility, built-in connection pooling for serverless environments.
3. **Queue Infrastructure (Durably Persisted Worker Queue):**
   - Bounded concurrency (`MAX_CONCURRENCY = 3`), exponential backoff retries, and dead-letter queue.
4. **Disaster Recovery Strategy:**
   - Dual-tier recovery: Daily PostgreSQL snapshots combined with cryptographic atomic snapshot backups (`BackupService`).
