import type { TenantRole, TenantUser, TenantModuleConfig } from '@/types';

export type TenantPermission =
  | 'manage_platform'
  | 'manage_tenant'
  | 'manage_billing'
  | 'manage_users'
  | 'manage_branding'
  | 'manage_custom_domains'
  | 'manage_modules'
  | 'manage_projects'
  | 'manage_proposals'
  | 'manage_crm'
  | 'manage_automations'
  | 'view_ceo_command'
  | 'view_financials'
  | 'export_data'
  | 'run_audits'
  | 'read_only';

export const ROLE_PERMISSIONS: Record<TenantRole, TenantPermission[]> = {
  owner: [
    'manage_tenant',
    'manage_billing',
    'manage_users',
    'manage_branding',
    'manage_custom_domains',
    'manage_modules',
    'manage_projects',
    'manage_proposals',
    'manage_crm',
    'manage_automations',
    'view_ceo_command',
    'view_financials',
    'export_data',
    'run_audits',
    'read_only',
  ],
  admin: [
    'manage_tenant',
    'manage_users',
    'manage_branding',
    'manage_custom_domains',
    'manage_modules',
    'manage_projects',
    'manage_proposals',
    'manage_crm',
    'manage_automations',
    'view_ceo_command',
    'view_financials',
    'export_data',
    'run_audits',
    'read_only',
  ],
  manager: [
    'manage_projects',
    'manage_proposals',
    'manage_crm',
    'manage_automations',
    'run_audits',
    'read_only',
  ],
  employee: [
    'manage_proposals',
    'manage_crm',
    'run_audits',
    'read_only',
  ],
  viewer: [
    'read_only',
  ],
};

export const ALL_MODULE_KEYS = [
  'overview',
  'command-center',
  'market-research',
  'market-mapping',
  'business-discovery',
  'website-audit',
  'local-seo',
  'contact-discovery',
  'email-verification',
  'content-discovery',
  'opportunity-analysis',
  'lead-scoring',
  'outreach-strategy',
  'gmail-integration',
  'crm-pipeline',
  'ai-assistant',
  'competitor-monitor',
  'multi-market',
  'buyer-signals',
  'service-recommendations',
  'proposals',
  'client-projects',
  'agency-performance',
  'client-portal',
  'automation-hub',
] as const;

export type ModuleKey = typeof ALL_MODULE_KEYS[number];

export const MODULE_METADATA: Record<ModuleKey, { title: string; category: string; description: string }> = {
  'overview': { title: 'Agency Overview', category: 'General', description: 'Cross-functional executive summary dashboard.' },
  'command-center': { title: 'AI CEO Command Center', category: 'Executive', description: 'Autonomous decision support, health scoring, and targets.' },
  'market-research': { title: 'Automated Market Research', category: 'Intelligence', description: 'Territory definition, TAM analysis, and target niches.' },
  'market-mapping': { title: 'Market Mapping & TAM', category: 'Intelligence', description: 'Geographic market density and competitor mapping.' },
  'business-discovery': { title: 'Business Discovery', category: 'Pipeline', description: 'Automated prospecting and local registry sweeps.' },
  'website-audit': { title: 'Website Audit Engine', category: 'Intelligence', description: '10-factor technical website auditing and scoring.' },
  'local-seo': { title: 'Local SEO Intelligence', category: 'Intelligence', description: 'Google Business Profile, NAP audits, and local 3-pack.' },
  'contact-discovery': { title: 'Contact Discovery', category: 'Pipeline', description: 'Decision maker extraction with multi-source corroboration.' },
  'email-verification': { title: 'Email Verification', category: 'Pipeline', description: 'Deliverability validation, MX check, and syntax verification.' },
  'content-discovery': { title: 'Content & FAQ Discovery', category: 'Intelligence', description: 'Content calendar gaps and customer question mining.' },
  'opportunity-analysis': { title: 'Opportunity Analysis', category: 'Intelligence', description: 'Automated gap-to-service problem identification.' },
  'lead-scoring': { title: 'Lead Scoring Engine', category: 'Pipeline', description: 'Transparent 100-point rubric lead qualification.' },
  'outreach-strategy': { title: 'Outreach Strategy', category: 'Outreach', description: 'Personalized consultative outreach synthesis.' },
  'gmail-integration': { title: 'Gmail Integration', category: 'Outreach', description: 'One-click Gmail OAuth drafting and review workflow.' },
  'crm-pipeline': { title: 'CRM & Pipeline', category: 'Pipeline', description: 'Kanban prospect tracking and activity timeline.' },
  'ai-assistant': { title: 'AI Assistant (RAG)', category: 'Productivity', description: 'Conversational grounded repository intelligence.' },
  'competitor-monitor': { title: 'Competitor Monitoring', category: 'Intelligence', description: 'Snapshot diff tracking and market movements.' },
  'multi-market': { title: 'Multi-Market Comparison', category: 'Intelligence', description: 'Cross-metro benchmarking and expansion matrix.' },
  'buyer-signals': { title: 'Buyer Signals', category: 'Intelligence', description: 'High-intent buying triggers and readiness scoring.' },
  'service-recommendations': { title: 'Services & Packages', category: 'Commerce', description: 'Service catalog, packaging, and custom tiering.' },
  'proposals': { title: 'Proposals & Quotations', category: 'Commerce', description: 'Interactive proposal generation and pricing calculations.' },
  'client-projects': { title: 'Client Projects & Delivery', category: 'Operations', description: 'Task tracking, onboarding wizards, and deliverables.' },
  'agency-performance': { title: 'Revenue & Financials', category: 'Finance', description: 'Invoicing, aging AR, cash flow, and profitability.' },
  'client-portal': { title: 'Client Portal', category: 'Operations', description: 'Branded external stakeholder review and feedback portal.' },
  'automation-hub': { title: 'Automation Hub', category: 'Automation', description: 'Event-driven triggers, actions, and outbound webhooks.' },
};

export function hasPermission(
  role: TenantRole,
  permission: TenantPermission,
  isPlatformSuperAdmin = false
): boolean {
  if (isPlatformSuperAdmin) return true;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export function isSuperAdminUser(user?: TenantUser | null): boolean {
  if (!user) return false;
  return Boolean(user.isPlatformSuperAdmin);
}

export function canAccessModule(
  role: TenantRole,
  moduleId: string,
  tenantModuleConfig?: TenantModuleConfig,
  isPlatformSuperAdmin = false
): boolean {
  if (isPlatformSuperAdmin) return true;

  // 1. Check if tenant has disabled this module globally
  if (tenantModuleConfig?.enabledModules) {
    if (tenantModuleConfig.enabledModules[moduleId] === false) {
      return false;
    }
  }

  // 2. Role-specific module restrictions
  if (moduleId === 'command-center') {
    return hasPermission(role, 'view_ceo_command', isPlatformSuperAdmin);
  }

  if (moduleId === 'agency-performance') {
    return hasPermission(role, 'view_financials', isPlatformSuperAdmin);
  }

  if (moduleId === 'automation-hub') {
    return hasPermission(role, 'manage_automations', isPlatformSuperAdmin);
  }

  return true;
}
