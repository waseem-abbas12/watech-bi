import { prisma, isDatabaseConfigured } from './db';
import { evaluateResourceQuota, type QuotaCheckResult } from '@/lib/engines/tenantContextEngine';
import type { TenantPlan, TenantUsage } from '@/types';

export const DEFAULT_PLANS: Record<string, TenantPlan> = {
  'plan-starter': {
    id: 'plan-starter',
    name: 'Starter Tier',
    slug: 'starter',
    priceMonthly: 0,
    priceAnnual: 0,
    currency: 'USD',
    userLimit: 3,
    leadLimit: 500,
    researchLimit: 5,
    aiQueryLimit: 100,
    automationLimit: 25,
    storageLimitMb: 1000,
    enabledModules: ['overview', 'business-discovery', 'website-audit', 'lead-scoring'],
  },
  'plan-growth': {
    id: 'plan-growth',
    name: 'Growth Agency',
    slug: 'growth',
    priceMonthly: 0,
    priceAnnual: 0,
    currency: 'USD',
    userLimit: 10,
    leadLimit: 2500,
    researchLimit: 25,
    aiQueryLimit: 1000,
    automationLimit: 250,
    storageLimitMb: 10000,
    enabledModules: ['overview', 'business-discovery', 'website-audit', 'local-seo', 'contact-discovery', 'email-verification', 'crm-pipeline', 'proposals', 'client-projects'],
  },
  'plan-enterprise': {
    id: 'plan-enterprise',
    name: 'Enterprise Agency Command',
    slug: 'enterprise',
    priceMonthly: 0,
    priceAnnual: 0,
    currency: 'USD',
    userLimit: 999999,
    leadLimit: 999999,
    researchLimit: 999999,
    aiQueryLimit: 999999,
    automationLimit: 999999,
    storageLimitMb: 999999,
    enabledModules: ['*'],
  },
};

export async function checkServerEntitlement(
  tenantId: string,
  resource: 'users' | 'leads' | 'research' | 'ai' | 'automation' | 'storage'
): Promise<QuotaCheckResult> {
  const currentPeriod = new Date().toISOString().slice(0, 7);

  if (isDatabaseConfigured) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: true,
      },
    });

    const planId = tenant?.subscription?.planId || tenant?.planId || 'plan-starter';
    const plan = DEFAULT_PLANS[planId] || DEFAULT_PLANS['plan-starter'];

    const usage = await prisma.tenantUsage.findFirst({
      where: { tenantId, period: currentPeriod },
    });

    const mappedUsage: TenantUsage = {
      id: usage?.id || `usage-${tenantId}-${currentPeriod}`,
      tenantId,
      period: currentPeriod,
      activeUsersCount: usage?.activeUsersCount || 1,
      leadsCount: usage?.leadsCount || 0,
      researchOpsCount: usage?.researchOpsCount || 0,
      aiQueriesCount: usage?.aiQueriesCount || 0,
      automationExecsCount: usage?.automationExecsCount || 0,
      storageBytesUsed: Number(usage?.storageBytesUsed || 0),
      apiRequestsCount: usage?.apiRequestsCount || 0,
      lastTrackedAt: usage?.lastTrackedAt.toISOString() || new Date().toISOString(),
    };

    return evaluateResourceQuota(resource, mappedUsage, plan);
  }

  // Fallback for development / unconfigured DB
  const defaultUsage: TenantUsage = {
    id: `usage-${tenantId}-${currentPeriod}`,
    tenantId,
    period: currentPeriod,
    activeUsersCount: 1,
    leadsCount: 50,
    researchOpsCount: 5,
    aiQueriesCount: 20,
    automationExecsCount: 2,
    storageBytesUsed: 10 * 1024 * 1024,
    apiRequestsCount: 100,
    lastTrackedAt: new Date().toISOString(),
  };

  return evaluateResourceQuota(resource, defaultUsage, DEFAULT_PLANS['plan-enterprise']);
}