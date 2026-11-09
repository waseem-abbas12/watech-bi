-- ====================================================================
-- WATECH-BI MULTI-TENANT PRODUCTION RLS POLICIES & FUNCTIONS
-- ====================================================================

-- 1. Helper function to extract current tenant ID from transaction session
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS VARCHAR(64) AS $$
    SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::VARCHAR(64);
$$ LANGUAGE sql STABLE;

-- 2. Helper function to test if super admin bypass is active
CREATE OR REPLACE FUNCTION is_platform_super_admin() RETURNS BOOLEAN AS $$
    SELECT COALESCE(NULLIF(current_setting('app.is_super_admin', true), '')::BOOLEAN, false);
$$ LANGUAGE sql STABLE;

-- 3. Enable RLS on all tenant data tables
ALTER TABLE "tenant_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_branding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_domains" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_usage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_module_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "market_areas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "businesses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "proposals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agency_invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "automation_workflows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "secure_files" ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies enforcing strict tenant boundaries
CREATE POLICY tenant_isolation_users ON "tenant_users"
    FOR ALL
    USING (is_platform_super_admin() OR "tenantId" = current_tenant_id())
    WITH CHECK (is_platform_super_admin() OR "tenantId" = current_tenant_id());

CREATE POLICY tenant_isolation_branding ON "tenant_branding"
    FOR ALL
    USING (is_platform_super_admin() OR "tenantId" = current_tenant_id())
    WITH CHECK (is_platform_super_admin() OR "tenantId" = current_tenant_id());

CREATE POLICY tenant_isolation_subscriptions ON "tenant_subscriptions"
    FOR ALL
    USING (is_platform_super_admin() OR "tenantId" = current_tenant_id())
    WITH CHECK (is_platform_super_admin() OR "tenantId" = current_tenant_id());

CREATE POLICY tenant_isolation_invitations ON "tenant_invitations"
    FOR ALL
    USING (is_platform_super_admin() OR "tenantId" = current_tenant_id())
    WITH CHECK (is_platform_super_admin() OR "tenantId" = current_tenant_id());

CREATE POLICY tenant_isolation_domains ON "tenant_domains"
    FOR ALL
    USING (is_platform_super_admin() OR "tenantId" = current_tenant_id())
    WITH CHECK (is_platform_super_admin() OR "tenantId" = current_tenant_id());

CREATE POLICY tenant_isolation_usage ON "tenant_usage"
    FOR ALL
    USING (is_platform_super_admin() OR "tenantId" = current_tenant_id())
    WITH CHECK (is_platform_super_admin() OR "tenantId" = current_tenant_id());

CREATE POLICY tenant_isolation_audit_logs ON "tenant_audit_logs"
    FOR ALL
    USING (is_platform_super_admin() OR "tenantId" = current_tenant_id())
    WITH CHECK (is_platform_super_admin() OR "tenantId" = current_tenant_id());

CREATE POLICY tenant_isolation_module_configs ON "tenant_module_configs"
    FOR ALL
    USING (is_platform_super_admin() OR "tenantId" = current_tenant_id())
    WITH CHECK (is_platform_super_admin() OR "tenantId" = current_tenant_id());

CREATE POLICY tenant_isolation_projects ON "projects"
    FOR ALL
    USING (is_platform_super_admin() OR "tenantId" = current_tenant_id())
    WITH CHECK (is_platform_super_admin() OR "tenantId" = current_tenant_id());

CREATE POLICY tenant_isolation_market_areas ON "market_areas"
    FOR ALL
    USING (is_platform_super_admin() OR "tenantId" = current_tenant_id())
    WITH CHECK (is_platform_super_admin() OR "tenantId" = current_tenant_id());

CREATE POLICY tenant_isolation_businesses ON "businesses"
    FOR ALL
    USING (is_platform_super_admin() OR "tenantId" = current_tenant_id())
    WITH CHECK (is_platform_super_admin() OR "tenantId" = current_tenant_id());

CREATE POLICY tenant_isolation_proposals ON "proposals"
    FOR ALL
    USING (is_platform_super_admin() OR "tenantId" = current_tenant_id())
    WITH CHECK (is_platform_super_admin() OR "tenantId" = current_tenant_id());

CREATE POLICY tenant_isolation_clients ON "clients"
    FOR ALL
    USING (is_platform_super_admin() OR "tenantId" = current_tenant_id())
    WITH CHECK (is_platform_super_admin() OR "tenantId" = current_tenant_id());

CREATE POLICY tenant_isolation_invoices ON "agency_invoices"
    FOR ALL
    USING (is_platform_super_admin() OR "tenantId" = current_tenant_id())
    WITH CHECK (is_platform_super_admin() OR "tenantId" = current_tenant_id());

CREATE POLICY tenant_isolation_automations ON "automation_workflows"
    FOR ALL
    USING (is_platform_super_admin() OR "tenantId" = current_tenant_id())
    WITH CHECK (is_platform_super_admin() OR "tenantId" = current_tenant_id());

CREATE POLICY tenant_isolation_secure_files ON "secure_files"
    FOR ALL
    USING (is_platform_super_admin() OR "tenantId" = current_tenant_id())
    WITH CHECK (is_platform_super_admin() OR "tenantId" = current_tenant_id());
