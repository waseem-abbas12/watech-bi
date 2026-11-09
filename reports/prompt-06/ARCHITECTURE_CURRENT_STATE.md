# WATECH-BI — CURRENT ARCHITECTURAL STATE ASSESSMENT
**Prompt 06: Phase 1 — Comprehensive Architecture Discovery**  
**Date:** November 9, 2026  
**Auditor:** Principal SaaS Architect, Enterprise Database Architect & Security Engineer  
**Project:** `E:\watech-bi`

---

## 1. EXECUTIVE OVERVIEW

Watech-BI is currently in a transitional state between a local-first single-tenant agency operating system (powered by browser-based IndexedDB via Dexie) and a cloud-native multi-tenant SaaS application.

While foundational multi-tenant data models (`Tenant`, `TenantUser`, `TenantSession`, `TenantBranding`, etc.) exist in `prisma/schema.prisma` and server-side JWT authentication helpers exist in `src/lib/server/auth.ts`, the primary operational lead generation, website audit, contact extraction, and CRM pipeline workflows still rely heavily on client-side Dexie tables for state persistence.

---

## 2. APPLICATION STRUCTURE & PAGES

The application is built with **Next.js 14.2 (App Router)** and TypeScript.

### Primary UI Routes
1. `/` — Main Executive Dashboard & Pipeline Workspace:
   - Contains Project Selector, Industry/Location discovery input, Pipeline Mode selector (Mode A: Google Places Discovery vs Mode B: Existing Businesses in Dexie), Stage progress stepper (Stages 1 through 10), and live data tables.
2. `/onboarding` — Multi-tenant tenant setup and organization creation wizard.
3. `/platform-admin` — Platform super-admin overview for tenant monitoring and license plans.
4. `/command-center` — High-level agency KPI management and quick action dispatch.
5. `/automation` — Automation workflow rule builder and webhook trigger viewer.
6. `/portal/*` (Client Portal):
   - `/portal/login` — Client authentication.
   - `/portal/dashboard` — Client project overview, active deliverables, and invoice summaries.
   - `/portal/projects` & `/portal/projects/[id]` — Project milestone inspection and asset download.
   - `/portal/deliverables` — Deliverable approvals and revision requests.
   - `/portal/invoices` — Invoice review and balance tracking.
   - `/portal/requests` & `/portal/support` — Ticket submission and support chat.

---

## 3. EXISTING DATABASE TABLES & DATA ENTITIES

The application currently has two distinct persistence layers:

### Layer A: Client-Side Dexie IndexedDB (`src/lib/db/db.ts`)
Dexie is currently the authoritative store for all operational research and CRM data across 30+ tables:
- `projects` — Research projects and target discovery definitions.
- `businesses` — Discovered HVAC and local contractor records.
- `audits` — Technical and local SEO audit reports.
- `auditFindings` — Detailed defect items (mobile, TTFB, meta tags).
- `contacts` — Extracted personnel, verified emails, and decision makers.
- `opportunities` — Concrete gap proposals referencing audit findings.
- `leadScores` — Deterministic 0–100 opportunity scores and qualification flags.
- `crmActivities` — Engagement history, calls, notes, and stages.
- `followUpSchedules` — Cadence triggers and next action dates.
- `gmailDrafts` & `outreachDrafts` — Prepared outreach messages.
- `localSeoProfiles` & `localReviews` — Google Maps review analysis.
- `competitorSnapshots` & `marketComparisons` — Competitive market benchmarks.

### Layer B: Server-Side Prisma Schema (`prisma/schema.prisma`)
Prisma defines PostgreSQL models primarily for tenant administration, with limited operational models:
- **Tenancy:** `Tenant`, `TenantUser`, `TenantSession`, `TenantBranding`, `TenantPlan`, `TenantSubscription`, `TenantInvitation`, `TenantDomain`, `TenantUsage`, `TenantAuditLog`, `TenantModuleConfig`.
- **Operational Entities (Partial):** `ResearchProject`, `MarketArea`, `Business`, `BusinessProposal`, `ClientProfile`, `AgencyInvoice`, `AutomationWorkflow`, `SecureFile`.
- **Critical Missing Entities in Prisma:**
  - `WebsiteAudit` & `AuditFinding`
  - `Contact` (with role classification)
  - `EmailVerificationRecord`
  - `Opportunity`
  - `LeadScore`
  - `CrmActivity`
  - `FollowUpSchedule`
  - `PipelineRun` & `PipelineStageExecution`
  - `PipelineLock` (Distributed lock coordination)

---

## 4. ALL EXISTING API ROUTES (35 ROUTE HANDLERS)

| API Route | HTTP Method | Authentication | Multi-Tenant Scoping | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | Public | Creates `Tenant` + `TenantUser` | Organization signup and owner account provisioning |
| `/api/auth/login` | `POST` | Public | Verifies tenant membership | Issues JWT cookie (`watech_auth_token`) |
| `/api/auth/logout` | `POST` | Public | Clears cookie | Destroys active session cookie |
| `/api/auth/me` | `GET` | Optional | Reads token claims | Returns current session identity and tenant |
| `/api/auth/invite` | `POST` | Required | Enforces `admin` role | Invites members to an organization |
| `/api/pipeline/execute` | `POST` | **Missing** | **Missing** | Runs unified 10-stage lead generation pipeline |
| `/api/audit/inspect` | `POST` | **Missing** | **Missing** | SSRF-guarded website crawler and technical audit |
| `/api/contact/extract` | `POST` | **Missing** | **Missing** | Scrapes HTML for emails, phones, and team members |
| `/api/email/verify` | `POST` | **Missing** | **Missing** | Performs DNS MX validation for contact emails |
| `/api/competitor/snapshot` | `POST` | **Missing** | **Missing** | Scrapes competitor landing page for comparison |
| `/api/content/extract` | `POST` | **Missing** | **Missing** | Extracts metadata, headings, and schema markup |
| `/api/local-seo/inspect` | `POST` | **Missing** | **Missing** | Analyzes GBP local signals and reviews |
| `/api/market/compare` | `POST` | **Missing** | **Missing** | Compares target business against competitors |
| `/api/sales-intelligence/evaluate` | `POST` | **Missing** | **Missing** | Computes buyer readiness and pitch angle |
| `/api/services/catalog` | `GET` | Public | Global | Lists agency service packages |
| `/api/services/recommend` | `POST` | **Missing** | **Missing** | Matches audit defects to service catalog offerings |
| `/api/proposal/generate` | `POST` | **Missing** | **Missing** | Generates proposal JSON and quotation breakdown |
| `/api/gmail/auth` | `GET` | Required | Tenant-scoped | Initiates Google OAuth consent flow |
| `/api/gmail/callback` | `GET` | Public | Tenant-scoped | Exchanges OAuth code for refresh tokens |
| `/api/gmail/status` | `GET` | Required | Tenant-scoped | Checks Gmail connection status |
| `/api/gmail/create-draft` | `POST` | Required | Tenant-scoped | Creates Gmail draft using connected account |
| `/api/gmail/disconnect` | `POST` | Required | Tenant-scoped | Clears Gmail OAuth tokens |
| `/api/files/download` | `GET` | Required | Tenant-scoped | Issues signed download URL |
| `/api/files/signed-url` | `POST` | Required | Tenant-scoped | Generates S3/storage signed upload URL |
| `/api/billing/webhook` | `POST` | Webhook Sig | Global | Stripe webhook handler |
| `/api/cron/briefing` | `GET` | Cron Secret | Global | Vercel Cron daily executive briefing generator |
| `/api/cron/reminders` | `GET` | Cron Secret | Global | Vercel Cron CRM follow-up reminder generator |
| `/api/cron/sync` | `GET` | Cron Secret | Global | Vercel Cron background data sync |
| `/api/ai/ceo` | `POST` | Required | Tenant-scoped | AI CEO copilot advisory generation |
| `/api/ai/chat` | `POST` | Required | Tenant-scoped | AI sales strategy chat assistant |
| `/api/ai/report` | `POST` | Required | Tenant-scoped | Generates markdown client reports |
| `/api/n8n/test` | `POST` | Required | Global | Tests n8n webhook connectivity |
| `/api/webhooks/test` | `POST` | Required | Global | Validates external webhook delivery |
| `/api/notifications` | `GET` | Required | Tenant-scoped | Returns unread in-app alerts |
| `/api/health` | `GET` | Public | Global | System health check (HTTP 200) |

---

## 5. BUSINESS LOGIC & ENGINES

1. **Pipeline Runner (`src/lib/server/pipeline/pipelineRunner.ts`):**
   - Coordinates the 10 stages: Discovery -> Deduplication -> Audit -> Contacts -> Decision Makers -> Email MX -> Opportunities -> Scoring -> CRM Persistence -> Follow-up Scheduling.
   - Enforces in-memory mutex locking (`acquirePipelineLock` / `releasePipelineLock`).
   - Uses `runWithBoundedConcurrency` (cap: 4 workers).
2. **SSRF Guard (`src/lib/server/ssrfGuard.ts`):**
   - Validates all external target URLs against private CIDR blocks, localhost, link-local metadata (`169.254.169.254`), and restricted ports.
   - Wraps `safeFetch` with manual redirect inspection and 2MB stream size limits.
3. **Deterministic Scoring Engine (`src/lib/engines/scoring.ts`):**
   - 100-point algorithm evaluating technical SEO, local SEO, mobile readiness, conversion focus, and decision maker presence. Minimum qualification score = 40.
4. **Decision Maker Classifier (`src/lib/engines/decisionMakerEngine.ts`):**
   - Role taxonomy sorting contacts into Tier 1 (Executives), Tier 2 (Directors), Tier 3 (Management), and Staff.
5. **Opportunity Engine (`src/lib/engines/opportunities.ts`):**
   - Generates concrete gap analyses referencing explicit audit defect evidence.

---

## 6. AUTHENTICATION & ACCESS CONTROL CURRENT STATE

- **Mechanism:** JWT tokens stored in HttpOnly cookies (`watech_auth_token`) or passed via `Authorization: Bearer <token>`.
- **Password Security:** Salted hashes using `bcryptjs` (cost factor 10).
- **Session Lifespan:** 7 days.
- **Current Limitation:** Several critical execution APIs (including `/api/pipeline/execute`, `/api/audit/inspect`, `/api/contact/extract`) have **no authentication checks**, allowing unauthenticated anonymous execution.
- **No In-Flight Multi-Tenant Validation:** Requests to `/api/pipeline/execute` currently do not verify that the target `projectId` belongs to the requesting user's organization.

---

## 7. DATA ACCESS PATHS & REPOSITORY PATTERNS

- **Client-Side:** UI components call `src/lib/db/repository.ts` directly, reading and writing to IndexedDB without any server authorization or tenant boundaries.
- **Server-Side:** Partial implementation in `src/lib/server/tenantRepository.ts` enforces `where: { tenantId }`, but is currently only wired to `ResearchProject` and `Business`. Pipeline executions bypass this repository completely and return JSON to the client, which then manually persists to Dexie!

---

## 8. DUPLICATED STATE & RESPONSIBILITY SPLIT

| Capability | Client Responsibility (Dexie) | Server Responsibility (API / Prisma) | Architectural Risk |
| :--- | :--- | :--- | :--- |
| **Pipeline Execution** | Receives results and writes to Dexie | Executes HTTP crawls & computes scores | Results lost if client closes tab before save; no server persistence |
| **Project Management** | Manages local project records | Minimal `prisma.researchProject` store | Projects created locally are invisible to team members |
| **CRM Activities** | Fully stored in Dexie | Zero server persistence | CRM notes and follow-ups are trapped in user's browser |
| **Concurrency Locking** | None | In-memory process mutex | Ineffective across multi-instance serverless deployments |

---

## 9. CONCLUSION & REFACTORING IMPERATIVES

To establish a production-grade multi-tenant SaaS foundation:
1. All 10 pipeline entities must be modeled in Prisma and stored centrally in PostgreSQL.
2. `/api/pipeline/execute` and all operational APIs must enforce mandatory authentication and organization membership.
3. In-memory locks must be replaced or augmented with a centralized, database-backed distributed lock coordination mechanism.
4. Dexie must transition into a client-side cache and offline mirror, while the centralized database becomes the authoritative source of truth.
5. A safe, non-destructive migration utility must import existing Dexie records into the centralized schema without data loss.
