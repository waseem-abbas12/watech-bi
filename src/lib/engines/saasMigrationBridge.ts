/**
 * SaaS Migration Bridge Engine
 * Generates PostgreSQL Row-Level Security (RLS) DDL scripts,
 * Prisma Schema definitions, and Dexie-to-PostgreSQL export routines
 * to bridge local-first multi-tenancy to cloud production architecture.
 */

export function generatePostgreSqlRlsDdl(): string {
  return `-- ====================================================================
-- WATECH-BI MULTI-TENANT ARCHITECTURE: POSTGRESQL ROW-LEVEL SECURITY (RLS)
-- Generated automatically by SaaS Migration Bridge Engine
-- Compatible with PostgreSQL 14+, Supabase, AWS RDS Aurora, Google Cloud SQL
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Master Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(64) PRIMARY KEY,
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    plan_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    custom_domain VARCHAR(255) UNIQUE,
    contact_email VARCHAR(255) NOT NULL,
    is_platform_super_admin_tenant BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tenant Users Table
CREATE TABLE IF NOT EXISTS tenant_users (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'employee',
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    is_platform_super_admin BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- 4. Multi-Tenant Business Table with Foreign Key
CREATE TABLE IF NOT EXISTS businesses (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id VARCHAR(64) NOT NULL,
    official_name VARCHAR(255) NOT NULL,
    brand_name VARCHAR(255),
    domain VARCHAR(255),
    website_url TEXT,
    phone VARCHAR(64),
    email VARCHAR(255),
    city VARCHAR(128),
    state VARCHAR(64),
    status VARCHAR(64) DEFAULT 'discovered',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Multi-Tenant Research Projects
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    industry_niche VARCHAR(255),
    city_area VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Multi-Tenant Proposals Table
CREATE TABLE IF NOT EXISTS proposals (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    business_id VARCHAR(64) NOT NULL,
    project_id VARCHAR(64) NOT NULL,
    proposal_number VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(64) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Multi-Tenant Invoices Table
CREATE TABLE IF NOT EXISTS agency_invoices (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_number VARCHAR(64) NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(64) NOT NULL DEFAULT 'draft',
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) ACTIVATION
-- ====================================================================

-- Enable RLS on all tenant data tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_invoices ENABLE ROW LEVEL SECURITY;

-- Create Tenant Context Function from Session JWT / Request Header
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS VARCHAR(64) AS $$
    SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::VARCHAR(64);
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION is_platform_super_admin() RETURNS BOOLEAN AS $$
    SELECT COALESCE(NULLIF(current_setting('app.is_super_admin', true), '')::BOOLEAN, false);
$$ LANGUAGE sql STABLE;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS tenant_isolation_businesses ON businesses;
DROP POLICY IF EXISTS tenant_isolation_projects ON projects;
DROP POLICY IF EXISTS tenant_isolation_proposals ON proposals;
DROP POLICY IF EXISTS tenant_isolation_invoices ON agency_invoices;

-- Enforce Strict Tenant Isolation Policies
CREATE POLICY tenant_isolation_businesses ON businesses
    FOR ALL
    USING (is_platform_super_admin() OR tenant_id = current_tenant_id())
    WITH CHECK (is_platform_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_projects ON projects
    FOR ALL
    USING (is_platform_super_admin() OR tenant_id = current_tenant_id())
    WITH CHECK (is_platform_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_proposals ON proposals
    FOR ALL
    USING (is_platform_super_admin() OR tenant_id = current_tenant_id())
    WITH CHECK (is_platform_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_invoices ON agency_invoices
    FOR ALL
    USING (is_platform_super_admin() OR tenant_id = current_tenant_id())
    WITH CHECK (is_platform_super_admin() OR tenant_id = current_tenant_id());

-- Create High-Performance Composite Indexes for Tenant Filtering
CREATE INDEX IF NOT EXISTS idx_businesses_tenant_id ON businesses(tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON projects(tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_proposals_tenant_id ON proposals(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON agency_invoices(tenant_id, status);
`;
}

export function generatePrismaSchema(): string {
  return `// ====================================================================
// WATECH-BI PRISMA MULTI-TENANT SCHEMA DEFINITION
// ====================================================================

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Tenant {
  id                         String              @id @default(uuid())
  slug                       String              @unique
  name                       String
  planId                     String
  status                     String              @default("active")
  customDomain               String?             @unique
  contactEmail               String
  isPlatformSuperAdminTenant Boolean             @default(false)
  createdAt                  DateTime            @default(now())
  updatedAt                  DateTime            @updatedAt

  users                      TenantUser[]
  branding                   TenantBranding?
  subscription               TenantSubscription?
  moduleConfig               TenantModuleConfig?
  usage                      TenantUsage[]
  auditLogs                  TenantAuditLog[]
  domains                    TenantDomain[]
  businesses                 Business[]
  projects                   Project[]
  proposals                  Proposal[]
  invoices                   AgencyInvoice[]

  @@map("tenants")
}

model TenantUser {
  id                   String    @id @default(uuid())
  tenantId             String
  email                String
  fullName             String
  role                 String    @default("employee")
  status               String    @default("active")
  isPlatformSuperAdmin Boolean   @default(false)
  lastLoginAt          DateTime?
  avatarUrl            String?
  createdAt            DateTime  @default(now())

  tenant               Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, email])
  @@index([tenantId])
  @@map("tenant_users")
}

model TenantBranding {
  id             String   @id @default(uuid())
  tenantId       String   @unique
  companyName    String
  logoUrl        String?
  faviconUrl     String?
  primaryColor   String   @default("#2563eb")
  secondaryColor String   @default("#4f46e5")
  accentColor    String   @default("#10b981")
  fontStack      String   @default("Inter, sans-serif")
  footerText     String
  supportEmail   String
  customCss      String?
  updatedAt      DateTime @updatedAt

  tenant         Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("tenant_branding")
}

model TenantSubscription {
  id                 String    @id @default(uuid())
  tenantId           String    @unique
  planId             String
  status             String    @default("active")
  billingInterval    String    @default("monthly")
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  cancelAtPeriodEnd  Boolean   @default(false)
  trialEndsAt        DateTime?
  billingEmail       String?
  paymentMethodLast4 String?

  tenant             Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("tenant_subscriptions")
}

model TenantModuleConfig {
  id             String   @id @default(uuid())
  tenantId       String   @unique
  enabledModules Json
  customLabels   Json?
  updatedAt      DateTime @updatedAt

  tenant         Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("tenant_module_configs")
}

model TenantUsage {
  id                  String   @id @default(uuid())
  tenantId            String
  period              String
  activeUsersCount    Int      @default(0)
  leadsCount          Int      @default(0)
  researchOpsCount    Int      @default(0)
  aiQueriesCount      Int      @default(0)
  automationExecsCount Int     @default(0)
  storageBytesUsed    BigInt   @default(0)
  apiRequestsCount    Int      @default(0)
  lastTrackedAt       DateTime @default(now())

  tenant              Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, period])
  @@index([tenantId])
  @@map("tenant_usage")
}

model TenantAuditLog {
  id           String   @id @default(uuid())
  tenantId     String
  actorUserId  String
  actorEmail   String
  action       String
  resourceType String
  resourceId   String?
  details      String
  ipAddress    String?
  timestamp    DateTime @default(now())

  tenant       Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId, timestamp])
  @@map("tenant_audit_logs")
}

model TenantDomain {
  id                    String   @id @default(uuid())
  tenantId              String
  domain                String   @unique
  subdomain             String
  verificationStatus    String   @default("pending")
  sslStatus             String   @default("pending")
  dnsVerificationRecord Json
  createdAt             DateTime @default(now())

  tenant                Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@map("tenant_domains")
}

model Business {
  id           String   @id @default(uuid())
  tenantId     String
  projectId    String
  officialName String
  domain       String?
  websiteUrl   String?
  phone        String?
  email        String?
  city         String?
  state        String?
  status       String   @default("discovered")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  tenant       Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId, projectId])
  @@map("businesses")
}

model Project {
  id            String   @id @default(uuid())
  tenantId      String
  name          String
  industryNiche String?
  cityArea      String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tenant        Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@map("projects")
}

model Proposal {
  id             String   @id @default(uuid())
  tenantId       String
  businessId     String
  projectId      String
  proposalNumber String
  title          String
  status         String   @default("draft")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  tenant         Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId, status])
  @@map("proposals")
}

model AgencyInvoice {
  id            String   @id @default(uuid())
  tenantId      String
  invoiceNumber String
  clientId      String
  totalAmount   Decimal  @db.Decimal(12, 2)
  amountPaid    Decimal  @db.Decimal(12, 2)
  balance       Decimal  @db.Decimal(12, 2)
  status        String   @default("draft")
  dueDate       DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tenant        Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId, status])
  @@map("agency_invoices")
}
`;
}
