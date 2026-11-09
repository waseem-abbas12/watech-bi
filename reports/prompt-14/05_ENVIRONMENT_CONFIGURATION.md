# WATECH-BI — PROMPT 14: ENVIRONMENT CONFIGURATION GUIDE
**Document ID:** `WATECH-P14-CFG-005`  
**Date:** 2026-11-09  
**Status:** PRODUCTION ENVIRONMENT DIRECTORY  
**Auditor:** DevOps Security Engineer  

---

## 1. Vercel Environment Variables Configuration

To configure production secrets on Vercel without committing them into Git:
1. Navigate to: [https://vercel.com/asad1218/watech-bi/settings/environment-variables](https://vercel.com/asad1218/watech-bi/settings/environment-variables)
2. Add the following variables:

| Variable Name | Recommended Production Value / Generation | Environment Scope | Mandatory / Optional |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | `https://watech-bi.vercel.app` (or custom domain) | Production, Preview | **Mandatory** |
| `JWT_SECRET` | `openssl rand -hex 32` | Production, Preview | **Mandatory** |
| `ENCRYPTION_SECRET` | `openssl rand -hex 32` | Production, Preview | **Mandatory** |
| `STORAGE_SIGNING_SECRET`| `openssl rand -hex 32` | Production, Preview | **Mandatory** |
| `CRON_SECRET` | `openssl rand -hex 16` | Production | **Mandatory for Crons** |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/watech_bi?pgbouncer=true` | Production, Preview | **Required for Cloud DB** |
| `STRIPE_SECRET_KEY` | `sk_live_...` (from Stripe Dashboard) | Production | Required for Live Billing |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (from Stripe Webhooks) | Production | Required for Webhook Sync |
| `RESEND_API_KEY` | `re_live_...` (from Resend.com) | Production | Optional (Email simulator active) |

---

## 2. Setting Variables via Vercel CLI (Optional Alternative)

```bash
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add JWT_SECRET production
vercel env add ENCRYPTION_SECRET production
vercel env add DATABASE_URL production
vercel env add CRON_SECRET production
```
*(CLI will prompt for the secret value securely without echoing to terminal).*
