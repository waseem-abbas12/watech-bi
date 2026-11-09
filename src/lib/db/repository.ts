import { db, WatechDatabase } from './db';
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
import { extractDomain } from '@/lib/utils';

export interface DuplicateMatch {
  existing: Business;
  matchField: 'domain' | 'phone' | 'name' | 'address';
  confidence: number;
}

export interface IRepository {
  // Projects
  getProjects(): Promise<ResearchProject[]>;
  getProject(id: string): Promise<ResearchProject | undefined>;
  saveProject(project: ResearchProject): Promise<void>;
  deleteProject(id: string): Promise<void>;

  // Businesses
  getBusinesses(projectId?: string): Promise<Business[]>;
  getBusiness(id: string): Promise<Business | undefined>;
  saveBusiness(business: Business): Promise<void>;
  saveBusinesses(businesses: Business[]): Promise<void>;
  deleteBusiness(id: string): Promise<void>;
  savePipelineBatch(data: {
    project: ResearchProject;
    businesses: Business[];
    audits: WebsiteAudit[];
    contacts: Contact[];
    emailRecords: EmailDiscoveryRecord[];
    opportunities: Opportunity[];
    leadScores: LeadScore[];
    followUpSchedules: FollowUpSchedule[];
    crmActivities: CrmActivity[];
  }): Promise<{
    businesses: number;
    audits: number;
    contacts: number;
    emails: number;
    opportunities: number;
    scores: number;
    schedules: number;
    crmActivities: number;
  }>;
  findDuplicates(candidate: Partial<Business>, projectId?: string): Promise<DuplicateMatch[]>;

  // Market Areas
  getMarketAreas(projectId: string): Promise<MarketArea[]>;
  saveMarketArea(area: MarketArea): Promise<void>;

  // Audits
  getAudits(projectId?: string): Promise<WebsiteAudit[]>;
  getAuditForBusiness(businessId: string): Promise<WebsiteAudit | undefined>;
  saveAudit(audit: WebsiteAudit): Promise<void>;

  // Intelligence Facts
  getFacts(businessId?: string, projectId?: string): Promise<IntelligenceFact[]>;
  saveFact(fact: IntelligenceFact): Promise<void>;
  saveFacts(facts: IntelligenceFact[]): Promise<void>;

  // Content Items
  getContentItems(businessId?: string, projectId?: string): Promise<ContentItem[]>;
  saveContentItem(item: ContentItem): Promise<void>;

  // Opportunities
  getOpportunities(businessId?: string, projectId?: string): Promise<Opportunity[]>;
  saveOpportunity(opp: Opportunity): Promise<void>;
  saveOpportunities(opps: Opportunity[]): Promise<void>;

  // Lead Scores
  getScores(projectId?: string): Promise<LeadScore[]>;
  getScoreForBusiness(businessId: string): Promise<LeadScore | undefined>;
  saveScore(score: LeadScore): Promise<void>;

  // Contacts
  getContacts(businessId?: string, projectId?: string): Promise<Contact[]>;
  saveContact(contact: Contact): Promise<void>;
  saveContacts(contacts: Contact[]): Promise<void>;
  deleteContact(id: string): Promise<void>;

  // Emails
  getEmails(businessId?: string, projectId?: string): Promise<EmailDiscoveryRecord[]>;
  saveEmail(email: EmailDiscoveryRecord): Promise<void>;
  saveEmails(emails: EmailDiscoveryRecord[]): Promise<void>;
  deleteEmail(id: string): Promise<void>;

  // Sources
  getSources(projectId?: string, businessId?: string): Promise<SourceRecord[]>;
  saveSource(source: SourceRecord): Promise<void>;
  saveSources(sources: SourceRecord[]): Promise<void>;

  // Outreach Drafts
  getOutreachDrafts(projectId?: string): Promise<OutreachDraft[]>;
  getDraftForBusiness(businessId: string): Promise<OutreachDraft | undefined>;
  saveOutreachDraft(draft: OutreachDraft): Promise<void>;

  // Suppressions
  getSuppressions(): Promise<SuppressionRecord[]>;
  saveSuppression(record: SuppressionRecord): Promise<void>;
  isSuppressed(domain?: string, email?: string, phone?: string): Promise<boolean>;

  // Local SEO & GBP Profiles
  getLocalSeoProfiles(projectId?: string): Promise<LocalSeoProfile[]>;
  getLocalSeoProfileForBusiness(businessId: string): Promise<LocalSeoProfile | undefined>;
  saveLocalSeoProfile(profile: LocalSeoProfile): Promise<void>;
  saveLocalSeoProfiles(profiles: LocalSeoProfile[]): Promise<void>;
  deleteLocalSeoProfile(id: string): Promise<void>;

  // Local Reviews
  getLocalReviews(businessId?: string, projectId?: string): Promise<LocalReview[]>;
  saveLocalReview(review: LocalReview): Promise<void>;
  saveLocalReviews(reviews: LocalReview[]): Promise<void>;
  deleteLocalReview(id: string): Promise<void>;

  // Content Calendar Items
  getContentCalendarItems(businessId?: string, projectId?: string): Promise<ContentCalendarItem[]>;
  saveContentCalendarItem(item: ContentCalendarItem): Promise<void>;
  saveContentCalendarItems(items: ContentCalendarItem[]): Promise<void>;
  deleteContentCalendarItem(id: string): Promise<void>;

  // Customer Questions
  getCustomerQuestions(businessId?: string, projectId?: string): Promise<CustomerQuestionInsight[]>;
  saveCustomerQuestions(questions: CustomerQuestionInsight[]): Promise<void>;
  deleteCustomerQuestion(id: string): Promise<void>;

  // Outreach Strategies (Prompt 11)
  getOutreachStrategies(projectId?: string): Promise<OutreachProspectStrategy[]>;
  getOutreachStrategyForBusiness(businessId: string): Promise<OutreachProspectStrategy | undefined>;
  saveOutreachStrategy(strategy: OutreachProspectStrategy): Promise<void>;
  saveOutreachStrategies(strategies: OutreachProspectStrategy[]): Promise<void>;
  deleteOutreachStrategy(id: string): Promise<void>;

  // Follow-up Schedules (Prompt 13)
  getFollowUpSchedules(projectId?: string): Promise<FollowUpSchedule[]>;
  getFollowUpScheduleForBusiness(businessId: string): Promise<FollowUpSchedule | undefined>;
  saveFollowUpSchedule(schedule: FollowUpSchedule): Promise<void>;
  deleteFollowUpSchedule(id: string): Promise<void>;

  // CRM Activities (Prompt 13)
  getCrmActivities(businessId?: string, projectId?: string): Promise<CrmActivity[]>;
  logCrmActivity(activity: Omit<CrmActivity, 'id' | 'timestamp'>): Promise<CrmActivity>;
  saveCrmActivity(activity: CrmActivity): Promise<void>;

  // Gmail Draft Records (Prompt 12)
  getGmailDraftRecords(projectId?: string): Promise<GmailDraftRecord[]>;
  getGmailDraftsForBusiness(businessId: string): Promise<GmailDraftRecord[]>;
  saveGmailDraftRecord(record: GmailDraftRecord): Promise<void>;

  // AI Conversations (Prompt 14)
  getAiConversations(projectId?: string, businessId?: string): Promise<AIConversation[]>;
  getAiConversation(id: string): Promise<AIConversation | undefined>;
  saveAiConversation(conv: AIConversation): Promise<void>;
  deleteAiConversation(id: string): Promise<void>;

  // Competitor Watchlist (Prompt 15)
  getCompetitorWatchlist(projectId?: string, businessId?: string): Promise<CompetitorWatchItem[]>;
  getCompetitorWatchItem(id: string): Promise<CompetitorWatchItem | undefined>;
  saveCompetitorWatchItem(item: CompetitorWatchItem): Promise<void>;
  deleteCompetitorWatchItem(id: string): Promise<void>;

  // Competitor Snapshots (Prompt 15)
  getCompetitorSnapshots(watchId: string): Promise<CompetitorSnapshot[]>;
  getCompetitorSnapshot(id: string): Promise<CompetitorSnapshot | undefined>;
  saveCompetitorSnapshot(snapshot: CompetitorSnapshot): Promise<void>;
  deleteCompetitorSnapshot(id: string): Promise<void>;

  // Competitor Changes (Prompt 15)
  getCompetitorChanges(watchId?: string): Promise<CompetitorChange[]>;
  saveCompetitorChange(change: CompetitorChange): Promise<void>;
  saveCompetitorChanges(changes: CompetitorChange[]): Promise<void>;
  updateCompetitorChangeStatus(id: string, status: 'new' | 'reviewed' | 'important' | 'dismissed'): Promise<void>;

  // Multi-Market Intelligence (Prompt 16)
  getMarketComparisons(): Promise<MarketComparison[]>;
  getMarketComparison(id: string): Promise<MarketComparison | undefined>;
  saveMarketComparison(comp: MarketComparison): Promise<void>;
  deleteMarketComparison(id: string): Promise<void>;
  getMarketComparisonSnapshots(comparisonId?: string): Promise<MarketComparisonSnapshot[]>;
  saveMarketComparisonSnapshot(snap: MarketComparisonSnapshot): Promise<void>;
  deleteMarketComparisonSnapshot(id: string): Promise<void>;

  // Prompt 17: Buyer Signals & Sales Readiness
  getBuyerSignals(businessId?: string, projectId?: string): Promise<BuyerSignal[]>;
  saveBuyerSignal(signal: BuyerSignal): Promise<void>;
  saveBuyerSignals(signals: BuyerSignal[]): Promise<void>;
  deleteBuyerSignal(id: string): Promise<void>;
  getSalesReadinessRecord(businessId: string): Promise<SalesReadinessRecord | undefined>;
  getSalesReadinessRecords(projectId?: string): Promise<SalesReadinessRecord[]>;
  saveSalesReadinessRecord(record: SalesReadinessRecord): Promise<void>;
  deleteSalesReadinessRecord(id: string): Promise<void>;

  // Prompt 18: Watech Services, Packages & Recommendations
  getServices(category?: string, activeOnly?: boolean): Promise<WatechServiceItem[]>;
  getService(id: string): Promise<WatechServiceItem | undefined>;
  saveService(service: WatechServiceItem): Promise<void>;
  saveServices(services: WatechServiceItem[]): Promise<void>;
  deleteService(id: string): Promise<void>;

  getPackages(activeOnly?: boolean): Promise<WatechServicePackage[]>;
  getPackage(id: string): Promise<WatechServicePackage | undefined>;
  savePackage(pkg: WatechServicePackage): Promise<void>;
  savePackages(packages: WatechServicePackage[]): Promise<void>;
  deletePackage(id: string): Promise<void>;

  getRecommendations(projectId?: string): Promise<BusinessServiceRecommendation[]>;
  getRecommendationForBusiness(businessId: string): Promise<BusinessServiceRecommendation | undefined>;
  saveRecommendation(rec: BusinessServiceRecommendation): Promise<void>;
  deleteRecommendation(id: string): Promise<void>;

  // Prompt 19: Proposals, Quotations & Pricing
  getProposals(projectId?: string, businessId?: string): Promise<BusinessProposal[]>;
  getProposal(id: string): Promise<BusinessProposal | undefined>;
  saveProposal(proposal: BusinessProposal): Promise<void>;
  deleteProposal(id: string): Promise<void>;

  getProposalVersions(proposalId: string): Promise<ProposalVersion[]>;
  saveProposalVersion(version: ProposalVersion): Promise<void>;

  getQuotations(projectId?: string): Promise<ProposalQuotation[]>;
  getQuotation(id: string): Promise<ProposalQuotation | undefined>;
  saveQuotation(quotation: ProposalQuotation): Promise<void>;
  deleteQuotation(id: string): Promise<void>;

  getBrandingConfig(): Promise<BrandingConfiguration | undefined>;
  saveBrandingConfig(config: BrandingConfiguration): Promise<void>;

  // Prompt 20: Client Onboarding & Project Management
  getClients(projectId?: string): Promise<ClientProfile[]>;
  getClient(id: string): Promise<ClientProfile | undefined>;
  getClientByBusinessId(businessId: string): Promise<ClientProfile | undefined>;
  saveClient(client: ClientProfile): Promise<void>;
  updateClient(client: ClientProfile): Promise<void>;
  deleteClient(id: string): Promise<void>;

  getClientOnboarding(clientId: string): Promise<ClientOnboarding | undefined>;
  saveClientOnboarding(onboarding: ClientOnboarding): Promise<void>;

  getClientRequirements(clientId?: string, projectId?: string): Promise<ClientRequirement[]>;
  saveClientRequirement(req: ClientRequirement): Promise<void>;
  deleteClientRequirement(id: string): Promise<void>;

  getClientAssets(clientId?: string, projectId?: string): Promise<ClientAsset[]>;
  saveClientAsset(asset: ClientAsset): Promise<void>;
  deleteClientAsset(id: string): Promise<void>;

  getClientProjects(clientId?: string, researchProjectId?: string): Promise<ClientProject[]>;
  getClientProject(id: string): Promise<ClientProject | undefined>;
  saveClientProject(project: ClientProject): Promise<void>;
  deleteClientProject(id: string): Promise<void>;

  getProjectTasks(projectId?: string, clientId?: string): Promise<ProjectTask[]>;
  getProjectTask(id: string): Promise<ProjectTask | undefined>;
  saveProjectTask(task: ProjectTask): Promise<void>;
  saveProjectTasks(tasks: ProjectTask[]): Promise<void>;
  deleteProjectTask(id: string): Promise<void>;

  getProjectMilestones(projectId?: string, clientId?: string): Promise<ProjectMilestone[]>;
  saveProjectMilestone(milestone: ProjectMilestone): Promise<void>;
  saveProjectMilestones(milestones: ProjectMilestone[]): Promise<void>;
  deleteProjectMilestone(id: string): Promise<void>;

  getTeamMembers(activeOnly?: boolean): Promise<TeamMember[]>;
  getTeamMember(id: string): Promise<TeamMember | undefined>;
  saveTeamMember(member: TeamMember): Promise<void>;
  saveTeamMembers(members: TeamMember[]): Promise<void>;
  deleteTeamMember(id: string): Promise<void>;

  getDeliverables(projectId?: string, clientId?: string): Promise<Deliverable[]>;
  saveDeliverable(del: Deliverable): Promise<void>;
  deleteDeliverable(id: string): Promise<void>;

  getDeliverableRevisions(deliverableId?: string, projectId?: string): Promise<DeliverableRevision[]>;
  saveDeliverableRevision(rev: DeliverableRevision): Promise<void>;

  getClientCommunications(clientId?: string, projectId?: string): Promise<ClientCommunication[]>;
  saveClientCommunication(comm: ClientCommunication): Promise<void>;

  getProjectExpenses(projectId?: string, clientId?: string): Promise<ProjectExpense[]>;
  saveProjectExpense(expense: ProjectExpense): Promise<void>;
  deleteProjectExpense(id: string): Promise<void>;

  // Prompt 21: Revenue, Profitability & Agency Performance
  getInvoices(clientId?: string, projectId?: string): Promise<AgencyInvoice[]>;
  getInvoice(id: string): Promise<AgencyInvoice | undefined>;
  saveInvoice(invoice: AgencyInvoice): Promise<void>;
  deleteInvoice(id: string): Promise<void>;

  getPayments(invoiceId?: string, clientId?: string): Promise<PaymentRecord[]>;
  getPayment(id: string): Promise<PaymentRecord | undefined>;
  savePayment(payment: PaymentRecord): Promise<void>;
  deletePayment(id: string): Promise<void>;

  getAgencyExpenses(clientId?: string, projectId?: string): Promise<AgencyExpense[]>;
  getAgencyExpense(id: string): Promise<AgencyExpense | undefined>;
  saveAgencyExpense(expense: AgencyExpense): Promise<void>;
  deleteAgencyExpense(id: string): Promise<void>;

  getRecurringContracts(clientId?: string): Promise<RecurringContract[]>;
  getRecurringContract(id: string): Promise<RecurringContract | undefined>;
  saveRecurringContract(contract: RecurringContract): Promise<void>;
  deleteRecurringContract(id: string): Promise<void>;

  getFinancialAuditLogs(entityType?: string, entityId?: string): Promise<FinancialAuditLog[]>;
  logFinancialAudit(log: FinancialAuditLog): Promise<void>;

  // Prompt 22: Client Portal & Self-Service
  getClientPortalUsers(clientId?: string): Promise<ClientPortalUser[]>;
  getClientPortalUser(id: string): Promise<ClientPortalUser | undefined>;
  getClientPortalUserByEmail(email: string): Promise<ClientPortalUser | undefined>;
  saveClientPortalUser(user: ClientPortalUser): Promise<void>;
  deleteClientPortalUser(id: string): Promise<void>;

  getClientRequests(clientId?: string, projectId?: string): Promise<ClientRequest[]>;
  getClientRequest(id: string): Promise<ClientRequest | undefined>;
  saveClientRequest(request: ClientRequest): Promise<void>;
  deleteClientRequest(id: string): Promise<void>;

  getClientNotifications(clientId?: string, portalUserId?: string): Promise<ClientNotification[]>;
  saveClientNotification(notification: ClientNotification): Promise<void>;
  markNotificationRead(id: string): Promise<void>;

  getClientApprovals(clientId?: string, entityId?: string): Promise<ClientApprovalRecord[]>;
  saveClientApproval(approval: ClientApprovalRecord): Promise<void>;

  getClientInvitations(clientId?: string): Promise<ClientInvitation[]>;
  getClientInvitationByToken(token: string): Promise<ClientInvitation | undefined>;
  saveClientInvitation(invitation: ClientInvitation): Promise<void>;
  deleteClientInvitation(id: string): Promise<void>;

  // Prompt 23: Workflow Automation & Integrations
  getAutomationWorkflows(): Promise<AutomationWorkflow[]>;
  getAutomationWorkflow(id: string): Promise<AutomationWorkflow | undefined>;
  saveAutomationWorkflow(workflow: AutomationWorkflow): Promise<void>;
  deleteAutomationWorkflow(id: string): Promise<void>;

  getAutomationEvents(limit?: number): Promise<AutomationEvent[]>;
  getAutomationEvent(id: string): Promise<AutomationEvent | undefined>;
  saveAutomationEvent(event: AutomationEvent): Promise<void>;

  getAutomationExecutions(workflowId?: string, limit?: number): Promise<AutomationExecution[]>;
  getAutomationExecution(id: string): Promise<AutomationExecution | undefined>;
  saveAutomationExecution(execution: AutomationExecution): Promise<void>;
  deleteAutomationExecution(id: string): Promise<void>;

  getAutomationApprovals(status?: string): Promise<AutomationApproval[]>;
  getAutomationApproval(id: string): Promise<AutomationApproval | undefined>;
  saveAutomationApproval(approval: AutomationApproval): Promise<void>;

  getIntegrationConnections(): Promise<IntegrationConnection[]>;
  getIntegrationConnection(providerId: string): Promise<IntegrationConnection | undefined>;
  saveIntegrationConnection(conn: IntegrationConnection): Promise<void>;

  getWebhookEndpoints(): Promise<WebhookEndpoint[]>;
  getWebhookEndpoint(id: string): Promise<WebhookEndpoint | undefined>;
  saveWebhookEndpoint(endpoint: WebhookEndpoint): Promise<void>;
  deleteWebhookEndpoint(id: string): Promise<void>;

  getWebhookDeliveries(endpointId?: string, limit?: number): Promise<WebhookDelivery[]>;
  saveWebhookDelivery(delivery: WebhookDelivery): Promise<void>;

  // Prompt 24: CEO Command Center
  getCeoTargets(): Promise<CeoTarget[]>;
  getCeoTarget(id: string): Promise<CeoTarget | undefined>;
  saveCeoTarget(target: CeoTarget): Promise<void>;
  saveCeoTargets(targets: CeoTarget[]): Promise<void>;
  updateCeoTarget(id: string, updates: Partial<CeoTarget>): Promise<void>;
  deleteCeoTarget(id: string): Promise<void>;

  getCeoDailyBriefings(limit?: number): Promise<CeoDailyBriefing[]>;
  getCeoDailyBriefing(idOrDate: string): Promise<CeoDailyBriefing | undefined>;
  saveCeoDailyBriefing(briefing: CeoDailyBriefing): Promise<void>;

  getCeoWeeklyReviews(limit?: number): Promise<CeoWeeklyReview[]>;
  getCeoWeeklyReview(id: string): Promise<CeoWeeklyReview | undefined>;
  saveCeoWeeklyReview(review: CeoWeeklyReview): Promise<void>;

  getCeoActions(status?: 'all' | 'pending' | 'completed'): Promise<CeoNextBestAction[]>;
  getCeoAction(id: string): Promise<CeoNextBestAction | undefined>;
  saveCeoAction(action: CeoNextBestAction): Promise<void>;
  saveCeoActions(actions: CeoNextBestAction[]): Promise<void>;
  updateCeoAction(id: string, updates: Partial<CeoNextBestAction>): Promise<void>;
  deleteCeoAction(id: string): Promise<void>;

  // Prompt 25: White-Label SaaS & Multi-Tenant Architecture
  getTenants(): Promise<Tenant[]>;
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  getTenantByDomain(domain: string): Promise<Tenant | undefined>;
  saveTenant(tenant: Tenant): Promise<void>;
  updateTenant(id: string, updates: Partial<Tenant>): Promise<void>;
  deleteTenant(id: string): Promise<void>;

  getTenantBranding(tenantId: string): Promise<TenantBranding | undefined>;
  saveTenantBranding(branding: TenantBranding): Promise<void>;

  getTenantPlans(): Promise<TenantPlan[]>;
  getTenantPlan(id: string): Promise<TenantPlan | undefined>;
  getTenantPlanBySlug(slug: string): Promise<TenantPlan | undefined>;
  saveTenantPlan(plan: TenantPlan): Promise<void>;

  getTenantSubscription(tenantId: string): Promise<TenantSubscription | undefined>;
  saveTenantSubscription(sub: TenantSubscription): Promise<void>;

  getTenantUsers(tenantId?: string): Promise<TenantUser[]>;
  getTenantUser(id: string): Promise<TenantUser | undefined>;
  getTenantUserByEmail(email: string): Promise<TenantUser | undefined>;
  saveTenantUser(user: TenantUser): Promise<void>;
  deleteTenantUser(id: string): Promise<void>;

  getTenantInvitations(tenantId?: string): Promise<TenantInvitation[]>;
  saveTenantInvitation(inv: TenantInvitation): Promise<void>;
  deleteTenantInvitation(id: string): Promise<void>;

  getTenantDomains(tenantId?: string): Promise<TenantDomain[]>;
  saveTenantDomain(domain: TenantDomain): Promise<void>;
  deleteTenantDomain(id: string): Promise<void>;

  getTenantUsage(tenantId: string, period?: string): Promise<TenantUsage | undefined>;
  saveTenantUsage(usage: TenantUsage): Promise<void>;

  getTenantAuditLogs(tenantId?: string, limit?: number): Promise<TenantAuditLog[]>;
  saveTenantAuditLog(log: TenantAuditLog): Promise<void>;

  getTenantModuleConfig(tenantId: string): Promise<TenantModuleConfig | undefined>;
  saveTenantModuleConfig(config: TenantModuleConfig): Promise<void>;

  // Full Backup & Restore
  exportDatabase(): Promise<string>;
  importDatabase(jsonData: string): Promise<void>;
  clearAll(): Promise<void>;
}

class DexieRepositoryImpl implements IRepository {
  private get database(): WatechDatabase {
    if (!db) {
      throw new Error('Dexie IndexedDB is only available in the browser.');
    }
    return db;
  }

  async getProjects(): Promise<ResearchProject[]> {
    if (typeof window === 'undefined') return [];
    return this.database.projects.reverse().sortBy('createdAt');
  }

  async getProject(id: string): Promise<ResearchProject | undefined> {
    if (typeof window === 'undefined') return undefined;
    return this.database.projects.get(id);
  }

  async saveProject(project: ResearchProject): Promise<void> {
    await this.database.projects.put(project);
  }

  async deleteProject(id: string): Promise<void> {
    await this.database.transaction('rw', 
      [
        this.database.projects,
        this.database.businesses,
        this.database.audits,
        this.database.auditFindings,
        this.database.intelligenceFacts,
        this.database.contentItems,
        this.database.opportunities,
        this.database.leadScores,
        this.database.contacts,
        this.database.emails,
        this.database.sources,
        this.database.outreachDrafts,
        this.database.marketAreas,
        this.database.aiConversations,
        this.database.competitorWatchlist,
        this.database.proposals,
        this.database.quotations,
        this.database.followUpSchedules,
        this.database.crmActivities,
        this.database.localSeoProfiles,
        this.database.localReviews,
      ], 
      async () => {
        await this.database.projects.delete(id);
        await this.database.businesses.where('projectId').equals(id).delete();
        await this.database.audits.where('projectId').equals(id).delete();
        await this.database.intelligenceFacts.where('projectId').equals(id).delete();
        await this.database.contentItems.where('projectId').equals(id).delete();
        await this.database.opportunities.where('projectId').equals(id).delete();
        await this.database.leadScores.where('projectId').equals(id).delete();
        await this.database.contacts.where('projectId').equals(id).delete();
        await this.database.emails.where('projectId').equals(id).delete();
        await this.database.sources.where('projectId').equals(id).delete();
        await this.database.outreachDrafts.where('projectId').equals(id).delete();
        await this.database.marketAreas.where('projectId').equals(id).delete();
        await this.database.aiConversations.where('projectId').equals(id).delete();
        await this.database.proposals.where('projectId').equals(id).delete();
        await this.database.quotations.where('projectId').equals(id).delete();
        await this.database.followUpSchedules.where('projectId').equals(id).delete();
        await this.database.crmActivities.where('projectId').equals(id).delete();
        await this.database.localSeoProfiles.where('projectId').equals(id).delete();
        await this.database.localReviews.where('projectId').equals(id).delete();
        const watches = await this.database.competitorWatchlist.where('projectId').equals(id).toArray();
        for (const w of watches) {
          await this.database.competitorSnapshots.where('watchId').equals(w.id).delete();
          await this.database.competitorChanges.where('watchId').equals(w.id).delete();
        }
        await this.database.competitorWatchlist.where('projectId').equals(id).delete();
      }
    );
  }

  async getBusinesses(projectId?: string): Promise<Business[]> {
    if (typeof window === 'undefined') return [];
    if (projectId) {
      return this.database.businesses.where('projectId').equals(projectId).toArray();
    }
    return this.database.businesses.toArray();
  }

  async getBusiness(id: string): Promise<Business | undefined> {
    if (typeof window === 'undefined') return undefined;
    return this.database.businesses.get(id);
  }

  async saveBusiness(business: Business): Promise<void> {
    await this.database.businesses.put(business);
  }

  async saveBusinesses(businesses: Business[]): Promise<void> {
    await this.database.businesses.bulkPut(businesses);
  }

  async deleteBusiness(id: string): Promise<void> {
    if (typeof window === 'undefined') return;
    await this.database.transaction('rw', [
      this.database.businesses,
      this.database.audits,
      this.database.auditFindings,
      this.database.contacts,
      this.database.opportunities,
      this.database.leadScores,
      this.database.followUpSchedules,
      this.database.crmActivities,
      this.database.emails,
      this.database.outreachDrafts,
    ], async () => {
      await this.database.businesses.delete(id);
      await this.database.audits.where('businessId').equals(id).delete();
      await this.database.auditFindings.where('auditId').equals(`audit-${id}`).delete();
      await this.database.contacts.where('businessId').equals(id).delete();
      await this.database.opportunities.where('businessId').equals(id).delete();
      await this.database.leadScores.where('businessId').equals(id).delete();
      await this.database.followUpSchedules.where('businessId').equals(id).delete();
      await this.database.crmActivities.where('businessId').equals(id).delete();
      await this.database.emails.where('businessId').equals(id).delete();
      await this.database.outreachDrafts.where('businessId').equals(id).delete();
    });
  }

  async savePipelineBatch(data: {
    project: ResearchProject;
    businesses: Business[];
    audits: WebsiteAudit[];
    contacts: Contact[];
    emailRecords: EmailDiscoveryRecord[];
    opportunities: Opportunity[];
    leadScores: LeadScore[];
    followUpSchedules: FollowUpSchedule[];
    crmActivities: CrmActivity[];
  }): Promise<{
    businesses: number;
    audits: number;
    contacts: number;
    emails: number;
    opportunities: number;
    scores: number;
    schedules: number;
    crmActivities: number;
  }> {
    if (typeof window === 'undefined') {
      return {
        businesses: 0,
        audits: 0,
        contacts: 0,
        emails: 0,
        opportunities: 0,
        scores: 0,
        schedules: 0,
        crmActivities: 0,
      };
    }

    await this.database.transaction('rw', [
      this.database.projects,
      this.database.businesses,
      this.database.audits,
      this.database.contacts,
      this.database.emails,
      this.database.opportunities,
      this.database.leadScores,
      this.database.followUpSchedules,
      this.database.crmActivities,
    ], async () => {
      await this.database.projects.put(data.project);
      if (data.businesses.length > 0) await this.database.businesses.bulkPut(data.businesses);
      if (data.audits.length > 0) await this.database.audits.bulkPut(data.audits);
      if (data.contacts.length > 0) await this.database.contacts.bulkPut(data.contacts);
      if (data.emailRecords.length > 0) await this.database.emails.bulkPut(data.emailRecords);
      if (data.opportunities.length > 0) await this.database.opportunities.bulkPut(data.opportunities);
      if (data.leadScores.length > 0) await this.database.leadScores.bulkPut(data.leadScores);
      if (data.followUpSchedules.length > 0) await this.database.followUpSchedules.bulkPut(data.followUpSchedules);
      if (data.crmActivities.length > 0) await this.database.crmActivities.bulkPut(data.crmActivities);
    });

    return {
      businesses: data.businesses.length,
      audits: data.audits.length,
      contacts: data.contacts.length,
      emails: data.emailRecords.length,
      opportunities: data.opportunities.length,
      scores: data.leadScores.length,
      schedules: data.followUpSchedules.length,
      crmActivities: data.crmActivities.length,
    };
  }

  async findDuplicates(candidate: Partial<Business>, projectId?: string): Promise<DuplicateMatch[]> {
    if (typeof window === 'undefined') return [];
    const businesses = await this.getBusinesses(projectId);
    const matches: DuplicateMatch[] = [];

    const normDomain = candidate.domain ? extractDomain(candidate.domain) : (candidate.websiteUrl ? extractDomain(candidate.websiteUrl) : '');
    const normPhone = candidate.phone ? candidate.phone.replace(/\D/g, '') : '';
    const normName = candidate.officialName ? candidate.officialName.toLowerCase().replace(/[^a-z0-9]/g, '') : '';

    for (const b of businesses) {
      if (candidate.id && b.id === candidate.id) continue;

      const bDomain = extractDomain(b.domain || b.websiteUrl);
      if (normDomain && bDomain && normDomain === bDomain) {
        matches.push({ existing: b, matchField: 'domain', confidence: 0.98 });
        continue;
      }

      const bPhone = b.phone ? b.phone.replace(/\D/g, '') : '';
      if (normPhone && bPhone && normPhone.length >= 7 && normPhone === bPhone) {
        matches.push({ existing: b, matchField: 'phone', confidence: 0.92 });
        continue;
      }

      const bName = b.officialName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normName && bName && (normName === bName || (normName.length > 5 && bName.includes(normName)))) {
        matches.push({ existing: b, matchField: 'name', confidence: 0.85 });
      }
    }

    return matches;
  }

  async getMarketAreas(projectId: string): Promise<MarketArea[]> {
    if (typeof window === 'undefined') return [];
    return this.database.marketAreas.where('projectId').equals(projectId).toArray();
  }

  async saveMarketArea(area: MarketArea): Promise<void> {
    await this.database.marketAreas.put(area);
  }

  async getAudits(projectId?: string): Promise<WebsiteAudit[]> {
    if (typeof window === 'undefined') return [];
    if (projectId) {
      return this.database.audits.where('projectId').equals(projectId).toArray();
    }
    return this.database.audits.toArray();
  }

  async getAuditForBusiness(businessId: string): Promise<WebsiteAudit | undefined> {
    if (typeof window === 'undefined') return undefined;
    const audits = await this.database.audits.where('businessId').equals(businessId).toArray();
    return audits[0];
  }

  async saveAudit(audit: WebsiteAudit): Promise<void> {
    await this.database.audits.put(audit);
  }

  async getFacts(businessId?: string, projectId?: string): Promise<IntelligenceFact[]> {
    if (typeof window === 'undefined') return [];
    if (businessId) {
      return this.database.intelligenceFacts.where('businessId').equals(businessId).toArray();
    }
    if (projectId) {
      return this.database.intelligenceFacts.where('projectId').equals(projectId).toArray();
    }
    return this.database.intelligenceFacts.toArray();
  }

  async saveFact(fact: IntelligenceFact): Promise<void> {
    await this.database.intelligenceFacts.put(fact);
  }

  async saveFacts(facts: IntelligenceFact[]): Promise<void> {
    await this.database.intelligenceFacts.bulkPut(facts);
  }

  async getContentItems(businessId?: string, projectId?: string): Promise<ContentItem[]> {
    if (typeof window === 'undefined') return [];
    if (businessId) {
      return this.database.contentItems.where('businessId').equals(businessId).toArray();
    }
    if (projectId) {
      return this.database.contentItems.where('projectId').equals(projectId).toArray();
    }
    return this.database.contentItems.toArray();
  }

  async saveContentItem(item: ContentItem): Promise<void> {
    await this.database.contentItems.put(item);
  }

  async getOpportunities(businessId?: string, projectId?: string): Promise<Opportunity[]> {
    if (typeof window === 'undefined') return [];
    if (businessId) {
      return this.database.opportunities.where('businessId').equals(businessId).toArray();
    }
    if (projectId) {
      return this.database.opportunities.where('projectId').equals(projectId).toArray();
    }
    return this.database.opportunities.toArray();
  }

  async saveOpportunity(opp: Opportunity): Promise<void> {
    await this.database.opportunities.put(opp);
  }

  async saveOpportunities(opps: Opportunity[]): Promise<void> {
    await this.database.opportunities.bulkPut(opps);
  }

  async getScores(projectId?: string): Promise<LeadScore[]> {
    if (typeof window === 'undefined') return [];
    if (projectId) {
      return this.database.leadScores.where('projectId').equals(projectId).toArray();
    }
    return this.database.leadScores.toArray();
  }

  async getScoreForBusiness(businessId: string): Promise<LeadScore | undefined> {
    if (typeof window === 'undefined') return undefined;
    const scores = await this.database.leadScores.where('businessId').equals(businessId).toArray();
    return scores[0];
  }

  async saveScore(score: LeadScore): Promise<void> {
    await this.database.leadScores.put(score);
  }

  async getContacts(businessId?: string, projectId?: string): Promise<Contact[]> {
    if (typeof window === 'undefined') return [];
    if (businessId) {
      return this.database.contacts.where('businessId').equals(businessId).toArray();
    }
    if (projectId) {
      return this.database.contacts.where('projectId').equals(projectId).toArray();
    }
    return this.database.contacts.toArray();
  }

  async saveContact(contact: Contact): Promise<void> {
    await this.database.contacts.put(contact);
  }

  async saveContacts(contacts: Contact[]): Promise<void> {
    await this.database.contacts.bulkPut(contacts);
  }

  async deleteContact(id: string): Promise<void> {
    await this.database.contacts.delete(id);
  }

  // Emails
  async getEmails(businessId?: string, projectId?: string): Promise<EmailDiscoveryRecord[]> {
    if (typeof window === 'undefined') return [];
    if (businessId) {
      return this.database.emails.where('businessId').equals(businessId).toArray();
    }
    if (projectId) {
      return this.database.emails.where('projectId').equals(projectId).toArray();
    }
    return this.database.emails.toArray();
  }

  async saveEmail(email: EmailDiscoveryRecord): Promise<void> {
    await this.database.emails.put(email);
  }

  async saveEmails(emails: EmailDiscoveryRecord[]): Promise<void> {
    await this.database.emails.bulkPut(emails);
  }

  async deleteEmail(id: string): Promise<void> {
    await this.database.emails.delete(id);
  }

  async getSources(projectId?: string, businessId?: string): Promise<SourceRecord[]> {
    if (typeof window === 'undefined') return [];
    if (businessId) {
      return this.database.sources.where('businessId').equals(businessId).toArray();
    }
    if (projectId) {
      return this.database.sources.where('projectId').equals(projectId).toArray();
    }
    return this.database.sources.toArray();
  }

  async saveSource(source: SourceRecord): Promise<void> {
    await this.database.sources.put(source);
  }

  async saveSources(sources: SourceRecord[]): Promise<void> {
    await this.database.sources.bulkPut(sources);
  }

  async getOutreachDrafts(projectId?: string): Promise<OutreachDraft[]>;
  async getOutreachDrafts(projectId?: string): Promise<OutreachDraft[]> {
    if (typeof window === 'undefined') return [];
    if (projectId) {
      return this.database.outreachDrafts.where('projectId').equals(projectId).toArray();
    }
    return this.database.outreachDrafts.toArray();
  }

  async getDraftForBusiness(businessId: string): Promise<OutreachDraft | undefined> {
    if (typeof window === 'undefined') return undefined;
    const drafts = await this.database.outreachDrafts.where('businessId').equals(businessId).toArray();
    return drafts[0];
  }

  async saveOutreachDraft(draft: OutreachDraft): Promise<void> {
    await this.database.outreachDrafts.put(draft);
  }

  async getSuppressions(): Promise<SuppressionRecord[]> {
    if (typeof window === 'undefined') return [];
    return this.database.suppressions.toArray();
  }

  async saveSuppression(record: SuppressionRecord): Promise<void> {
    await this.database.suppressions.put(record);
  }

  async isSuppressed(domain?: string, email?: string, phone?: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const suppressions = await this.database.suppressions.toArray();
    const normDomain = domain ? extractDomain(domain) : '';
    const normPhone = phone ? phone.replace(/\D/g, '') : '';
    const normEmail = email ? email.toLowerCase().trim() : '';

    return suppressions.some(s => {
      if (normDomain && s.domain && extractDomain(s.domain) === normDomain) return true;
      if (normEmail && s.email && s.email.toLowerCase().trim() === normEmail) return true;
      if (normPhone && s.phone && s.phone.replace(/\D/g, '') === normPhone) return true;
      return false;
    });
  }

  // Local SEO & GBP Profiles
  async getLocalSeoProfiles(projectId?: string): Promise<LocalSeoProfile[]> {
    if (typeof window === 'undefined') return [];
    if (projectId) {
      return this.database.localSeoProfiles.where('projectId').equals(projectId).toArray();
    }
    return this.database.localSeoProfiles.toArray();
  }

  async getLocalSeoProfileForBusiness(businessId: string): Promise<LocalSeoProfile | undefined> {
    if (typeof window === 'undefined') return undefined;
    return this.database.localSeoProfiles.where('businessId').equals(businessId).first();
  }

  async saveLocalSeoProfile(profile: LocalSeoProfile): Promise<void> {
    await this.database.localSeoProfiles.put(profile);
  }

  async saveLocalSeoProfiles(profiles: LocalSeoProfile[]): Promise<void> {
    await this.database.localSeoProfiles.bulkPut(profiles);
  }

  async deleteLocalSeoProfile(id: string): Promise<void> {
    await this.database.localSeoProfiles.delete(id);
  }

  // Local Reviews
  async getLocalReviews(businessId?: string, projectId?: string): Promise<LocalReview[]> {
    if (typeof window === 'undefined') return [];
    if (businessId) {
      return this.database.localReviews.where('businessId').equals(businessId).toArray();
    }
    if (projectId) {
      return this.database.localReviews.where('projectId').equals(projectId).toArray();
    }
    return this.database.localReviews.toArray();
  }

  async saveLocalReview(review: LocalReview): Promise<void> {
    await this.database.localReviews.put(review);
  }

  async saveLocalReviews(reviews: LocalReview[]): Promise<void> {
    await this.database.localReviews.bulkPut(reviews);
  }

  async deleteLocalReview(id: string): Promise<void> {
    await this.database.localReviews.delete(id);
  }

  // Content Calendar Items
  async getContentCalendarItems(businessId?: string, projectId?: string): Promise<ContentCalendarItem[]> {
    if (typeof window === 'undefined') return [];
    if (businessId) {
      return this.database.contentCalendarItems.where('businessId').equals(businessId).toArray();
    }
    if (projectId) {
      return this.database.contentCalendarItems.where('projectId').equals(projectId).toArray();
    }
    return this.database.contentCalendarItems.toArray();
  }

  async saveContentCalendarItem(item: ContentCalendarItem): Promise<void> {
    await this.database.contentCalendarItems.put(item);
  }

  async saveContentCalendarItems(items: ContentCalendarItem[]): Promise<void> {
    await this.database.contentCalendarItems.bulkPut(items);
  }

  async deleteContentCalendarItem(id: string): Promise<void> {
    await this.database.contentCalendarItems.delete(id);
  }

  // Customer Questions
  async getCustomerQuestions(businessId?: string, projectId?: string): Promise<CustomerQuestionInsight[]> {
    if (typeof window === 'undefined') return [];
    if (businessId) {
      return this.database.customerQuestions.where('businessId').equals(businessId).toArray();
    }
    if (projectId) {
      return this.database.customerQuestions.where('projectId').equals(projectId).toArray();
    }
    return this.database.customerQuestions.toArray();
  }

  async saveCustomerQuestions(questions: CustomerQuestionInsight[]): Promise<void> {
    await this.database.customerQuestions.bulkPut(questions);
  }

  async deleteCustomerQuestion(id: string): Promise<void> {
    await this.database.customerQuestions.delete(id);
  }

  // Outreach Strategies (Prompt 11)
  async getOutreachStrategies(projectId?: string): Promise<OutreachProspectStrategy[]> {
    if (typeof window === 'undefined') return [];
    if (projectId) {
      return this.database.outreachStrategies.where('projectId').equals(projectId).toArray();
    }
    return this.database.outreachStrategies.toArray();
  }

  async getOutreachStrategyForBusiness(businessId: string): Promise<OutreachProspectStrategy | undefined> {
    if (typeof window === 'undefined') return undefined;
    const list = await this.database.outreachStrategies.where('businessId').equals(businessId).toArray();
    return list[0];
  }

  async saveOutreachStrategy(strategy: OutreachProspectStrategy): Promise<void> {
    await this.database.outreachStrategies.put(strategy);
  }

  async saveOutreachStrategies(strategies: OutreachProspectStrategy[]): Promise<void> {
    await this.database.outreachStrategies.bulkPut(strategies);
  }

  async deleteOutreachStrategy(id: string): Promise<void> {
    await this.database.outreachStrategies.delete(id);
  }

  // Follow-up Schedules (Prompt 13)
  async getFollowUpSchedules(projectId?: string): Promise<FollowUpSchedule[]> {
    if (typeof window === 'undefined') return [];
    if (projectId) {
      return this.database.followUpSchedules.where('projectId').equals(projectId).toArray();
    }
    return this.database.followUpSchedules.toArray();
  }

  async getFollowUpScheduleForBusiness(businessId: string): Promise<FollowUpSchedule | undefined> {
    if (typeof window === 'undefined') return undefined;
    const list = await this.database.followUpSchedules.where('businessId').equals(businessId).toArray();
    return list[0];
  }

  async saveFollowUpSchedule(schedule: FollowUpSchedule): Promise<void> {
    await this.database.followUpSchedules.put(schedule);
  }

  async deleteFollowUpSchedule(id: string): Promise<void> {
    await this.database.followUpSchedules.delete(id);
  }

  // CRM Activities (Prompt 13)
  async getCrmActivities(businessId?: string, projectId?: string): Promise<CrmActivity[]> {
    if (typeof window === 'undefined') return [];
    let list: CrmActivity[] = [];
    if (businessId) {
      list = await this.database.crmActivities.where('businessId').equals(businessId).toArray();
    } else if (projectId) {
      list = await this.database.crmActivities.where('projectId').equals(projectId).toArray();
    } else {
      list = await this.database.crmActivities.toArray();
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async logCrmActivity(activityData: Omit<CrmActivity, 'id' | 'timestamp'>): Promise<CrmActivity> {
    const activity: CrmActivity = {
      ...activityData,
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    await this.database.crmActivities.put(activity);
    return activity;
  }

  async saveCrmActivity(activity: CrmActivity): Promise<void> {
    await this.database.crmActivities.put(activity);
  }

  // Gmail Draft Records (Prompt 12)
  async getGmailDraftRecords(projectId?: string): Promise<GmailDraftRecord[]> {
    if (typeof window === 'undefined') return [];
    if (projectId) {
      return this.database.gmailDraftRecords.where('projectId').equals(projectId).toArray();
    }
    return this.database.gmailDraftRecords.toArray();
  }

  async getGmailDraftsForBusiness(businessId: string): Promise<GmailDraftRecord[]> {
    if (typeof window === 'undefined') return [];
    return this.database.gmailDraftRecords.where('businessId').equals(businessId).toArray();
  }

  async saveGmailDraftRecord(record: GmailDraftRecord): Promise<void> {
    await this.database.gmailDraftRecords.put(record);
  }

  // AI Conversations (Prompt 14)
  async getAiConversations(projectId?: string, businessId?: string): Promise<AIConversation[]> {
    if (typeof window === 'undefined') return [];
    let list = await this.database.aiConversations.toArray();
    if (projectId) {
      list = list.filter(c => c.projectId === projectId);
    }
    if (businessId) {
      list = list.filter(c => c.businessId === businessId);
    }
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async getAiConversation(id: string): Promise<AIConversation | undefined> {
    if (typeof window === 'undefined') return undefined;
    return this.database.aiConversations.get(id);
  }

  async saveAiConversation(conv: AIConversation): Promise<void> {
    await this.database.aiConversations.put(conv);
  }

  async deleteAiConversation(id: string): Promise<void> {
    await this.database.aiConversations.delete(id);
  }

  // Competitor Watchlist (Prompt 15)
  async getCompetitorWatchlist(projectId?: string, businessId?: string): Promise<CompetitorWatchItem[]> {
    if (typeof window === 'undefined') return [];
    let list = await this.database.competitorWatchlist.toArray();
    if (projectId) {
      list = list.filter(c => c.projectId === projectId);
    }
    if (businessId) {
      list = list.filter(c => c.businessId === businessId);
    }
    return list;
  }

  async getCompetitorWatchItem(id: string): Promise<CompetitorWatchItem | undefined> {
    if (typeof window === 'undefined') return undefined;
    return this.database.competitorWatchlist.get(id);
  }

  async saveCompetitorWatchItem(item: CompetitorWatchItem): Promise<void> {
    await this.database.competitorWatchlist.put(item);
  }

  async deleteCompetitorWatchItem(id: string): Promise<void> {
    await this.database.transaction('rw', [
      this.database.competitorWatchlist,
      this.database.competitorSnapshots,
      this.database.competitorChanges,
    ], async () => {
      await this.database.competitorWatchlist.delete(id);
      await this.database.competitorSnapshots.where('watchId').equals(id).delete();
      await this.database.competitorChanges.where('watchId').equals(id).delete();
    });
  }

  // Competitor Snapshots (Prompt 15)
  async getCompetitorSnapshots(watchId: string): Promise<CompetitorSnapshot[]> {
    if (typeof window === 'undefined') return [];
    const list = await this.database.competitorSnapshots.where('watchId').equals(watchId).toArray();
    return list.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
  }

  async getCompetitorSnapshot(id: string): Promise<CompetitorSnapshot | undefined> {
    if (typeof window === 'undefined') return undefined;
    return this.database.competitorSnapshots.get(id);
  }

  async saveCompetitorSnapshot(snapshot: CompetitorSnapshot): Promise<void> {
    await this.database.competitorSnapshots.put(snapshot);
  }

  async deleteCompetitorSnapshot(id: string): Promise<void> {
    await this.database.competitorSnapshots.delete(id);
  }

  // Competitor Changes (Prompt 15)
  async getCompetitorChanges(watchId?: string): Promise<CompetitorChange[]> {
    if (typeof window === 'undefined') return [];
    let list = await this.database.competitorChanges.toArray();
    if (watchId) {
      list = list.filter(c => c.watchId === watchId);
    }
    return list.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
  }

  async saveCompetitorChange(change: CompetitorChange): Promise<void> {
    await this.database.competitorChanges.put(change);
  }

  async saveCompetitorChanges(changes: CompetitorChange[]): Promise<void> {
    await this.database.competitorChanges.bulkPut(changes);
  }

  async updateCompetitorChangeStatus(id: string, status: 'new' | 'reviewed' | 'important' | 'dismissed'): Promise<void> {
    await this.database.competitorChanges.update(id, { status });
  }

  // Multi-Market Intelligence (Prompt 16)
  async getMarketComparisons(): Promise<MarketComparison[]> {
    if (typeof window === 'undefined') return [];
    return this.database.marketComparisons.reverse().sortBy('updatedAt');
  }

  async getMarketComparison(id: string): Promise<MarketComparison | undefined> {
    if (typeof window === 'undefined') return undefined;
    return this.database.marketComparisons.get(id);
  }

  async saveMarketComparison(comp: MarketComparison): Promise<void> {
    await this.database.marketComparisons.put(comp);
  }

  async deleteMarketComparison(id: string): Promise<void> {
    await this.database.transaction('rw', [
      this.database.marketComparisons,
      this.database.marketComparisonSnapshots,
    ], async () => {
      await this.database.marketComparisons.delete(id);
      await this.database.marketComparisonSnapshots.where('comparisonId').equals(id).delete();
    });
  }

  async getMarketComparisonSnapshots(comparisonId?: string): Promise<MarketComparisonSnapshot[]> {
    if (typeof window === 'undefined') return [];
    let list = await this.database.marketComparisonSnapshots.toArray();
    if (comparisonId) {
      list = list.filter(s => s.comparisonId === comparisonId);
    }
    return list.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
  }

  async saveMarketComparisonSnapshot(snap: MarketComparisonSnapshot): Promise<void> {
    await this.database.marketComparisonSnapshots.put(snap);
  }

  async deleteMarketComparisonSnapshot(id: string): Promise<void> {
    await this.database.marketComparisonSnapshots.delete(id);
  }

  // Prompt 17: Buyer Signals & Sales Readiness
  async getBuyerSignals(businessId?: string, projectId?: string): Promise<BuyerSignal[]> {
    if (typeof window === 'undefined') return [];
    if (businessId) {
      return this.database.buyerSignals.where('businessId').equals(businessId).toArray();
    }
    if (projectId) {
      return this.database.buyerSignals.where('projectId').equals(projectId).toArray();
    }
    return this.database.buyerSignals.toArray();
  }

  async saveBuyerSignal(signal: BuyerSignal): Promise<void> {
    await this.database.buyerSignals.put(signal);
  }

  async saveBuyerSignals(signals: BuyerSignal[]): Promise<void> {
    await this.database.buyerSignals.bulkPut(signals);
  }

  async deleteBuyerSignal(id: string): Promise<void> {
    await this.database.buyerSignals.delete(id);
  }

  async getSalesReadinessRecord(businessId: string): Promise<SalesReadinessRecord | undefined> {
    if (typeof window === 'undefined') return undefined;
    const list = await this.database.salesReadinessRecords.where('businessId').equals(businessId).toArray();
    return list[0];
  }

  async getSalesReadinessRecords(projectId?: string): Promise<SalesReadinessRecord[]> {
    if (typeof window === 'undefined') return [];
    if (projectId) {
      return this.database.salesReadinessRecords.where('projectId').equals(projectId).toArray();
    }
    return this.database.salesReadinessRecords.toArray();
  }

  async saveSalesReadinessRecord(record: SalesReadinessRecord): Promise<void> {
    await this.database.salesReadinessRecords.put(record);
  }

  async deleteSalesReadinessRecord(id: string): Promise<void> {
    await this.database.salesReadinessRecords.delete(id);
  }

  // Prompt 18: Watech Services, Packages & Recommendations
  async getServices(category?: string, activeOnly = false): Promise<WatechServiceItem[]> {
    if (typeof window === 'undefined') return [];
    let list = await this.database.watechServices.toArray();
    if (category) {
      list = list.filter(s => s.category === category);
    }
    if (activeOnly) {
      list = list.filter(s => s.isActive);
    }
    return list;
  }

  async getService(id: string): Promise<WatechServiceItem | undefined> {
    if (typeof window === 'undefined') return undefined;
    return this.database.watechServices.get(id);
  }

  async saveService(service: WatechServiceItem): Promise<void> {
    await this.database.watechServices.put(service);
  }

  async saveServices(services: WatechServiceItem[]): Promise<void> {
    await this.database.watechServices.bulkPut(services);
  }

  async deleteService(id: string): Promise<void> {
    await this.database.watechServices.delete(id);
  }

  async getPackages(activeOnly = false): Promise<WatechServicePackage[]> {
    if (typeof window === 'undefined') return [];
    let list = await this.database.servicePackages.toArray();
    if (activeOnly) {
      list = list.filter(p => p.isActive);
    }
    return list;
  }

  async getPackage(id: string): Promise<WatechServicePackage | undefined> {
    if (typeof window === 'undefined') return undefined;
    return this.database.servicePackages.get(id);
  }

  async savePackage(pkg: WatechServicePackage): Promise<void> {
    await this.database.servicePackages.put(pkg);
  }

  async savePackages(packages: WatechServicePackage[]): Promise<void> {
    await this.database.servicePackages.bulkPut(packages);
  }

  async deletePackage(id: string): Promise<void> {
    await this.database.servicePackages.delete(id);
  }

  async getRecommendations(projectId?: string): Promise<BusinessServiceRecommendation[]> {
    if (typeof window === 'undefined') return [];
    if (projectId) {
      return this.database.serviceRecommendations.where('projectId').equals(projectId).toArray();
    }
    return this.database.serviceRecommendations.toArray();
  }

  async getRecommendationForBusiness(businessId: string): Promise<BusinessServiceRecommendation | undefined> {
    if (typeof window === 'undefined') return undefined;
    const list = await this.database.serviceRecommendations.where('businessId').equals(businessId).toArray();
    return list[0];
  }

  async saveRecommendation(rec: BusinessServiceRecommendation): Promise<void> {
    await this.database.serviceRecommendations.put(rec);
  }

  async deleteRecommendation(id: string): Promise<void> {
    await this.database.serviceRecommendations.delete(id);
  }

  // Prompt 19: Proposals, Quotations & Pricing
  async getProposals(projectId?: string, businessId?: string): Promise<BusinessProposal[]> {
    if (typeof window === 'undefined') return [];
    if (businessId) {
      return this.database.proposals.where('businessId').equals(businessId).toArray();
    }
    if (projectId) {
      return this.database.proposals.where('projectId').equals(projectId).toArray();
    }
    return this.database.proposals.toArray();
  }

  async getProposal(id: string): Promise<BusinessProposal | undefined> {
    if (typeof window === 'undefined') return undefined;
    return this.database.proposals.get(id);
  }

  async saveProposal(proposal: BusinessProposal): Promise<void> {
    await this.database.proposals.put(proposal);
  }

  async deleteProposal(id: string): Promise<void> {
    await this.database.transaction('rw', [this.database.proposals, this.database.proposalVersions], async () => {
      await this.database.proposals.delete(id);
      await this.database.proposalVersions.where('proposalId').equals(id).delete();
    });
  }

  async getProposalVersions(proposalId: string): Promise<ProposalVersion[]> {
    if (typeof window === 'undefined') return [];
    return this.database.proposalVersions.where('proposalId').equals(proposalId).reverse().sortBy('createdAt');
  }

  async saveProposalVersion(version: ProposalVersion): Promise<void> {
    await this.database.proposalVersions.put(version);
  }

  async getQuotations(projectId?: string): Promise<ProposalQuotation[]> {
    if (typeof window === 'undefined') return [];
    if (projectId) {
      return this.database.quotations.where('projectId').equals(projectId).toArray();
    }
    return this.database.quotations.toArray();
  }

  async getQuotation(id: string): Promise<ProposalQuotation | undefined> {
    if (typeof window === 'undefined') return undefined;
    return this.database.quotations.get(id);
  }

  async saveQuotation(quotation: ProposalQuotation): Promise<void> {
    await this.database.quotations.put(quotation);
  }

  async deleteQuotation(id: string): Promise<void> {
    await this.database.quotations.delete(id);
  }

  async getBrandingConfig(): Promise<BrandingConfiguration | undefined> {
    if (typeof window === 'undefined') return undefined;
    const all = await this.database.brandingConfigurations.toArray();
    return all[0];
  }

  async saveBrandingConfig(config: BrandingConfiguration): Promise<void> {
    await this.database.brandingConfigurations.put(config);
  }

  // Prompt 20: Client Onboarding & Project Management
  async getClients(projectId?: string): Promise<ClientProfile[]> {
    if (typeof window === 'undefined') return [];
    if (projectId) {
      return this.database.clients.where('projectId').equals(projectId).toArray();
    }
    return this.database.clients.toArray();
  }

  async getClient(id: string): Promise<ClientProfile | undefined> {
    if (typeof window === 'undefined') return undefined;
    return this.database.clients.get(id);
  }

  async getClientByBusinessId(businessId: string): Promise<ClientProfile | undefined> {
    if (typeof window === 'undefined') return undefined;
    const list = await this.database.clients.where('businessId').equals(businessId).toArray();
    return list[0];
  }

  async saveClient(client: ClientProfile): Promise<void> {
    await this.database.clients.put(client);
  }

  async updateClient(client: ClientProfile): Promise<void> {
    await this.database.clients.put(client);
  }

  async deleteClient(id: string): Promise<void> {
    await this.database.transaction('rw', [
      this.database.clients,
      this.database.clientOnboardings,
      this.database.clientRequirements,
      this.database.clientAssets,
      this.database.clientProjects,
      this.database.projectTasks,
      this.database.projectMilestones,
      this.database.deliverables,
      this.database.deliverableRevisions,
      this.database.clientCommunications,
      this.database.projectExpenses,
    ], async () => {
      await this.database.clients.delete(id);
      await this.database.clientOnboardings.where('clientId').equals(id).delete();
      await this.database.clientRequirements.where('clientId').equals(id).delete();
      await this.database.clientAssets.where('clientId').equals(id).delete();
      await this.database.clientProjects.where('clientId').equals(id).delete();
      await this.database.projectTasks.where('clientId').equals(id).delete();
      await this.database.projectMilestones.where('clientId').equals(id).delete();
      await this.database.deliverables.where('clientId').equals(id).delete();
      await this.database.deliverableRevisions.where('clientId').equals(id).delete();
      await this.database.clientCommunications.where('clientId').equals(id).delete();
      await this.database.projectExpenses.where('clientId').equals(id).delete();
    });
  }

  async getClientOnboarding(clientId: string): Promise<ClientOnboarding | undefined> {
    if (typeof window === 'undefined') return undefined;
    const list = await this.database.clientOnboardings.where('clientId').equals(clientId).toArray();
    return list[0];
  }

  async saveClientOnboarding(onboarding: ClientOnboarding): Promise<void> {
    await this.database.clientOnboardings.put(onboarding);
  }

  async getClientRequirements(clientId?: string, projectId?: string): Promise<ClientRequirement[]> {
    if (typeof window === 'undefined') return [];
    if (clientId && projectId) {
      return this.database.clientRequirements.where('clientId').equals(clientId).and(r => r.projectId === projectId).toArray();
    }
    if (clientId) {
      return this.database.clientRequirements.where('clientId').equals(clientId).toArray();
    }
    if (projectId) {
      return this.database.clientRequirements.where('projectId').equals(projectId).toArray();
    }
    return this.database.clientRequirements.toArray();
  }

  async saveClientRequirement(req: ClientRequirement): Promise<void> {
    await this.database.clientRequirements.put(req);
  }

  async deleteClientRequirement(id: string): Promise<void> {
    await this.database.clientRequirements.delete(id);
  }

  async getClientAssets(clientId?: string, projectId?: string): Promise<ClientAsset[]> {
    if (typeof window === 'undefined') return [];
    if (clientId && projectId) {
      return this.database.clientAssets.where('clientId').equals(clientId).and(a => a.projectId === projectId).toArray();
    }
    if (clientId) {
      return this.database.clientAssets.where('clientId').equals(clientId).toArray();
    }
    if (projectId) {
      return this.database.clientAssets.where('projectId').equals(projectId).toArray();
    }
    return this.database.clientAssets.toArray();
  }

  async saveClientAsset(asset: ClientAsset): Promise<void> {
    await this.database.clientAssets.put(asset);
  }

  async deleteClientAsset(id: string): Promise<void> {
    await this.database.clientAssets.delete(id);
  }

  async getClientProjects(clientId?: string, researchProjectId?: string): Promise<ClientProject[]> {
    if (typeof window === 'undefined') return [];
    if (clientId) {
      return this.database.clientProjects.where('clientId').equals(clientId).toArray();
    }
    if (researchProjectId) {
      return this.database.clientProjects.where('researchProjectId').equals(researchProjectId).toArray();
    }
    return this.database.clientProjects.toArray();
  }

  async getClientProject(id: string): Promise<ClientProject | undefined> {
    if (typeof window === 'undefined') return undefined;
    return this.database.clientProjects.get(id);
  }

  async saveClientProject(project: ClientProject): Promise<void> {
    await this.database.clientProjects.put(project);
  }

  async deleteClientProject(id: string): Promise<void> {
    await this.database.transaction('rw', [
      this.database.clientProjects,
      this.database.projectTasks,
      this.database.projectMilestones,
      this.database.deliverables,
      this.database.deliverableRevisions,
      this.database.projectExpenses,
    ], async () => {
      await this.database.clientProjects.delete(id);
      await this.database.projectTasks.where('projectId').equals(id).delete();
      await this.database.projectMilestones.where('projectId').equals(id).delete();
      await this.database.deliverables.where('projectId').equals(id).delete();
      await this.database.deliverableRevisions.where('projectId').equals(id).delete();
      await this.database.projectExpenses.where('projectId').equals(id).delete();
    });
  }

  async getProjectTasks(projectId?: string, clientId?: string): Promise<ProjectTask[]> {
    if (typeof window === 'undefined') return [];
    if (projectId) {
      return this.database.projectTasks.where('projectId').equals(projectId).toArray();
    }
    if (clientId) {
      return this.database.projectTasks.where('clientId').equals(clientId).toArray();
    }
    return this.database.projectTasks.toArray();
  }

  async getProjectTask(id: string): Promise<ProjectTask | undefined> {
    if (typeof window === 'undefined') return undefined;
    return this.database.projectTasks.get(id);
  }

  async saveProjectTask(task: ProjectTask): Promise<void> {
    await this.database.projectTasks.put(task);
  }

  async saveProjectTasks(tasks: ProjectTask[]): Promise<void> {
    await this.database.projectTasks.bulkPut(tasks);
  }

  async deleteProjectTask(id: string): Promise<void> {
    await this.database.projectTasks.delete(id);
  }

  async getProjectMilestones(projectId?: string, clientId?: string): Promise<ProjectMilestone[]> {
    if (typeof window === 'undefined') return [];
    if (projectId) {
      return this.database.projectMilestones.where('projectId').equals(projectId).toArray();
    }
    if (clientId) {
      return this.database.projectMilestones.where('clientId').equals(clientId).toArray();
    }
    return this.database.projectMilestones.toArray();
  }

  async saveProjectMilestone(milestone: ProjectMilestone): Promise<void> {
    await this.database.projectMilestones.put(milestone);
  }

  async saveProjectMilestones(milestones: ProjectMilestone[]): Promise<void> {
    await this.database.projectMilestones.bulkPut(milestones);
  }

  async deleteProjectMilestone(id: string): Promise<void> {
    await this.database.projectMilestones.delete(id);
  }

  async getTeamMembers(activeOnly?: boolean): Promise<TeamMember[]> {
    if (typeof window === 'undefined') return [];
    const members = await this.database.teamMembers.toArray();
    if (activeOnly) {
      return members.filter(m => m.isActive);
    }
    return members;
  }

  async getTeamMember(id: string): Promise<TeamMember | undefined> {
    if (typeof window === 'undefined') return undefined;
    return this.database.teamMembers.get(id);
  }

  async saveTeamMember(member: TeamMember): Promise<void> {
    await this.database.teamMembers.put(member);
  }

  async saveTeamMembers(members: TeamMember[]): Promise<void> {
    await this.database.teamMembers.bulkPut(members);
  }

  async deleteTeamMember(id: string): Promise<void> {
    await this.database.teamMembers.delete(id);
  }

  async getDeliverables(projectId?: string, clientId?: string): Promise<Deliverable[]> {
    if (typeof window === 'undefined') return [];
    if (projectId) {
      return this.database.deliverables.where('projectId').equals(projectId).toArray();
    }
    if (clientId) {
      return this.database.deliverables.where('clientId').equals(clientId).toArray();
    }
    return this.database.deliverables.toArray();
  }

  async saveDeliverable(del: Deliverable): Promise<void> {
    await this.database.deliverables.put(del);
  }

  async deleteDeliverable(id: string): Promise<void> {
    await this.database.deliverables.delete(id);
  }

  async getDeliverableRevisions(deliverableId?: string, projectId?: string): Promise<DeliverableRevision[]> {
    if (typeof window === 'undefined') return [];
    if (deliverableId) {
      return this.database.deliverableRevisions.where('deliverableId').equals(deliverableId).toArray();
    }
    if (projectId) {
      return this.database.deliverableRevisions.where('projectId').equals(projectId).toArray();
    }
    return this.database.deliverableRevisions.toArray();
  }

  async saveDeliverableRevision(rev: DeliverableRevision): Promise<void> {
    await this.database.deliverableRevisions.put(rev);
  }

  async getClientCommunications(clientId?: string, projectId?: string): Promise<ClientCommunication[]> {
    if (typeof window === 'undefined') return [];
    if (clientId) {
      return this.database.clientCommunications.where('clientId').equals(clientId).reverse().sortBy('timestamp');
    }
    if (projectId) {
      return this.database.clientCommunications.where('projectId').equals(projectId).reverse().sortBy('timestamp');
    }
    return this.database.clientCommunications.reverse().sortBy('timestamp');
  }

  async saveClientCommunication(comm: ClientCommunication): Promise<void> {
    await this.database.clientCommunications.put(comm);
  }

  async getProjectExpenses(projectId?: string, clientId?: string): Promise<ProjectExpense[]> {
    if (typeof window === 'undefined') return [];
    if (projectId) {
      return this.database.projectExpenses.where('projectId').equals(projectId).toArray();
    }
    if (clientId) {
      return this.database.projectExpenses.where('clientId').equals(clientId).toArray();
    }
    return this.database.projectExpenses.toArray();
  }

  async saveProjectExpense(expense: ProjectExpense): Promise<void> {
    await this.database.projectExpenses.put(expense);
  }

  async deleteProjectExpense(id: string): Promise<void> {
    await this.database.projectExpenses.delete(id);
  }

  // Prompt 21: Invoices
  async getInvoices(clientId?: string, projectId?: string): Promise<AgencyInvoice[]> {
    if (typeof window === 'undefined') return [];
    if (clientId) {
      return this.database.invoices.where('clientId').equals(clientId).reverse().sortBy('issueDate');
    }
    if (projectId) {
      return this.database.invoices.where('projectId').equals(projectId).reverse().sortBy('issueDate');
    }
    return this.database.invoices.reverse().sortBy('issueDate');
  }

  async getInvoice(id: string): Promise<AgencyInvoice | undefined> {
    if (typeof window === 'undefined') return undefined;
    return this.database.invoices.get(id);
  }

  async saveInvoice(invoice: AgencyInvoice): Promise<void> {
    await this.database.invoices.put(invoice);
  }

  async deleteInvoice(id: string): Promise<void> {
    await this.database.transaction('rw', [this.database.invoices, this.database.payments], async () => {
      await this.database.invoices.delete(id);
      await this.database.payments.where('invoiceId').equals(id).delete();
    });
  }

  // Payments
  async getPayments(invoiceId?: string, clientId?: string): Promise<PaymentRecord[]> {
    if (typeof window === 'undefined') return [];
    if (invoiceId) {
      return this.database.payments.where('invoiceId').equals(invoiceId).reverse().sortBy('paymentDate');
    }
    if (clientId) {
      return this.database.payments.where('clientId').equals(clientId).reverse().sortBy('paymentDate');
    }
    return this.database.payments.reverse().sortBy('paymentDate');
  }

  async getPayment(id: string): Promise<PaymentRecord | undefined> {
    if (typeof window === 'undefined') return undefined;
    return this.database.payments.get(id);
  }

  async savePayment(payment: PaymentRecord): Promise<void> {
    await this.database.payments.put(payment);
  }

  async deletePayment(id: string): Promise<void> {
    await this.database.payments.delete(id);
  }

  // Agency Expenses
  async getAgencyExpenses(clientId?: string, projectId?: string): Promise<AgencyExpense[]> {
    if (typeof window === 'undefined') return [];
    if (clientId) {
      return this.database.agencyExpenses.where('clientId').equals(clientId).reverse().sortBy('date');
    }
    if (projectId) {
      return this.database.agencyExpenses.where('projectId').equals(projectId).reverse().sortBy('date');
    }
    return this.database.agencyExpenses.reverse().sortBy('date');
  }

  async getAgencyExpense(id: string): Promise<AgencyExpense | undefined> {
    if (typeof window === 'undefined') return undefined;
    return this.database.agencyExpenses.get(id);
  }

  async saveAgencyExpense(expense: AgencyExpense): Promise<void> {
    await this.database.agencyExpenses.put(expense);
  }

  async deleteAgencyExpense(id: string): Promise<void> {
    await this.database.agencyExpenses.delete(id);
  }

  // Recurring Contracts
  async getRecurringContracts(clientId?: string): Promise<RecurringContract[]> {
    if (typeof window === 'undefined') return [];
    if (clientId) {
      return this.database.recurringContracts.where('clientId').equals(clientId).toArray();
    }
    return this.database.recurringContracts.toArray();
  }

  async getRecurringContract(id: string): Promise<RecurringContract | undefined> {
    if (typeof window === 'undefined') return undefined;
    return this.database.recurringContracts.get(id);
  }

  async saveRecurringContract(contract: RecurringContract): Promise<void> {
    await this.database.recurringContracts.put(contract);
  }

  async deleteRecurringContract(id: string): Promise<void> {
    await this.database.recurringContracts.delete(id);
  }

  // Financial Audit Logs
  async getFinancialAuditLogs(entityType?: string, entityId?: string): Promise<FinancialAuditLog[]> {
    if (typeof window === 'undefined') return [];
    const logs = await this.database.financialAuditLogs.reverse().sortBy('timestamp');
    if (entityType && entityId) {
      return logs.filter(l => l.entityType === entityType && l.entityId === entityId);
    }
    if (entityType) {
      return logs.filter(l => l.entityType === entityType);
    }
    return logs;
  }

  async logFinancialAudit(log: FinancialAuditLog): Promise<void> {
    await this.database.financialAuditLogs.put(log);
  }

  // Prompt 22: Client Portal & Self-Service
  async getClientPortalUsers(clientId?: string): Promise<ClientPortalUser[]> {
    if (typeof window === 'undefined') return [];
    if (clientId) {
      return this.database.clientPortalUsers.where('clientId').equals(clientId).toArray();
    }
    return this.database.clientPortalUsers.toArray();
  }

  async getClientPortalUser(id: string): Promise<ClientPortalUser | undefined> {
    if (typeof window === 'undefined') return undefined;
    return this.database.clientPortalUsers.get(id);
  }

  async getClientPortalUserByEmail(email: string): Promise<ClientPortalUser | undefined> {
    if (typeof window === 'undefined') return undefined;
    return this.database.clientPortalUsers.where('email').equalsIgnoreCase(email).first();
  }

  async saveClientPortalUser(user: ClientPortalUser): Promise<void> {
    await this.database.clientPortalUsers.put(user);
  }

  async deleteClientPortalUser(id: string): Promise<void> {
    await this.database.clientPortalUsers.delete(id);
  }

  async getClientRequests(clientId?: string, projectId?: string): Promise<ClientRequest[]> {
    if (typeof window === 'undefined') return [];
    const all = await this.database.clientRequests.reverse().sortBy('submittedAt');
    if (clientId && projectId) {
      return all.filter(r => r.clientId === clientId && r.projectId === projectId);
    }
    if (clientId) {
      return all.filter(r => r.clientId === clientId);
    }
    return all;
  }

  async getClientRequest(id: string): Promise<ClientRequest | undefined> {
    if (typeof window === 'undefined') return undefined;
    return this.database.clientRequests.get(id);
  }

  async saveClientRequest(request: ClientRequest): Promise<void> {
    await this.database.clientRequests.put(request);
  }

  async deleteClientRequest(id: string): Promise<void> {
    await this.database.clientRequests.delete(id);
  }

  async getClientNotifications(clientId?: string, portalUserId?: string): Promise<ClientNotification[]> {
    if (typeof window === 'undefined') return [];
    const all = await this.database.clientNotifications.reverse().sortBy('createdAt');
    if (clientId && portalUserId) {
      return all.filter(n => n.clientId === clientId && (!n.portalUserId || n.portalUserId === portalUserId));
    }
    if (clientId) {
      return all.filter(n => n.clientId === clientId);
    }
    return all;
  }

  async saveClientNotification(notification: ClientNotification): Promise<void> {
    await this.database.clientNotifications.put(notification);
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.database.clientNotifications.update(id, { isRead: true });
  }

  async getClientApprovals(clientId?: string, entityId?: string): Promise<ClientApprovalRecord[]> {
    if (typeof window === 'undefined') return [];
    const all = await this.database.clientApprovals.reverse().sortBy('timestamp');
    if (clientId && entityId) {
      return all.filter(a => a.clientId === clientId && a.entityId === entityId);
    }
    if (clientId) {
      return all.filter(a => a.clientId === clientId);
    }
    return all;
  }

  async saveClientApproval(approval: ClientApprovalRecord): Promise<void> {
    await this.database.clientApprovals.put(approval);
  }

  async getClientInvitations(clientId?: string): Promise<ClientInvitation[]> {
    if (typeof window === 'undefined') return [];
    if (clientId) {
      return this.database.clientInvitations.where('clientId').equals(clientId).toArray();
    }
    return this.database.clientInvitations.toArray();
  }

  async getClientInvitationByToken(token: string): Promise<ClientInvitation | undefined> {
    if (typeof window === 'undefined') return undefined;
    return this.database.clientInvitations.where('inviteToken').equals(token).first();
  }

  async saveClientInvitation(invitation: ClientInvitation): Promise<void> {
    await this.database.clientInvitations.put(invitation);
  }

  async deleteClientInvitation(id: string): Promise<void> {
    await this.database.clientInvitations.delete(id);
  }

  // Prompt 23: Workflow Automation & Integrations
  private serverWorkflows: AutomationWorkflow[] = [];
  private serverEvents: AutomationEvent[] = [];
  private serverExecutions: AutomationExecution[] = [];
  private serverApprovals: AutomationApproval[] = [];

  async getAutomationWorkflows(): Promise<AutomationWorkflow[]> {
    if (typeof window === 'undefined') return [...this.serverWorkflows];
    return this.database.automationWorkflows.toArray();
  }

  async getAutomationWorkflow(id: string): Promise<AutomationWorkflow | undefined> {
    if (typeof window === 'undefined') return this.serverWorkflows.find(w => w.id === id);
    return this.database.automationWorkflows.get(id);
  }

  async saveAutomationWorkflow(workflow: AutomationWorkflow): Promise<void> {
    if (typeof window === 'undefined') {
      const idx = this.serverWorkflows.findIndex(w => w.id === workflow.id);
      if (idx >= 0) this.serverWorkflows[idx] = workflow;
      else this.serverWorkflows.push(workflow);
      return;
    }
    await this.database.automationWorkflows.put(workflow);
  }

  async deleteAutomationWorkflow(id: string): Promise<void> {
    await this.database.automationWorkflows.delete(id);
  }

  async getAutomationEvents(limit: number = 50): Promise<AutomationEvent[]> {
    if (typeof window === 'undefined') {
      return [...this.serverEvents].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
    }
    const all = await this.database.automationEvents.toArray();
    return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  }

  async getAutomationEvent(id: string): Promise<AutomationEvent | undefined> {
    if (typeof window === 'undefined') {
      return this.serverEvents.find(e => e.id === id);
    }
    return this.database.automationEvents.get(id);
  }

  async saveAutomationEvent(event: AutomationEvent): Promise<void> {
    if (typeof window === 'undefined') {
      const idx = this.serverEvents.findIndex(e => e.id === event.id);
      if (idx >= 0) this.serverEvents[idx] = event;
      else this.serverEvents.unshift(event);
      return;
    }
    await this.database.automationEvents.put(event);
  }

  async getAutomationExecutions(workflowId?: string, limit: number = 50): Promise<AutomationExecution[]> {
    if (typeof window === 'undefined') {
      let list = [...this.serverExecutions];
      if (workflowId) list = list.filter(e => e.workflowId === workflowId);
      return list.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).slice(0, limit);
    }
    let all = await this.database.automationExecutions.toArray();
    if (workflowId) {
      all = all.filter(e => e.workflowId === workflowId);
    }
    return all.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).slice(0, limit);
  }

  async getAutomationExecution(id: string): Promise<AutomationExecution | undefined> {
    if (typeof window === 'undefined') {
      return this.serverExecutions.find(e => e.id === id);
    }
    return this.database.automationExecutions.get(id);
  }

  async saveAutomationExecution(execution: AutomationExecution): Promise<void> {
    if (typeof window === 'undefined') {
      const idx = this.serverExecutions.findIndex(e => e.id === execution.id);
      if (idx >= 0) this.serverExecutions[idx] = execution;
      else this.serverExecutions.unshift(execution);
      return;
    }
    await this.database.automationExecutions.put(execution);
  }

  async deleteAutomationExecution(id: string): Promise<void> {
    if (typeof window === 'undefined') {
      const idx = this.serverExecutions.findIndex(e => e.id === id);
      if (idx >= 0) this.serverExecutions.splice(idx, 1);
      return;
    }
    await this.database.automationExecutions.delete(id);
  }

  async getAutomationApprovals(status?: string): Promise<AutomationApproval[]> {
    if (typeof window === 'undefined') {
      let list = [...this.serverApprovals];
      if (status) list = list.filter(a => a.status === status);
      return list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    }
    let all = await this.database.automationApprovals.toArray();
    if (status) {
      all = all.filter(a => a.status === status);
    }
    return all.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }

  async getAutomationApproval(id: string): Promise<AutomationApproval | undefined> {
    if (typeof window === 'undefined') {
      return this.serverApprovals.find(a => a.id === id);
    }
    return this.database.automationApprovals.get(id);
  }

  async saveAutomationApproval(approval: AutomationApproval): Promise<void> {
    if (typeof window === 'undefined') {
      const idx = this.serverApprovals.findIndex(a => a.id === approval.id);
      if (idx >= 0) this.serverApprovals[idx] = approval;
      else this.serverApprovals.unshift(approval);
      return;
    }
    await this.database.automationApprovals.put(approval);
  }

  async getIntegrationConnections(): Promise<IntegrationConnection[]> {
    if (typeof window === 'undefined') return [];
    return this.database.integrationConnections.toArray();
  }

  async getIntegrationConnection(providerId: string): Promise<IntegrationConnection | undefined> {
    if (typeof window === 'undefined') return undefined;
    return this.database.integrationConnections.get(providerId);
  }

  async saveIntegrationConnection(conn: IntegrationConnection): Promise<void> {
    await this.database.integrationConnections.put(conn);
  }

  async getWebhookEndpoints(): Promise<WebhookEndpoint[]> {
    if (typeof window === 'undefined') return [];
    return this.database.webhookEndpoints.toArray();
  }

  async getWebhookEndpoint(id: string): Promise<WebhookEndpoint | undefined> {
    if (typeof window === 'undefined') return undefined;
    return this.database.webhookEndpoints.get(id);
  }

  async saveWebhookEndpoint(endpoint: WebhookEndpoint): Promise<void> {
    await this.database.webhookEndpoints.put(endpoint);
  }

  async deleteWebhookEndpoint(id: string): Promise<void> {
    await this.database.webhookEndpoints.delete(id);
  }

  async getWebhookDeliveries(endpointId?: string, limit: number = 50): Promise<WebhookDelivery[]> {
    if (typeof window === 'undefined') return [];
    let all = await this.database.webhookDeliveries.toArray();
    if (endpointId) {
      all = all.filter(d => d.endpointId === endpointId);
    }
    return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  }

  async saveWebhookDelivery(delivery: WebhookDelivery): Promise<void> {
    await this.database.webhookDeliveries.put(delivery);
  }

  // Prompt 24: CEO Command Center
  async getCeoTargets(): Promise<CeoTarget[]> {
    if (typeof window === 'undefined') return [];
    return await this.database.ceoTargets.toArray();
  }

  async getCeoTarget(id: string): Promise<CeoTarget | undefined> {
    if (typeof window === 'undefined') return undefined;
    return await this.database.ceoTargets.get(id);
  }

  async saveCeoTarget(target: CeoTarget): Promise<void> {
    await this.database.ceoTargets.put(target);
  }

  async saveCeoTargets(targets: CeoTarget[]): Promise<void> {
    await this.database.ceoTargets.bulkPut(targets);
  }

  async updateCeoTarget(id: string, updates: Partial<CeoTarget>): Promise<void> {
    await this.database.ceoTargets.update(id, { ...updates, updatedAt: new Date().toISOString() });
  }

  async deleteCeoTarget(id: string): Promise<void> {
    await this.database.ceoTargets.delete(id);
  }

  async getCeoDailyBriefings(limit: number = 10): Promise<CeoDailyBriefing[]> {
    if (typeof window === 'undefined') return [];
    const list = await this.database.ceoDailyBriefings.toArray();
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit);
  }

  async getCeoDailyBriefing(idOrDate: string): Promise<CeoDailyBriefing | undefined> {
    if (typeof window === 'undefined') return undefined;
    const direct = await this.database.ceoDailyBriefings.get(idOrDate);
    if (direct) return direct;
    return await this.database.ceoDailyBriefings.where('date').equals(idOrDate).first();
  }

  async saveCeoDailyBriefing(briefing: CeoDailyBriefing): Promise<void> {
    await this.database.ceoDailyBriefings.put(briefing);
  }

  async getCeoWeeklyReviews(limit: number = 10): Promise<CeoWeeklyReview[]> {
    if (typeof window === 'undefined') return [];
    const list = await this.database.ceoWeeklyReviews.toArray();
    return list.sort((a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime()).slice(0, limit);
  }

  async getCeoWeeklyReview(id: string): Promise<CeoWeeklyReview | undefined> {
    if (typeof window === 'undefined') return undefined;
    return await this.database.ceoWeeklyReviews.get(id);
  }

  async saveCeoWeeklyReview(review: CeoWeeklyReview): Promise<void> {
    await this.database.ceoWeeklyReviews.put(review);
  }

  async getCeoActions(status?: 'all' | 'pending' | 'completed'): Promise<CeoNextBestAction[]> {
    if (typeof window === 'undefined') return [];
    let list = await this.database.ceoActions.toArray();
    if (status === 'pending') {
      list = list.filter(a => !a.isCompleted);
    } else if (status === 'completed') {
      list = list.filter(a => a.isCompleted);
    }
    return list.sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0));
  }

  async getCeoAction(id: string): Promise<CeoNextBestAction | undefined> {
    if (typeof window === 'undefined') return undefined;
    return await this.database.ceoActions.get(id);
  }

  async saveCeoAction(action: CeoNextBestAction): Promise<void> {
    await this.database.ceoActions.put(action);
  }

  async saveCeoActions(actions: CeoNextBestAction[]): Promise<void> {
    await this.database.ceoActions.bulkPut(actions);
  }

  async updateCeoAction(id: string, updates: Partial<CeoNextBestAction>): Promise<void> {
    await this.database.ceoActions.update(id, updates);
  }

  async deleteCeoAction(id: string): Promise<void> {
    await this.database.ceoActions.delete(id);
  }

  // Prompt 25: White-Label SaaS & Multi-Tenant Architecture
  async getTenants(): Promise<Tenant[]> {
    if (typeof window === 'undefined') return [];
    return await this.database.tenants.toArray();
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    if (typeof window === 'undefined') return undefined;
    return await this.database.tenants.get(id);
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    if (typeof window === 'undefined') return undefined;
    return await this.database.tenants.where('slug').equals(slug).first();
  }

  async getTenantByDomain(domain: string): Promise<Tenant | undefined> {
    if (typeof window === 'undefined') return undefined;
    return await this.database.tenants.where('customDomain').equals(domain).first();
  }

  async saveTenant(tenant: Tenant): Promise<void> {
    await this.database.tenants.put(tenant);
  }

  async updateTenant(id: string, updates: Partial<Tenant>): Promise<void> {
    await this.database.tenants.update(id, { ...updates, updatedAt: new Date().toISOString() });
  }

  async deleteTenant(id: string): Promise<void> {
    await this.database.tenants.delete(id);
  }

  async getTenantBranding(tenantId: string): Promise<TenantBranding | undefined> {
    if (typeof window === 'undefined') return undefined;
    return await this.database.tenantBranding.where('tenantId').equals(tenantId).first();
  }

  async saveTenantBranding(branding: TenantBranding): Promise<void> {
    await this.database.tenantBranding.put(branding);
  }

  async getTenantPlans(): Promise<TenantPlan[]> {
    if (typeof window === 'undefined') return [];
    return await this.database.tenantPlans.toArray();
  }

  async getTenantPlan(id: string): Promise<TenantPlan | undefined> {
    if (typeof window === 'undefined') return undefined;
    return await this.database.tenantPlans.get(id);
  }

  async getTenantPlanBySlug(slug: string): Promise<TenantPlan | undefined> {
    if (typeof window === 'undefined') return undefined;
    return await this.database.tenantPlans.where('slug').equals(slug).first();
  }

  async saveTenantPlan(plan: TenantPlan): Promise<void> {
    await this.database.tenantPlans.put(plan);
  }

  async getTenantSubscription(tenantId: string): Promise<TenantSubscription | undefined> {
    if (typeof window === 'undefined') return undefined;
    return await this.database.tenantSubscriptions.where('tenantId').equals(tenantId).first();
  }

  async saveTenantSubscription(sub: TenantSubscription): Promise<void> {
    await this.database.tenantSubscriptions.put(sub);
  }

  async getTenantUsers(tenantId?: string): Promise<TenantUser[]> {
    if (typeof window === 'undefined') return [];
    if (tenantId) {
      return await this.database.tenantUsers.where('tenantId').equals(tenantId).toArray();
    }
    return await this.database.tenantUsers.toArray();
  }

  async getTenantUser(id: string): Promise<TenantUser | undefined> {
    if (typeof window === 'undefined') return undefined;
    return await this.database.tenantUsers.get(id);
  }

  async getTenantUserByEmail(email: string): Promise<TenantUser | undefined> {
    if (typeof window === 'undefined') return undefined;
    return await this.database.tenantUsers.where('email').equals(email).first();
  }

  async saveTenantUser(user: TenantUser): Promise<void> {
    await this.database.tenantUsers.put(user);
  }

  async deleteTenantUser(id: string): Promise<void> {
    await this.database.tenantUsers.delete(id);
  }

  async getTenantInvitations(tenantId?: string): Promise<TenantInvitation[]> {
    if (typeof window === 'undefined') return [];
    if (tenantId) {
      return await this.database.tenantInvitations.where('tenantId').equals(tenantId).toArray();
    }
    return await this.database.tenantInvitations.toArray();
  }

  async saveTenantInvitation(inv: TenantInvitation): Promise<void> {
    await this.database.tenantInvitations.put(inv);
  }

  async deleteTenantInvitation(id: string): Promise<void> {
    await this.database.tenantInvitations.delete(id);
  }

  async getTenantDomains(tenantId?: string): Promise<TenantDomain[]> {
    if (typeof window === 'undefined') return [];
    if (tenantId) {
      return await this.database.tenantDomains.where('tenantId').equals(tenantId).toArray();
    }
    return await this.database.tenantDomains.toArray();
  }

  async saveTenantDomain(domain: TenantDomain): Promise<void> {
    await this.database.tenantDomains.put(domain);
  }

  async deleteTenantDomain(id: string): Promise<void> {
    await this.database.tenantDomains.delete(id);
  }

  async getTenantUsage(tenantId: string, period?: string): Promise<TenantUsage | undefined> {
    if (typeof window === 'undefined') return undefined;
    const currentPeriod = period || new Date().toISOString().slice(0, 7);
    return await this.database.tenantUsage
      .where('tenantId')
      .equals(tenantId)
      .and(u => u.period === currentPeriod)
      .first();
  }

  async saveTenantUsage(usage: TenantUsage): Promise<void> {
    await this.database.tenantUsage.put(usage);
  }

  async getTenantAuditLogs(tenantId?: string, limit: number = 50): Promise<TenantAuditLog[]> {
    if (typeof window === 'undefined') return [];
    let list = await this.database.tenantAuditLogs.toArray();
    if (tenantId) {
      list = list.filter(l => l.tenantId === tenantId);
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  }

  async saveTenantAuditLog(log: TenantAuditLog): Promise<void> {
    await this.database.tenantAuditLogs.put(log);
  }

  async getTenantModuleConfig(tenantId: string): Promise<TenantModuleConfig | undefined> {
    if (typeof window === 'undefined') return undefined;
    return await this.database.tenantModuleConfigs.where('tenantId').equals(tenantId).first();
  }

  async saveTenantModuleConfig(config: TenantModuleConfig): Promise<void> {
    await this.database.tenantModuleConfigs.put(config);
  }

  async exportDatabase(): Promise<string> {
    const data = {
      version: 14,
      exportedAt: new Date().toISOString(),
      projects: await this.database.projects.toArray(),
      marketAreas: await this.database.marketAreas.toArray(),
      businesses: await this.database.businesses.toArray(),
      audits: await this.database.audits.toArray(),
      auditFindings: await this.database.auditFindings.toArray(),
      intelligenceFacts: await this.database.intelligenceFacts.toArray(),
      contentItems: await this.database.contentItems.toArray(),
      opportunities: await this.database.opportunities.toArray(),
      leadScores: await this.database.leadScores.toArray(),
      contacts: await this.database.contacts.toArray(),
      emails: await this.database.emails.toArray(),
      sources: await this.database.sources.toArray(),
      outreachDrafts: await this.database.outreachDrafts.toArray(),
      suppressions: await this.database.suppressions.toArray(),
      localSeoProfiles: await this.database.localSeoProfiles.toArray(),
      localReviews: await this.database.localReviews.toArray(),
      contentCalendarItems: await this.database.contentCalendarItems.toArray(),
      customerQuestions: await this.database.customerQuestions.toArray(),
      outreachStrategies: await this.database.outreachStrategies.toArray(),
      followUpSchedules: await this.database.followUpSchedules.toArray(),
      crmActivities: await this.database.crmActivities.toArray(),
      gmailDraftRecords: await this.database.gmailDraftRecords.toArray(),
      aiConversations: await this.database.aiConversations.toArray(),
      competitorWatchlist: await this.database.competitorWatchlist.toArray(),
      competitorSnapshots: await this.database.competitorSnapshots.toArray(),
      competitorChanges: await this.database.competitorChanges.toArray(),
      marketComparisons: await this.database.marketComparisons.toArray(),
      marketComparisonSnapshots: await this.database.marketComparisonSnapshots.toArray(),
      watechServices: await this.database.watechServices.toArray(),
      servicePackages: await this.database.servicePackages.toArray(),
      serviceRecommendations: await this.database.serviceRecommendations.toArray(),
      buyerSignals: await this.database.buyerSignals.toArray(),
      salesReadinessRecords: await this.database.salesReadinessRecords.toArray(),
      proposals: await this.database.proposals.toArray(),
      proposalVersions: await this.database.proposalVersions.toArray(),
      quotations: await this.database.quotations.toArray(),
      brandingConfigurations: await this.database.brandingConfigurations.toArray(),
      clients: await this.database.clients.toArray(),
      clientOnboardings: await this.database.clientOnboardings.toArray(),
      clientRequirements: await this.database.clientRequirements.toArray(),
      clientAssets: await this.database.clientAssets.toArray(),
      clientProjects: await this.database.clientProjects.toArray(),
      projectTasks: await this.database.projectTasks.toArray(),
      projectMilestones: await this.database.projectMilestones.toArray(),
      teamMembers: await this.database.teamMembers.toArray(),
      deliverables: await this.database.deliverables.toArray(),
      deliverableRevisions: await this.database.deliverableRevisions.toArray(),
      clientCommunications: await this.database.clientCommunications.toArray(),
      projectExpenses: await this.database.projectExpenses.toArray(),
      invoices: await this.database.invoices.toArray(),
      payments: await this.database.payments.toArray(),
      agencyExpenses: await this.database.agencyExpenses.toArray(),
      recurringContracts: await this.database.recurringContracts.toArray(),
      financialAuditLogs: await this.database.financialAuditLogs.toArray(),
      clientPortalUsers: await this.database.clientPortalUsers.toArray(),
      clientRequests: await this.database.clientRequests.toArray(),
      clientNotifications: await this.database.clientNotifications.toArray(),
      clientApprovals: await this.database.clientApprovals.toArray(),
      clientInvitations: await this.database.clientInvitations.toArray(),
      automationWorkflows: await this.database.automationWorkflows.toArray(),
      automationEvents: await this.database.automationEvents.toArray(),
      automationExecutions: await this.database.automationExecutions.toArray(),
      automationApprovals: await this.database.automationApprovals.toArray(),
      integrationConnections: await this.database.integrationConnections.toArray(),
      webhookEndpoints: await this.database.webhookEndpoints.toArray(),
      webhookDeliveries: await this.database.webhookDeliveries.toArray(),
      ceoTargets: await this.database.ceoTargets.toArray(),
      ceoDailyBriefings: await this.database.ceoDailyBriefings.toArray(),
      ceoWeeklyReviews: await this.database.ceoWeeklyReviews.toArray(),
      ceoActions: await this.database.ceoActions.toArray(),
      tenants: await this.database.tenants.toArray(),
      tenantBranding: await this.database.tenantBranding.toArray(),
      tenantPlans: await this.database.tenantPlans.toArray(),
      tenantSubscriptions: await this.database.tenantSubscriptions.toArray(),
      tenantUsers: await this.database.tenantUsers.toArray(),
      tenantInvitations: await this.database.tenantInvitations.toArray(),
      tenantDomains: await this.database.tenantDomains.toArray(),
      tenantUsage: await this.database.tenantUsage.toArray(),
      tenantAuditLogs: await this.database.tenantAuditLogs.toArray(),
      tenantModuleConfigs: await this.database.tenantModuleConfigs.toArray(),
    };
    return JSON.stringify(data, null, 2);
  }

  async importDatabase(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData);
    if (!data.version) throw new Error('Invalid backup file format');

    await this.clearAll();

    if (data.projects) await this.database.projects.bulkPut(data.projects);
    if (data.marketAreas) await this.database.marketAreas.bulkPut(data.marketAreas);
    if (data.businesses) await this.database.businesses.bulkPut(data.businesses);
    if (data.audits) await this.database.audits.bulkPut(data.audits);
    if (data.auditFindings) await this.database.auditFindings.bulkPut(data.auditFindings);
    if (data.intelligenceFacts) await this.database.intelligenceFacts.bulkPut(data.intelligenceFacts);
    if (data.contentItems) await this.database.contentItems.bulkPut(data.contentItems);
    if (data.opportunities) await this.database.opportunities.bulkPut(data.opportunities);
    if (data.leadScores) await this.database.leadScores.bulkPut(data.leadScores);
    if (data.contacts) await this.database.contacts.bulkPut(data.contacts);
    if (data.emails) await this.database.emails.bulkPut(data.emails);
    if (data.sources) await this.database.sources.bulkPut(data.sources);
    if (data.outreachDrafts) await this.database.outreachDrafts.bulkPut(data.outreachDrafts);
    if (data.suppressions) await this.database.suppressions.bulkPut(data.suppressions);
    if (data.localSeoProfiles) await this.database.localSeoProfiles.bulkPut(data.localSeoProfiles);
    if (data.localReviews) await this.database.localReviews.bulkPut(data.localReviews);
    if (data.contentCalendarItems) await this.database.contentCalendarItems.bulkPut(data.contentCalendarItems);
    if (data.customerQuestions) await this.database.customerQuestions.bulkPut(data.customerQuestions);
    if (data.outreachStrategies) await this.database.outreachStrategies.bulkPut(data.outreachStrategies);
    if (data.followUpSchedules) await this.database.followUpSchedules.bulkPut(data.followUpSchedules);
    if (data.crmActivities) await this.database.crmActivities.bulkPut(data.crmActivities);
    if (data.gmailDraftRecords) await this.database.gmailDraftRecords.bulkPut(data.gmailDraftRecords);
    if (data.aiConversations) await this.database.aiConversations.bulkPut(data.aiConversations);
    if (data.competitorWatchlist) await this.database.competitorWatchlist.bulkPut(data.competitorWatchlist);
    if (data.competitorSnapshots) await this.database.competitorSnapshots.bulkPut(data.competitorSnapshots);
    if (data.competitorChanges) await this.database.competitorChanges.bulkPut(data.competitorChanges);
    if (data.marketComparisons) await this.database.marketComparisons.bulkPut(data.marketComparisons);
    if (data.marketComparisonSnapshots) await this.database.marketComparisonSnapshots.bulkPut(data.marketComparisonSnapshots);
    if (data.watechServices) await this.database.watechServices.bulkPut(data.watechServices);
    if (data.servicePackages) await this.database.servicePackages.bulkPut(data.servicePackages);
    if (data.serviceRecommendations) await this.database.serviceRecommendations.bulkPut(data.serviceRecommendations);
    if (data.buyerSignals) await this.database.buyerSignals.bulkPut(data.buyerSignals);
    if (data.salesReadinessRecords) await this.database.salesReadinessRecords.bulkPut(data.salesReadinessRecords);
    if (data.proposals) await this.database.proposals.bulkPut(data.proposals);
    if (data.proposalVersions) await this.database.proposalVersions.bulkPut(data.proposalVersions);
    if (data.quotations) await this.database.quotations.bulkPut(data.quotations);
    if (data.brandingConfigurations) await this.database.brandingConfigurations.bulkPut(data.brandingConfigurations);
    if (data.clients) await this.database.clients.bulkPut(data.clients);
    if (data.clientOnboardings) await this.database.clientOnboardings.bulkPut(data.clientOnboardings);
    if (data.clientRequirements) await this.database.clientRequirements.bulkPut(data.clientRequirements);
    if (data.clientAssets) await this.database.clientAssets.bulkPut(data.clientAssets);
    if (data.clientProjects) await this.database.clientProjects.bulkPut(data.clientProjects);
    if (data.projectTasks) await this.database.projectTasks.bulkPut(data.projectTasks);
    if (data.projectMilestones) await this.database.projectMilestones.bulkPut(data.projectMilestones);
    if (data.teamMembers) await this.database.teamMembers.bulkPut(data.teamMembers);
    if (data.deliverables) await this.database.deliverables.bulkPut(data.deliverables);
    if (data.deliverableRevisions) await this.database.deliverableRevisions.bulkPut(data.deliverableRevisions);
    if (data.clientCommunications) await this.database.clientCommunications.bulkPut(data.clientCommunications);
    if (data.projectExpenses) await this.database.projectExpenses.bulkPut(data.projectExpenses);
    if (data.invoices) await this.database.invoices.bulkPut(data.invoices);
    if (data.payments) await this.database.payments.bulkPut(data.payments);
    if (data.agencyExpenses) await this.database.agencyExpenses.bulkPut(data.agencyExpenses);
    if (data.recurringContracts) await this.database.recurringContracts.bulkPut(data.recurringContracts);
    if (data.financialAuditLogs) await this.database.financialAuditLogs.bulkPut(data.financialAuditLogs);
    if (data.clientPortalUsers) await this.database.clientPortalUsers.bulkPut(data.clientPortalUsers);
    if (data.clientRequests) await this.database.clientRequests.bulkPut(data.clientRequests);
    if (data.clientNotifications) await this.database.clientNotifications.bulkPut(data.clientNotifications);
    if (data.clientApprovals) await this.database.clientApprovals.bulkPut(data.clientApprovals);
    if (data.clientInvitations) await this.database.clientInvitations.bulkPut(data.clientInvitations);
    if (data.automationWorkflows) await this.database.automationWorkflows.bulkPut(data.automationWorkflows);
    if (data.automationEvents) await this.database.automationEvents.bulkPut(data.automationEvents);
    if (data.automationExecutions) await this.database.automationExecutions.bulkPut(data.automationExecutions);
    if (data.automationApprovals) await this.database.automationApprovals.bulkPut(data.automationApprovals);
    if (data.integrationConnections) await this.database.integrationConnections.bulkPut(data.integrationConnections);
    if (data.webhookEndpoints) await this.database.webhookEndpoints.bulkPut(data.webhookEndpoints);
    if (data.webhookDeliveries) await this.database.webhookDeliveries.bulkPut(data.webhookDeliveries);
    if (data.ceoTargets) await this.database.ceoTargets.bulkPut(data.ceoTargets);
    if (data.ceoDailyBriefings) await this.database.ceoDailyBriefings.bulkPut(data.ceoDailyBriefings);
    if (data.ceoWeeklyReviews) await this.database.ceoWeeklyReviews.bulkPut(data.ceoWeeklyReviews);
    if (data.ceoActions) await this.database.ceoActions.bulkPut(data.ceoActions);
    if (data.tenants) await this.database.tenants.bulkPut(data.tenants);
    if (data.tenantBranding) await this.database.tenantBranding.bulkPut(data.tenantBranding);
    if (data.tenantPlans) await this.database.tenantPlans.bulkPut(data.tenantPlans);
    if (data.tenantSubscriptions) await this.database.tenantSubscriptions.bulkPut(data.tenantSubscriptions);
    if (data.tenantUsers) await this.database.tenantUsers.bulkPut(data.tenantUsers);
    if (data.tenantInvitations) await this.database.tenantInvitations.bulkPut(data.tenantInvitations);
    if (data.tenantDomains) await this.database.tenantDomains.bulkPut(data.tenantDomains);
    if (data.tenantUsage) await this.database.tenantUsage.bulkPut(data.tenantUsage);
    if (data.tenantAuditLogs) await this.database.tenantAuditLogs.bulkPut(data.tenantAuditLogs);
    if (data.tenantModuleConfigs) await this.database.tenantModuleConfigs.bulkPut(data.tenantModuleConfigs);
  }

  async clearAll(): Promise<void> {
    await Promise.all([
      this.database.projects.clear(),
      this.database.marketAreas.clear(),
      this.database.businesses.clear(),
      this.database.audits.clear(),
      this.database.auditFindings.clear(),
      this.database.intelligenceFacts.clear(),
      this.database.contentItems.clear(),
      this.database.opportunities.clear(),
      this.database.leadScores.clear(),
      this.database.contacts.clear(),
      this.database.emails.clear(),
      this.database.sources.clear(),
      this.database.outreachDrafts.clear(),
      this.database.suppressions.clear(),
      this.database.localSeoProfiles.clear(),
      this.database.localReviews.clear(),
      this.database.contentCalendarItems.clear(),
      this.database.customerQuestions.clear(),
      this.database.outreachStrategies.clear(),
      this.database.followUpSchedules.clear(),
      this.database.crmActivities.clear(),
      this.database.gmailDraftRecords.clear(),
      this.database.aiConversations.clear(),
      this.database.competitorWatchlist.clear(),
      this.database.competitorSnapshots.clear(),
      this.database.competitorChanges.clear(),
      this.database.marketComparisons.clear(),
      this.database.marketComparisonSnapshots.clear(),
      this.database.watechServices.clear(),
      this.database.servicePackages.clear(),
      this.database.serviceRecommendations.clear(),
      this.database.buyerSignals.clear(),
      this.database.salesReadinessRecords.clear(),
      this.database.proposals.clear(),
      this.database.proposalVersions.clear(),
      this.database.quotations.clear(),
      this.database.brandingConfigurations.clear(),
      this.database.clients.clear(),
      this.database.clientOnboardings.clear(),
      this.database.clientRequirements.clear(),
      this.database.clientAssets.clear(),
      this.database.clientProjects.clear(),
      this.database.projectTasks.clear(),
      this.database.projectMilestones.clear(),
      this.database.teamMembers.clear(),
      this.database.deliverables.clear(),
      this.database.deliverableRevisions.clear(),
      this.database.clientCommunications.clear(),
      this.database.projectExpenses.clear(),
      this.database.invoices.clear(),
      this.database.payments.clear(),
      this.database.agencyExpenses.clear(),
      this.database.recurringContracts.clear(),
      this.database.financialAuditLogs.clear(),
      this.database.clientPortalUsers.clear(),
      this.database.clientRequests.clear(),
      this.database.clientNotifications.clear(),
      this.database.clientApprovals.clear(),
      this.database.clientInvitations.clear(),
      this.database.automationWorkflows.clear(),
      this.database.automationEvents.clear(),
      this.database.automationExecutions.clear(),
      this.database.automationApprovals.clear(),
      this.database.integrationConnections.clear(),
      this.database.webhookEndpoints.clear(),
      this.database.webhookDeliveries.clear(),
      this.database.ceoTargets.clear(),
      this.database.ceoDailyBriefings.clear(),
      this.database.ceoWeeklyReviews.clear(),
      this.database.ceoActions.clear(),
      this.database.tenants.clear(),
      this.database.tenantBranding.clear(),
      this.database.tenantPlans.clear(),
      this.database.tenantSubscriptions.clear(),
      this.database.tenantUsers.clear(),
      this.database.tenantInvitations.clear(),
      this.database.tenantDomains.clear(),
      this.database.tenantUsage.clear(),
      this.database.tenantAuditLogs.clear(),
      this.database.tenantModuleConfigs.clear(),
    ]);
  }
}

export const repository: IRepository = new DexieRepositoryImpl();


