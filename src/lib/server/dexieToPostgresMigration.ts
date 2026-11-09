import { prisma, isDatabaseConfigured } from './db';

export interface MigrationSummary {
  dryRun: boolean;
  totalRecordsProcessed: number;
  tenantsImported: number;
  projectsImported: number;
  businessesImported: number;
  auditsImported: number;
  findingsImported: number;
  contactsImported: number;
  opportunitiesImported: number;
  leadScoresImported: number;
  crmActivitiesImported: number;
  followUpSchedulesImported: number;
  proposalsImported: number;
  invoicesImported: number;
  rejectedRows: Array<{ entity: string; id: string; reason: string }>;
  errors: string[];
}

/**
 * Migrates exported Dexie JSON data to centralized PostgreSQL database.
 * Supports dry-run validation, idempotent batch upserts, and rejection reporting.
 */
export async function migrateDexieToPostgreSql(
  jsonData: string,
  options: { dryRun?: boolean; defaultTenantId?: string } = {}
): Promise<MigrationSummary> {
  const dryRun = options.dryRun ?? true;
  const defaultTenantId = options.defaultTenantId || 'tenant-watech-hq';

  const summary: MigrationSummary = {
    dryRun,
    totalRecordsProcessed: 0,
    tenantsImported: 0,
    projectsImported: 0,
    businessesImported: 0,
    auditsImported: 0,
    findingsImported: 0,
    contactsImported: 0,
    opportunitiesImported: 0,
    leadScoresImported: 0,
    crmActivitiesImported: 0,
    followUpSchedulesImported: 0,
    proposalsImported: 0,
    invoicesImported: 0,
    rejectedRows: [],
    errors: [],
  };

  let parsed: any;
  try {
    parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
  } catch (err: any) {
    summary.errors.push(`JSON parse error: ${err.message}`);
    return summary;
  }

  if (!isDatabaseConfigured && !dryRun) {
    summary.errors.push('PostgreSQL database is not configured (missing DATABASE_URL).');
    return summary;
  }

  // 1. Migrate Tenants
  const tenants = parsed.tenants || [];
  for (const t of tenants) {
    summary.totalRecordsProcessed++;
    if (!t.id || !t.slug || !t.name) {
      summary.rejectedRows.push({ entity: 'tenants', id: t.id || 'unknown', reason: 'Missing required tenant fields' });
      continue;
    }

    if (!dryRun) {
      await prisma.tenant.upsert({
        where: { id: t.id },
        create: {
          id: t.id,
          slug: t.slug,
          name: t.name,
          planId: t.planId || 'plan-growth',
          status: t.status || 'active',
          customDomain: t.customDomain || null,
          contactEmail: t.contactEmail || 'admin@watech.agency',
          isPlatformSuperAdminTenant: Boolean(t.isPlatformSuperAdminTenant),
        },
        update: {
          name: t.name,
          status: t.status,
          contactEmail: t.contactEmail,
        },
      });
    }
    summary.tenantsImported++;
  }

  // Ensure default tenant exists
  if (!dryRun) {
    await prisma.tenant.upsert({
      where: { id: defaultTenantId },
      create: {
        id: defaultTenantId,
        slug: 'watech-hq',
        name: 'Watech Intelligence HQ',
        planId: 'plan-enterprise',
        status: 'active',
        contactEmail: 'admin@watech.agency',
        isPlatformSuperAdminTenant: true,
      },
      update: {},
    });
  }

  // 2. Migrate Projects
  const projects = parsed.projects || [];
  for (const p of projects) {
    summary.totalRecordsProcessed++;
    if (!p.id || !p.name) {
      summary.rejectedRows.push({ entity: 'projects', id: p.id || 'unknown', reason: 'Missing project id or name' });
      continue;
    }

    const tenantId = p.tenantId || defaultTenantId;
    if (!dryRun) {
      await prisma.researchProject.upsert({
        where: { id: p.id },
        create: {
          id: p.id,
          tenantId,
          name: p.name,
          industryNiche: p.industryNiche || null,
          cityArea: p.cityArea || null,
          status: p.status || 'active',
        },
        update: {
          name: p.name,
          status: p.status,
        },
      });
    }
    summary.projectsImported++;
  }

  // 3. Migrate Businesses
  const businesses = parsed.businesses || [];
  for (const b of businesses) {
    summary.totalRecordsProcessed++;
    if (!b.id || !b.officialName || !b.projectId) {
      summary.rejectedRows.push({ entity: 'businesses', id: b.id || 'unknown', reason: 'Missing business id, name, or projectId' });
      continue;
    }

    const tenantId = b.tenantId || defaultTenantId;
    if (!dryRun) {
      await prisma.business.upsert({
        where: { id: b.id },
        create: {
          id: b.id,
          tenantId,
          projectId: b.projectId,
          officialName: b.officialName,
          brandName: b.brandName || null,
          domain: b.domain || null,
          websiteUrl: b.websiteUrl || null,
          phone: b.phone || null,
          email: b.email || null,
          city: b.city || null,
          state: b.state || null,
          status: b.status || 'discovered',
          opportunityScore: b.opportunityScore || 0,
        },
        update: {
          officialName: b.officialName,
          domain: b.domain || null,
          websiteUrl: b.websiteUrl || null,
          phone: b.phone || null,
          email: b.email || null,
          status: b.status || 'discovered',
          opportunityScore: b.opportunityScore || 0,
        },
      });
    }
    summary.businessesImported++;
  }

  // 4. Migrate Website Audits & Findings
  const audits = parsed.audits || [];
  for (const a of audits) {
    summary.totalRecordsProcessed++;
    if (!a.id || !a.businessId || !a.projectId) {
      summary.rejectedRows.push({ entity: 'audits', id: a.id || 'unknown', reason: 'Missing audit id, businessId, or projectId' });
      continue;
    }

    const tenantId = a.tenantId || defaultTenantId;
    if (!dryRun) {
      await prisma.websiteAudit.upsert({
        where: { id: a.id },
        create: {
          id: a.id,
          tenantId,
          businessId: a.businessId,
          projectId: a.projectId,
          targetUrl: a.targetUrl || '',
          totalScore: a.totalScore || 0,
          grade: a.grade || 'N/A',
          dimensions: a.dimensions || {},
          categories: a.categories || [],
          advancedIssues: a.advancedIssues || [],
        },
        update: {
          totalScore: a.totalScore || 0,
          grade: a.grade || 'N/A',
          dimensions: a.dimensions || {},
          categories: a.categories || [],
        },
      });
    }
    summary.auditsImported++;
  }

  const findings = parsed.auditFindings || [];
  for (const f of findings) {
    summary.totalRecordsProcessed++;
    if (!f.id || !f.auditId || !f.category || !f.observation) {
      summary.rejectedRows.push({ entity: 'auditFindings', id: f.id || 'unknown', reason: 'Missing audit finding required fields' });
      continue;
    }

    const tenantId = f.tenantId || defaultTenantId;
    if (!dryRun) {
      await prisma.auditFinding.upsert({
        where: { id: f.id },
        create: {
          id: f.id,
          tenantId,
          auditId: f.auditId,
          category: f.category,
          severity: f.severity || 'medium',
          observation: f.observation,
          evidenceUrlOrSnippet: f.evidenceUrlOrSnippet || null,
        },
        update: {
          severity: f.severity || 'medium',
          observation: f.observation,
        },
      });
    }
    summary.findingsImported++;
  }

  // 5. Migrate Contacts
  const contacts = parsed.contacts || [];
  for (const c of contacts) {
    summary.totalRecordsProcessed++;
    if (!c.id || !c.businessId || !c.fullName) {
      summary.rejectedRows.push({ entity: 'contacts', id: c.id || 'unknown', reason: 'Missing contact id, businessId, or fullName' });
      continue;
    }

    const tenantId = c.tenantId || defaultTenantId;
    const projectId = c.projectId || (parsed.businesses?.find((b: any) => b.id === c.businessId)?.projectId) || projects[0]?.id;

    if (!projectId) {
      summary.rejectedRows.push({ entity: 'contacts', id: c.id, reason: 'Unable to resolve projectId for contact' });
      continue;
    }

    if (!dryRun) {
      await prisma.contact.upsert({
        where: { id: c.id },
        create: {
          id: c.id,
          tenantId,
          businessId: c.businessId,
          projectId,
          fullName: c.fullName,
          roleOrTitle: c.roleOrTitle || null,
          isDecisionMaker: Boolean(c.isDecisionMaker),
          decisionMakerTier: c.decisionMakerTier || null,
          email: c.email || null,
          phone: c.phone || null,
          linkedinUrl: c.linkedinUrl || null,
          contactSourceLabel: c.contactSourceLabel || null,
        },
        update: {
          fullName: c.fullName,
          roleOrTitle: c.roleOrTitle || null,
          isDecisionMaker: Boolean(c.isDecisionMaker),
          email: c.email || null,
          phone: c.phone || null,
        },
      });
    }
    summary.contactsImported++;
  }

  // 6. Migrate Opportunities
  const opportunities = parsed.opportunities || [];
  for (const o of opportunities) {
    summary.totalRecordsProcessed++;
    if (!o.id || !o.businessId || !o.category || !o.title) {
      summary.rejectedRows.push({ entity: 'opportunities', id: o.id || 'unknown', reason: 'Missing opportunity required fields' });
      continue;
    }

    const tenantId = o.tenantId || defaultTenantId;
    const projectId = o.projectId || (parsed.businesses?.find((b: any) => b.id === o.businessId)?.projectId) || projects[0]?.id;

    if (!projectId) {
      summary.rejectedRows.push({ entity: 'opportunities', id: o.id, reason: 'Unable to resolve projectId for opportunity' });
      continue;
    }

    if (!dryRun) {
      await prisma.opportunity.upsert({
        where: { id: o.id },
        create: {
          id: o.id,
          tenantId,
          businessId: o.businessId,
          projectId,
          category: o.category,
          title: o.title,
          description: o.description || '',
          severity: o.severity || 'medium',
          impact: o.impact || 'moderate',
          confidenceScore: o.confidenceScore || 80,
          evidenceSnippets: o.evidenceSnippets || [],
        },
        update: {
          title: o.title,
          description: o.description || '',
          severity: o.severity || 'medium',
        },
      });
    }
    summary.opportunitiesImported++;
  }

  // 7. Migrate Lead Scores
  const leadScores = parsed.leadScores || [];
  for (const s of leadScores) {
    summary.totalRecordsProcessed++;
    if (!s.id || !s.businessId || s.score === undefined) {
      summary.rejectedRows.push({ entity: 'leadScores', id: s.id || 'unknown', reason: 'Missing lead score required fields' });
      continue;
    }

    const tenantId = s.tenantId || defaultTenantId;
    const projectId = s.projectId || (parsed.businesses?.find((b: any) => b.id === s.businessId)?.projectId) || projects[0]?.id;

    if (!projectId) {
      summary.rejectedRows.push({ entity: 'leadScores', id: s.id, reason: 'Unable to resolve projectId for leadScore' });
      continue;
    }

    if (!dryRun) {
      await prisma.leadScore.upsert({
        where: { id: s.id },
        create: {
          id: s.id,
          tenantId,
          businessId: s.businessId,
          projectId,
          score: s.score,
          scoreBand: s.scoreBand || 'Hold',
          isQualified: Boolean(s.isQualified),
          scoringBreakdown: s.scoringBreakdown || {},
        },
        update: {
          score: s.score,
          scoreBand: s.scoreBand || 'Hold',
          isQualified: Boolean(s.isQualified),
        },
      });
    }
    summary.leadScoresImported++;
  }

  // 8. Migrate CRM Activities
  const crmActivities = parsed.crmActivities || [];
  for (const act of crmActivities) {
    summary.totalRecordsProcessed++;
    if (!act.id || !act.businessId || !act.type) {
      summary.rejectedRows.push({ entity: 'crmActivities', id: act.id || 'unknown', reason: 'Missing crmActivity required fields' });
      continue;
    }

    const tenantId = act.tenantId || defaultTenantId;
    const projectId = act.projectId || (parsed.businesses?.find((b: any) => b.id === act.businessId)?.projectId) || projects[0]?.id;

    if (!projectId) {
      summary.rejectedRows.push({ entity: 'crmActivities', id: act.id, reason: 'Unable to resolve projectId for crmActivity' });
      continue;
    }

    if (!dryRun) {
      await prisma.crmActivity.upsert({
        where: { id: act.id },
        create: {
          id: act.id,
          tenantId,
          businessId: act.businessId,
          projectId,
          type: act.type,
          stage: act.stage || 'lead',
          title: act.title || 'Activity',
          notes: act.notes || null,
        },
        update: {
          stage: act.stage || 'lead',
          title: act.title || 'Activity',
          notes: act.notes || null,
        },
      });
    }
    summary.crmActivitiesImported++;
  }

  // 9. Migrate Follow-up Schedules
  const followUpSchedules = parsed.followUpSchedules || [];
  for (const sch of followUpSchedules) {
    summary.totalRecordsProcessed++;
    if (!sch.id || !sch.businessId || !sch.scheduledFor) {
      summary.rejectedRows.push({ entity: 'followUpSchedules', id: sch.id || 'unknown', reason: 'Missing followUpSchedule required fields' });
      continue;
    }

    const tenantId = sch.tenantId || defaultTenantId;
    const projectId = sch.projectId || (parsed.businesses?.find((b: any) => b.id === sch.businessId)?.projectId) || projects[0]?.id;

    if (!projectId) {
      summary.rejectedRows.push({ entity: 'followUpSchedules', id: sch.id, reason: 'Unable to resolve projectId for followUpSchedule' });
      continue;
    }

    if (!dryRun) {
      await prisma.followUpSchedule.upsert({
        where: { id: sch.id },
        create: {
          id: sch.id,
          tenantId,
          businessId: sch.businessId,
          projectId,
          scheduledFor: new Date(sch.scheduledFor),
          cadenceStep: sch.cadenceStep || 1,
          channel: sch.channel || 'email',
          status: sch.status || 'pending',
        },
        update: {
          scheduledFor: new Date(sch.scheduledFor),
          status: sch.status || 'pending',
        },
      });
    }
    summary.followUpSchedulesImported++;
  }

  return summary;
}
