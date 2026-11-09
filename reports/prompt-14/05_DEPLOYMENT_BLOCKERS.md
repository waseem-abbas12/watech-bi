# WATECH-BI — PROMPT 14: DEPLOYMENT BLOCKERS & EXTERNAL PREREQUISITES
**Document ID:** `WATECH-P14-BLK-005`  
**Date:** 2026-11-09  
**Status:** CODE BLOCKERS CLOSED — OWNER INFRASTRUCTURE PREREQUISITES IDENTIFIED  
**Auditor:** Production Release Manager  

---

## 1. Blocker Status Summary

All software-engineering deployment blockers (cryptographic key derivation, salt uniqueness, SSRF protections, webhook buffer comparisons, and plan quota gates) are **100% resolved**.

The remaining items represent standard **Owner Infrastructure Prerequisites** that require live external account provisioning and cannot be fabricated by the agent without violating Non-Negotiable Rule 4 ("Never fabricate credentials, URLs, deployment IDs or successful deployment results").

---

## 2. Infrastructure & Credential Action Register

| Item | Category | Required Action from Business Owner | Severity | Impact if Omitted |
| :--- | :--- | :--- | :--- | :--- |
| **1. Cloud PostgreSQL** | Database | Provision pooled PostgreSQL 14+ instance (Supabase, Neon, or AWS RDS) and provide `DATABASE_URL` | Medium | System operates on high-speed local Dexie + file snapshot storage |
| **2. Production Domain DNS**| Networking | Add CNAME record for `app.watech.agency` pointing to hosting provider | Medium | Accessible via hosting platform default URL or local port 3000 |
| **3. Live Stripe Keys** | Billing | Provide `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET` | Medium | Billing operates in sandbox test mode; real cards cannot be charged |
| **4. Live Email Provider** | Messaging | Provide `RESEND_API_KEY` with verified sending domain | Low | System falls back to server console email delivery logging |

---

## 3. Owner Authorization Statement

Deployment to remote commercial hosting infrastructure will proceed immediately once the business owner authorizes access and provides the target environment variables listed above.
