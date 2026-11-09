# WATECH-BI — PROMPT 13: BILLING & REVENUE ENGINE READINESS
**Document ID:** `WATECH-P13-BIL-005`  
**Date:** 2026-11-09  
**Status:** SANDBOX VERIFIED — AWAITING OWNER LIVE KEYS  
**Auditor:** Principal Monetization Architect & Financial Security Specialist  

---

## 1. Commercial SaaS Monetization Architecture

The billing infrastructure in WATECH-BI (`src/app/api/billing/`, `src/lib/server/entitlements.ts`) provides a complete subscription lifecycle and usage quota governance engine.

### 1.1 Commercial Plan Matrix & Entitlements

| Plan Tier | Monthly Price | Included Monthly Leads | Team User Seats | Advanced CRM & Auditing | Dedicated Webhooks |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Starter** | $79 / month | 250 verified leads | Up to 2 seats | Basic | Standard |
| **Professional** | $199 / month | 1,000 verified leads | Up to 5 seats | Full Pipeline + Follow-ups | Real-time HMAC |
| **Enterprise** | $499 / month | Unlimited leads | Up to 25 seats | Comprehensive + API Export | Custom Webhooks |

---

## 2. Server-Side Quota & Entitlement Enforcement

Quota enforcement is strictly enforced on the server, not merely hidden in client UI:
- **Lead Consumption Gate:** `src/lib/server/entitlements.ts` queries current tenant usage against the active plan limit before allowing CSV ingestion or pipeline discovery runs.
- **Over-Quota Rejection:** When monthly usage reaches 100%, API endpoints return HTTP 403 Forbidden with payload:
  `{ error: "Plan quota exceeded. Upgrade subscription to process additional leads." }`.
- **Seat Allocation Gate:** User invitation endpoints check tenant member count against allowed user seats before creating new tenant user records.

---

## 3. Stripe Integration Security & Webhook Resilience

### 3.1 Webhook Verification & Anti-Replay Guard
In `src/app/api/billing/webhook/route.ts`:
1. **Timestamp Validation:** Parses `t=timestamp` from `stripe-signature`. If `|current_time - timestamp| > 300` seconds (5 minutes), the webhook is rejected as an expired or replayed request.
2. **Buffer-Safe HMAC-SHA256:**
   ```typescript
   const sigBuf = Buffer.from(signaturePart);
   const expBuf = Buffer.from(expectedSignature);
   if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
     return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
   }
   ```
3. **Idempotent Subscription State Sync:** Events `customer.subscription.created` and `customer.subscription.updated` perform atomic database upserts on `tenantSubscription`, preventing duplicate billing cycles.

---

## 4. Live vs. Sandbox Separation & Owner Action Required

> [!IMPORTANT]
> **Strict Security Gating:** The application code is architected to prevent accidental production transactions using test keys. If `STRIPE_WEBHOOK_SECRET` is unset when `NODE_ENV === 'production'`, the webhook handler strictly refuses to accept incoming requests.

### What the Business Owner Must Provide for Live Monetization:
1. **Stripe Production Account:** Activate a live Stripe merchant account.
2. **Stripe Production API Keys:**
   - `STRIPE_SECRET_KEY`: `rk_live_...` or `sk_live_...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: `pk_live_...`
   - `STRIPE_WEBHOOK_SECRET`: `whsec_...` (Configured to listen to `https://<domain>/api/billing/webhook`).
3. **Stripe Products & Price IDs:** Create recurring price objects for the Starter, Professional, and Enterprise tiers and map them in configuration.

---

## 5. Billing Engine Verdict

**Verdict:** SANDBOX FULLY VERIFIED — READY FOR PRODUCTION KEY INJECTION.  
The billing engine, quota gates, and webhook defenses are fully operational and secure. Live credit card processing will activate as soon as the owner provides live Stripe credentials.
