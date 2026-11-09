# WATECH-BI — NAVIGATION & INFORMATION ARCHITECTURE REPORT
## Commercial B2B SaaS Sitemap, Wayfinding & Hierarchy

---

### 1. Unified Sitemap & Section Grouping

The application structure has been consolidated into 5 functional domains, replacing the 27 flat items:

```
[ WATECH-BI APPLICATION SHELL ]
├── Header Bar
│   ├── Dynamic White-Label Brand Logo & Plan Tag (e.g., STARTER, GROWTH, PRO)
│   ├── Multi-Tenant Organization Switcher
│   ├── Active Project Selector (with Industry & Geographic Area)
│   ├── [Cmd+K] Global Intelligence Search Bar
│   └── User Account Menu (User Role, Plan Details, Settings)
│
└── Persistent Navigation
    ├── 1. WORKSPACE
    │   ├── Executive Overview (`/` or `module=overview`)
    │   └── Projects Manager (`module=projects`)
    │
    ├── 2. INTELLIGENCE
    │   ├── Autonomous Lead Pipeline (`module=lead_pipeline`)
    │   ├── Discover Businesses (`module=discovery`)
    │   ├── Lead Intelligence Dossier (`module=lead_intelligence`)
    │   ├── Website Technical Audits (`module=website_audit`)
    │   └── Revenue Opportunities (`module=opportunity_analysis`)
    │
    ├── 3. SALES & CRM
    │   ├── Lead CRM Pipeline Board (`module=lead_crm`)
    │   └── Follow-Up Agenda Workspace (`module=followups`)
    │
    ├── 4. MANAGEMENT
    │   ├── Research Reports & Deliverables (`module=research_reports`)
    │   ├── Workflow Automations Hub (`module=automation`)
    │   └── CEO Command Center (`module=command_center`)
    │
    └── 5. ACCOUNT
        ├── Subscription & Quota Metering (`module=billing`)
        └── Settings & API Integrations (`module=settings`)
```

---

### 2. Wayfinding Enhancements

1. **Persistent Breadcrumbs:**
   Displayed directly above the main viewport on every screen:
   `Organization Name / Active Project Name / Active Module Name`
   This guarantees that customer context is never lost when drilling into specific records.
2. **Keyboard Accessibility (`Cmd+K` / `Ctrl+K`):**
   Pressing `Cmd+K` or `Ctrl+K` immediately summons the Global Search modal with zero latency, allowing instant navigation to any business, contact, opportunity, or project.
3. **Responsive Mobile Drawer:**
   On mobile and tablet viewports, the hamburger menu reveals the same 5 categorical sections with accessible tap targets (minimum 44px height), smooth backdrop transition, and immediate auto-close upon selection.
