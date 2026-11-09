import dns from 'node:dns';
import { promisify } from 'node:util';
import type {
  Business,
  WebsiteAudit,
  AuditCategoryScore,
  AuditFinding,
  ScoreBand,
  AuditDimensions,
  Contact,
  EmailDiscoveryRecord,
  Opportunity,
  LeadScore,
  FollowUpSchedule,
  CrmActivity,
  ResearchProject,
  EmailVerificationStatus,
} from '@/types';
import { discoveryManager } from '../discovery/discoveryManager';
import { isSafeTargetUrl, safeFetch } from '../ssrfGuard';
import { classifyDecisionMakerRole } from '@/lib/engines/decisionMakerEngine';
import { generateOpportunities } from '@/lib/engines/opportunities';
import { calculateLeadScore } from '@/lib/engines/scoring';
import { calculateDueDate } from '@/lib/engines/followUpEngine';
import { ServerTenantRepository } from '../tenantRepository';

const resolveMx = promisify(dns.resolveMx);

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  'guerrillamail.com',
  '10minutemail.com',
  'trashmail.com',
  'sharklasers.com',
  'yopmail.com',
  'getairmail.com',
  'dispostable.com',
]);

const ROLE_PREFIXES = new Set([
  'info',
  'sales',
  'support',
  'contact',
  'admin',
  'billing',
  'office',
  'help',
  'service',
  'dispatch',
  'team',
  'careers',
  'jobs',
  'press',
  'media',
]);

export type PipelineMode = 'discovery' | 'existing_businesses';

export interface PipelineExecuteInput {
  mode?: PipelineMode;
  industry?: string;
  location?: string;
  count?: number;
  minimumScore?: number;
  projectId?: string;
  projectName?: string;
  existingBusinesses?: Business[];
  excludeDemo?: boolean;
  tenantId?: string;
  userId?: string;
}

export interface StageResult {
  stage:
    | 'BUSINESS_DISCOVERY'
    | 'BUSINESS_DEDUPLICATION'
    | 'WEBSITE_AUDIT'
    | 'CONTACT_EXTRACTION'
    | 'DECISION_MAKER_ANALYSIS'
    | 'EMAIL_VERIFICATION'
    | 'OPPORTUNITY_ANALYSIS'
    | 'LEAD_SCORING'
    | 'CRM_PERSISTENCE'
    | 'FOLLOW_UP_SCHEDULING';
  status: 'completed' | 'partial' | 'skipped' | 'failed';
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  recordsSkipped: number;
  durationMs: number;
  startedAt?: string;
  completedAt?: string;
  retryCount?: number;
  error?: string;
  details?: Record<string, any>;
}

export interface PipelineExecutionResult {
  runId: string;
  success: boolean;
  status: 'completed' | 'partial' | 'failed' | 'unconfigured';
  mode: PipelineMode;
  industry: string;
  location: string;
  requestedCount: number;
  minimumScore: number;
  totalDurationMs: number;
  startedAt: string;
  completedAt: string;
  stages: StageResult[];
  summary: {
    totalDiscovered: number;
    deduplicated: number;
    audited: number;
    auditFailed: number;
    auditSkipped: number;
    contactsFound: number;
    emailsVerified: number;
    opportunitiesGenerated: number;
    leadsScored: number;
    leadsQualified: number;
    totalRetries: number;
  };
  data: {
    project: ResearchProject;
    businesses: Business[];
    audits: WebsiteAudit[];
    contacts: Contact[];
    emailRecords: EmailDiscoveryRecord[];
    opportunities: Opportunity[];
    leadScores: LeadScore[];
    followUpSchedules: FollowUpSchedule[];
    crmActivities: CrmActivity[];
  };
  error?: string;
  errorCode?: string;
  help?: string;
}

// In-flight execution lock to prevent simultaneous duplicate executions on the same project
const inFlightPipelineLocks = new Set<string>();

export function acquirePipelineLock(lockKey: string): boolean {
  if (inFlightPipelineLocks.has(lockKey)) {
    return false;
  }
  inFlightPipelineLocks.add(lockKey);
  return true;
}

export function releasePipelineLock(lockKey: string): void {
  inFlightPipelineLocks.delete(lockKey);
}

/**
 * Worker pool helper for bounded concurrency.
 */
async function runWithBoundedConcurrency<T, R>(
  items: T[],
  concurrency: number,
  workerFn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const idx = nextIndex++;
      results[idx] = await workerFn(items[idx], idx);
    }
  }

  const workersCount = Math.min(concurrency, items.length);
  const workers = Array.from({ length: workersCount }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function executePipeline(input: PipelineExecuteInput): Promise<PipelineExecutionResult> {
  const startTime = Date.now();
  const runStartedIso = new Date(startTime).toISOString();
  const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const mode: PipelineMode =
    input.mode || (input.existingBusinesses && input.existingBusinesses.length > 0 ? 'existing_businesses' : 'discovery');
  const count = Math.max(1, Math.min(input.count || 10, 100));
  const minimumScore = typeof input.minimumScore === 'number' ? input.minimumScore : 40;

  const industry = (
    input.industry ||
    (input.existingBusinesses && input.existingBusinesses[0]?.serviceArea) ||
    'Commercial Services'
  ).trim();
  const location = (
    input.location ||
    (input.existingBusinesses && input.existingBusinesses[0]?.city
      ? `${input.existingBusinesses[0].city}, ${input.existingBusinesses[0].state || ''}, ${input.existingBusinesses[0].country || 'USA'}`
      : 'Local Market')
  ).trim();

  const projectId =
    input.projectId ||
    (input.existingBusinesses && input.existingBusinesses[0]?.projectId) ||
    `proj-pipe-${Date.now()}`;
  const projectName = input.projectName || `${industry} Pipeline ?" ${location}`;

  const tenantId =
    input.tenantId ||
    (input.existingBusinesses && (input.existingBusinesses[0] as any)?.tenantId) ||
    'tenant-watech-hq';
  const tenantRepo = new ServerTenantRepository(tenantId);

  // Concurrency Lock: Guard against duplicate in-flight pipeline runs on the same project
  const lockKey = `${mode}:${tenantId}:${projectId}`;
  if (!acquirePipelineLock(lockKey)) {
    return {
      runId,
      success: false,
      status: 'failed',
      mode,
      industry,
      location,
      requestedCount: count,
      minimumScore,
      totalDurationMs: 0,
      startedAt: runStartedIso,
      completedAt: new Date().toISOString(),
      stages: [],
      summary: {
        totalDiscovered: 0,
        deduplicated: 0,
        audited: 0,
        auditFailed: 0,
        auditSkipped: 0,
        contactsFound: 0,
        emailsVerified: 0,
        opportunitiesGenerated: 0,
        leadsScored: 0,
        leadsQualified: 0,
        totalRetries: 0,
      },
      data: {
        project: {
          id: projectId,
          name: projectName,
          country: 'USA',
          stateRegion: '',
          cityArea: location,
          industryNiche: industry,
          businessModel: 'commercial',
          watechServicesToEvaluate: [],
          researchDepth: 'deep',
          isDemo: false,
          createdAt: runStartedIso,
          updatedAt: runStartedIso,
        },
        businesses: [],
        audits: [],
        contacts: [],
        emailRecords: [],
        opportunities: [],
        leadScores: [],
        followUpSchedules: [],
        crmActivities: [],
      },
      error: 'Concurrent pipeline execution blocked: An active pipeline run is already in progress for this project.',
      errorCode: 'CONCURRENT_EXECUTION_LOCKED',
      help: 'Wait for the active pipeline run to finish before initiating another execution.',
    };
  }

  const distLock = await tenantRepo.acquireDistributedLock(projectId, 120000, runId);
  if (!distLock.acquired) {
    releasePipelineLock(lockKey);
    return {
      runId,
      success: false,
      status: 'failed',
      mode,
      industry,
      location,
      requestedCount: count,
      minimumScore,
      totalDurationMs: 0,
      startedAt: runStartedIso,
      completedAt: new Date().toISOString(),
      stages: [],
      summary: {
        totalDiscovered: 0,
        deduplicated: 0,
        audited: 0,
        auditFailed: 0,
        auditSkipped: 0,
        contactsFound: 0,
        emailsVerified: 0,
        opportunitiesGenerated: 0,
        leadsScored: 0,
        leadsQualified: 0,
        totalRetries: 0,
      },
      data: {
        project: {
          id: projectId,
          name: projectName,
          country: 'USA',
          stateRegion: '',
          cityArea: location,
          industryNiche: industry,
          businessModel: 'commercial',
          watechServicesToEvaluate: [],
          researchDepth: 'deep',
          isDemo: false,
          createdAt: runStartedIso,
          updatedAt: runStartedIso,
        },
        businesses: [],
        audits: [],
        contacts: [],
        emailRecords: [],
        opportunities: [],
        leadScores: [],
        followUpSchedules: [],
        crmActivities: [],
      },
      error: distLock.error || 'Concurrent pipeline execution blocked: An active pipeline run is already in progress for this project.',
      errorCode: 'CONCURRENT_EXECUTION_LOCKED',
      help: 'Wait for the active pipeline run to finish before initiating another execution.',
    };
  }

  try {
    const stages: StageResult[] = [];
    let totalRetries = 0;

    const project: ResearchProject = {
      id: projectId,
      name: projectName,
      country: 'USA',
      stateRegion: location.includes(',') ? location.split(',')[1]?.trim() || '' : '',
      cityArea: location.includes(',') ? location.split(',')[0]?.trim() || location : location,
      industryNiche: industry,
      businessModel: 'commercial',
      watechServicesToEvaluate: [
        'website_development',
        'google_business_profile',
        'conversion_optimization',
        'crm',
        'automation',
      ],
      researchDepth: 'deep',
      targetDiscoveryCount: count,
      isDemo: false,
      createdAt: runStartedIso,
      updatedAt: runStartedIso,
    };

    const businesses: Business[] = [];
    const audits: WebsiteAudit[] = [];
    const contacts: Contact[] = [];
    const emailRecords: EmailDiscoveryRecord[] = [];
    const opportunities: Opportunity[] = [];
    const leadScores: LeadScore[] = [];
    const followUpSchedules: FollowUpSchedule[] = [];
    const crmActivities: CrmActivity[] = [];

    let totalDiscoveredCount = 0;
    let deduplicatedCount = 0;

    // -------------------------------------------------------------
    // STAGE 1: BUSINESS_DISCOVERY & STAGE 2: DEDUPLICATION
    // -------------------------------------------------------------
    if (mode === 'existing_businesses') {
      const s1Start = Date.now();
      const rawSelected = input.existingBusinesses || [];

      stages.push({
        stage: 'BUSINESS_DISCOVERY',
        status: 'skipped',
        recordsProcessed: rawSelected.length,
        recordsSucceeded: rawSelected.length,
        recordsFailed: 0,
        recordsSkipped: rawSelected.length,
        durationMs: Date.now() - s1Start,
        startedAt: new Date(s1Start).toISOString(),
        completedAt: new Date().toISOString(),
        retryCount: 0,
        details: {
          reason: 'EXISTING_BUSINESS_SELECTED',
          count: rawSelected.length,
          mode: 'existing_businesses',
        },
      });

      totalDiscoveredCount = rawSelected.length;

      // Stage 2: Deduplicate within provided list & filter demo if requested
      const s2Start = Date.now();
      const seenIds = new Set<string>();
      const seenDomains = new Set<string>();

      for (const rawBiz of rawSelected) {
        if (input.excludeDemo && rawBiz.isDemo) {
          deduplicatedCount++;
          continue;
        }
        if (seenIds.has(rawBiz.id)) {
          deduplicatedCount++;
          continue;
        }
        const rawDomain = (rawBiz.domain || rawBiz.websiteUrl || '')
          .toLowerCase()
          .trim()
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .replace(/\/.*$/, '');

        if (rawDomain && seenDomains.has(rawDomain)) {
          deduplicatedCount++;
          continue;
        }

        seenIds.add(rawBiz.id);
        if (rawDomain) seenDomains.add(rawDomain);
        businesses.push({ ...rawBiz });
      }

      stages.push({
        stage: 'BUSINESS_DEDUPLICATION',
        status: 'completed',
        recordsProcessed: rawSelected.length,
        recordsSucceeded: businesses.length,
        recordsFailed: 0,
        recordsSkipped: deduplicatedCount,
        durationMs: Date.now() - s2Start,
        startedAt: new Date(s2Start).toISOString(),
        completedAt: new Date().toISOString(),
        retryCount: 0,
        details: { deduplicatedCount, finalCount: businesses.length },
      });
    } else {
      // Mode A: Discovery Provider
      const s1Start = Date.now();
      const discoveryResult = await discoveryManager.discover({
        industry,
        location,
        count,
      });

      if (!discoveryResult.success) {
        stages.push({
          stage: 'BUSINESS_DISCOVERY',
          status: 'failed',
          recordsProcessed: count,
          recordsSucceeded: 0,
          recordsFailed: count,
          recordsSkipped: 0,
          durationMs: Date.now() - s1Start,
          startedAt: new Date(s1Start).toISOString(),
          completedAt: new Date().toISOString(),
          retryCount: 0,
          error: discoveryResult.error || 'Discovery provider failed',
          details: { errorCode: discoveryResult.errorCode },
        });

        return {
          runId,
          success: false,
          status: 'unconfigured',
          mode,
          industry,
          location,
          requestedCount: count,
          minimumScore,
          totalDurationMs: Date.now() - startTime,
          startedAt: runStartedIso,
          completedAt: new Date().toISOString(),
          stages,
          summary: {
            totalDiscovered: 0,
            deduplicated: 0,
            audited: 0,
            auditFailed: 0,
            auditSkipped: 0,
            contactsFound: 0,
            emailsVerified: 0,
            opportunitiesGenerated: 0,
            leadsScored: 0,
            leadsQualified: 0,
            totalRetries: 0,
          },
          data: {
            project,
            businesses: [],
            audits: [],
            contacts: [],
            emailRecords: [],
            opportunities: [],
            leadScores: [],
            followUpSchedules: [],
            crmActivities: [],
          },
          error: discoveryResult.error,
          errorCode: discoveryResult.errorCode,
          help: discoveryResult.help,
        };
      }

      totalDiscoveredCount = discoveryResult.businesses.length;

      stages.push({
        stage: 'BUSINESS_DISCOVERY',
        status: 'completed',
        recordsProcessed: count,
        recordsSucceeded: discoveryResult.businesses.length,
        recordsFailed: 0,
        recordsSkipped: 0,
        durationMs: Date.now() - s1Start,
        startedAt: new Date(s1Start).toISOString(),
        completedAt: new Date().toISOString(),
        retryCount: 0,
        details: { provider: discoveryResult.provider },
      });

      // Stage 2: Deduplicate discovered businesses
      const s2Start = Date.now();
      const seenIds = new Set<string>();
      const seenDomains = new Set<string>();

      for (const disc of discoveryResult.businesses) {
        const discId = `biz-disc-${disc.providerId}`;
        if (seenIds.has(discId)) {
          deduplicatedCount++;
          continue;
        }
        const rawDomain = (disc.domain || disc.websiteUrl || '')
          .toLowerCase()
          .trim()
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .replace(/\/.*$/, '');

        if (rawDomain && seenDomains.has(rawDomain)) {
          deduplicatedCount++;
          continue;
        }

        seenIds.add(discId);
        if (rawDomain) seenDomains.add(rawDomain);

        businesses.push({
          id: discId,
          projectId,
          googlePlaceId: disc.providerId,
          officialName: disc.name,
          brandName: disc.name,
          domain: rawDomain,
          websiteUrl: disc.websiteUrl || (rawDomain ? `https://${rawDomain}` : ''),
          hasWebsite: Boolean(disc.websiteUrl && disc.websiteUrl.length > 5),
          phone: disc.phone,
          fullAddress: disc.formattedAddress,
          city: disc.city,
          state: disc.state,
          country: disc.country || 'USA',
          postalCode: disc.postalCode,
          serviceArea: location,
          businessModel: 'commercial',
          ownerVerificationStatus: 'unverified',
          reviewRating: disc.rating,
          reviewCount: disc.userRatingCount,
          marketingChannels: ['organic_search', 'local_listings'],
          status: 'discovered',
          queueStatus: 'research_next',
          isDemo: false,
          createdAt: runStartedIso,
          updatedAt: runStartedIso,
        });
      }

      stages.push({
        stage: 'BUSINESS_DEDUPLICATION',
        status: 'completed',
        recordsProcessed: discoveryResult.businesses.length,
        recordsSucceeded: businesses.length,
        recordsFailed: 0,
        recordsSkipped: deduplicatedCount,
        durationMs: Date.now() - s2Start,
        startedAt: new Date(s2Start).toISOString(),
        completedAt: new Date().toISOString(),
        retryCount: 0,
        details: { deduplicatedCount },
      });
    }

    // Storage for HTML snippet per business for contact extraction
    const htmlCache: Map<string, string> = new Map();

    // -------------------------------------------------------------
    // STAGE 3: WEBSITE_AUDIT (Bounded Concurrency & Controlled Retry)
    // -------------------------------------------------------------
    const s3Start = Date.now();
    let auditSucceeded = 0;
    let auditFailed = 0;
    let auditSkipped = 0;
    let stage3Retries = 0;

    // Use bounded worker pool with max 4 concurrent requests
    const auditResults = await runWithBoundedConcurrency(businesses, 4, async (biz) => {
      if (!biz.hasWebsite || !biz.websiteUrl || biz.websiteUrl.trim().length < 5) {
        return { bizId: biz.id, status: 'skipped' as const };
      }

      const syncCheck = isSafeTargetUrl(biz.websiteUrl);
      if (!syncCheck.safe) {
        return { bizId: biz.id, status: 'failed' as const, error: syncCheck.reason };
      }

      let attempt = 0;
      const maxAttempts = 2; // Initial try + 1 retry for transient network drops

      while (attempt < maxAttempts) {
        attempt++;
        try {
          const auditResult = await inspectWebsiteInternal(biz.websiteUrl, biz.id, projectId);
          if (auditResult.audit) {
            return {
              bizId: biz.id,
              status: 'succeeded' as const,
              audit: auditResult.audit,
              html: auditResult.html,
              retriesUsed: attempt - 1,
            };
          }

          // If retryable and attempts left, back off and retry
          if (auditResult.retryable && attempt < maxAttempts) {
            stage3Retries++;
            await new Promise((r) => setTimeout(r, 200 * attempt));
            continue;
          }

          return { bizId: biz.id, status: 'failed' as const, error: auditResult.error || 'Inspection failed' };
        } catch (err: any) {
          if (attempt < maxAttempts) {
            stage3Retries++;
            await new Promise((r) => setTimeout(r, 200 * attempt));
            continue;
          }
          return { bizId: biz.id, status: 'failed' as const, error: err.message || 'Inspection error' };
        }
      }

      return { bizId: biz.id, status: 'failed' as const };
    });

    for (const res of auditResults) {
      if (res.status === 'succeeded' && res.audit) {
        audits.push(res.audit);
        if (res.html) {
          htmlCache.set(res.bizId, res.html);
        }
        const b = businesses.find((x) => x.id === res.bizId);
        if (b) b.status = 'audited';
        auditSucceeded++;
      } else if (res.status === 'skipped') {
        auditSkipped++;
      } else {
        auditFailed++;
      }
    }

    totalRetries += stage3Retries;

    stages.push({
      stage: 'WEBSITE_AUDIT',
      status:
        auditFailed > 0 && auditSucceeded === 0
          ? 'failed'
          : auditFailed > 0 || auditSkipped > 0
          ? 'partial'
          : 'completed',
      recordsProcessed: businesses.length,
      recordsSucceeded: auditSucceeded,
      recordsFailed: auditFailed,
      recordsSkipped: auditSkipped,
      durationMs: Date.now() - s3Start,
      startedAt: new Date(s3Start).toISOString(),
      completedAt: new Date().toISOString(),
      retryCount: stage3Retries,
    });

    // -------------------------------------------------------------
    // STAGE 4: CONTACT_EXTRACTION
    // -------------------------------------------------------------
    const s4Start = Date.now();
    let contactsExtractedCount = 0;

    for (const biz of businesses) {
      const html = htmlCache.get(biz.id);
      const bizContacts: Contact[] = [];

      // Record dispatch reception if phone exists
      if (biz.phone && !bizContacts.some((c) => c.phone === biz.phone)) {
        bizContacts.push({
          id: `ct-reception-${biz.id}`,
          businessId: biz.id,
          projectId,
          fullName: `${biz.officialName} Office`,
          roleOrTitle: 'Office & Dispatch',
          phone: biz.phone,
          company: biz.officialName,
          verificationStatus: 'verified',
          confidence: 0.9,
          contactSourceLabel: 'official_company_source',
          isDecisionMaker: false,
          decisionMakerTier: 'general_staff',
          notes: 'Dispatch reception contact',
        });
      }

      if (html && biz.websiteUrl) {
        const extracted = extractContactsFromHtml(html, biz.websiteUrl, biz.id, projectId, biz.officialName);
        for (const item of extracted) {
          if (!bizContacts.some((c) => c.email && c.email.toLowerCase() === item.email?.toLowerCase())) {
            bizContacts.push(item);
          }
        }
      }

      contacts.push(...bizContacts);
      contactsExtractedCount += bizContacts.length;
    }

    // Free HTML cache memory now that contacts and audit are extracted
    htmlCache.clear();

    stages.push({
      stage: 'CONTACT_EXTRACTION',
      status: 'completed',
      recordsProcessed: businesses.length,
      recordsSucceeded: contactsExtractedCount,
      recordsFailed: 0,
      recordsSkipped: 0,
      durationMs: Date.now() - s4Start,
      startedAt: new Date(s4Start).toISOString(),
      completedAt: new Date().toISOString(),
      retryCount: 0,
    });

    // -------------------------------------------------------------
    // STAGE 5: DECISION_MAKER_ANALYSIS
    // -------------------------------------------------------------
    const s5Start = Date.now();
    let decisionMakersIdentified = 0;

    for (const contact of contacts) {
      const classification = classifyDecisionMakerRole(contact.roleOrTitle, '10-25');
      contact.isDecisionMaker = classification.isDecisionMaker;
      contact.decisionMakerTier = classification.tier;
      if (classification.isDecisionMaker) {
        decisionMakersIdentified++;
      }
    }

    stages.push({
      stage: 'DECISION_MAKER_ANALYSIS',
      status: 'completed',
      recordsProcessed: contacts.length,
      recordsSucceeded: decisionMakersIdentified,
      recordsFailed: 0,
      recordsSkipped: 0,
      durationMs: Date.now() - s5Start,
      startedAt: new Date(s5Start).toISOString(),
      completedAt: new Date().toISOString(),
      retryCount: 0,
      details: { decisionMakersIdentified },
    });

    // -------------------------------------------------------------
    // STAGE 6: EMAIL_VERIFICATION (Bounded Concurrency & DNS Guard)
    // -------------------------------------------------------------
    const s6Start = Date.now();
    let verifiedEmailsCount = 0;

    const emailsToVerify = Array.from(
      new Set(contacts.map((c) => c.email).filter((e): e is string => Boolean(e && e.includes('@'))))
    );

    const verificationMap = new Map<string, EmailDiscoveryRecord>();

    const emailVerificationResults = await runWithBoundedConcurrency(emailsToVerify, 4, async (email) => {
      try {
        const record = await verifyEmailInternal(email, projectId);
        return record;
      } catch {
        // Fallback safe invalid record on unhandled DNS error
        const [localPart, domainPart] = email.trim().toLowerCase().split('@');
        const fallbackRecord: EmailDiscoveryRecord = {
          id: `eml-${email.replace(/[^a-z0-9]/gi, '-').substring(0, 30)}`,
          businessId: '',
          projectId,
          email: email.trim().toLowerCase(),
          emailType: 'general_business',
          discoverySource: 'website',
          sourceUrl: `https://${domainPart}`,
          discoveryDate: new Date().toISOString(),
          sourceType: 'website_scrape',
          confidence: 0.1,
          verificationStatus: 'invalid',
          syntaxValid: true,
          mxRecordsPresent: false,
          isDisposable: false,
          isRoleBased: false,
          isOutreachSafe: false,
        };
        return fallbackRecord;
      }
    });

    for (const record of emailVerificationResults) {
      verificationMap.set(record.email.toLowerCase(), record);
      emailRecords.push(record);
      if (record.verificationStatus === 'domain_passed_unconfirmed' || record.verificationStatus === 'provider_verified') {
        verifiedEmailsCount++;
      }
    }

    // Update contacts with verification status
    for (const contact of contacts) {
      if (contact.email) {
        const verified = verificationMap.get(contact.email.toLowerCase());
        if (verified) {
          contact.verificationStatus = verified.verificationStatus === 'invalid' ? 'unverified' : 'verified';
        }
      }
    }

    stages.push({
      stage: 'EMAIL_VERIFICATION',
      status: 'completed',
      recordsProcessed: emailsToVerify.length,
      recordsSucceeded: verifiedEmailsCount,
      recordsFailed: emailsToVerify.length - verifiedEmailsCount,
      recordsSkipped: 0,
      durationMs: Date.now() - s6Start,
      startedAt: new Date(s6Start).toISOString(),
      completedAt: new Date().toISOString(),
      retryCount: 0,
    });

    // -------------------------------------------------------------
    // STAGE 7: OPPORTUNITY_ANALYSIS
    // -------------------------------------------------------------
    const s7Start = Date.now();
    let opportunitiesCount = 0;

    for (const biz of businesses) {
      const audit = audits.find((a) => a.businessId === biz.id);
      const opps = generateOpportunities(biz, audit, []);
      opportunities.push(...opps);
      opportunitiesCount += opps.length;
    }

    stages.push({
      stage: 'OPPORTUNITY_ANALYSIS',
      status: 'completed',
      recordsProcessed: businesses.length,
      recordsSucceeded: opportunitiesCount,
      recordsFailed: 0,
      recordsSkipped: 0,
      durationMs: Date.now() - s7Start,
      startedAt: new Date(s7Start).toISOString(),
      completedAt: new Date().toISOString(),
      retryCount: 0,
    });

    // -------------------------------------------------------------
    // STAGE 8: LEAD_SCORING (Deterministic 100-Point Engine)
    // -------------------------------------------------------------
    const s8Start = Date.now();

    for (const biz of businesses) {
      const audit = audits.find((a) => a.businessId === biz.id);
      const bizContacts = contacts.filter((c) => c.businessId === biz.id);
      const score = calculateLeadScore(biz, audit, bizContacts, []);
      leadScores.push(score);

      if (score.totalScore >= minimumScore) {
        biz.status = 'qualified';
        biz.queueStatus = 'prepare_outreach';
      } else {
        biz.status = audit ? 'audited' : 'discovered';
        biz.queueStatus = 'research_next';
      }
    }

    const qualifiedCount = businesses.filter((b) => b.status === 'qualified').length;

    stages.push({
      stage: 'LEAD_SCORING',
      status: 'completed',
      recordsProcessed: businesses.length,
      recordsSucceeded: leadScores.length,
      recordsFailed: 0,
      recordsSkipped: 0,
      durationMs: Date.now() - s8Start,
      startedAt: new Date(s8Start).toISOString(),
      completedAt: new Date().toISOString(),
      retryCount: 0,
      details: { qualifiedCount },
    });

    // -------------------------------------------------------------
    // STAGE 9: CRM_PERSISTENCE (Preparation)
    // -------------------------------------------------------------
    const s9Start = Date.now();

    for (const biz of businesses) {
      if (biz.status === 'qualified') {
        const score = leadScores.find((s) => s.businessId === biz.id);
        crmActivities.push({
          id: `act-qual-${biz.id}`,
          businessId: biz.id,
          projectId,
          type: 'qualification_changed',
          title: 'Lead Qualified for Outreach',
          description: `Lead passed autonomous qualification with score ${score?.totalScore ?? 0}/100 (Threshold: ${minimumScore}).`,
          actor: 'Watech Autonomous Pipeline',
          metadata: { score: score?.totalScore, minimumScore },
          timestamp: new Date().toISOString(),
        });
      }
    }

    stages.push({
      stage: 'CRM_PERSISTENCE',
      status: 'completed',
      recordsProcessed: businesses.length,
      recordsSucceeded: qualifiedCount,
      recordsFailed: 0,
      recordsSkipped: businesses.length - qualifiedCount,
      durationMs: Date.now() - s9Start,
      startedAt: new Date(s9Start).toISOString(),
      completedAt: new Date().toISOString(),
      retryCount: 0,
    });

    // -------------------------------------------------------------
    // STAGE 10: FOLLOW_UP_SCHEDULING
    // -------------------------------------------------------------
    const s10Start = Date.now();
    let schedulesCreated = 0;
    const nowIso = new Date().toISOString();

    for (const biz of businesses) {
      if (biz.status === 'qualified') {
        const nextDate = calculateDueDate(nowIso, 3);
        const sched: FollowUpSchedule = {
          id: `sched-${biz.id}`,
          businessId: biz.id,
          projectId,
          firstOutreachDate: nowIso.split('T')[0],
          nextFollowUpDate: nextDate,
          followUpIntervalDays: 3,
          attemptNumber: 1,
          maxAttempts: 4,
          preferredChannel: biz.email ? 'email' : 'phone',
          timezone: 'America/New_York',
          status: 'scheduled',
          notes: 'Autonomous pipeline follow-up initialized upon lead qualification.',
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        followUpSchedules.push(sched);
        schedulesCreated++;

        crmActivities.push({
          id: `act-sched-${biz.id}`,
          businessId: biz.id,
          projectId,
          type: 'followup_scheduled',
          title: 'Initial Follow-Up Scheduled',
          description: `Follow-up set for ${nextDate} via ${sched.preferredChannel}.`,
          actor: 'Watech Autonomous Pipeline',
          metadata: { nextFollowUpDate: nextDate },
          timestamp: nowIso,
        });
      }
    }

    stages.push({
      stage: 'FOLLOW_UP_SCHEDULING',
      status: 'completed',
      recordsProcessed: qualifiedCount,
      recordsSucceeded: schedulesCreated,
      recordsFailed: 0,
      recordsSkipped: 0,
      durationMs: Date.now() - s10Start,
      startedAt: new Date(s10Start).toISOString(),
      completedAt: new Date().toISOString(),
      retryCount: 0,
    });

    const overallStatus =
      auditFailed > 0 || auditSkipped > 0 || deduplicatedCount > 0
        ? 'partial'
        : qualifiedCount > 0
        ? 'completed'
        : 'partial';

    const completedIso = new Date().toISOString();

    // Centralized Database Persistence (PostgreSQL / Prisma)
    try {
      await tenantRepo.savePipelineBatch({
        project,
        businesses,
        audits,
        contacts,
        opportunities,
        leadScores,
        followUpSchedules,
        crmActivities,
        runId,
      });
    } catch (err: any) {
      console.warn('[PipelineRunner] Warning: Centralized batch save encountered non-fatal error:', err.message);
    }

    return {
      runId,
      success: true,
      status: overallStatus,
      mode,
      industry,
      location,
      requestedCount: count,
      minimumScore,
      totalDurationMs: Date.now() - startTime,
      startedAt: runStartedIso,
      completedAt: completedIso,
      stages,
      summary: {
        totalDiscovered: totalDiscoveredCount,
        deduplicated: deduplicatedCount,
        audited: auditSucceeded,
        auditFailed,
        auditSkipped,
        contactsFound: contactsExtractedCount,
        emailsVerified: verifiedEmailsCount,
        opportunitiesGenerated: opportunitiesCount,
        leadsScored: leadScores.length,
        leadsQualified: qualifiedCount,
        totalRetries,
      },
      data: {
        project,
        businesses,
        audits,
        contacts,
        emailRecords,
        opportunities,
        leadScores,
        followUpSchedules,
        crmActivities,
      },
    };
  } finally {
    try {
      await tenantRepo.releaseDistributedLock(projectId, runId);
    } catch {
      // Ignored
    }
    releasePipelineLock(lockKey);
  }
}

// -------------------------------------------------------------
// INTERNAL ENGINE HELPERS
// -------------------------------------------------------------

async function inspectWebsiteInternal(
  url: string,
  businessId: string,
  projectId: string
): Promise<{ audit?: WebsiteAudit; html?: string; retryable?: boolean; error?: string }> {
  let targetUrl = url.trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `https://${targetUrl}`;
  }

  // Use safeFetch with DNS rebinding defense, redirect validation, and 2MB stream limit
  const fetchResult = await safeFetch(targetUrl, {
    timeoutMs: 6000,
    maxRedirects: 3,
    maxBytes: 2 * 1024 * 1024,
  });

  if (!fetchResult.ok && fetchResult.status !== 200) {
    const isRetryable = fetchResult.status === 0 || fetchResult.status >= 500;
    return {
      audit: undefined,
      retryable: isRetryable,
      error: fetchResult.error || `HTTP ${fetchResult.status}`,
    };
  }

  const html = fetchResult.text;
  const responseTimeMs = fetchResult.durationMs;
  const httpStatus = fetchResult.status;
  const finalParsed = new URL(fetchResult.finalUrl);
  const origin = finalParsed.origin;

  // Check robots & sitemap via safeFetch
  let robotsTxtAvailable = false;
  let sitemapAvailable = false;

  try {
    const rRes = await safeFetch(`${origin}/robots.txt`, {
      method: 'HEAD',
      timeoutMs: 2500,
      maxRedirects: 1,
    });
    robotsTxtAvailable = rRes.status === 200;
  } catch {}

  try {
    const sRes = await safeFetch(`${origin}/sitemap.xml`, {
      method: 'HEAD',
      timeoutMs: 2500,
      maxRedirects: 1,
    });
    sitemapAvailable = sRes.status === 200;
  } catch {}

  // Parse DOM tags
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  const metaDescMatch =
    html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) ||
    html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);
  const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';

  const hasViewport = /<meta\s+name=["']viewport["']/i.test(html);
  const hasSsl = fetchResult.finalUrl.startsWith('https://');

  const categories: AuditCategoryScore[] = [
    {
      category: 'existence_and_accessibility',
      categoryName: 'Existence & Accessibility',
      score: httpStatus === 200 ? 90 : 50,
      weight: 15,
      status: httpStatus === 200 ? 'passed' : 'warning',
      findingsCount: 0,
      summary: `HTTP Status ${httpStatus}, Response Time ${responseTimeMs}ms`,
    },
    {
      category: 'visual_credibility',
      categoryName: 'Visual Credibility',
      score: hasViewport ? 80 : 40,
      weight: 15,
      status: hasViewport ? 'passed' : 'warning',
      findingsCount: 0,
      summary: hasViewport ? 'Viewport configured for responsive devices' : 'Missing responsive viewport tag',
    },
    {
      category: 'mobile_responsiveness',
      categoryName: 'Mobile Responsiveness',
      score: hasViewport ? 85 : 35,
      weight: 20,
      status: hasViewport ? 'passed' : 'failed',
      findingsCount: 0,
      summary: hasViewport ? 'Mobile viewport detected' : 'Non-responsive mobile layout',
    },
    {
      category: 'performance_and_speed',
      categoryName: 'Performance & Speed',
      score: responseTimeMs < 1200 ? 85 : responseTimeMs < 3000 ? 65 : 40,
      weight: 15,
      status: responseTimeMs < 1500 ? 'passed' : 'warning',
      findingsCount: 0,
      summary: `Server response latency: ${responseTimeMs}ms`,
    },
    {
      category: 'technical_seo',
      categoryName: 'Technical SEO',
      score: title && metaDescription ? 80 : title ? 60 : 30,
      weight: 20,
      status: title && metaDescription ? 'passed' : 'warning',
      findingsCount: 0,
      summary: `Title: ${title.length > 0 ? 'Present' : 'Missing'}, Meta Description: ${metaDescription.length > 0 ? 'Present' : 'Missing'}`,
    },
    {
      category: 'local_seo',
      categoryName: 'Local SEO',
      score: robotsTxtAvailable && sitemapAvailable ? 85 : 55,
      weight: 15,
      status: 'warning',
      findingsCount: 0,
      summary: `robots.txt: ${robotsTxtAvailable ? 'Yes' : 'No'}, sitemap.xml: ${sitemapAvailable ? 'Yes' : 'No'}`,
    },
  ];

  const totalScore = Math.round(categories.reduce((acc, c) => acc + c.score, 0) / categories.length);
  const grade: ScoreBand = totalScore >= 80 ? 'A' : totalScore >= 60 ? 'B' : totalScore >= 40 ? 'C' : 'Hold';

  const auditId = `audit-${businessId}`;
  const now = new Date().toISOString();

  const findings: AuditFinding[] = [];
  if (!metaDescription) {
    findings.push({
      id: `fnd-meta-${businessId}`,
      auditId,
      category: 'technical_seo',
      severity: 'medium',
      observation: 'The homepage does not define a meta description, impairing click-through rates in organic search.',
      evidenceUrlOrSnippet: 'Missing <meta name="description"> tag',
      confidence: 0.9,
      customerImpact: 'Moderate loss in organic search CTR and qualified traffic.',
      recommendedAction: 'Add a concise 150-160 character meta description emphasizing commercial offerings.',
      isAutomated: true,
    });
  }

  if (!hasViewport) {
    findings.push({
      id: `fnd-vp-${businessId}`,
      auditId,
      category: 'mobile_responsiveness',
      severity: 'high',
      observation: 'Mobile devices cannot properly scale the layout without a viewport definition.',
      evidenceUrlOrSnippet: 'No responsive viewport tag located',
      confidence: 0.95,
      customerImpact: 'Degraded mobile experience and search ranking penalties.',
      recommendedAction: 'Implement <meta name="viewport" content="width=device-width, initial-scale=1.0">.',
      isAutomated: true,
    });
  }

  if (responseTimeMs > 2500) {
    findings.push({
      id: `fnd-perf-${businessId}`,
      auditId,
      category: 'performance_and_speed',
      severity: 'medium',
      observation: `Homepage initial response took ${responseTimeMs}ms, exceeding the 1.5s threshold.`,
      evidenceUrlOrSnippet: `Latency: ${responseTimeMs}ms`,
      confidence: 0.85,
      customerImpact: 'Increased bounce rates and poor Core Web Vitals.',
      recommendedAction: 'Enable edge caching, modernize hosting architecture, and compress unoptimized assets.',
      isAutomated: true,
    });
  }

  const dimensions: AuditDimensions = {
    technicalHealth: categories.find((c) => c.category === 'existence_and_accessibility')?.score ?? 80,
    seoReadiness: categories.find((c) => c.category === 'technical_seo')?.score ?? 70,
    performance: categories.find((c) => c.category === 'performance_and_speed')?.score ?? 70,
    conversionReadiness: 65,
    userExperience: categories.find((c) => c.category === 'visual_credibility')?.score ?? 70,
    trustAndCredibility: 75,
  };

  const audit: WebsiteAudit = {
    id: auditId,
    businessId,
    projectId,
    targetUrl: fetchResult.finalUrl,
    totalScore,
    grade,
    inspectedAt: now,
    responseTimeMs,
    httpStatus,
    hasSsl,
    isAutomated: true,
    scoringRulesVersion: 'v2.0-deterministic',
    dimensions,
    robotsTxtAvailable,
    sitemapAvailable,
    categories,
    findings,
    advancedIssues: [],
  };

  return { audit, html };
}

function extractContactsFromHtml(
  html: string,
  url: string,
  businessId: string,
  projectId: string,
  businessName: string
): Contact[] {
  const contacts: Contact[] = [];
  const parsedDomain = new URL(url).hostname.replace(/^www\./, '');

  // 1. Email extraction via regex
  const rawEmails = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi) || [];
  const validEmails = Array.from(
    new Set(
      rawEmails
        .map((e) => e.toLowerCase())
        .filter(
          (e) =>
            !e.endsWith('.png') &&
            !e.endsWith('.jpg') &&
            !e.endsWith('.webp') &&
            !e.includes('example.com') &&
            !e.includes('sentry.io') &&
            !e.includes('wixpress.com') &&
            !e.includes('schema.org')
        )
    )
  );

  // 2. Phone extraction
  const telMatches = (html.match(/href=["']tel:([^"']*)["']/gi) || []).map((t) =>
    t.replace(/href=["']tel:/i, '').replace(/["']/g, '').trim()
  );
  const patternPhones = html.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [];
  const primaryPhone = Array.from(new Set([...telMatches, ...patternPhones]))[0];

  // 3. Create contacts from emails
  for (const email of validEmails) {
    const [localPart] = email.split('@');
    const isRole = ROLE_PREFIXES.has(localPart);

    contacts.push({
      id: `ct-${email.replace(/[^a-z0-9]/gi, '-').substring(0, 30)}`,
      businessId,
      projectId,
      fullName: isRole ? `${businessName} Office` : 'Direct Contact',
      roleOrTitle: isRole ? 'Office & Dispatch' : 'Team / Executive Member',
      email,
      phone: primaryPhone,
      company: businessName,
      verificationStatus: 'unverified',
      confidence: 0.8,
      contactSourceLabel: 'official_company_source',
      isDecisionMaker: !isRole,
      decisionMakerTier: isRole ? 'general_staff' : 'tier3_management',
    });
  }

  return contacts;
}

async function verifyEmailInternal(email: string, projectId: string): Promise<EmailDiscoveryRecord> {
  const trimmed = email.trim().toLowerCase();
  const [localPart, domainPart] = trimmed.split('@');
  const now = new Date().toISOString();

  let mxRecordsPresent = false;
  let mxRecords: string[] = [];

  try {
    const records = await resolveMx(domainPart);
    if (records && records.length > 0) {
      mxRecordsPresent = true;
      mxRecords = records.sort((a, b) => a.priority - b.priority).map((r) => r.exchange);
    }
  } catch {
    mxRecordsPresent = false;
  }

  const isDisposable = DISPOSABLE_DOMAINS.has(domainPart);
  const isRole = ROLE_PREFIXES.has(localPart);

  let verificationStatus: EmailVerificationStatus = 'unknown';
  if (!mxRecordsPresent) {
    verificationStatus = 'invalid';
  } else if (isDisposable) {
    verificationStatus = 'disposable';
  } else {
    verificationStatus = 'domain_passed_unconfirmed';
  }

  const emailSlug = trimmed.replace(/[^a-z0-9]/gi, '-').substring(0, 30);

  return {
    id: `eml-${emailSlug}`,
    businessId: '', // linked by caller
    projectId,
    email: trimmed,
    emailType: isRole ? 'department_email' : 'named_professional',
    discoverySource: 'website',
    sourceUrl: `https://${domainPart}`,
    discoveryDate: now,
    sourceType: 'website_scrape',
    confidence: mxRecordsPresent ? 0.85 : 0.2,
    verificationStatus,
    syntaxValid: true,
    mxRecordsPresent,
    isDisposable,
    isRoleBased: isRole,
    isOutreachSafe: mxRecordsPresent && !isDisposable,
    providerResponse: {
      mxRecords,
      isDisposable,
      isRoleBased: isRole,
      verifiedViaDns: mxRecordsPresent,
    },
  };
}
