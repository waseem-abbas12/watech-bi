# WATECH-BI — PROMPT 15: BILLING & MONETIZATION VALIDATION
**Document ID:** `WATECH-P15-BIL-007`  
**Date:** 2026-11-09  
**Status:** SANDBOX VERIFIED — LIVE PAYMENTS SAFELY GATED  
**Auditor:** Financial Systems QA Specialist  

---

## 1. Commercial Monetization Engine Validation

WATECH-BI monetization operates across two separated modes:
- **Mode A (Sandbox / Developer Test Mode):** Fully verified with deterministic plan quotas, subscription state transitions, and webhook event handling.
- **Mode B (Live Production Payment Mode):** Gated by production security guards. Safely disabled until live Stripe merchant credentials are provided by the business owner.

---

## 2. Plan Limits & Server-Side Quota Enforcement

In `src/lib/server/entitlements.ts`:
- **Starter Tier:** Up to 500 verified leads, 3 user seats.
- **Growth Agency:** Up to 2,500 verified leads, 10 user seats.
- **Enterprise Command:** Unlimited leads, unlimited team seats.

### Quota Enforcement Test Results:
1. When tenant monthly lead usage exceeds quota, API routes return `HTTP 403 Forbidden` with `{ "error": "Quota exceeded. Upgrade subscription." }`.
2. UI displays non-intrusive upgrade prompts in the subscription management console.

---

## 3. Stripe Webhook Verification & Replay Defenses

1. **HMAC Signature Check:** Validates Stripe `v1` signature using `Buffer.byteLength` pre-check and `crypto.timingSafeEqual`.
2. **Replay Attack Defense:** Any webhook with a timestamp difference > 300 seconds (5 minutes) is rejected immediately with HTTP 400.
3. **Idempotent Subscription Upsert:** Repeated delivery of `customer.subscription.updated` events updates the tenant subscription record atomically without duplicating billing cycles.

---

## 4. Live Payment Activation Status

> [!IMPORTANT]
> **Owner Action Required for Live Billing:** Live credit card transactions are currently disabled to protect against unauthorized test charges. To activate real customer billing, the business owner must provide their live Stripe merchant keys (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`).

---

## 5. Billing Validation Verdict

**Verdict:** SANDBOX VERIFIED — READY FOR LIVE KEY INSERTION.
