# WATECH-BI — PROMPT 13: OWNER ACTION CHECKLIST
**Document ID:** `WATECH-P13-ACT-009`  
**Date:** 2026-11-09  
**Target:** Business Owner & Release Executive  

---

## 1. Overview

This checklist outlines the exact actions the business owner must execute to move WATECH-BI from **Restricted Pilot** to **Full Public Production**. The engineering team has resolved all code-level blockers, hardened the cryptographic and security layer, and verified the complete 18-area regression suite.

---

## 2. Owner Action Items Checklist

### Phase 1: Infrastructure & Database Setup
- [ ] **1. Provision Production PostgreSQL Database**
  - Create a managed PostgreSQL 14+ instance on [Supabase](https://supabase.com), [Neon](https://neon.tech), or [AWS RDS](https://aws.amazon.com/rds/).
  - Obtain the connection string (with connection pooler enabled).
  - Note: If using serverless, append `?pgbouncer=true&connection_limit=1`.
- [ ] **2. Select Hosting Deployment Target**
  - **Option A (Recommended - Containerized Service):** Deploy to [Railway](https://railway.app), [Render](https://render.com), or [Fly.io](https://fly.io) using standard Node.js server (`npm run start -- -p 3000`). Preserves built-in queue and file snapshots without extra dependencies.
  - **Option B (Serverless):** Deploy to [Vercel](https://vercel.com) using existing `vercel.json` and `.vercel/project.json`.

---

### Phase 2: Cryptographic Secrets Generation
Run the following commands on a secure terminal to generate production secrets:
```bash
# Generate JWT Secret
openssl rand -hex 32

# Generate Credential Encryption Secret
openssl rand -hex 32

# Generate Storage Signing Secret
openssl rand -hex 32

# Generate Cron Secret
openssl rand -hex 16
```
- [ ] **3. Record Generated Secrets in Production Environment Variables:**
  - `JWT_SECRET`
  - `ENCRYPTION_SECRET`
  - `STORAGE_SIGNING_SECRET`
  - `CRON_SECRET`

---

### Phase 3: Stripe Merchant Account & Live Billing
- [ ] **4. Activate Stripe Merchant Account**
  - Complete business verification on [stripe.com](https://stripe.com).
- [ ] **5. Obtain Live Stripe API Keys**
  - Copy `STRIPE_SECRET_KEY` (`sk_live_...`)
  - Copy `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_live_...`)
- [ ] **6. Configure Stripe Webhook Endpoint**
  - Navigate to **Stripe Dashboard > Developers > Webhooks**.
  - Add endpoint: `https://app.watech.agency/api/billing/webhook`.
  - Subscribe to events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`.
  - Copy the signing secret into `STRIPE_WEBHOOK_SECRET` (`whsec_...`).

---

### Phase 4: Transactional Email & Domain
- [ ] **7. Verify Sending Domain on Resend or Mailgun**
  - Add DNS TXT and MX records for `watech.agency`.
  - Obtain `RESEND_API_KEY` (`re_live_...`).
  - Set `EMAIL_FROM="Watech Intelligence" <support@watech.agency>`.
- [ ] **8. Configure Custom Domain DNS**
  - Point `app.watech.agency` CNAME record to the chosen deployment platform.
  - Enable SSL / TLS enforcement.

---

### Phase 5: Production Launch Commands
Once the environment variables are configured in your hosting platform, execute:

```bash
# 1. Run database schema migration
npx prisma migrate deploy

# 2. Build the production release
npm run build

# 3. Start the production instance
npm run start -- -p 3000
```

---

## 3. Post-Launch Health Verification
Verify deployment success:
```bash
# Test public health probe
curl -I https://app.watech.agency/api/health
# Expected: HTTP/1.1 200 OK
```

Congratulations! Once these checklist items are completed, WATECH-BI is fully live and collecting revenue.
