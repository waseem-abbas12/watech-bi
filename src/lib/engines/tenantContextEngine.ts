import type {
  Tenant,
  TenantPlan,
  TenantUsage,
  TenantAuditLog,
  TenantUser,
} from '@/types';
import { repository } from '@/lib/db/repository';

export interface QuotaCheckResult {
  resource: 'users' | 'leads' | 'research' | 'ai' | 'automation' | 'storage';
  isAllowed: boolean;
  current: number;
  limit: number;
  usagePercent: number;
  isWarning: boolean; // >= 80%
  warningMessage?: string;
}

export function evaluateResourceQuota(
  resource: 'users' | 'leads' | 'research' | 'ai' | 'automation' | 'storage',
  usage: TenantUsage,
  plan: TenantPlan
): QuotaCheckResult {
  let current = 0;
  let limit = 0;

  switch (resource) {
    case 'users':
      current = usage.activeUsersCount;
      limit = plan.userLimit;
      break;
    case 'leads':
      current = usage.leadsCount;
      limit = plan.leadLimit;
      break;
    case 'research':
      current = usage.researchOpsCount;
      limit = plan.researchLimit;
      break;
    case 'ai':
      current = usage.aiQueriesCount;
      limit = plan.aiQueryLimit;
      break;
    case 'automation':
      current = usage.automationExecsCount;
      limit = plan.automationLimit;
      break;
    case 'storage':
      current = Math.round(usage.storageBytesUsed / (1024 * 1024));
      limit = plan.storageLimitMb;
      break;
  }

  // Enterprise/unlimited handle
  if (limit >= 999999) {
    return {
      resource,
      isAllowed: true,
      current,
      limit,
      usagePercent: 0,
      isWarning: false,
    };
  }

  const usagePercent = limit > 0 ? Math.round((current / limit) * 100) : 100;
  const isAllowed = current < limit;
  const isWarning = usagePercent >= 80;

  let warningMessage: string | undefined;
  if (!isAllowed) {
    warningMessage = `Limit reached for ${resource} (${current}/${limit}). Upgrade plan to increase capacity.`;
  } else if (isWarning) {
    warningMessage = `You have used ${usagePercent}% of your monthly ${resource} quota (${current}/${limit}).`;
  }

  return {
    resource,
    isAllowed,
    current,
    limit,
    usagePercent,
    isWarning,
    warningMessage,
  };
}

export async function logTenantAudit(params: {
  tenantId: string;
  actor: TenantUser;
  action: string;
  resourceType: string;
  resourceId?: string;
  details: string;
}): Promise<void> {
  const auditLog: TenantAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    tenantId: params.tenantId,
    actorUserId: params.actor.id,
    actorEmail: params.actor.email,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    details: params.details,
    timestamp: new Date().toISOString(),
  };

  await repository.saveTenantAuditLog(auditLog);
}

export async function getOrCreateCurrentUsage(tenantId: string): Promise<TenantUsage> {
  const currentPeriod = new Date().toISOString().slice(0, 7);
  let usage = await repository.getTenantUsage(tenantId, currentPeriod);

  if (!usage) {
    usage = {
      id: `usage-${tenantId}-${currentPeriod}`,
      tenantId,
      period: currentPeriod,
      activeUsersCount: 1,
      leadsCount: 0,
      researchOpsCount: 0,
      aiQueriesCount: 0,
      automationExecsCount: 0,
      storageBytesUsed: 0,
      apiRequestsCount: 0,
      lastTrackedAt: new Date().toISOString(),
    };
    await repository.saveTenantUsage(usage);
  }

  return usage;
}

export async function incrementTenantUsage(
  tenantId: string,
  metric: 'leadsCount' | 'researchOpsCount' | 'aiQueriesCount' | 'automationExecsCount' | 'apiRequestsCount',
  amount = 1
): Promise<TenantUsage> {
  const usage = await getOrCreateCurrentUsage(tenantId);
  usage[metric] = (usage[metric] || 0) + amount;
  usage.lastTrackedAt = new Date().toISOString();
  await repository.saveTenantUsage(usage);
  return usage;
}
