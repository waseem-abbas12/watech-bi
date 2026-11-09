# WATECH-BI — PROMPT 13: PRODUCTION DEPLOYMENT GUIDE
**Document ID:** `WATECH-P13-CFG-006`  
**Date:** 2026-11-09  
**Status:** PRODUCTION LAUNCH RUNBOOK COMPLETE  
**Auditor:** Principal DevOps Engineer & Release Automation Architect  

---

## 1. Overview & Deployment Philosophy

This guide defines the turnkey deployment runbook for transitioning WATECH-BI into live production. It supports two production deployment patterns:
1. **Target A (Recommended): Containerized Node.js Service (Railway, Render, Fly.io, or VPS)** — Preserves the complete background worker, file-based snapshot backups, and local caching with zero architectural changes.
2. **Target B: Vercel Serverless + Supabase / Neon PostgreSQL** — Serverless edge hosting utilizing remote pooled database connections and Vercel crons.

---

## 2. Environment Variable Configuration Template

Create `.env.production` (or inject into your deployment platform's secret manager):

```ini
# ==============================================================================
# WATECH-BI PRODUCTION ENVIRONMENT CONFIGURATION
# ==============================================================================

# Core Application URL
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.watech.agency
PORT=3000

# Security & Cryptographic Secrets (MUST BE GENERATED VIA: openssl rand -hex 32)
JWT_SECRET=replace_with_64_char_hex_secret_min_32_bytes
ENCRYPTION_SECRET=replace_with_64_char_hex_secret_min_32_bytes
STORAGE_SIGNING_SECRET=replace_with_64_char_hex_secret_min_32_bytes
CRON_SECRET=replace_with_32_char_random_hex_secret

# Database Configuration (PostgreSQL 14+)
# For Serverless/Vercel: Append ?pgbouncer=true&connection_limit=1
DATABASE_URL=postgresql://watech_prod_user:YourSecureDbPassword@db.watech.agency:5432/watech_bi?schema=public

# Billing & Stripe (Provided by Owner)
STRIPE_SECRET_KEY=sk_live_replace_with_actual_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_replace_with_actual_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_replace_with_stripe_endpoint_secret

# Transactional Email & Messaging (Resend or Mailgun)
RESEND_API_KEY=re_live_replace_with_resend_api_key
EMAIL_FROM="Watech Intelligence" <support@watech.agency>

# AI Engine API Keys (Optional - Rule-based engines execute if omitted)
OPENAI_API_KEY=sk-proj-optional_openai_key
ANTHROPIC_API_KEY=sk-ant-optional_claude_key
```

---

## 3. Deployment Runbook & Commands

### 3.1 Step 1: Pre-Deployment Build Verification
```bash
# Verify TypeScript compile check
npx tsc --noEmit

# Run production build
npm run build
```

### 3.2 Step 2: Database Migration
```bash
# Apply Prisma schema migrations to production PostgreSQL
npx prisma migrate deploy

# Verify generation of client types
npx prisma generate
```

### 3.3 Step 3: Service Startup
- **Direct Node.js Server:**
  ```bash
  npm run start -- -p 3000
  ```
- **PM2 Process Manager (for VPS / VM):**
  ```bash
  pm2 start npm --name "watech-bi" -- run start -- -p 3000
  pm2 save
  ```
- **Docker Container:**
  ```bash
  docker build -t watech-bi:1.0.0 .
  docker run -d -p 3000:3000 --env-file .env.production --name watech-bi-prod watech-bi:1.0.0
  ```

---

## 4. Health Check & Post-Deployment Verification

Execute post-deployment verification immediately following service launch:

```bash
# 1. Inspect HTTP Health Probe
curl -f -I https://app.watech.agency/api/health
# Expected: HTTP/1.1 200 OK

# 2. Inspect Environment & Cryptography Validator
curl -s -H "Authorization: Bearer <CRON_SECRET>" https://app.watech.agency/api/admin/health-check | jq .
# Expected: { "status": "healthy", "environmentValid": true }

# 3. Test Background Cron Heartbeat
curl -s -X POST -H "Authorization: Bearer <CRON_SECRET>" https://app.watech.agency/api/cron/briefing
# Expected: HTTP 200 OK
```

---

## 5. Domain, DNS & SSL Configuration Checklist

1. **DNS A / CNAME Records:**
   - Host `app` pointing to server IP or CNAME to hosting provider (e.g., `cname.vercel-dns.com` or `railway.app`).
2. **TLS / SSL Certificate:**
   - Enforce HTTP to HTTPS redirection (automatic on Cloudflare, Vercel, and modern reverse proxies).
   - Verify HSTS headers: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
3. **CORS & Framing Protections:**
   - Ensure `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff` headers are delivered on all responses.

---

## 6. Rollback Runbook

If catastrophic errors occur during a production release:
1. **Revert Application Binary / Container:**
   - On container platforms: Redeploy previous stable tag (`watech-bi:previous-tag`).
   - On Vercel: Click "Promote to Production" on the previous deployment in the Vercel dashboard.
2. **Restore Database if Schema Was Corrupted:**
   ```bash
   pg_restore --clean --if-exists -d $DATABASE_URL pre_migration_backup.dump
   ```
3. **Notify Operations & Log RCA:** Record incidents in the deployment log.
