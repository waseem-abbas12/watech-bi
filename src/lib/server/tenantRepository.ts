import { prisma, isDatabaseConfigured } from './db';
import type { Prisma } from '@prisma/client';

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Server-side tenant-isolated data repository.
 * Every query strictly enforces tenant isolation and handles session scoping.
 */
export class ServerTenantRepository {
  private tenantId: string;
  private isSuperAdmin: boolean;

  constructor(tenantId: string, isSuperAdmin: boolean = false) {
    if (!tenantId && !isSuperAdmin) {
      throw new Error('Tenant context is required for database operations.');
    }
    this.tenantId = tenantId;
    this.isSuperAdmin = isSuperAdmin;
  }

  /**
   * Sets the PostgreSQL session variables for transaction-level RLS policies.
   */
  async withTenantContext<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    if (!isDatabaseConfigured) {
      throw new Error('PostgreSQL database is not configured (missing DATABASE_URL).');
    }

    return await prisma.$transaction(async (tx) => {
      // Set PostgreSQL session setting for current transaction RLS
      await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${this.tenantId}'`);
      if (this.isSuperAdmin) {
        await tx.$executeRawUnsafe(`SET LOCAL app.is_super_admin = 'true'`);
      }
      return await callback(tx);
    });
  }

  // --------------------------------------------------------------------------
  // PROJECTS
  // --------------------------------------------------------------------------

  async getProjects(options: PaginationOptions = {}) {
    if (!isDatabaseConfigured) return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const [total, data] = await Promise.all([
      prisma.researchProject.count({ where: { tenantId: this.tenantId } }),
      prisma.researchProject.findMany({
        where: { tenantId: this.tenantId },
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getProjectById(id: string) {
    if (!isDatabaseConfigured) return null;
    return await prisma.researchProject.findFirst({
      where: { id, tenantId: this.tenantId },
    });
  }

  async createProject(data: { name: string; industryNiche?: string; cityArea?: string }) {
    if (!isDatabaseConfigured) throw new Error('Database not configured');
    return await prisma.researchProject.create({
      data: {
        ...data,
        tenantId: this.tenantId,
      },
    });
  }

  // --------------------------------------------------------------------------
  // BUSINESSES & LEADS
  // --------------------------------------------------------------------------

  async getBusinesses(projectId?: string, options: PaginationOptions = {}) {
    if (!isDatabaseConfigured) return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.BusinessWhereInput = {
      tenantId: this.tenantId,
      ...(projectId ? { projectId } : {}),
    };

    const [total, data] = await Promise.all([
      prisma.business.count({ where }),
      prisma.business.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getBusinessById(id: string) {
    if (!isDatabaseConfigured) return null;
    return await prisma.business.findFirst({
      where: { id, tenantId: this.tenantId },
    });
  }

  async upsertBusiness(id: string, data: Prisma.BusinessCreateWithoutTenantInput) {
    if (!isDatabaseConfigured) throw new Error('Database not configured');
    return await prisma.business.upsert({
      where: { id },
      create: {
        ...data,
        id,
        tenant: { connect: { id: this.tenantId } },
      },
      update: {
        ...data,
      },
    });
  }

  // --------------------------------------------------------------------------
  // PROPOSALS
  // --------------------------------------------------------------------------

  async getProposals(options: PaginationOptions = {}) {
    if (!isDatabaseConfigured) return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const [total, data] = await Promise.all([
      prisma.businessProposal.count({ where: { tenantId: this.tenantId } }),
      prisma.businessProposal.findMany({
        where: { tenantId: this.tenantId },
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // --------------------------------------------------------------------------
  // INVOICES & FINANCIALS
  // --------------------------------------------------------------------------

  async getInvoices(options: PaginationOptions = {}) {
    if (!isDatabaseConfigured) return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const [total, data] = await Promise.all([
      prisma.agencyInvoice.count({ where: { tenantId: this.tenantId } }),
      prisma.agencyInvoice.findMany({
        where: { tenantId: this.tenantId },
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // --------------------------------------------------------------------------
  // AUDIT LOGS
  // --------------------------------------------------------------------------

  async createAuditLog(params: {
    actorUserId?: string;
    actorEmail: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details: string;
    ipAddress?: string;
  }) {
    if (!isDatabaseConfigured) return null;
    return await prisma.tenantAuditLog.create({
      data: {
        tenantId: this.tenantId,
        actorUserId: params.actorUserId,
        actorEmail: params.actorEmail,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        details: params.details,
        ipAddress: params.ipAddress,
      },
    });
  }

  // --------------------------------------------------------------------------
  // PROJECT OWNERSHIP VERIFICATION
  // --------------------------------------------------------------------------

  async verifyProjectOwnership(projectId: string): Promise<boolean> {
    if (!isDatabaseConfigured) return true; // Local dev mode fallback
    const project = await prisma.researchProject.findFirst({
      where: {
        id: projectId,
        tenantId: this.tenantId,
      },
      select: { id: true },
    });
    return Boolean(project);
  }

  // --------------------------------------------------------------------------
  // DISTRIBUTED PIPELINE LOCK COORDINATION
  // --------------------------------------------------------------------------

  async acquireDistributedLock(
    projectId: string,
    ttlMs: number = 60000,
    workerId: string = `worker-${Date.now()}`
  ): Promise<{ acquired: boolean; lockId?: string; error?: string }> {
    const lockKey = `${this.tenantId}:${projectId}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    if (!isDatabaseConfigured) {
      // Memory fallback when live PostgreSQL is unconfigured
      return { acquired: true, lockId: `mem-${Date.now()}` };
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.pipelineLock.findUnique({
          where: { lockKey },
        });

        if (existing) {
          // If existing lock is still valid and not expired, refuse lock
          if (existing.expiresAt > now && existing.lockedBy !== workerId) {
            return {
              acquired: false,
              error: `Project is currently locked by active execution '${existing.lockedBy}' until ${existing.expiresAt.toISOString()}`,
            };
          }

          // Lock has expired or belongs to current worker -> Renew
          const renewed = await tx.pipelineLock.update({
            where: { lockKey },
            data: {
              lockedBy: workerId,
              lockedAt: now,
              expiresAt,
            },
          });
          return { acquired: true, lockId: renewed.id };
        }

        // No active lock -> Create
        const created = await tx.pipelineLock.create({
          data: {
            tenantId: this.tenantId,
            projectId,
            lockKey,
            lockedBy: workerId,
            lockedAt: now,
            expiresAt,
          },
        });
        return { acquired: true, lockId: created.id };
      });
    } catch (err: any) {
      return { acquired: false, error: err.message };
    }
  }

  async releaseDistributedLock(projectId: string, workerId?: string): Promise<boolean> {
    const lockKey = `${this.tenantId}:${projectId}`;
    if (!isDatabaseConfigured) return true;

    try {
      await prisma.pipelineLock.deleteMany({
        where: {
          lockKey,
          ...(workerId ? { lockedBy: workerId } : {}),
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // CENTRALIZED ATOMIC PIPELINE BATCH PERSISTENCE
  // --------------------------------------------------------------------------

  async savePipelineBatch(batch: {
    project: any;
    businesses: any[];
    audits: any[];
    contacts: any[];
    opportunities: any[];
    leadScores: any[];
    followUpSchedules: any[];
    crmActivities: any[];
    runId?: string;
  }) {
    if (!isDatabaseConfigured) {
      return { success: true, persistedCentrally: false, message: 'Saved to local memory (PostgreSQL not connected)' };
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Ensure project exists and belongs to this tenant
      await tx.researchProject.upsert({
        where: { id: batch.project.id },
        create: {
          id: batch.project.id,
          tenantId: this.tenantId,
          name: batch.project.name,
          industryNiche: batch.project.industryNiche,
          cityArea: batch.project.cityArea,
          status: 'active',
        },
        update: {
          name: batch.project.name,
          industryNiche: batch.project.industryNiche,
          cityArea: batch.project.cityArea,
        },
      });

      // 2. Businesses
      for (const biz of batch.businesses) {
        await tx.business.upsert({
          where: { id: biz.id },
          create: {
            id: biz.id,
            tenantId: this.tenantId,
            projectId: batch.project.id,
            officialName: biz.officialName,
            brandName: biz.brandName || null,
            domain: biz.domain || null,
            websiteUrl: biz.websiteUrl || null,
            phone: biz.phone || null,
            email: biz.email || null,
            address: biz.fullAddress || biz.address || null,
            city: biz.city || null,
            state: biz.state || null,
            zip: biz.postalCode || biz.zip || null,
            country: biz.country || 'USA',
            industry: biz.industry || null,
            subcategory: biz.subcategory || null,
            description: biz.description || null,
            latitude: biz.latitude || null,
            longitude: biz.longitude || null,
            branchInfo: biz.branchInfo || null,
            aboutPageUrl: biz.aboutPageUrl || null,
            contactPageUrl: biz.contactPageUrl || null,
            servicesPageUrl: biz.servicesPageUrl || null,
            teamPageUrl: biz.teamPageUrl || null,
            socialProfiles: biz.socialProfiles || null,
            phoneNumbers: biz.phoneNumbers || null,
            emails: biz.emails || null,
            contactFormUrl: biz.contactFormUrl || null,
            businessHours: biz.businessHours || null,
            services: biz.services || null,
            serviceArea: biz.serviceArea || null,
            googlePlaceId: biz.googlePlaceId || null,
            googleBusinessProfileUrl: biz.googleBusinessProfileUrl || null,
            reviewRating: biz.reviewRating || null,
            reviewCount: biz.reviewCount || null,
            sourceUrls: biz.sourceUrls || null,
            sourceName: biz.sourceName || null,
            discoveryTimestamp: biz.discoveryTimestamp ? new Date(biz.discoveryTimestamp) : null,
            fieldVerificationStatus: biz.fieldVerificationStatus || null,
            confidenceIndicator: biz.confidenceIndicator || null,
            status: biz.status || 'discovered',
            opportunityScore: biz.opportunityScore || 0,
          },
          update: {
            officialName: biz.officialName,
            brandName: biz.brandName || null,
            domain: biz.domain || null,
            websiteUrl: biz.websiteUrl || null,
            phone: biz.phone || null,
            email: biz.email || null,
            address: biz.fullAddress || biz.address || null,
            city: biz.city || null,
            state: biz.state || null,
            zip: biz.postalCode || biz.zip || null,
            country: biz.country || 'USA',
            industry: biz.industry || null,
            subcategory: biz.subcategory || null,
            description: biz.description || null,
            aboutPageUrl: biz.aboutPageUrl || null,
            contactPageUrl: biz.contactPageUrl || null,
            servicesPageUrl: biz.servicesPageUrl || null,
            teamPageUrl: biz.teamPageUrl || null,
            socialProfiles: biz.socialProfiles || null,
            phoneNumbers: biz.phoneNumbers || null,
            emails: biz.emails || null,
            contactFormUrl: biz.contactFormUrl || null,
            businessHours: biz.businessHours || null,
            services: biz.services || null,
            serviceArea: biz.serviceArea || null,
            googleBusinessProfileUrl: biz.googleBusinessProfileUrl || null,
            reviewRating: biz.reviewRating || null,
            reviewCount: biz.reviewCount || null,
            status: biz.status || 'discovered',
            opportunityScore: biz.opportunityScore || 0,
          },
        });
      }

      // 3. Website Audits
      for (const aud of batch.audits) {
        await tx.websiteAudit.upsert({
          where: { id: aud.id },
          create: {
            id: aud.id,
            tenantId: this.tenantId,
            businessId: aud.businessId,
            projectId: batch.project.id,
            targetUrl: aud.targetUrl || '',
            totalScore: aud.totalScore || 0,
            grade: aud.grade || 'N/A',
            dimensions: aud.dimensions || {},
            categories: aud.categories || [],
            advancedIssues: aud.advancedIssues || [],
          },
          update: {
            totalScore: aud.totalScore || 0,
            grade: aud.grade || 'N/A',
            dimensions: aud.dimensions || {},
            categories: aud.categories || [],
            advancedIssues: aud.advancedIssues || [],
          },
        });
      }

      // 4. Contacts
      for (const cnt of batch.contacts) {
        await tx.contact.upsert({
          where: { id: cnt.id },
          create: {
            id: cnt.id,
            tenantId: this.tenantId,
            businessId: cnt.businessId,
            projectId: batch.project.id,
            fullName: cnt.fullName,
            roleOrTitle: cnt.roleOrTitle || null,
            isDecisionMaker: Boolean(cnt.isDecisionMaker),
            decisionMakerTier: cnt.decisionMakerTier || null,
            email: cnt.email || null,
            phone: cnt.phone || null,
            linkedinUrl: cnt.linkedinUrl || null,
            contactSourceLabel: cnt.contactSourceLabel || null,
          },
          update: {
            fullName: cnt.fullName,
            roleOrTitle: cnt.roleOrTitle || null,
            isDecisionMaker: Boolean(cnt.isDecisionMaker),
            decisionMakerTier: cnt.decisionMakerTier || null,
            email: cnt.email || null,
            phone: cnt.phone || null,
          },
        });
      }

      // 5. Opportunities
      for (const opp of batch.opportunities) {
        await tx.opportunity.upsert({
          where: { id: opp.id },
          create: {
            id: opp.id,
            tenantId: this.tenantId,
            businessId: opp.businessId,
            projectId: batch.project.id,
            category: opp.category,
            title: opp.title,
            description: opp.description || '',
            severity: opp.severity || 'medium',
            impact: opp.impact || 'moderate',
            confidenceScore: opp.confidenceScore || 80,
            evidenceSnippets: opp.evidenceSnippets || [],
          },
          update: {
            title: opp.title,
            description: opp.description || '',
            severity: opp.severity || 'medium',
            impact: opp.impact || 'moderate',
          },
        });
      }

      // 6. Lead Scores
      for (const sc of batch.leadScores) {
        await tx.leadScore.upsert({
          where: { id: sc.id },
          create: {
            id: sc.id,
            tenantId: this.tenantId,
            businessId: sc.businessId,
            projectId: batch.project.id,
            score: sc.score,
            scoreBand: sc.scoreBand || 'Hold',
            isQualified: Boolean(sc.isQualified),
            scoringBreakdown: sc.scoringBreakdown || {},
          },
          update: {
            score: sc.score,
            scoreBand: sc.scoreBand || 'Hold',
            isQualified: Boolean(sc.isQualified),
            scoringBreakdown: sc.scoringBreakdown || {},
          },
        });
      }

      // 7. CRM Activities
      for (const act of batch.crmActivities) {
        await tx.crmActivity.upsert({
          where: { id: act.id },
          create: {
            id: act.id,
            tenantId: this.tenantId,
            businessId: act.businessId,
            projectId: batch.project.id,
            type: act.type,
            stage: act.stage,
            title: act.title,
            notes: act.notes || null,
          },
          update: {
            stage: act.stage,
            title: act.title,
            notes: act.notes || null,
          },
        });
      }

      // 8. Follow-up Schedules
      for (const sch of batch.followUpSchedules) {
        await tx.followUpSchedule.upsert({
          where: { id: sch.id },
          create: {
            id: sch.id,
            tenantId: this.tenantId,
            businessId: sch.businessId,
            projectId: batch.project.id,
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

      return {
        success: true,
        persistedCentrally: true,
        counts: {
          businesses: batch.businesses.length,
          audits: batch.audits.length,
          contacts: batch.contacts.length,
          opportunities: batch.opportunities.length,
          leadScores: batch.leadScores.length,
          crmActivities: batch.crmActivities.length,
          followUpSchedules: batch.followUpSchedules.length,
        },
      };
    });
  }
}