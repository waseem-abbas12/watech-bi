# WATECH-BI — API AUTHORIZATION & ACCESS CONTROL AUDIT REPORT
**Prompt 06: Phase 9 — API Security Review**  
**Date:** November 9, 2026  
**Auditor:** Principal Security Engineer & Authentication Architect  
**Project:** `E:\watech-bi`

---

## 1. COMPREHENSIVE API ROUTE INVENTORY & ACCESS CONTROL MATRIX

Every API route handler in `src/app/api/` has been systematically evaluated and hardened against the following controls:
1. **Authentication:** Verification of cryptographically signed JWT in HttpOnly cookie or Bearer header.
2. **Authorization (RBAC):** Role enforcement (`owner`, `admin`, `manager`, `employee`).
3. **Multi-Tenant Ownership:** Automatic resolution of `tenantId` from session; zero trust in client-supplied parameters; cross-tenant validation.
4. **Input Validation & SSRF Guard:** URL checks, request size limits, CIDR range blocks.

| Endpoint | Method | Auth Requirement | Min Role | Tenant Scoped | SSRF Protected | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | Public | None | Self (creates tenant) | N/A | **HARDENED** |
| `/api/auth/login` | `POST` | Public | None | Verifies membership | N/A | **HARDENED** |
| `/api/auth/logout` | `POST` | Public | None | Clears token | N/A | **HARDENED** |
| `/api/auth/me` | `GET` | Optional | None | Returns own claims | N/A | **HARDENED** |
| `/api/auth/invite` | `POST` | Required | `admin` | Strict tenant match | N/A | **HARDENED** |
| `/api/pipeline/execute` | `POST` | Required (Prod) | `manager` | Enforces project tenant | Yes (internal) | **HARDENED** |
| `/api/audit/inspect` | `POST` | Required (Prod) | `employee`| Enforces project tenant | Yes (`ssrfGuard`) | **HARDENED** |
| `/api/contact/extract` | `POST` | Required (Prod) | `employee`| Enforces project tenant | Yes (`ssrfGuard`) | **HARDENED** |
| `/api/email/verify` | `POST` | Required (Prod) | `employee`| Enforces project tenant | Yes (DNS only) | **HARDENED** |
| `/api/competitor/snapshot` | `POST` | Required (Prod) | `manager` | Enforces project tenant | Yes (`ssrfGuard`) | **HARDENED** |
| `/api/content/extract` | `POST` | Required (Prod) | `employee`| Enforces project tenant | Yes (`ssrfGuard`) | **HARDENED** |
| `/api/local-seo/inspect` | `POST` | Required (Prod) | `employee`| Enforces project tenant | Yes (`ssrfGuard`) | **HARDENED** |
| `/api/market/compare` | `POST` | Required (Prod) | `manager` | Enforces project tenant | Yes | **HARDENED** |
| `/api/sales-intelligence/evaluate` | `POST` | Required (Prod) | `manager` | Enforces project tenant | N/A | **HARDENED** |
| `/api/services/catalog` | `GET` | Public | None | Global catalog | N/A | **HARDENED** |
| `/api/services/recommend` | `POST` | Required (Prod) | `employee`| Enforces project tenant | N/A | **HARDENED** |
| `/api/proposal/generate` | `POST` | Required (Prod) | `manager` | Enforces business tenant | N/A | **HARDENED** |
| `/api/gmail/auth` | `GET` | Required | `admin` | Connected per tenant | N/A | **HARDENED** |
| `/api/gmail/callback` | `GET` | Public | None | Validates OAuth state | N/A | **HARDENED** |
| `/api/gmail/status` | `GET` | Required | `employee`| Scoped to tenant tokens| N/A | **HARDENED** |
| `/api/gmail/create-draft` | `POST` | Required | `employee`| Verifies draft ownership| N/A | **HARDENED** |
| `/api/gmail/disconnect` | `POST` | Required | `admin` | Tenant OAuth purge | N/A | **HARDENED** |
| `/api/files/download` | `GET` | Required | `employee`| Verifies storageKey tenant| N/A | **HARDENED** |
| `/api/files/signed-url` | `POST` | Required | `manager` | Prepends tenant path | N/A | **HARDENED** |
| `/api/billing/webhook` | `POST` | Webhook Secret | None | Stripe sig verification | N/A | **HARDENED** |
| `/api/cron/briefing` | `GET` | Bearer Token | System | Authenticates CRON_SECRET | N/A | **HARDENED** |
| `/api/cron/reminders` | `GET` | Bearer Token | System | Authenticates CRON_SECRET | N/A | **HARDENED** |
| `/api/cron/sync` | `GET` | Bearer Token | System | Authenticates CRON_SECRET | N/A | **HARDENED** |
| `/api/ai/ceo` | `POST` | Required | `owner` | Strictly isolated tenant | N/A | **HARDENED** |
| `/api/ai/chat` | `POST` | Required | `employee`| Tenant-scoped context | N/A | **HARDENED** |
| `/api/ai/report` | `POST` | Required | `employee`| Tenant-scoped data | N/A | **HARDENED** |
| `/api/n8n/test` | `POST` | Required | `admin` | Tenant credentials | N/A | **HARDENED** |
| `/api/webhooks/test` | `POST` | Required | `admin` | Tenant credentials | N/A | **HARDENED** |
| `/api/notifications` | `GET` | Required | `employee`| Filtered by `userId` | N/A | **HARDENED** |
| `/api/health` | `GET` | Public | None | Global ping (HTTP 200) | N/A | **HARDENED** |

---

## 2. CROSS-TENANT DEFENSE MECHANISM

1. **Parameter Tampering Immunity:**
   Client requests passing `tenantId`, `organizationId`, or `org` in JSON payloads or query strings are ignored in favor of the cryptographically verified `user.tenantId` in the JWT session token.
2. **Explicit Cross-Tenant Block:**
   If a client explicitly passes a `tenantId` parameter that contradicts the session claims, `requireTenantContext` halts immediately:
   ```json
   {
     "success": false,
     "error": "Forbidden: Cross-tenant execution blocked. You cannot run pipelines against another organization.",
     "errorCode": "CROSS_TENANT_ACCESS_DENIED"
   }
   ```
   **HTTP Status:** `403 Forbidden`
3. **Insecure Direct Object Reference (IDOR) Prevention:**
   When targeting entity IDs (`projectId`, `businessId`, `auditId`), `ServerTenantRepository` checks `where: { id, tenantId }`. Querying an entity belonging to another tenant returns `null` or `404/403`.
