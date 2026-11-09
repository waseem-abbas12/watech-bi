# WATECH-BI — PROMPT 09 FORENSIC UI & UX AUDIT
## Comprehensive Usability, Information Architecture & Product Interface Assessment

**Auditing Role:** Principal SaaS UX Architect, Senior Frontend Systems Engineer & Accessibility Specialist  
**Target Codebase:** `E:\watech-bi`  
**Date:** November 9, 2026  
**Status:** COMPLETE (BASELINE AUDIT FOR SAAS CONSOLIDATION)  

---

### 1. Executive Summary

A forensic review of the existing WATECH-BI user interface reveals that while the underlying 10-stage lead intelligence pipeline, multi-tenant isolation, database models, and CSV ingestion engines function correctly (Prompts 01–07), the **product presentation layer remains fragmented**. 

The current interface resembles an internal developer diagnostic console rather than a commercial B2B SaaS platform:
1. **Sidebar Clutter & Developer Artifacts:** The sidebar displays a flat list of 27 navigation items cluttered with developer prompt badges (`P05`, `P09`, `P10`, `P11`, `P14`, `P23`), creating visual exhaustion and high cognitive load.
2. **Missing Navigational Hierarchy:** Core workflows are not grouped into logical domains (Workspace, Intelligence, Sales, Management, Account).
3. **Fragmented Lead Intelligence:** To inspect a single company, users must manually navigate between 8 distinct modules (`BusinessDiscovery`, `WebsiteAudit`, `ContactDiscovery`, `EmailVerification`, `OpportunityAnalysis`, `LeadScoring`, `OutreachStrategy`, `LeadCrm`). There is no unified 360° lead dossier.
4. **Missing Global Search:** The top navigation bar lacks a global search bar with tenant scoping, forcing users to navigate to specific tabs and manually filter.
5. **Missing Account & Subscription UI:** The top bar does not feature a customer account dropdown, subscription plan indicator, or quota usage summary.
6. **Follow-Up Management Tucked Away:** Follow-up tasks are buried inside tab drawers in the CRM rather than having a clear operational dashboard for Due Today, Overdue, and Upcoming outreach.
7. **Accessibility & Contrast Inconsistencies:** Multiple small text labels use low-contrast slate colors (`text-[9px] text-slate-500`) below WCAG 2.1 AA standards; focus states are inconsistently styled.

---

### 2. Detailed Findings by Area

#### 2.1 Navigation & Application Shell (`AppShell.tsx`)
- **Finding 1.1:** 27 flat items in the left sidebar without categorical grouping.
- **Finding 1.2:** Hardcoded developer prompt references (`badge: 'P05'`, `'P09'`, `'1-CLICK'`, etc.) degrade commercial credibility.
- **Finding 1.3:** Top header lacks a Global Search modal trigger (`Cmd+K` / `Ctrl+K`).
- **Finding 1.4:** Header lacks User Profile / Account Menu displaying user role, email, and subscription plan tier.
- **Finding 1.5:** Data storage indicator statically states "IndexedDB Local" even though Prompt 06 centralized multi-tenant architecture was established.

#### 2.2 Executive Overview Dashboard (`OverviewDashboard.tsx`)
- **Finding 2.1:** Metrics cards focus heavily on static counts rather than actionable next steps.
- **Finding 2.2:** Does not show quick-launch triggers for Recent Projects or Recent Pipeline runs.
- **Finding 2.3:** No visibility into Monthly Usage or Quota Limits.

#### 2.3 Lead Intelligence & Dossier Representation
- **Finding 2.4:** A user researching an HVAC company like "Beckers Heating and Air" must open 6 different screens to see their website audit, decision-maker, email verification status, opportunities, and lead score.
- **Finding 2.5:** Need a unified **Lead Intelligence Dossier** combining:
  1. Business Profile & Provenance
  2. Website Performance & Technical Audit (10 categories)
  3. Verified Decision-Maker & Extracted Contacts
  4. Commercial Service Opportunities & Revenue Gaps
  5. Deterministic Lead Score Breakdown (100-pt algorithm)

#### 2.4 Lead Management & Table Usability
- **Finding 2.6:** Table controls lack multi-facet filtering (filtering simultaneously by score band, decision-maker status, and email verification).
- **Finding 2.7:** No column visibility customization or bulk actions (e.g. bulk push to CRM, bulk export CSV).

#### 2.5 Follow-Up & Sales Execution
- **Finding 2.8:** The Follow-Up Schedule is secondary in the CRM Kanban view; sales reps cannot see an immediate "Today's Agenda" or "Overdue Outreach" list.

#### 2.6 Global Search
- **Finding 2.9:** Zero global search capability across projects, businesses, contacts, and opportunities.

---

### 3. Target Information Architecture (Prompt 09)

```
[ WATECH-BI APPLICATION SHELL ]
├── Header
│   ├── Dynamic Brand Logo & Plan Badge
│   ├── Multi-Tenant Org Switcher
│   ├── Active Project Selector
│   ├── [Cmd+K] Global Search Bar (Tenant-Scoped)
│   └── User Profile Menu (Role, Quota, Settings, Logout)
│
└── Persistent Grouped Sidebar
    ├── WORKSPACE
    │   ├── Overview Dashboard (Executive BI & Metrics)
    │   └── Projects Manager (Create, Switch, Archive, Status)
    │
    ├── INTELLIGENCE
    │   ├── Autonomous Lead Pipeline (10-Stage Engine)
    │   ├── Discover Businesses (Manual & CSV Ingestion)
    │   ├── Unified Lead Dossier (360° Lead Intelligence)
    │   └── Website Audits (Technical & Performance Deep-Dive)
    │
    ├── SALES & CRM
    │   ├── Lead CRM & Pipeline (Kanban & Table Views)
    │   └── Follow-Up Workspace (Due Today, Overdue, Upcoming)
    │
    ├── MANAGEMENT
    │   ├── Market Reports & Intelligence
    │   └── Workflow Automations Hub
    │
    └── ACCOUNT
        ├── Subscription & Usage
        └── Settings & Integrations
```

---

### 4. Implementation Plan for Prompt 09

1. **Phase 1: Unified Application Shell & Navigation:** Refactor `AppShell.tsx` into the 5 structured sections with clean commercial labels, global search trigger, user account dropdown, and mobile navigation drawer.
2. **Phase 2: Executive Overview Dashboard:** Upgrade `OverviewDashboard.tsx` with actionable KPI cards, recent runs, pipeline health, and quota overview.
3. **Phase 3: Dedicated Projects Management View:** Create `ProjectsManagementView.tsx` allowing users to manage, configure, search, and archive projects.
4. **Phase 4: Unified 360° Lead Dossier Modal / View:** Create `LeadIntelligenceDossier.tsx` consolidating profile, audit, decision-maker, opportunities, and score breakdown.
5. **Phase 5: Advanced Lead Management Table:** Enhance table with multi-attribute filtering, column toggle, sorting, and bulk CSV export.
6. **Phase 6 & 7: Follow-Up Workspace:** Build `FollowUpWorkspaceView.tsx` with tabbed views (Due Today, Overdue, Upcoming, Completed).
7. **Phase 8: Global Search Dialog:** Implement `GlobalSearchDialog.tsx` with keyboard shortcut (`Cmd+K`), search API endpoint `/api/search`, and strict tenant isolation.
8. **Phase 9 & 10: Design System & Accessibility:** Refine color palette, accessible contrast, typography, and responsive drawer.
9. **Phase 11 & 12: Automated UI Test Suite & Reports:** Implement `test_ui_customer_experience.mjs` verifying all routes, navigation, search, and accessibility.
