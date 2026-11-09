export type VerificationStatus = 'verified' | 'estimated' | 'hypothesis' | 'unverified';
export type ScoreBand = 'A' | 'B' | 'C' | 'Hold';
export type BusinessStatus =
  | 'discovered'
  | 'researched'
  | 'audited'
  | 'qualified'
  | 'contact_ready'
  | 'outreach_ready'
  | 'draft_ready'
  | 'contacted'
  | 'replied'
  | 'meeting_booked'
  | 'in_discussion'
  | 'proposal_sent'
  | 'negotiation'
  | 'won'
  | 'closed'
  | 'lost'
  | 'not_interested'
  | 'suppressed';
export type ResearchDepth = 'quick' | 'standard' | 'deep';

export type OpportunityCategory =
  | 'website_redesign'
  | 'website_development'
  | 'landing_pages'
  | 'local_seo'
  | 'technical_seo'
  | 'seo'
  | 'google_business_profile'
  | 'lead_generation'
  | 'conversion_optimization'
  | 'social_media'
  | 'social_media_marketing'
  | 'paid_advertising'
  | 'content_marketing'
  | 'video_marketing'
  | 'crm'
  | 'automation'
  | 'marketing_automation'
  | 'email_marketing'
  | 'email_automation'
  | 'whatsapp_automation'
  | 'ai_chat_assistants'
  | 'business_process_automation'
  | 'reputation_management'
  | 'customer_experience'
  | 'ecommerce'
  | 'custom_software';

export type WatechService = OpportunityCategory;

export interface ResearchProject {
  id: string;
  tenantId?: string;
  name: string;
  country: string;
  stateRegion: string;
  cityArea: string;
  zipPostalCodes?: string;
  neighborhoodsOrCorridors?: string;
  industryNiche: string;
  subIndustry?: string;
  businessModel: 'residential' | 'commercial' | 'b2b' | 'b2c' | 'mixed';
  targetBusinessSize?: string;
  targetServices?: string;
  targetCustomerSegment?: string;
  competitorNames?: string;
  watechServicesToEvaluate: WatechService[];
  researchDepth: ResearchDepth;
  targetDiscoveryCount?: number;
  notesAndExclusions?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MarketArea {
  id: string;
  projectId: string;
  name: string;
  country: string;
  region: string;
  geographicBoundaries: string;
  zipPostalCodes?: string;
  mainCommercialAreas?: string;
  residentialIndustrialZones?: string;
  relevantCategories: string[];
  estimatedBusinessCount?: number;
  countSourceUrl?: string;
  countConfidence?: number;
  independentVsFranchiseRatio?: string;
  residentialCommercialSplit?: string;
  seasonalityAndDemandNotes?: string;
  competitorsOverview?: string;
  digitalMaturityPattern?: string;
  competitionDensity?: 'low' | 'moderate' | 'high' | 'saturated';
  underservedGaps?: string;
  underservedLocations?: string;
  potentialGrowthAreas?: string;
  marketRisks?: string;
  coveragePercentage: number;
  createdAt: string;
}

export interface Business {
  id: string;
  tenantId?: string;
  projectId: string;
  googlePlaceId?: string;
  officialName: string;
  brandName?: string;
  domain: string;
  websiteUrl: string;
  hasWebsite?: boolean;
  phone?: string;
  email?: string;
  fullAddress?: string;
  city?: string;
  state?: string;
  country: string;
  postalCode?: string;
  serviceArea?: string;
  businessModel: string;
  foundingYear?: number;
  teamSizeEstimate?: string;
  fleetCapacity?: string;
  ownerManagerName?: string;
  ownerManagerRole?: string;
  ownerVerificationStatus: VerificationStatus;
  opportunityScore?: number;
  pricingNotes?: string;
  reviewRating?: number;
  reviewCount?: number;
  reviewSentimentSummary?: string;
  marketingChannels: string[];
  growthSignals?: string[];
  strengths?: string[];
  weaknesses?: string[];
  googleBusinessProfileUrl?: string;
  linkedinCompanyUrl?: string;
  status: BusinessStatus;
  queueStatus?: LeadQueueStatus;
  buyingReadinessSignals?: BuyingReadinessSignal[];
  researchCompleteness?: number;
  mergedIds?: string[];
  isDemo?: boolean;
  lastCheckedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type AuditCategory =
  | 'existence_and_accessibility'
  | 'visual_credibility'
  | 'mobile_responsiveness'
  | 'performance_and_speed'
  | 'technical_seo'
  | 'local_seo'
  | 'conversion_focus'
  | 'lead_capture'
  | 'trust_and_proof'
  | 'follow_up_readiness';

export interface AuditFinding {
  id: string;
  auditId: string;
  category: AuditCategory;
  observation: string;
  evidenceUrlOrSnippet: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  confidence: number;
  customerImpact: string;
  recommendedAction: string;
  isAutomated: boolean;
}

export interface AuditCategoryScore {
  category: AuditCategory;
  categoryName: string;
  score: number; // 0 - 100
  weight: number;
  status: 'passed' | 'warning' | 'failed' | 'unknown';
  findingsCount: number;
  summary: string;
}

export interface AdvancedAuditIssue {
  id: string;
  auditId: string;
  dimension: 'technical' | 'seo' | 'performance' | 'conversion' | 'ux' | 'trust';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  whatIsWrong: string;
  evidence: string;
  whyItMatters: string;
  recommendedFix: string;
  expectedBusinessImpact: string;
  estimatedEffort: 'low' | 'medium' | 'high';
  confidence: number;
  matchedWatechService: WatechService;
}

export interface AuditDimensions {
  technicalHealth: number;
  seoReadiness: number;
  performance: number;
  conversionReadiness: number;
  userExperience: number;
  trustAndCredibility: number;
}

export interface WebsiteAudit {
  id: string;
  businessId: string;
  projectId: string;
  targetUrl: string;
  totalScore: number;
  grade: ScoreBand;
  inspectedAt: string;
  responseTimeMs?: number;
  httpStatus?: number;
  hasSsl?: boolean;
  isAutomated: boolean;
  scoringRulesVersion: string;
  dimensions?: AuditDimensions;
  robotsTxtAvailable?: boolean;
  sitemapAvailable?: boolean;
  imageStats?: { total: number; missingAlt: number; unoptimized: number };
  linkStats?: { internal: number; external: number };
  pageSpeedData?: {
    performance?: number;
    accessibility?: number;
    bestPractices?: number;
    seo?: number;
    lcp?: string;
    cls?: string;
    fid?: string;
    isAvailable: boolean;
    notice?: string;
  };
  categories: AuditCategoryScore[];
  findings: AuditFinding[];
  advancedIssues?: AdvancedAuditIssue[];
}

export interface IntelligenceFact {
  id: string;
  businessId: string;
  projectId: string;
  claim: string;
  value: string;
  category: 'identity' | 'leadership' | 'operations' | 'marketing' | 'reputation' | 'growth' | 'pricing';
  sourceUrl: string;
  sourceType: string;
  dateCollected: string;
  confidence: number;
  verificationStatus: VerificationStatus;
  notes?: string;
}

export type ContentClassification =
  | 'educational'
  | 'promotional'
  | 'service_focused'
  | 'problem_solving'
  | 'comparison'
  | 'case_study'
  | 'faq'
  | 'seasonal'
  | 'local_community'
  | 'brand_awareness';

export interface ContentItem {
  id: string;
  businessId: string;
  projectId: string;
  contentType: 'service_page' | 'blog' | 'landing_page' | 'google_profile' | 'social_media' | 'youtube' | 'review_qa' | 'faq' | 'competitor_page';
  classification?: ContentClassification;
  title: string;
  url: string;
  mainTopic?: string;
  summary?: string;
  headings?: string[];
  publicationDate?: string;
  lastUpdatedDate?: string;
  callToActionText?: string;
  callToActionQuality: 'strong' | 'weak' | 'missing';
  imagesCount?: number;
  internalLinksCount?: number;
  themes: string[];
  audience?: string;
  observedCadence?: string;
  customerFaqsIdentified?: string[];
  missingGapsIdentified?: string[];
  sourceUrl?: string;
  sourceType?: 'website' | 'blog' | 'service_page' | 'faq' | 'social' | 'youtube' | 'reviews' | 'competitor' | 'manual';
  dateObserved: string;
}

export type OpportunityPriority =
  | 'immediate_opportunity'
  | 'high_priority'
  | 'medium_priority'
  | 'long_term_opportunity'
  | 'insufficient_evidence';

export interface OpportunityScoreBreakdown {
  businessImpact: number; // Max 25
  evidenceStrength: number; // Max 25
  serviceRelevance: number; // Max 20
  implementationFeasibility: number; // Max 15
  businessReadinessSignals: number; // Max 15
  totalScore: number; // Max 100
  scoreExplanation: string;
}

export interface CompoundOpportunityRelationship {
  parentOpportunityId: string;
  childFindingIds: string[];
  compoundTitle: string;
  synthesisRationale: string;
}

export interface Opportunity {
  id: string;
  businessId: string;
  projectId: string;
  identifiedProblem: string;
  evidence: string;
  businessRelevance: string;
  recommendedSolution: string;
  relevantWatechService: WatechService;
  category?: OpportunityCategory;
  priorityBand?: OpportunityPriority;
  scoreBreakdown?: OpportunityScoreBreakdown;
  smallestUsefulFirstStep?: string;
  businessConsequence?: string;
  implementationComplexity?: 'low' | 'medium' | 'high';
  isCompound?: boolean;
  compoundFindings?: string[];
  auditorNotes?: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  suggestedOutreachAngle: string;
  status: 'identified' | 'proposed' | 'in_discussion' | 'accepted' | 'dismissed';
  createdAt: string;
}

export type LeadQueueStatus =
  | 'research_next'
  | 'find_decision_maker'
  | 'verify_contact'
  | 'prepare_outreach'
  | 'ready_for_review'
  | 'contacted'
  | 'replied'
  | 'not_interested'
  | 'suppressed';

export type BuyingReadinessSignalType =
  | 'hiring_activity'
  | 'new_locations'
  | 'new_services'
  | 'recent_expansion'
  | 'active_marketing'
  | 'rebranding'
  | 'growth_announcements';

export interface BuyingReadinessSignal {
  id: string;
  type: BuyingReadinessSignalType;
  title: string;
  description: string;
  sourceUrl?: string;
  sourceType?: string;
  dateObserved?: string;
  isPubliclyObservable: boolean;
}

export interface DuplicateCandidate {
  business: Business;
  duplicateOf: Business;
  matchReasons: ('domain' | 'name' | 'phone' | 'address')[];
  confidence: number;
}

export interface LeadScoreCategory {
  name: string;
  pointsAwarded: number;
  maxPoints: number;
  evidence: string;
  isUnknown: boolean;
  notes?: string;
}

export interface Prompt08ScoreBreakdown {
  opportunityEvidence: LeadScoreCategory; // Max 25
  websitePotential: LeadScoreCategory; // Max 15
  localSeoPotential: LeadScoreCategory; // Max 15
  capacityGrowthSignals: LeadScoreCategory; // Max 10
  watechServiceFit: LeadScoreCategory; // Max 15
  decisionMakerAvailability: LeadScoreCategory; // Max 10
  dataReliabilityRecency: LeadScoreCategory; // Max 10
}

export interface LeadScore {
  id: string;
  businessId: string;
  projectId: string;
  totalScore: number;
  band: ScoreBand;
  breakdown: {
    websiteIssues?: LeadScoreCategory;
    seoWeaknesses?: LeadScoreCategory;
    leadCaptureWeaknesses?: LeadScoreCategory;
    socialContentWeaknesses?: LeadScoreCategory;
    reputationOpportunities?: LeadScoreCategory;
    automationOpportunities?: LeadScoreCategory;
    capacityGrowthSignals: LeadScoreCategory;
    decisionMakerRoute?: LeadScoreCategory;
    // Prompt 08 7-dimension categories:
    opportunityEvidence?: LeadScoreCategory;
    websitePotential?: LeadScoreCategory;
    localSeoPotential?: LeadScoreCategory;
    watechServiceFit?: LeadScoreCategory;
    decisionMakerAvailability?: LeadScoreCategory;
    dataReliabilityRecency?: LeadScoreCategory;
  };
  prompt08Breakdown?: Prompt08ScoreBreakdown;
  positiveEvidence?: string[];
  negativeEvidence?: string[];
  unknownInformation?: string[];
  priorityReasons?: string[];
  recommendedNextStep?: string;
  researchCompleteness?: number;
  customWeightsApplied?: Record<string, number>;
  calculatedAt: string;
  rationale: string;
}

export type ContactSourceLabel =
  | 'official_company_source'
  | 'public_professional_profile'
  | 'reputable_directory'
  | 'third_party_provider'
  | 'user_supplied'
  | 'unverified';

export type DecisionMakerTier =
  | 'tier1_executive'
  | 'tier2_director'
  | 'tier3_management'
  | 'general_staff';

export type ContactReviewStatus =
  | 'approved'
  | 'rejected'
  | 'pending_review'
  | 'merged';

export interface DecisionMakerConfidenceBreakdown {
  sourceQuality: number; // Max 30
  roleRelevance: number; // Max 25
  companyAssociation: number; // Max 20
  informationRecency: number; // Max 15
  independentCorroboration: number; // Max 10
  totalConfidence: number; // Max 100
  explanation: string;
}

export interface ContactResearchHistoryEntry {
  id: string;
  contactId?: string;
  businessId: string;
  action: 'discovered' | 'verified_mx' | 'approved' | 'rejected' | 'edited' | 'merged';
  timestamp: string;
  details: string;
  actor: string;
}

export interface Contact {
  id: string;
  businessId: string;
  projectId: string;
  fullName: string;
  roleOrTitle: string;
  company?: string;
  email?: string;
  phone?: string;
  publicBusinessPhone?: string;
  linkedinUrl?: string;
  professionalProfileUrl?: string;
  gbpUrl?: string;
  sourceDirectory?: string;
  department?: string;
  verificationStatus: VerificationStatus;
  isDecisionMaker: boolean;
  decisionMakerTier?: DecisionMakerTier;
  contactSourceLabel?: ContactSourceLabel;
  reviewStatus?: ContactReviewStatus;
  confidence: number;
  confidenceBreakdown?: DecisionMakerConfidenceBreakdown;
  corroboratingSources?: string[];
  sourceUrl?: string;
  discoveryDate?: string;
  notes?: string;
  decisionMakerScore?: number;
  isApproved?: boolean;
  isFallbackGeneralRoute?: boolean;
}

export type EmailType = 
  | 'named_professional'
  | 'general_business'
  | 'department_email'
  | 'contact_form_only'
  | 'unknown'
  | 'personal_professional'
  | 'general_inbox'
  | 'department_inbox'
  | 'form_only'
  | 'inferred';

export type EmailVerificationStatus =
  | 'provider_verified'
  | 'domain_passed_unconfirmed'
  | 'accept_all'
  | 'risky'
  | 'unknown'
  | 'invalid'
  | 'disposable'
  | 'verified_provider'
  | 'risky_accept_all';

export interface EmailProviderConfig {
  provider: 'hunter' | 'snov' | 'apollo';
  name: string;
  apiKeyConfigured: boolean;
  connectionStatus: 'connected' | 'unconfigured' | 'rate_limited' | 'error';
  monthlyQuota?: number;
  usedQuota?: number;
  lastCheckedDate?: string;
  lastError?: string;
}

export interface ContactQualityScore {
  sourceReliability: number; // Max 35
  roleAssociation: number; // Max 30
  verificationQuality: number; // Max 25
  recency: number; // Max 10
  totalScore: number; // Max 100
  grade: 'high_quality' | 'acceptable' | 'low_quality' | 'excluded';
  summary: string;
}

export interface EmailDiscoveryRecord {
  id: string;
  businessId: string;
  projectId: string;
  email: string;
  associatedPersonName?: string;
  roleTitle?: string;
  emailType: EmailType;
  discoverySource: 'website' | 'gbp' | 'linkedin' | 'directory' | 'social' | 'provider' | 'manual' | 'csv_import';
  sourceUrl: string;
  discoveryDate: string;
  sourceType: string;
  providerName?: string;
  providerResponse?: Record<string, any>;
  confidence: number;
  verificationStatus: EmailVerificationStatus;
  syntaxValid: boolean;
  mxRecordsPresent: boolean;
  isDisposable: boolean;
  isRoleBased: boolean;
  qualityScore?: ContactQualityScore;
  isOutreachSafe?: boolean;
  exclusionReason?: string;
  sourceHistory?: string[];
  notes?: string;
}

export interface SourceRecord {
  id: string;
  projectId: string;
  businessId?: string;
  url: string;
  sourceName: string;
  sourceType: 'official_website' | 'public_registry' | 'search_engine' | 'social_media' | 'customer_reviews' | 'direct_inspection' | 'demo_dataset' | 'csv_import' | 'directory_listing' | 'linkedin_public' | 'gbp_public';
  retrievalDate: string;
  excerptOrNote: string;
  verificationStatus: VerificationStatus;
  confidence: number;
}

export interface OutreachSequence {
  firstContact: { subject: string; body: string; cta: string };
  followUpNoResponse: { subject: string; body: string; cta: string };
  positiveReply: { subject: string; body: string; cta: string };
  requestMoreInfo: { subject: string; body: string; cta: string };
  notInterested: { subject: string; body: string; cta: string };
  optOutNotice: { subject: string; body: string; cta: string };
}

export interface OutreachDraft {
  id: string;
  businessId: string;
  projectId: string;
  verifiedIdentity: string;
  targetName?: string;
  targetRole?: string;
  contactRouteSummary: string;
  strongestFindings: string[];
  topOpportunity: string;
  recommendedService: WatechService;
  personalizationAngle: string;
  suggestedSubjectLine: string;
  callToAction: string;
  sequence?: OutreachSequence;
  sourcesAttribution: string;
  isSuppressed: boolean;
  isApprovedByHuman?: boolean;
  status: 'draft' | 'ready' | 'suppressed' | 'sent';
  createdAt: string;
}

export interface SuppressionRecord {
  id: string;
  domain?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  reason: string;
  addedAt: string;
}

export interface GmailIntegrationState {
  isConnected: boolean;
  userEmail?: string;
  draftOnlyMode: boolean;
  lastConnectedAt?: string;
}

// PROMPT 05: Local SEO & Google Business Profile Intelligence Types

export type LocalSeoProvenance = 'manual' | 'csv_import' | 'live_inspect' | 'google_places_api';

export interface LocalSeoProfile {
  id: string;
  businessId: string;
  projectId: string;
  businessName: string;
  address?: string;
  phone?: string;
  websiteUrl?: string;
  googleBusinessProfileUrl?: string;
  primaryCategory: string;
  secondaryCategories: string[];
  serviceAreas: string[];
  zipCodes: string[];
  serviceRadiusMiles?: number;
  openingHours?: string;
  description?: string;
  servicesList: string[];
  photosCount: number;
  hasCoverPhoto: boolean;
  reviewCount: number;
  averageRating: number;
  respondedReviewsCount?: number;
  averageResponseTimeDays?: number;
  qaCount?: number;
  unansweredQaCount?: number;
  hasLocalBusinessSchema?: boolean;
  hasServiceAreaPages?: boolean;
  napConsistencyStatus: 'matched' | 'mismatched' | 'unknown';
  napDiscrepancies: string[];
  source: LocalSeoProvenance;
  apiConfigured: boolean;
  lastAuditedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalReview {
  id: string;
  profileId: string;
  businessId: string;
  projectId: string;
  authorName: string;
  rating: number;
  reviewDate?: string;
  reviewText: string;
  ownerResponseText?: string;
  ownerResponseDate?: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  detectedPraiseTopic?: string;
  detectedComplaintTopic?: string;
  serviceMentioned?: string;
}

export interface ComplaintSummaryItem {
  topic: string;
  count: number;
  evidenceQuotes: string[];
}

export interface PraiseSummaryItem {
  serviceOrAspect: string;
  count: number;
  evidenceQuotes: string[];
}

export interface ReviewIntelligenceReport {
  totalReviewsAnalyzed: number;
  responseRatePercentage: number;
  averageResponseTimeDays?: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  commonComplaints: ComplaintSummaryItem[];
  frequentlyPraised: PraiseSummaryItem[];
  customerExpectations: string[];
  trustBuildingOpportunities: string[];
}

export interface LocalSeoScorecardDimension {
  name: string;
  score: number; // 0 - 100
  weight: number;
  status: 'excellent' | 'good' | 'needs_work' | 'critical' | 'unknown';
  evidence: string[];
  gaps: string[];
}

export interface LocalSeoScorecard {
  id: string;
  businessId: string;
  projectId: string;
  totalScore: number;
  band: ScoreBand;
  profileCompleteness: LocalSeoScorecardDimension;
  napConsistency: LocalSeoScorecardDimension;
  reviewManagement: LocalSeoScorecardDimension;
  websiteLocalSeo: LocalSeoScorecardDimension;
  localContent: LocalSeoScorecardDimension;
  competitorPositioning: LocalSeoScorecardDimension;
  calculatedAt: string;
  summary: string;
}

// PROMPT 06: Content & Competitor Intelligence Engine Types

export interface CustomerQuestionInsight {
  id: string;
  projectId: string;
  businessId?: string;
  question: string;
  category: 'pain_point' | 'purchase_concern' | 'service_comparison' | 'emergency_need' | 'price_concern' | 'trust_concern';
  customerContext: string;
  sourceLabel: string;
  sourceType: 'public_reviews' | 'public_faq' | 'search_intent' | 'customer_feedback';
  suggestedContentAngle: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ContentOpportunityItem {
  id: string;
  projectId: string;
  businessId: string;
  topic: string;
  targetAudience: string;
  customerProblem: string;
  searchIntent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  suggestedFormat: 'pillar_guide' | 'case_study' | 'faq_accordion' | 'service_page' | 'video_script' | 'comparison_matrix';
  suggestedTitle: string;
  suggestedOutline: string[];
  relevantWatechService: WatechService;
  funnelStage: 'top_of_funnel_awareness' | 'middle_of_funnel_evaluation' | 'bottom_of_funnel_decision';
  priority: 'high' | 'medium' | 'low';
  evidenceSource: string;
  status: 'identified' | 'added_to_calendar' | 'published';
}

export interface ContentCalendarItem {
  id: string;
  projectId: string;
  businessId: string;
  topic: string;
  contentFormat: 'pillar_guide' | 'case_study' | 'faq_accordion' | 'service_page' | 'video_script' | 'comparison_matrix' | 'linkedin_post' | 'gbp_update';
  platform: 'website_blog' | 'service_page' | 'linkedin' | 'youtube' | 'gbp_update' | 'email_newsletter';
  plannedDate: string;
  status: 'idea' | 'planned' | 'in_production' | 'ready' | 'published';
  assignedPerson: string;
  priority: 'high' | 'medium' | 'low';
  targetAudience?: string;
  notes?: string;
  linkedOpportunityId?: string;
}

export interface CompetitorContentMetric {
  businessId: string;
  businessName: string;
  discoveredPagesCount: number;
  servicePagesCount: number;
  faqCount: number;
  localPagesCount: number;
  educationalCount: number;
  caseStudyCount: number;
  lastUpdatedCadence: string;
  ctaEffectivenessScore: number; // 0-100
  topTopics: string[];
}

// PROMPT 11: Outreach Strategy & Personalization Engine Types

export type OutreachAngleId = 'conversion_friction' | 'local_authority' | 'growth_capacity';

export type OutreachStyle =
  | 'professional'
  | 'conversational'
  | 'short_direct'
  | 'consultative'
  | 'executive';

export type OutreachMessageType =
  | 'first_cold_email'
  | 'short_intro'
  | 'personalized_follow_up'
  | 'value_first'
  | 'permission_offer'
  | 'website_concept_intro'
  | 'linkedin_connect'
  | 'linkedin_follow_up'
  | 'response_interested'
  | 'response_not_interested'
  | 'polite_closing';

export interface OutreachEvidenceClaim {
  id: string;
  claimText: string;
  sourceName: string;
  sourceUrl: string;
  sourceType: string;
  retrievalDate: string;
  isIncluded: boolean;
}

export interface OutreachMessageContent {
  subject: string;
  body: string;
  cta: string;
}

export interface OutreachStrategyAngle {
  id: OutreachAngleId;
  title: string;
  description: string;
  isRecommended: boolean;
  recommendedReason: string;
  bestBusinessProblem: string;
  strongestEvidence: string;
  relevantWatechService: WatechService;
  whyFindingMatters: string;
  openingAngle: string;
  bestFirstContactCta: string;
  recommendedFollowUpApproach: string;
  messages: Record<OutreachMessageType, OutreachMessageContent>;
  evidenceClaims: OutreachEvidenceClaim[];
}

export type OutreachStrategyStatus =
  | 'draft'
  | 'approved'
  | 'contacted'
  | 'follow_up_scheduled'
  | 'replied_interested'
  | 'replied_more_info'
  | 'not_interested'
  | 'suppressed';

export interface OutreachProspectStrategy {
  id: string;
  businessId: string;
  projectId: string;
  targetContactId?: string;
  targetContactName?: string;
  targetContactRole?: string;
  targetContactEmail?: string;
  selectedAngleId: OutreachAngleId;
  activeStyle: OutreachStyle;
  angles: OutreachStrategyAngle[];
  status: OutreachStrategyStatus;
  approvalDate?: string;
  contactedDate?: string;
  scheduledFollowUpDate?: string;
  responseDate?: string;
  responseNotes?: string;
  isSuppressed: boolean;
  suppressionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutreachPerformanceMetrics {
  draftsCreated: number;
  messagesApproved: number;
  messagesSent: number;
  replies: number;
  positiveReplies: number;
  meetings: number;
  optOuts: number;
}

// PROMPT 12: Gmail Integration & Draft Management Types

export interface GmailTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp ms
  scope: string;
  tokenType: string;
}

export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

export interface GmailDraftRecord {
  id: string;
  businessId: string;
  projectId: string;
  gmailDraftId: string;
  gmailMessageId?: string;
  recipient: string;
  subject: string;
  bodySnippet: string;
  status: 'draft_created' | 'sent_manually' | 'discarded';
  webLink?: string;
  createdAt: string;
  updatedAt: string;
}

// PROMPT 13: Outreach CRM, Follow-up Automation & Activity Timeline Types

export type FollowUpStatus =
  | 'scheduled'
  | 'due_today'
  | 'overdue'
  | 'completed'
  | 'paused'
  | 'stopped';

export type FollowUpStopCondition =
  | 'recipient_replied'
  | 'opted_out'
  | 'marked_not_interested'
  | 'suppressed'
  | 'invalid_email'
  | 'max_attempts_reached'
  | 'manual_stop';

export interface FollowUpSchedule {
  id: string;
  businessId: string;
  projectId: string;
  firstOutreachDate: string;
  nextFollowUpDate: string;
  followUpIntervalDays: number;
  attemptNumber: number;
  maxAttempts: number;
  preferredChannel: 'email' | 'phone' | 'linkedin';
  timezone?: string;
  status: FollowUpStatus;
  stopReason?: FollowUpStopCondition;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CrmActivityType =
  | 'lead_discovered'
  | 'research_completed'
  | 'audit_performed'
  | 'qualification_changed'
  | 'contact_added'
  | 'draft_generated'
  | 'draft_approved'
  | 'gmail_draft_created'
  | 'email_marked_sent'
  | 'followup_scheduled'
  | 'followup_completed'
  | 'reply_received'
  | 'meeting_booked'
  | 'proposal_sent'
  | 'negotiation_started'
  | 'deal_won'
  | 'deal_lost'
  | 'suppressed_optout';

export interface CrmActivity {
  id: string;
  businessId: string;
  projectId: string;
  type: CrmActivityType;
  title: string;
  description: string;
  actor: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface CrmMetricsSummary {
  totalLeads: number;
  qualifiedLeads: number;
  contactReady: number;
  draftsCreated: number;
  gmailDrafts: number;
  contacted: number;
  repliesReceived: number;
  positiveReplies: number;
  meetingsBooked: number;
  proposalsSent: number;
  dealsWon: number;
  dealsLost: number;
  suppressedCount: number;
  followUpsDueCount: number;
  followUpsOverdueCount: number;
}

// PROMPT 14: AI Research Assistant & Strategic Business Analyst Types

export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'local_heuristic';

export type AIChatRole = 'user' | 'assistant' | 'system';

export interface AICitation {
  sourceName: string;
  sourceUrl?: string;
  dateCollected?: string;
  category: string;
  excerpt: string;
  confidence?: number;
}

export interface AIMessage {
  id: string;
  conversationId?: string;
  role: AIChatRole;
  content: string;
  citations?: AICitation[];
  dataGaps?: string[];
  timestamp: string;
  modelUsed?: string;
}

export interface AIConversation {
  id: string;
  projectId: string;
  businessId?: string;
  title: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AIStrategicReport {
  id: string;
  businessId: string;
  projectId: string;
  title: string;
  executiveSummary: string;
  overview: {
    whatBusinessDoes: string;
    servicesOffered: string[];
    targetMarket: string;
    visiblePositioning: string;
  };
  digitalPresence: {
    websiteQualityScore: number;
    localSeoScore: number;
    conversionPathHealth: string;
    trustSignals: string[];
  };
  competitivePosition: {
    visibleCompetitors: string[];
    servicePositioning: string;
    observableGaps: string[];
  };
  growthOpportunities: {
    websiteImprovements: string[];
    localSeoOpportunities: string[];
    leadCaptureOptimizations: string[];
    automationOpportunities: string[];
  };
  watechServiceMatch: {
    recommendedServices: WatechService[];
    evidenceRationale: string;
  };
  dataGaps: string[];
  citations: AICitation[];
  generatedAt: string;
}

// PROMPT 15: Competitor Intelligence Monitoring & Change Detection Types

export type CompetitorMonitoringFrequency = 'manual' | 'daily' | 'weekly' | 'monthly';

export interface CompetitorWatchItem {
  id: string;
  projectId: string;
  businessId?: string;
  competitorName: string;
  websiteUrl: string;
  market: string;
  industry: string;
  monitoringStatus: 'active' | 'paused';
  monitoringFrequency: CompetitorMonitoringFrequency;
  lastCheckedDate?: string;
  nextScheduledCheck?: string;
  lastSuccessfulScan?: string;
  sourceReliability: number;
  failureCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitorSnapshot {
  id: string;
  watchId: string;
  capturedAt: string;
  httpStatus: number;
  title: string;
  metaDescription: string;
  mainHeadings: string[];
  servicesDetected: string[];
  ctaTexts: string[];
  publicOffers: string[];
  phoneDetected?: string;
  pageAvailability: boolean;
  internalLinksCount: number;
  rawSummarySnippet?: string;
}

export type CompetitorChangeType =
  | 'new_service'
  | 'removed_service'
  | 'title_change'
  | 'description_change'
  | 'new_promotion'
  | 'removed_promotion'
  | 'cta_change'
  | 'contact_change'
  | 'downtime'
  | 'restored';

export interface CompetitorChange {
  id: string;
  watchId: string;
  changeType: CompetitorChangeType;
  title: string;
  description: string;
  previousValue: string;
  currentValue: string;
  impactSeverity: 'high' | 'medium' | 'low';
  aiAnalysis?: string;
  status: 'new' | 'reviewed' | 'important' | 'dismissed';
  detectedAt: string;
}

export interface CompetitorNotification {
  id: string;
  watchId: string;
  changeId?: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  isRead: boolean;
  createdAt: string;
}

// PROMPT 16: Complete Multi-Market Intelligence Engine Types

export interface MarketScoreWeights {
  opportunityDensity: number; // e.g. 15
  digitalPresenceGaps: number; // e.g. 15
  localSeoOpportunity: number; // e.g. 15
  websiteImprovementOpportunity: number; // e.g. 15
  competitiveIntensity: number; // e.g. 10
  decisionMakerAccessibility: number; // e.g. 10
  researchCoverage: number; // e.g. 10
  leadQualificationPotential: number; // e.g. 10
}

export const DEFAULT_MARKET_SCORE_WEIGHTS: MarketScoreWeights = {
  opportunityDensity: 15,
  digitalPresenceGaps: 15,
  localSeoOpportunity: 15,
  websiteImprovementOpportunity: 15,
  competitiveIntensity: 10,
  decisionMakerAccessibility: 10,
  researchCoverage: 10,
  leadQualificationPotential: 10,
};

export interface MarketAggregatedMetrics {
  projectId: string;
  marketName: string;
  country: string;
  stateRegion: string;
  cityArea: string;
  industry: string;
  researchDepth: string;
  targetServices?: string;
  
  // Volume & Coverage
  totalDiscovered: number;
  withWebsiteCount: number;
  withoutWebsiteCount: number;
  auditedCount: number;
  auditCoveragePercent: number;
  avgAuditScore: number;
  sslCoveragePercent: number;
  
  // Local SEO & GBP
  localSeoCount: number;
  avgGbpRating: number;
  avgReviewCount: number;
  gbpClaimedPercent: number;
  
  // Contacts & Outreach
  contactsDiscoveredCount: number;
  decisionMakersCount: number;
  contactCoveragePercent: number;
  
  // Opportunities & Qualification
  totalOpportunitiesCount: number;
  qualifiedBusinessesCount: number; // Band A + B
  highOpportunityLeadsCount: number;
  avgLeadScore: number;
  
  // Scoring
  marketAttractivenessScore: number; // 0-100 explainable
  dimensionScores: Record<keyof MarketScoreWeights, number>;
  researchCoverageScore: number; // 0-100
  dataGaps: string[];
  recommendedNextAction: string;
  lastUpdated: string;
}

export interface MarketRecommendation {
  type: 'next_research' | 'strongest_digital_gap' | 'highest_qualified' | 'best_coverage' | 'needs_more_data';
  title: string;
  marketName: string;
  projectId: string;
  evidence: string;
  dataLimitations: string;
  suggestedAction: string;
}

export interface MarketComparison {
  id: string;
  name: string;
  projectIds: string[];
  weights: MarketScoreWeights;
  industryFilter?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketComparisonSnapshot {
  id: string;
  comparisonId: string;
  name: string;
  capturedAt: string;
  marketMetrics: Record<string, MarketAggregatedMetrics>;
  summaryNotes?: string;
}

export interface CrossMarketBusinessComparison {
  businessA: Business;
  businessB: Business;
  marketA: string;
  marketB: string;
  scoreA: number;
  scoreB: number;
  auditScoreA?: number;
  auditScoreB?: number;
  reviewCountA?: number;
  reviewCountB?: number;
  comparisonPoints: {
    dimension: string;
    valueA: string;
    valueB: string;
    advantage: 'business_a' | 'business_b' | 'tie' | 'insufficient_data';
    rationale: string;
  }[];
  verdict: string;
}

// ==========================================
// PROMPT 17: ADVANCED SALES INTELLIGENCE & BUYER SIGNALS
// ==========================================

export type BuyerSignalCategory =
  | 'growth'
  | 'digital_transformation'
  | 'marketing_need'
  | 'customer_experience'
  | 'competitive_pressure'
  | 'operational_efficiency';

export type BuyerSignalConfidence = 'high' | 'medium' | 'low' | 'unverified';

export type BuyerSignalReliability =
  | 'directly_observed'
  | 'third_party_public'
  | 'automated_interpretation'
  | 'hypothesis';

export type BuyerSignalStatus = 'active' | 'archived' | 'disproven';

export type BuyingIntentLevel =
  | 'explicit_intent'
  | 'strong_signal'
  | 'emerging_signal'
  | 'potential_need'
  | 'unknown';

export type SalesReadinessCategory =
  | 'priority_sales_opportunity'
  | 'strong_potential'
  | 'research_further'
  | 'low_immediate_priority'
  | 'insufficient_evidence';

export interface SalesReadinessWeights {
  businessNeedEvidence: number; // default 25
  growthSignals: number; // default 15
  buyingInvestmentSignals: number; // default 15
  digitalImprovementPotential: number; // default 15
  watechServiceFit: number; // default 15
  decisionMakerAccessibility: number; // default 10
  evidenceRecencyReliability: number; // default 5
}

export interface BuyerSignal {
  id: string;
  businessId: string;
  projectId: string;
  category: BuyerSignalCategory;
  signalType: string;
  title: string;
  description: string;
  evidenceExcerpt: string;
  sourceUrl?: string;
  sourceType: string;
  confidence: BuyerSignalConfidence;
  reliability: BuyerSignalReliability;
  firstDetectedDate: string;
  lastVerifiedDate: string;
  expirationDate?: string;
  recencyWeight: number; // 0.25 - 1.0 based on time decay
  status: BuyerSignalStatus;
}

export interface BuyerRoleRecommendation {
  recommendedRole: string; // e.g., 'Owner / Founder', 'VP Marketing', 'Operations Director'
  rationale: string;
  suggestedConversationStarter: string;
  matchedContactId?: string;
  matchedContactName?: string;
}

export interface SalesReadinessDimensionScore {
  dimension: keyof SalesReadinessWeights;
  name: string;
  pointsAwarded: number;
  maxPoints: number;
  weight: number;
  weightedScore: number;
  rawMetricSummary: string;
  evidenceRationale: string;
}

export interface SalesReadinessRecord {
  id: string;
  businessId: string;
  projectId: string;
  overallScore: number; // 0 - 100 explainable
  readinessCategory: SalesReadinessCategory;
  buyingIntent: BuyingIntentLevel;
  dimensionScores: Record<keyof SalesReadinessWeights, SalesReadinessDimensionScore>;
  buyerRoleRecommendation: BuyerRoleRecommendation;
  recommendedNextAction: string;
  primaryObservableBottleneck: string;
  calculatedAt: string;
  updatedAt: string;
}

// ==========================================
// PROMPT 18: WATECH SERVICE CATALOG & PACKAGE BUILDER
// ==========================================

export type ServiceCatalogCategory =
  | 'website_digital_experience'
  | 'marketing_customer_acquisition'
  | 'search_visibility'
  | 'creative_content'
  | 'software_business_automation'
  | 'business_growth_consulting';

export type PricingModel =
  | 'one_time'
  | 'monthly_retainer'
  | 'setup_plus_monthly'
  | 'custom_quote'
  | 'pricing_not_configured';

export type ServiceComplexity = 'low' | 'medium' | 'high' | 'enterprise';

export interface WatechServiceItem {
  id: string;
  name: string;
  category: ServiceCatalogCategory;
  description: string;
  problemsSolved: string[];
  idealIndustries: string[];
  idealBusinessSizes: string[];
  prerequisites: string[];
  deliverables: string[];
  complexity: ServiceComplexity;
  estimatedDuration: string;
  pricingModel: PricingModel;
  basePrice?: number;
  minPrice?: number;
  maxPrice?: number;
  isRecurring: boolean;
  optionalAddOns: string[];
  dependencies: string[];
  isActive: boolean;
  intendedOutcome: string;
  requiredCustomerAssets: string[];
  createdAt: string;
  updatedAt: string;
}

export type PackageType =
  | 'individual_service'
  | 'combined_solution'
  | 'complete_growth_system';

export interface PackageImplementationPhase {
  phase: number;
  name: string;
  duration: string;
  serviceIds: string[];
  keyMilestone: string;
}

export interface WatechServicePackage {
  id: string;
  name: string;
  type: PackageType;
  targetBusinessType: string;
  targetIndustry: string;
  description: string;
  includedServiceIds: string[];
  excludedServiceIds: string[];
  deliverables: string[];
  optionalAddOnIds: string[];
  implementationPhases: PackageImplementationPhase[];
  estimatedDuration: string;
  pricingModel: PricingModel;
  setupPrice?: number;
  recurringPrice?: number;
  supportPeriodDays: number;
  revisionLimit: number;
  termsAndConditions: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceMatchResult {
  serviceId: string;
  serviceName: string;
  category: ServiceCatalogCategory;
  matchScore: number; // 0 - 100
  relevanceFactor: number; // 0 - 100
  evidenceStrength: number; // 0 - 100
  supportingFindings: string[];
  rationale: string;
  expectedOutcome: string;
  requiredInformation: string[];
  prerequisitesMet: boolean;
  missingPrerequisites: string[];
  isUnnecessaryOrNoAction: boolean;
  implementationComplexity: ServiceComplexity;
}

export interface PricingSummary {
  model: PricingModel;
  setupText: string;
  recurringText: string;
  hasUnconfiguredPricing: boolean;
  estimatedTotalText: string;
}

export interface RecommendedTier {
  tierName: 'essential' | 'recommended' | 'comprehensive';
  packageType: PackageType;
  title: string;
  tagline: string;
  description: string;
  serviceMatches: ServiceMatchResult[];
  deliverables: string[];
  optionalAddOnServices: { id: string; name: string; whyConsider: string }[];
  estimatedDuration: string;
  pricingSummary: PricingSummary;
  feasibilityWarnings: string[];
  requiredCustomerAssets: string[];
  customerJourneyStagesCovered: string[]; // 1. Visibility, 2. Attraction, 3. Engagement, 4. Capture, 5. Qualification, 6. Follow-up, 7. Conversion, 8. Retention
  whyRecommended: string;
}

export interface BusinessServiceRecommendation {
  id: string;
  businessId: string;
  projectId: string;
  essentialSolution?: RecommendedTier;
  recommendedSolution: RecommendedTier;
  comprehensiveSolution?: RecommendedTier;
  serviceMatches: ServiceMatchResult[];
  status: 'draft' | 'approved' | 'presented' | 'rejected';
  userOverrideNotes?: string;
  pushedToCrm: boolean;
  pushedToCrmAt?: string;
  generatedAt: string;
  updatedAt: string;
}

// ==========================================
// PROMPT 19: PROPOSALS, QUOTATIONS & PRICING
// ==========================================

export type ProposalStatus =
  | 'draft'
  | 'internal_review'
  | 'approved'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'declined'
  | 'expired'
  | 'revised'
  | 'cancelled';

export type QuotationStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sent'
  | 'accepted'
  | 'declined'
  | 'expired';

export type ProposalTemplateType =
  | 'premium_business'
  | 'website_digital'
  | 'marketing_leadgen'
  | 'automation_software'
  | 'compact_quotation';

export type ProposalCurrency = 'USD' | 'PKR' | 'AED' | 'GBP' | 'EUR';

export interface QuotationLineItem {
  id: string;
  serviceId?: string;
  serviceName: string;
  description: string;
  category: ServiceCatalogCategory;
  billingType: 'one_time' | 'monthly' | 'hourly';
  quantity: number;
  unitPrice: number | null; // null represents 'pricing_not_configured'
  discountPercent: number; // 0 - 100
  taxPercent: number; // e.g., 0, 5, 8.25
  subtotal: number | null;
  notes?: string;
}

export interface ProposalQuotation {
  id: string;
  proposalId: string;
  businessId: string;
  projectId: string;
  quotationNumber: string; // e.g. QUO-2026-0042
  status: QuotationStatus;
  currency: ProposalCurrency;
  issueDate: string;
  expiryDate: string;
  lineItems: QuotationLineItem[];
  subtotal: number | null;
  totalDiscount: number;
  totalTax: number;
  totalAmount: number | null;
  paymentTerms: string;
  hasUnconfiguredPricing: boolean;
  notes: string;
  exclusions: string[];
}

export interface ProposalSection {
  id: string;
  type: string;
  title: string;
  content: string;
  isIncluded: boolean;
  order: number;
}

export interface ProposalVersion {
  id: string;
  proposalId: string;
  versionNumber: number;
  changedSections: string[];
  changedPrices: string[];
  snapshotData: string; // Serialized JSON of BusinessProposal
  createdAt: string;
  createdBy?: string;
}

export interface BusinessProposal {
  id: string;
  businessId: string;
  projectId: string;
  crmLeadId?: string;
  quotationId?: string;
  proposalNumber: string; // e.g. PROP-2026-0088
  title: string;
  templateType: ProposalTemplateType;
  status: ProposalStatus;
  currentVersion: number;
  cover: {
    clientName: string;
    clientContact?: string;
    validityPeriod: string;
    date: string;
  };
  executiveSummary: string;
  businessAssessment: {
    auditExcerpt: string;
    seoExcerpt: string;
    opportunitiesIdentified: string[];
    competitorContext?: string;
  };
  recommendedSolution: {
    packageTitle: string;
    servicesList: string[];
    expectedOutcomes: string[];
    dependencies: string[];
  };
  scopeOfWork: {
    deliverables: string[];
    activities: string[];
    acceptanceCriteria: string[];
    exclusions: string[];
  };
  implementationPhases: {
    phase: number;
    name: string;
    duration: string;
    milestones: string;
  }[];
  timeline: {
    estimatedStart: string;
    duration: string;
    milestones: string[];
  };
  termsAndConditions: string;
  nextSteps: string[];
  quotation: ProposalQuotation;
  humanApproved: boolean;
  humanApprovedAt?: string;
  humanApprovedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrandingConfiguration {
  id: string;
  companyName: string;
  logoUrl?: string;
  website: string;
  contactEmail: string;
  phone: string;
  address: string;
  primaryColor: string;
  accentColor: string;
  footerText: string;
  signatureName: string;
  signatureTitle: string;
  isDefault: boolean;
}

export interface ProposalMetricsSummary {
  totalProposals: number;
  draftCount: number;
  approvedCount: number;
  sentCount: number;
  acceptedCount: number;
  rejectedCount: number;
  expiredCount: number;
  totalQuotedValue: number;
  acceptedValue: number;
  averageProposalValue: number;
  acceptanceRatePercent: number;
}

// ==========================================
// PROMPT 20: CLIENT ONBOARDING & PROJECT MANAGEMENT
// ==========================================

export type ClientStatus =
  | 'onboarding'
  | 'active'
  | 'in_delivery'
  | 'maintenance'
  | 'paused'
  | 'churned'
  | 'completed';

export interface ClientContactInfo {
  name: string;
  title: string;
  email: string;
  phone?: string;
  preferredChannel: 'email' | 'phone' | 'portal';
  timezone?: string;
}

export interface ClientCommercialInfo {
  acceptedProposalId?: string;
  quotationId?: string;
  purchasedPackageName?: string;
  agreedServices: string[];
  contractValue: number;
  currency: ProposalCurrency;
  paymentModel: 'one_time' | 'monthly_retainer' | 'milestone';
  startDate: string;
  renewalDate?: string;
}

export interface ClientAccountInfo {
  assignedManagerId?: string;
  internalNotes?: string;
  clientRequirementsSummary?: string;
}

export interface ClientProfile {
  id: string;
  businessId: string;
  projectId: string; // Research project id linkage
  companyName: string;
  industry: string;
  website: string;
  country: string;
  state: string;
  city: string;
  address?: string;
  phone?: string;
  email?: string;
  companySize?: string;
  primaryContact: ClientContactInfo;
  commercial: ClientCommercialInfo;
  account: ClientAccountInfo;
  status: ClientStatus;
  healthScore: number; // 0 - 100
  healthGrade: 'good' | 'at_risk' | 'critical';
  healthFactors: string[];
  createdAt: string;
  updatedAt: string;
}

export type OnboardingStepStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'blocked'
  | 'not_applicable';

export interface OnboardingStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  category: 'contract_payment' | 'assets_branding' | 'technical_access' | 'scope_alignment' | 'kickoff';
  status: OnboardingStepStatus;
  completedAt?: string;
  notes?: string;
}

export interface ClientOnboarding {
  id: string;
  clientId: string;
  projectId: string;
  templateCategory: 'website' | 'marketing' | 'automation' | 'general';
  steps: OnboardingStep[];
  overallProgress: number; // 0 - 100
  isCompleted: boolean;
  completedAt?: string;
  updatedAt: string;
}

export interface ClientRequirement {
  id: string;
  clientId: string;
  projectId?: string;
  title: string;
  description: string;
  requiredFileTypeOrInfo: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  submittedContent?: string;
  internalNotes?: string;
  createdAt: string;
}

export interface ClientAsset {
  id: string;
  clientId: string;
  projectId?: string;
  fileName: string;
  fileType: string;
  storageType: 'local_browser_blob';
  fileUrl?: string; // Data URL or object URL
  fileSizeBytes?: number;
  version: number;
  description?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
}

export type ProjectDeliveryStatus =
  | 'planning'
  | 'onboarding'
  | 'ready_to_start'
  | 'in_progress'
  | 'internal_review'
  | 'client_review'
  | 'revision_required'
  | 'blocked'
  | 'completed'
  | 'on_hold'
  | 'cancelled';

export interface ClientProject {
  id: string;
  clientId: string;
  researchProjectId: string;
  proposalId?: string;
  packageId?: string;
  name: string;
  description: string;
  services: string[];
  deliverables: string[];
  startDate: string;
  targetCompletionDate: string;
  actualCompletionDate?: string;
  status: ProjectDeliveryStatus;
  statusReason?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedManagerId?: string;
  budget: number;
  currency: ProposalCurrency;
  notes?: string;
  progressPercent: number; // 0 - 100
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus =
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'in_review'
  | 'blocked'
  | 'completed';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ProjectTaskChecklistItem {
  id: string;
  label: string;
  isDone: boolean;
}

export interface ProjectTask {
  id: string;
  projectId: string; // ClientProject ID
  clientId: string;
  milestoneId?: string;
  title: string;
  description: string;
  assignedToTeamMemberId?: string;
  priority: TaskPriority;
  status: TaskStatus;
  startDate?: string;
  dueDate: string;
  estimatedHours?: number;
  actualHours?: number;
  dependsOnTaskIds: string[];
  isBlocked: boolean;
  blockedReason?: string;
  checklist: ProjectTaskChecklistItem[];
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  clientId: string;
  name: string;
  description: string;
  targetDate: string;
  completionDate?: string;
  weightPercent: number;
  isCompleted: boolean;
  deliverableIds: string[];
  approvalRequired: boolean;
}

export type TeamMemberRole =
  | 'project_manager'
  | 'developer'
  | 'designer'
  | 'seo_specialist'
  | 'marketing_specialist'
  | 'automation_specialist'
  | 'account_manager';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamMemberRole;
  skills: string[];
  activeProjectIds: string[];
  maxWeeklyHours: number;
  currentAssignedHours: number;
  isActive: boolean;
}

export type DeliverableStatus =
  | 'pending_internal_review'
  | 'ready_for_client_review'
  | 'sent_for_review'
  | 'approved'
  | 'revision_requested'
  | 'rejected';

export interface Deliverable {
  id: string;
  projectId: string;
  clientId: string;
  title: string;
  description: string;
  milestoneId?: string;
  status: DeliverableStatus;
  approvalNotes?: string;
  approvedAt?: string;
  approvedBy?: string;
  handoverUrl?: string;
}

export interface DeliverableRevision {
  id: string;
  deliverableId: string;
  projectId: string;
  clientId: string;
  revisionNumber: number;
  clientFeedback: string;
  requestedChanges: string;
  isOutOfScope: boolean;
  outOfScopeNotes?: string;
  priority: 'low' | 'medium' | 'high';
  assignedToTeamMemberId?: string;
  dueDate?: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
}

export type ClientCommunicationType =
  | 'welcome'
  | 'requirement_request'
  | 'project_update'
  | 'approval_request'
  | 'delivery_notice'
  | 'revision_request'
  | 'support_request'
  | 'meeting_notes';

export interface ClientCommunication {
  id: string;
  clientId: string;
  projectId?: string;
  type: ClientCommunicationType;
  subject: string;
  messageBody: string;
  channel: 'email' | 'meeting' | 'portal' | 'phone';
  loggedBy: string;
  timestamp: string;
}

export interface ProjectExpense {
  id: string;
  projectId: string;
  clientId: string;
  description: string;
  amount: number;
  currency: ProposalCurrency;
  category: 'software_api' | 'contractor' | 'asset' | 'hosting' | 'misc';
  loggedAt: string;
}

export interface ClientHealthSnapshot {
  clientId: string;
  healthScore: number;
  grade: 'good' | 'at_risk' | 'critical';
  reasons: string[];
  calculatedAt: string;
}

export interface HandoverReport {
  projectId: string;
  clientId: string;
  completedDeliverables: string[];
  handoverNotes: string;
  accessHandoverDetails: string;
  ongoingSupportTerms: string;
  generatedAt: string;
  generatedBy: string;
}

// ==========================================
// PROMPT 21: REVENUE, PROFITABILITY & AGENCY PERFORMANCE INTELLIGENCE
// ==========================================

export type InvoiceStatus =
  | 'draft'
  | 'issued'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export type PaymentMethod =
  | 'bank_transfer'
  | 'credit_card'
  | 'stripe'
  | 'wire'
  | 'check'
  | 'cash'
  | 'other';

export type PaymentVerificationStatus = 'verified' | 'unverified' | 'reversed';

export type AgencyExpenseCategory =
  | 'software_subscriptions'
  | 'hosting'
  | 'domains'
  | 'advertising'
  | 'contractor_payments'
  | 'team_salaries'
  | 'creative_production'
  | 'third_party_services'
  | 'payment_processing_fees'
  | 'operational_expenses'
  | 'other';

export interface InvoiceLineItem {
  id: string;
  serviceId?: string;
  description: string;
  category: ServiceCatalogCategory;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  subtotal: number;
}

export interface AgencyInvoice {
  id: string;
  invoiceNumber: string; // e.g. INV-2026-0042
  clientId: string;
  projectId?: string;
  proposalId?: string;
  quotationId?: string;
  issueDate: string;
  dueDate: string;
  currency: ProposalCurrency;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: InvoiceStatus;
  paymentTerms: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  paymentNumber: string; // e.g. PAY-2026-0019
  invoiceId: string;
  clientId: string;
  projectId?: string;
  amount: number;
  currency: ProposalCurrency;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  transactionReference: string;
  verificationStatus: PaymentVerificationStatus;
  verifiedBy?: string;
  reversalReason?: string;
  notes?: string;
  createdAt: string;
}

export interface AgencyExpense {
  id: string;
  category: AgencyExpenseCategory;
  description: string;
  amount: number;
  currency: ProposalCurrency;
  date: string;
  vendor: string;
  clientId?: string; // Optional direct allocation
  projectId?: string; // Optional direct allocation
  isRecurring: boolean;
  recurringInterval?: 'monthly' | 'quarterly' | 'annual';
  paymentStatus: 'paid' | 'pending' | 'scheduled';
  supportingDocRef?: string;
  createdAt: string;
}

export interface RecurringContract {
  id: string;
  clientId: string;
  serviceId?: string;
  serviceName: string;
  packageName?: string;
  monthlyValue: number;
  billingCadence: 'monthly' | 'quarterly' | 'annual';
  currency: ProposalCurrency;
  startDate: string;
  nextRenewalDate: string;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  churnReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialAuditLog {
  id: string;
  entityType: 'invoice' | 'payment' | 'expense' | 'contract';
  entityId: string;
  action: 'created' | 'issued' | 'payment_recorded' | 'payment_reversed' | 'cancelled' | 'updated';
  actor: string;
  previousState?: string;
  newState?: string;
  rationale: string;
  timestamp: string;
}

export interface AccountsReceivableAging {
  totalOutstanding: number;
  currentNotDue: number;
  overdue1to30: number;
  overdue31to60: number;
  overdue61to90: number;
  overdueOver90: number;
  invoiceCount: number;
}

export interface ProjectProfitability {
  projectId: string;
  projectName: string;
  clientName: string;
  contractBudget: number;
  invoicedTotal: number;
  collectedCash: number;
  directExpenses: number;
  laborCost: number;
  totalDirectCosts: number;
  grossProfit: number;
  grossMarginPercent: number;
  budgetVariance: number;
  estimatedHours: number;
  actualHours: number;
  status: ProjectDeliveryStatus;
}

export interface ClientProfitability {
  clientId: string;
  clientName: string;
  lifetimeContracted: number;
  collectedRevenue: number;
  outstandingBalance: number;
  directCosts: number;
  netMargin: number;
  marginPercent: number;
  activeRecurringMonthly: number;
  profitabilityBand: 'high_margin' | 'profitable' | 'break_even' | 'unprofitable' | 'insufficient_data';
  dataCompletenessScore: number; // 0 - 100
  dataWarnings: string[];
}

export interface ServiceProfitability {
  category: ServiceCatalogCategory;
  categoryLabel: string;
  serviceCount: number;
  totalRevenue: number;
  directFulfillmentCost: number;
  grossMargin: number;
  grossMarginPercent: number;
  estimatedHours: number;
  actualHours: number;
  recurringContribution: number;
}

export interface AgencyFinancialMetrics {
  totalContractedRevenue: number;
  totalInvoicedRevenue: number;
  totalCollectedRevenue: number;
  totalOutstandingReceivables: number;
  totalOverdueReceivables: number;
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  totalAgencyExpenses: number;
  directProjectCosts: number;
  generalOverheadExpenses: number;
  grossAgencyProfit: number;
  grossAgencyMarginPercent: number;
  newClientsInPeriod: number;
  clientAcquisitionCost: number; // CAC
  cacDataCompleteness: 'complete' | 'partial' | 'insufficient';
  cacIncludedExpenseTotal: number;
  activeClientsCount: number;
  pipelineProposalsValue: number;
  proposalAcceptanceRate: number;
}

export interface ForecastScenarioParams {
  expectedNewClientsPerMonth: number;
  averageContractValue: number;
  pipelineConversionRatePercent: number; // 0 - 100
  monthlyChurnPercent: number; // 0 - 100
  monthlyOperatingExpense: number;
}

export interface MonthlyForecastPoint {
  monthLabel: string; // e.g. "Dec 2026"
  confirmedContracted: number;
  expectedRecurring: number;
  probabilityWeightedPipeline: number;
  projectedTotalRevenue: number;
  projectedExpenses: number;
  projectedNetMargin: number;
}

export interface ForecastScenario {
  scenarioType: 'conservative' | 'base' | 'optimistic';
  params: ForecastScenarioParams;
  monthlyPoints: MonthlyForecastPoint[];
  totalProjectedRevenue: number;
  totalProjectedProfit: number;
}

export interface FinancialInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'concentration' | 'efficiency' | 'growth';
  title: string;
  observation: string;
  evidence: string;
  confidenceScore: number; // 0 - 100
  suggestedAction: string;
}

export type ClientRecord = ClientProfile;
export type Proposal = BusinessProposal;
export type DeliverableRecord = Deliverable;
export type InvoiceRecord = AgencyInvoice;

// ==========================================
// PROMPT 22: CLIENT PORTAL & SELF-SERVICE DASHBOARD
// ==========================================

export type ClientPortalUserRole =
  | 'owner'
  | 'billing'
  | 'technical'
  | 'stakeholder'
  | 'primary_contact'
  | 'billing_contact'
  | 'technical_contact';

export type ClientPortalUserStatus = 'active' | 'suspended' | 'invited';

export interface ClientPortalUser {
  id: string;
  clientId: string;
  email: string;
  fullName: string;
  name?: string; // Compatibility alias
  role: ClientPortalUserRole;
  status: ClientPortalUserStatus;
  passwordHash?: string; // Local simulation / demo auth
  lastLoginAt?: string;
  createdAt: string;
}

export interface ClientPortalSession {
  portalUser: ClientPortalUser;
  client: ClientProfile;
  token: string;
  expiresAt: string;
}

export type ClientRequestCategory =
  | 'new_service'
  | 'project_change'
  | 'additional_work'
  | 'design_revision'
  | 'website_content'
  | 'marketing_request'
  | 'technical_support'
  | 'general_question';

export type ClientRequestStatus =
  | 'submitted'
  | 'in_review'
  | 'in_progress'
  | 'waiting_on_client'
  | 'resolved'
  | 'declined';

export interface ClientRequest {
  id: string;
  clientId: string;
  projectId?: string;
  requestedByUserId?: string;
  category: ClientRequestCategory;
  subject: string;
  title?: string; // Compatibility alias
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'normal';
  attachments?: string[];
  status: ClientRequestStatus;
  assignedTeamMemberId?: string;
  internalNotes?: string; // Strictly internal staff notes
  clientVisibleResponse?: string; // Visible to client
  staffResponse?: string; // Compatibility alias
  submittedAt: string;
  createdAt?: string; // Compatibility alias
  updatedAt: string;
  resolvedAt?: string;
}

export type ClientNotificationType =
  | 'proposal'
  | 'invoice'
  | 'milestone'
  | 'deliverable'
  | 'approval'
  | 'request'
  | 'general'
  | 'deliverable_ready'
  | 'invoice_issued'
  | 'proposal_pending'
  | 'request_update';

export interface ClientNotification {
  id: string;
  clientId: string;
  portalUserId?: string;
  userId?: string; // Compatibility alias
  title: string;
  message: string;
  linkUrl?: string;
  link?: string; // Compatibility alias
  type: ClientNotificationType;
  isRead: boolean;
  createdAt: string;
}

export interface ClientApprovalRecord {
  id: string;
  clientId: string;
  entityType: 'deliverable' | 'proposal' | 'sow';
  entityId: string;
  decision: 'approved' | 'revision_requested' | 'rejected' | 'accepted';
  comments: string;
  versionNumber?: number;
  actorName: string;
  actorEmail: string;
  approvedByUserId?: string; // Compatibility alias
  timestamp: string;
}

export interface ClientInvitation {
  id: string;
  clientId: string;
  email: string;
  role: ClientPortalUserRole;
  inviteToken: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'revoked';
  createdAt: string;
}

export interface ClientDashboardSummary {
  clientName: string;
  activeProjectsCount: number;
  overallProgressPercent: number;
  upcomingMilestones: ProjectMilestone[];
  pendingApprovalsCount: number;
  outstandingInvoicesTotal: number;
  recentDeliverables: Deliverable[];
  openRequestsCount: number;
  nextRequiredAction: string;
}

// ============================================================================
// PROMPT 23: WORKFLOW AUTOMATION & INTEGRATION HUB TYPES
// ============================================================================

export type AutomationEventType =
  | 'lead.created'
  | 'lead.qualified'
  | 'lead.score_updated'
  | 'contact.discovered'
  | 'email.verified'
  | 'proposal.created'
  | 'proposal.accepted'
  | 'invoice.created'
  | 'invoice.overdue'
  | 'payment.confirmed'
  | 'project.created'
  | 'project.milestone_completed'
  | 'deliverable.submitted'
  | 'deliverable.approved'
  | 'client.request_created'
  | 'client.request_updated'
  | 'manual.triggered'
  | 'schedule.triggered';

export interface AutomationEvent {
  id: string;
  type: AutomationEventType;
  sourceModule: string;
  recordId: string;
  timestamp: string;
  payload: Record<string, any>;
  processingStatus: 'pending' | 'processed' | 'failed' | 'ignored';
  correlationId?: string;
}

export type WorkflowTriggerType = 'record_event' | 'schedule' | 'manual';

export interface WorkflowCondition {
  id: string;
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'less_than'
    | 'greater_than_or_equal'
    | 'less_than_or_equal'
    | 'contains'
    | 'is_empty'
    | 'is_not_empty'
    | 'in_list';
  value: any;
}

export interface ConditionGroup {
  logic: 'AND' | 'OR';
  conditions: WorkflowCondition[];
}

export interface WorkflowTriggerConfig {
  type: WorkflowTriggerType;
  eventType?: AutomationEventType;
  scheduleCron?: string;
  scheduleHumanLabel?: string;
  entityType?: string;
  conditions?: WorkflowCondition[];
}

export type WorkflowActionType =
  | 'update_crm_record'
  | 'change_lead_status'
  | 'assign_lead_owner'
  | 'add_internal_note'
  | 'create_follow_up_task'
  | 'generate_outreach_draft'
  | 'generate_proposal_draft'
  | 'create_project'
  | 'create_notification'
  | 'generate_research_report'
  | 'export_csv'
  | 'send_email'
  | 'trigger_webhook'
  | 'send_to_n8n';

export interface WorkflowActionConfig {
  type: WorkflowActionType;
  targetEntity?: string;
  parameters: Record<string, any>;
  isSensitive?: boolean;
  requiresApproval?: boolean;
  approvalInstructions?: string;
  retryLimit?: number;
  timeoutSeconds?: number;
}

export type WorkflowNodeType = 'trigger' | 'condition' | 'action' | 'delay' | 'approval';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  title: string;
  description?: string;
  config: Record<string, any>;
  nextNodeIds?: string[];
  trueNodeId?: string;
  falseNodeId?: string;
  position?: { x: number; y: number };
}

export type WorkflowStatus = 'active' | 'paused' | 'draft';

export interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  category:
    | 'lead_generation'
    | 'sales_pipeline'
    | 'client_operations'
    | 'finance_billing'
    | 'intelligence_reports'
    | 'custom';
  trigger: WorkflowTriggerConfig;
  nodes: WorkflowNode[];
  isActive: boolean;
  version: number;
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageDurationMs?: number;
  lastExecutedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ExecutionStatus =
  | 'running'
  | 'success'
  | 'failed'
  | 'waiting_for_approval'
  | 'paused'
  | 'cancelled';

export interface ExecutionStepLog {
  stepId: string;
  nodeType: WorkflowNodeType;
  title: string;
  status: 'pending' | 'success' | 'failed' | 'skipped' | 'waiting_for_approval';
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  retryCount?: number;
}

export interface AutomationExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  triggerEventId?: string;
  triggerType: WorkflowTriggerType;
  status: ExecutionStatus;
  idempotencyKey: string;
  currentStepId?: string;
  steps: ExecutionStepLog[];
  startedAt: string;
  completedAt?: string;
  totalDurationMs?: number;
  errorSummary?: string;
  isTestRun?: boolean;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'timed_out';

export interface AutomationApproval {
  id: string;
  executionId: string;
  workflowId: string;
  workflowName: string;
  stepId: string;
  actionType: WorkflowActionType;
  actionTitle: string;
  requestedPayload: Record<string, any>;
  requiredRole?: string;
  instructions?: string;
  status: ApprovalStatus;
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionNotes?: string;
}

export type IntegrationProviderId =
  | 'gmail'
  | 'n8n'
  | 'webhooks'
  | 'openai'
  | 'google_sheets'
  | 'csv';

export type IntegrationStatus =
  | 'connected'
  | 'disconnected'
  | 'degraded'
  | 'pending_auth'
  | 'error';

export interface IntegrationConnection {
  id: string;
  providerId: IntegrationProviderId;
  name: string;
  status: IntegrationStatus;
  isConfigured: boolean;
  lastTestedAt?: string;
  lastSuccessfulSyncAt?: string;
  credentialsSummary?: string;
  config: Record<string, any>;
  capabilities: string[];
  requiredPermissions: string[];
  error?: string;
  updatedAt: string;
}

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  description?: string;
  secret: string;
  subscribedEvents: (AutomationEventType | '*')[];
  isActive: boolean;
  timeoutMs: number;
  maxRetries: number;
  headers?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export type WebhookDeliveryStatus = 'success' | 'failed' | 'pending' | 'retrying';

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  endpointName: string;
  eventId: string;
  eventType: AutomationEventType;
  url: string;
  httpStatus?: number;
  requestHeaders: Record<string, string>;
  requestPayload: Record<string, any>;
  responseBody?: string;
  durationMs: number;
  status: WebhookDeliveryStatus;
  attemptNumber: number;
  maxAttempts: number;
  error?: string;
  timestamp: string;
}

export interface AutomationMetricsSummary {
  totalWorkflows: number;
  activeWorkflows: number;
  pausedWorkflows: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  pendingApprovals: number;
  estimatedHoursSaved: number;
  successRatePercent: number;
}

// ==========================================
// PROMPT 24: AI CEO COMMAND CENTER TYPES
// ==========================================

export type CeoConfidenceLevel = 'actual' | 'estimated' | 'forecast' | 'target' | 'missing';

export interface CeoMetric {
  key: string;
  label: string;
  value: number;
  formattedValue: string;
  definition: string;
  confidenceLevel: CeoConfidenceLevel;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  calculationFormula: string;
  dataSources: string[];
  missingDataNote?: string;
}

export interface CeoExecutiveOverview {
  totalLeads: CeoMetric;
  qualifiedLeads: CeoMetric;
  activeProspects: CeoMetric;
  proposalsSent: CeoMetric;
  proposalsAccepted: CeoMetric;
  activeClients: CeoMetric;
  activeProjects: CeoMetric;
  monthlyRevenue: CeoMetric;
  collectedRevenue: CeoMetric;
  outstandingReceivables: CeoMetric;
  monthlyExpenses: CeoMetric;
  grossProfit: CeoMetric;
  netProfit: CeoMetric;
  recurringRevenue: CeoMetric;
  clientRetention: CeoMetric;
  salesConversionRate: CeoMetric;
}

export interface CeoHealthScoreDimension {
  id: string;
  name: string;
  score: number; // 0 - 100
  weight: number; // 0.0 - 1.0
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'insufficient_data';
  evidence: string[];
  calculationMethodology: string;
  missingData: string[];
  recommendedImprovements: string[];
}

export interface CeoHealthScore {
  overallScore: number; // 0 - 100
  grade: 'A' | 'B' | 'C' | 'D' | 'F' | 'Insufficient data';
  isSufficientData: boolean;
  dimensions: CeoHealthScoreDimension[];
  dataConfidence: number; // 0 - 100
  calculationMethodology: string;
  missingDataSummary: string[];
  topRecommendations: string[];
}

export interface CeoNextBestAction {
  id: string;
  title: string;
  category: 'sales' | 'finance' | 'delivery' | 'market' | 'operations' | 'client';
  urgency: 'critical' | 'high' | 'medium' | 'low';
  potentialBusinessImpact: 'critical' | 'high' | 'medium' | 'low';
  financialImportance: number; // dollar value or ranking
  probabilityOfSuccess: number; // 0 - 100 %
  requiredEffort: 'low' | 'medium' | 'high';
  dataConfidence: number; // 0 - 100 %
  compositeScore: number;
  whatShouldBeDone: string;
  whyShouldBeDone: string;
  evidence: string[];
  expectedOutcome: string;
  practicalNextStep: string;
  actionType: string;
  entityId?: string;
  entityType?: 'business' | 'proposal' | 'invoice' | 'project' | 'deliverable' | 'market' | 'automation';
  isApproved: boolean;
  isCompleted: boolean;
  createdAt: string;
}

export interface CeoDailyBriefing {
  id: string;
  date: string;
  generatedAt: string;
  isAutomated: boolean;
  yesterday: {
    newLeads: number;
    leadsQualified: number;
    outreachActivity: number;
    repliesReceived: number;
    meetingsOrOpportunities: number;
    proposalsCreatedOrAccepted: number;
    paymentsReceived: number;
    projectProgressNotes: string[];
  };
  today: {
    pendingTasks: { id: string; title: string; priority: string; due: string }[];
    followUpsDue: { id: string; lead: string; reason: string }[];
    proposalsRequiringAction: { id: string; title: string; client: string; action: string }[];
    clientApprovalsPending: { id: string; client: string; title: string }[];
    overdueInvoices: { id: string; invoiceNumber: string; client: string; amount: number; daysOverdue: number }[];
    delayedProjects: { id: string; name: string; client: string; daysDelayed: number }[];
    highPriorityOpportunities: { id: string; title: string; client: string; value: number }[];
  };
  risks: {
    id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium';
    evidence: string;
    mitigation: string;
  }[];
  opportunities: {
    id: string;
    title: string;
    impact: 'high' | 'medium';
    potentialRevenue: number;
    action: string;
  }[];
}

export interface CeoTarget {
  id: string;
  metricKey:
    | 'monthly_revenue'
    | 'monthly_cash'
    | 'new_clients'
    | 'qualified_leads'
    | 'proposals'
    | 'conversion_rate'
    | 'project_delivery'
    | 'net_margin';
  label: string;
  period: 'monthly' | 'quarterly' | 'annual';
  targetValue: number;
  currentValue: number;
  unit: 'currency' | 'count' | 'percent';
  remainingGap: number;
  requiredWeeklyPace: number;
  riskOfMissing: 'low' | 'moderate' | 'high';
  historicalPerformance: number[];
  updatedAt: string;
}

export interface CeoWeeklyReview {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  performanceSummary: string;
  revenueAndCash: {
    targetRevenue: number;
    actualRevenue: number;
    collectedCash: number;
    outstandingBalance: number;
  };
  salesPerformance: {
    leadsDiscovered: number;
    qualifiedLeads: number;
    proposalsSent: number;
    proposalsAccepted: number;
    conversionRate: number;
  };
  clientAcquisition: {
    newClients: number;
    activeClients: number;
    churnedClients: number;
  };
  projectDelivery: {
    completedMilestones: number;
    delayedMilestones: number;
    onTimeDeliveryRate: number;
  };
  operationalBottlenecks: string[];
  majorWins: string[];
  majorFailures: string[];
  lessonsLearned: string[];
  nextWeekPriorities: string[];
  createdAt: string;
}

export interface CeoAiQueryResponse {
  query: string;
  answer: string;
  supportingData: {
    label: string;
    value: string;
    source: string;
    confidence: number;
  }[];
  dataGapsDisclosed: string[];
  recommendedActions: CeoNextBestAction[];
  requiresConfirmation: boolean;
  suggestedExecutableAction?: {
    actionType: string;
    payload: Record<string, unknown>;
    description: string;
  };
}

// ==========================================
// PROMPT 25: WHITE-LABEL SAAS & MULTI-TENANT ARCHITECTURE
// ==========================================

export type TenantStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'suspended';

export type TenantRole = 'owner' | 'admin' | 'manager' | 'employee' | 'viewer';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused';

export type BillingInterval = 'monthly' | 'annual';

export type TenantPlanSlug = 'starter' | 'growth' | 'professional' | 'enterprise';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  planId: string;
  status: TenantStatus;
  customDomain?: string;
  contactEmail: string;
  isPlatformSuperAdminTenant?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TenantBranding {
  id: string;
  tenantId: string;
  companyName: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string; // e.g. '#2563eb'
  secondaryColor: string; // e.g. '#4f46e5'
  accentColor: string; // e.g. '#10b981'
  fontStack: string; // e.g. 'Inter, sans-serif'
  footerText: string;
  supportEmail: string;
  portalBranding?: {
    portalTitle?: string;
    welcomeMessage?: string;
    supportPhone?: string;
  };
  customCss?: string;
  updatedAt: string;
}

export interface TenantPlan {
  id: string;
  name: string;
  slug: TenantPlanSlug;
  priceMonthly: number;
  priceAnnual: number;
  currency: string;
  userLimit: number;
  leadLimit: number;
  researchLimit: number;
  aiQueryLimit: number;
  automationLimit: number;
  storageLimitMb: number;
  enabledModules: string[];
  isCustom?: boolean;
}

export interface TenantSubscription {
  id: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: string;
  billingEmail?: string;
  paymentMethodLast4?: string;
}

export interface TenantUser {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: TenantRole;
  status: 'active' | 'invited' | 'suspended';
  isPlatformSuperAdmin?: boolean;
  lastLoginAt?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface TenantInvitation {
  id: string;
  tenantId: string;
  email: string;
  role: TenantRole;
  token: string;
  invitedByUserId: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  createdAt: string;
}

export interface TenantDomain {
  id: string;
  tenantId: string;
  domain: string;
  subdomain: string;
  verificationStatus: 'pending' | 'verified' | 'failed';
  sslStatus: 'pending' | 'active' | 'failed';
  dnsVerificationRecord: {
    type: string;
    name: string;
    value: string;
  };
  createdAt: string;
}

export interface TenantUsage {
  id: string;
  tenantId: string;
  period: string; // e.g. "2026-11"
  activeUsersCount: number;
  leadsCount: number;
  researchOpsCount: number;
  aiQueriesCount: number;
  automationExecsCount: number;
  storageBytesUsed: number;
  apiRequestsCount: number;
  lastTrackedAt: string;
}

export interface TenantAuditLog {
  id: string;
  tenantId: string;
  actorUserId: string;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface TenantModuleConfig {
  id: string;
  tenantId: string;
  enabledModules: Record<string, boolean>;
  customLabels?: Record<string, string>;
  updatedAt: string;
}

export interface TenantSession {
  tenant: Tenant;
  user: TenantUser;
  branding: TenantBranding;
  plan: TenantPlan;
  token: string;
  expiresAt: string;
}













