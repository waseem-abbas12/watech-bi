import Dexie, { type Table } from 'dexie';
import type {
  ResearchProject,
  MarketArea,
  Business,
  WebsiteAudit,
  AuditFinding,
  IntelligenceFact,
  ContentItem,
  Opportunity,
  LeadScore,
  Contact,
  EmailDiscoveryRecord,
  SourceRecord,
  OutreachDraft,
  SuppressionRecord,
  LocalSeoProfile,
  LocalReview,
  ContentCalendarItem,
  CustomerQuestionInsight,
  OutreachProspectStrategy,
  FollowUpSchedule,
  CrmActivity,
  GmailDraftRecord,
  AIConversation,
  CompetitorWatchItem,
  CompetitorSnapshot,
  CompetitorChange,
  MarketComparison,
  MarketComparisonSnapshot,
  WatechServiceItem,
  WatechServicePackage,
  BusinessServiceRecommendation,
  BuyerSignal,
  SalesReadinessRecord,
  BusinessProposal,
  ProposalVersion,
  ProposalQuotation,
  BrandingConfiguration,
  ClientProfile,
  ClientOnboarding,
  ClientRequirement,
  ClientAsset,
  ClientProject,
  ProjectTask,
  ProjectMilestone,
  TeamMember,
  Deliverable,
  DeliverableRevision,
  ClientCommunication,
  ProjectExpense,
  AgencyInvoice,
  PaymentRecord,
  AgencyExpense,
  RecurringContract,
  FinancialAuditLog,
  ClientPortalUser,
  ClientRequest,
  ClientNotification,
  ClientApprovalRecord,
  ClientInvitation,
  AutomationWorkflow,
  AutomationEvent,
  AutomationExecution,
  AutomationApproval,
  IntegrationConnection,
  WebhookEndpoint,
  WebhookDelivery,
  CeoTarget,
  CeoDailyBriefing,
  CeoWeeklyReview,
  CeoNextBestAction,
  Tenant,
  TenantBranding,
  TenantPlan,
  TenantSubscription,
  TenantUser,
  TenantInvitation,
  TenantDomain,
  TenantUsage,
  TenantAuditLog,
  TenantModuleConfig,
} from '@/types';

export class WatechDatabase extends Dexie {
  projects!: Table<ResearchProject, string>;
  marketAreas!: Table<MarketArea, string>;
  businesses!: Table<Business, string>;
  audits!: Table<WebsiteAudit, string>;
  auditFindings!: Table<AuditFinding, string>;
  intelligenceFacts!: Table<IntelligenceFact, string>;
  contentItems!: Table<ContentItem, string>;
  opportunities!: Table<Opportunity, string>;
  leadScores!: Table<LeadScore, string>;
  contacts!: Table<Contact, string>;
  emails!: Table<EmailDiscoveryRecord, string>;
  sources!: Table<SourceRecord, string>;
  outreachDrafts!: Table<OutreachDraft, string>;
  suppressions!: Table<SuppressionRecord, string>;
  localSeoProfiles!: Table<LocalSeoProfile, string>;
  localReviews!: Table<LocalReview, string>;
  contentCalendarItems!: Table<ContentCalendarItem, string>;
  customerQuestions!: Table<CustomerQuestionInsight, string>;
  outreachStrategies!: Table<OutreachProspectStrategy, string>;
  followUpSchedules!: Table<FollowUpSchedule, string>;
  crmActivities!: Table<CrmActivity, string>;
  gmailDraftRecords!: Table<GmailDraftRecord, string>;
  aiConversations!: Table<AIConversation, string>;
  competitorWatchlist!: Table<CompetitorWatchItem, string>;
  competitorSnapshots!: Table<CompetitorSnapshot, string>;
  competitorChanges!: Table<CompetitorChange, string>;
  marketComparisons!: Table<MarketComparison, string>;
  marketComparisonSnapshots!: Table<MarketComparisonSnapshot, string>;
  watechServices!: Table<WatechServiceItem, string>;
  servicePackages!: Table<WatechServicePackage, string>;
  serviceRecommendations!: Table<BusinessServiceRecommendation, string>;
  buyerSignals!: Table<BuyerSignal, string>;
  salesReadinessRecords!: Table<SalesReadinessRecord, string>;
  proposals!: Table<BusinessProposal, string>;
  proposalVersions!: Table<ProposalVersion, string>;
  quotations!: Table<ProposalQuotation, string>;
  brandingConfigurations!: Table<BrandingConfiguration, string>;
  clients!: Table<ClientProfile, string>;
  clientOnboardings!: Table<ClientOnboarding, string>;
  clientRequirements!: Table<ClientRequirement, string>;
  clientAssets!: Table<ClientAsset, string>;
  clientProjects!: Table<ClientProject, string>;
  projectTasks!: Table<ProjectTask, string>;
  projectMilestones!: Table<ProjectMilestone, string>;
  teamMembers!: Table<TeamMember, string>;
  deliverables!: Table<Deliverable, string>;
  deliverableRevisions!: Table<DeliverableRevision, string>;
  clientCommunications!: Table<ClientCommunication, string>;
  projectExpenses!: Table<ProjectExpense, string>;
  invoices!: Table<AgencyInvoice, string>;
  payments!: Table<PaymentRecord, string>;
  agencyExpenses!: Table<AgencyExpense, string>;
  recurringContracts!: Table<RecurringContract, string>;
  financialAuditLogs!: Table<FinancialAuditLog, string>;
  clientPortalUsers!: Table<ClientPortalUser, string>;
  clientRequests!: Table<ClientRequest, string>;
  clientNotifications!: Table<ClientNotification, string>;
  clientApprovals!: Table<ClientApprovalRecord, string>;
  clientInvitations!: Table<ClientInvitation, string>;
  automationWorkflows!: Table<AutomationWorkflow, string>;
  automationEvents!: Table<AutomationEvent, string>;
  automationExecutions!: Table<AutomationExecution, string>;
  automationApprovals!: Table<AutomationApproval, string>;
  integrationConnections!: Table<IntegrationConnection, string>;
  webhookEndpoints!: Table<WebhookEndpoint, string>;
  webhookDeliveries!: Table<WebhookDelivery, string>;
  ceoTargets!: Table<CeoTarget, string>;
  ceoDailyBriefings!: Table<CeoDailyBriefing, string>;
  ceoWeeklyReviews!: Table<CeoWeeklyReview, string>;
  ceoActions!: Table<CeoNextBestAction, string>;
  tenants!: Table<Tenant, string>;
  tenantBranding!: Table<TenantBranding, string>;
  tenantPlans!: Table<TenantPlan, string>;
  tenantSubscriptions!: Table<TenantSubscription, string>;
  tenantUsers!: Table<TenantUser, string>;
  tenantInvitations!: Table<TenantInvitation, string>;
  tenantDomains!: Table<TenantDomain, string>;
  tenantUsage!: Table<TenantUsage, string>;
  tenantAuditLogs!: Table<TenantAuditLog, string>;
  tenantModuleConfigs!: Table<TenantModuleConfig, string>;

  constructor() {
    super('WatechBiDatabase');
    this.version(2).stores({
      projects: 'id, name, country, cityArea, createdAt',
      marketAreas: 'id, projectId, name',
      businesses: 'id, projectId, domain, officialName, status, isDemo',
      audits: 'id, businessId, projectId, totalScore, grade',
      auditFindings: 'id, auditId, category, severity',
      intelligenceFacts: 'id, businessId, projectId, category, verificationStatus',
      contentItems: 'id, businessId, projectId, contentType',
      opportunities: 'id, businessId, projectId, relevantWatechService, effort, impact',
      leadScores: 'id, businessId, projectId, totalScore, band',
      contacts: 'id, businessId, projectId, isDecisionMaker, verificationStatus',
      emails: 'id, businessId, projectId, email, verificationStatus, emailType',
      sources: 'id, projectId, businessId, sourceType, verificationStatus',
      outreachDrafts: 'id, businessId, projectId, status, isSuppressed',
      suppressions: 'id, domain, email, phone',
    });

    this.version(3).stores({
      localSeoProfiles: 'id, businessId, projectId, businessName, primaryCategory, reviewCount',
      localReviews: 'id, profileId, businessId, projectId, rating, sentiment',
    });

    this.version(4).stores({
      contentCalendarItems: 'id, businessId, projectId, status, plannedDate, priority',
      customerQuestions: 'id, businessId, projectId, category, priority',
    });

    this.version(5).stores({
      outreachStrategies: 'id, businessId, projectId, status, selectedAngleId, isSuppressed',
    });

    this.version(6).stores({
      followUpSchedules: 'id, businessId, projectId, status, nextFollowUpDate, stopReason',
      crmActivities: 'id, businessId, projectId, type, timestamp',
      gmailDraftRecords: 'id, businessId, projectId, gmailDraftId, recipient, status, createdAt',
    });

    this.version(7).stores({
      aiConversations: 'id, projectId, businessId, updatedAt',
      competitorWatchlist: 'id, businessId, competitorName, monitoringStatus, nextScheduledCheck',
      competitorSnapshots: 'id, watchId, capturedAt',
      competitorChanges: 'id, watchId, changeType, status, detectedAt',
    });

    this.version(8).stores({
      marketComparisons: 'id, name, createdAt, updatedAt',
      marketComparisonSnapshots: 'id, comparisonId, capturedAt',
    });

    this.version(9).stores({
      watechServices: 'id, category, pricingModel, isActive, name',
      servicePackages: 'id, type, pricingModel, isActive, name',
      serviceRecommendations: 'id, businessId, projectId, status, pushedToCrm, generatedAt',
      buyerSignals: 'id, businessId, projectId, category, status, confidence, lastVerifiedDate',
      salesReadinessRecords: 'id, businessId, projectId, overallScore, readinessCategory, buyingIntent, calculatedAt',
    });

    this.version(10).stores({
      proposals: 'id, businessId, projectId, status, proposalNumber, templateType, createdAt',
      proposalVersions: 'id, proposalId, versionNumber, createdAt',
      quotations: 'id, proposalId, businessId, projectId, quotationNumber, status, currency, createdAt',
      brandingConfigurations: 'id, companyName, isDefault',
    });

    this.version(11).stores({
      clients: 'id, businessId, projectId, status, companyName, createdAt',
      clientOnboardings: 'id, clientId, projectId, templateCategory, isCompleted, updatedAt',
      clientRequirements: 'id, clientId, projectId, status, priority, dueDate, createdAt',
      clientAssets: 'id, clientId, projectId, fileType, approvalStatus, uploadedAt',
      clientProjects: 'id, clientId, researchProjectId, proposalId, status, priority, targetCompletionDate, createdAt',
      projectTasks: 'id, projectId, clientId, milestoneId, status, priority, assignedToTeamMemberId, dueDate, isBlocked',
      projectMilestones: 'id, projectId, clientId, isCompleted, targetDate',
      teamMembers: 'id, name, role, isActive',
      deliverables: 'id, projectId, clientId, milestoneId, status',
      deliverableRevisions: 'id, deliverableId, projectId, clientId, status, priority, isOutOfScope',
      clientCommunications: 'id, clientId, projectId, type, channel, timestamp',
      projectExpenses: 'id, projectId, clientId, category, loggedAt',
    });

    this.version(12).stores({
      invoices: 'id, invoiceNumber, clientId, projectId, status, issueDate, dueDate',
      payments: 'id, paymentNumber, invoiceId, clientId, projectId, verificationStatus, paymentDate',
      agencyExpenses: 'id, category, clientId, projectId, paymentStatus, date',
      recurringContracts: 'id, clientId, status, nextRenewalDate',
      financialAuditLogs: 'id, entityType, entityId, action, timestamp',
    });

    this.version(13).stores({
      clientPortalUsers: 'id, clientId, email, status',
      clientRequests: 'id, clientId, projectId, category, status, priority, submittedAt',
      clientNotifications: 'id, clientId, portalUserId, type, isRead, createdAt',
      clientApprovals: 'id, clientId, entityType, entityId, decision, timestamp',
      clientInvitations: 'id, clientId, email, status, inviteToken',
    });

    this.version(14).stores({
      automationWorkflows: 'id, name, isActive, category, updatedAt',
      automationEvents: 'id, type, sourceModule, recordId, processingStatus, timestamp',
      automationExecutions: 'id, workflowId, triggerEventId, status, idempotencyKey, startedAt, completedAt',
      automationApprovals: 'id, executionId, workflowId, stepId, status, requestedAt, decidedAt',
      integrationConnections: 'id, providerId, status, updatedAt',
      webhookEndpoints: 'id, name, url, isActive, createdAt',
      webhookDeliveries: 'id, endpointId, eventId, status, attemptNumber, timestamp',
    });

    this.version(15).stores({
      ceoTargets: 'id, metricKey, period, updatedAt',
      ceoDailyBriefings: 'id, date, createdAt',
      ceoWeeklyReviews: 'id, weekStartDate, weekEndDate, createdAt',
      ceoActions: 'id, category, urgency, isCompleted, createdAt',
    });

    this.version(16).stores({
      tenants: 'id, slug, status, customDomain, createdAt',
      tenantBranding: 'id, tenantId',
      tenantPlans: 'id, slug, isCustom',
      tenantSubscriptions: 'id, tenantId, status',
      tenantUsers: 'id, tenantId, email, role, status',
      tenantInvitations: 'id, tenantId, email, token, status',
      tenantDomains: 'id, tenantId, domain, subdomain, verificationStatus',
      tenantUsage: 'id, tenantId, period',
      tenantAuditLogs: 'id, tenantId, action, timestamp',
      tenantModuleConfigs: 'id, tenantId',
    });
  }
}

export const db = typeof window !== 'undefined' ? new WatechDatabase() : (null as unknown as WatechDatabase);
