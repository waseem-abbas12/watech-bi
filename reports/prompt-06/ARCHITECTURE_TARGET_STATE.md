# WATECH-BI — TARGET SAAS ARCHITECTURE SPECIFICATION
**Prompt 06: Phase 2 — Target Architecture Design**  
**Date:** November 9, 2026  
**Architect:** Principal SaaS Architect & Distributed Systems Engineer  
**Project:** `E:\watech-bi`

---

## 1. TARGET ARCHITECTURAL BLUEPRINT

The target architecture transitions Watech-BI from a browser-isolated local tool into a unified, secure, enterprise-grade multi-tenant SaaS platform. Every data record belongs strictly to an Organization (Tenant), is accessed through an authenticated and authorized server layer, and is backed by a centralized relational database.

```mermaid
flowchart TD
    subgraph Layer1["1. Presentation Layer (Next.js 14 App Router)"]
        UI_Dash["Executive Dashboard & Pipeline Workspace"]
        UI_CRM["CRM & Pipeline Manager"]
        UI_Portal["Client Portal (/portal/*)"]
        UI_Admin["Platform Administration (/platform-admin)"]
        Dexie_Cache[("Dexie Client Cache & Offline Sync")]
    end

    subgraph Layer2["2. Authentication Layer"]
        Auth_JWT["JWT Session Guardian (HttpOnly Cookies & Bearer)"]
        Auth_Bcrypt["Bcrypt Password Hasher"]
        Auth_Token["Token Verification & Session Validation"]
    end

    subgraph Layer3["3. Organization & Tenant Isolation Layer"]
        Org_Context["TenantContextMiddleware & Scoping"]
        Org_Hierarchy["Hierarchy: Org -> Members -> Workspaces -> Projects"]
    end

    subgraph Layer4["4. Authorization Layer (RBAC)"]
        RBAC_Guard["Role Engine (Owner / Admin / Manager / Member)"]
        RLS_Policy["Row-Level Security & Project Ownership Verification"]
    end

    subgraph Layer5["5. Business Logic & Core Engines"]
        Score_Engine["Deterministic Scoring Engine (40-pt Gate)"]
        DM_Engine["Decision Maker Taxonomy Engine"]
        Opp_Engine["Opportunity Gap Generation Engine"]
    end

    subgraph Layer6["6. Pipeline Execution Layer"]
        Pipe_Orch["10-Stage Pipeline Orchestrator"]
        Worker_Pool["Bounded Worker Concurrency Pool (Cap: 4)"]
        Coord_Lock["Database-Backed Distributed Coordination Lock"]
    end

    subgraph Layer7["7. Centralized Database Layer (PostgreSQL / Prisma)"]
        DB_Master[("Centralized PostgreSQL Database")]
        DB_Schema["Tenants, Users, Workspaces, Projects, Businesses, Audits, Contacts, Opportunities, CRM"]
    end

    subgraph Layer8["8. Integration & Network Layer"]
        SSRF_Guard["SSRF Guard (CIDR, Metadata, Port 22/5432/6379 Block)"]
        Safe_Fetch["Hardened SafeFetch Client (Redirect Inspection & 2MB Stream Cap)"]
        Ext_APIs["External Services (Google Places, SMTP, Gmail)"]
    end

    subgraph Layer9["9. Background Job Layer"]
        Cron_Guard["Cron Secret Bearer Verification"]
        Vercel_Cron["Daily Briefings, Sync & Follow-Up Reminders"]
    end

    subgraph Layer10["10. Monitoring, Audit & Rate Limiting"]
        Audit_Logger["TenantAuditLog & Execution Traceability (runId)"]
        Rate_Limiter["Sliding Window Rate Limiter"]
    end

    UI_Dash --> Auth_JWT
    UI_CRM --> Auth_JWT
    UI_Portal --> Auth_JWT
    UI_Admin --> Auth_JWT
    
    Auth_JWT --> Org_Context
    Org_Context --> RBAC_Guard
    RBAC_Guard --> Pipe_Orch
    
    Pipe_Orch --> Coord_Lock
    Coord_Lock --> DB_Master
    Pipe_Orch --> Worker_Pool
    Worker_Pool --> SSRF_Guard
    SSRF_Guard --> Safe_Fetch --> Ext_APIs
    
    Pipe_Orch --> Score_Engine
    Pipe_Orch --> DM_Engine
    Pipe_Orch --> Opp_Engine
    
    Pipe_Orch --> DB_Master
    DB_Master -.-> Dexie_Cache
    
    Vercel_Cron --> Cron_Guard --> DB_Master
    Pipe_Orch --> Audit_Logger
```

---

## 2. THE 10 TARGET ARCHITECTURE LAYERS

### Layer 1: Presentation Layer
- **Components:** Next.js 14 App Router React Server & Client Components.
- **Client Cache Strategy:** Dexie IndexedDB acts strictly as a high-speed read cache and offline mirror. It never creates authoritative records that bypass server validation.
- **State Management:** SWR/React Query hooks synchronizing with server REST API endpoints.

### Layer 2: Authentication Layer
- **Tokens:** Stateless JSON Web Tokens (JWT) signed with HMAC-SHA256 using `JWT_SECRET`.
- **Delivery:** HttpOnly, SameSite=Lax, Secure cookies (`watech_auth_token`) for browser navigation; `Authorization: Bearer <token>` for programmatic API consumers.
- **Payload Contract:**
  ```json
  {
    "userId": "usr_abc123",
    "email": "user@agency.com",
    "fullName": "Jane Doe",
    "tenantId": "org_xyz789",
    "role": "admin",
    "isPlatformSuperAdmin": false,
    "iat": 1794184000,
    "exp": 1794788800
  }
  ```

### Layer 3: Organization & Tenant Layer
- **Hierarchy:**
  ```
  Organization (Tenant)
  └── Organization Members (Users with Roles)
      └── Workspaces
          └── Projects
              ├── Discovered Businesses
              │   ├── Technical Audits & Findings
              │   ├── Extracted Contacts & Decision Makers
              │   └── Opportunities & Lead Scores
              ├── CRM Activities
              └── Follow-Up Schedules
  ```
- **Tenant Context Enforcement:** Every server request resolves the tenant identity from the verified session claims. No client-supplied `organizationId` parameter is ever trusted.

### Layer 4: Authorization Layer (RBAC & Multi-Tenant Boundaries)
- **Roles:**
  - `owner` — Full organization control, billing, invitations, settings, all projects.
  - `admin` — Team management, project management, pipeline execution, CRM.
  - `manager` — Project and pipeline execution, CRM editing, proposal creation.
  - `member` (employee) — Read access to assigned projects, view leads, log CRM activities.
- **Ownership Verification:** Before reading or mutating any project, business, audit, or CRM record, the server verifies `record.tenantId === session.tenantId`. Violations immediately return HTTP 403 Forbidden.

### Layer 5: Business Logic Layer
- **Deterministic Lead Scoring:** 100-point composite algorithm evaluating website defects, local presence, responsiveness, and decision-maker availability.
- **Decision Maker Taxonomy:** Strict classification separating verified executive leadership (CEO, Owner, Founder, VP) from non-decision-maker staff.
- **Opportunity Generator:** Converts concrete audit defects into pitch opportunities.

### Layer 6: Pipeline Execution Layer
- **Unified 10-Stage Pipeline:** Single-click execution coordinating discovery through CRM scheduling.
- **Bounded Worker Concurrency:** Strict concurrency pool (cap: 4 concurrent outbound workers) prevents socket exhaustion and CPU spikes.
- **Distributed Coordination Lock:** Replaces in-process mutexes with database-backed lock records (`PipelineLock`) keyed by `${tenantId}:${projectId}` with automatic TTL expiration.

### Layer 7: Centralized Database Layer
- **Authoritative Store:** PostgreSQL accessed via Prisma ORM.
- **Data Integrity:** Foreign key constraints with `onDelete: Cascade` guaranteeing zero orphaned records.
- **Transactions:** Multi-table ACID transactions guaranteeing that lead scores, opportunities, audits, and contacts are saved atomically.

### Layer 8: Integration & Network Security Layer
- **SSRF Guard:** Absolute defense preventing external crawler requests to private IPs (`10.0.0.0/8`, `192.168.0.0/16`, `127.0.0.1`, `::1`), cloud metadata (`169.254.169.254`), and sensitive service ports (`22`, `25`, `5432`, `6379`, `3000`).
- **Hardened HTTP Client (`safeFetch`):** Capped at 2MB download, enforces max 3 redirects, re-verifies redirect targets against SSRF rules.

### Layer 9: Background Job Layer
- **Scheduled Sync & Reminders:** Vercel Cron routes (`/api/cron/reminders`, `/api/cron/briefing`, `/api/cron/sync`) protected by `CRON_SECRET` authorization bearer headers.

### Layer 10: Monitoring, Audit & Rate Limiting
- **Audit Logging:** Every critical administrative mutation, export, or pipeline run writes to `TenantAuditLog`.
- **Traceability:** Every execution assigns a unique `runId` recorded across all stage logs.

---

## 3. SUMMARY OF ARCHITECTURAL ADVANTAGES

1. **Elimination of Data Trapping:** Data created by one user is immediately visible to authorized teammates in the organization.
2. **Ironclad Multi-Tenant Boundaries:** Cryptographically signed tokens guarantee no cross-organization data leakage.
3. **Multi-Instance Global Concurrency:** Database-backed locks ensure two users or background workers on separate serverless lambdas cannot corrupt the same project concurrently.
4. **Resilient Local Caching:** Dexie remains as a fast offline read cache without compromising the central database as source of truth.
