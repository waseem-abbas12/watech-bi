export type OpportunityVerificationStatus =
  | 'VERIFIED_OPPORTUNITY'
  | 'POTENTIAL_OPPORTUNITY'
  | 'INSUFFICIENT_EVIDENCE'
  | 'NOT_APPLICABLE';

export type WatechServiceCategory =
  | 'strategy_consulting'
  | 'branding_creative'
  | 'social_media_authority'
  | 'content_production'
  | 'paid_advertising'
  | 'web_landing_pages'
  | 'seo_local_search'
  | 'lead_generation_systems'
  | 'crm_lead_management'
  | 'ai_automation_workflows'
  | 'custom_software_development';

export interface WatechServiceDefinition {
  category: WatechServiceCategory;
  displayName: string;
  shortDescription: string;
  typicalBusinessProblem: string;
  recommendedDeliverables: string[];
}

export interface OpportunityEvidenceModel {
  id: string;
  businessId: string;
  projectId: string;
  category: string;
  identifiedGap: string;
  supportingEvidence: string;
  evidenceSourceUrl?: string;
  sourceType: string;
  discoveryTimestamp: string;
  verificationStatus: OpportunityVerificationStatus;
  confidenceScore: number; // 0 - 100
  suggestedWatechService: WatechServiceCategory;
  recommendationRationale: string;
  corroboratingSources?: string[];
  smallestUsefulFirstStep?: string;
  businessImpact?: 'low' | 'medium' | 'high';
}

export type PriorityBand =
  | 'Priority A' // 80 - 100
  | 'Priority B' // 60 - 79
  | 'Priority C' // 40 - 59
  | 'Research Required / Low Priority'; // 0 - 39

export interface CommercialScoreDimensionDetail {
  dimension: string;
  pointsAwarded: number;
  maxPoints: number;
  evidence: string;
  isDataMissing?: boolean;
}

export interface CommercialOpportunityScore {
  businessFit: number; // Max 25
  evidenceStrength: number; // Max 25
  serviceRelevance: number; // Max 20
  decisionMakerAccessibility: number; // Max 15
  dataCompleteness: number; // Max 15
  totalScore: number; // 0 - 100
  priorityBand: PriorityBand;
  scoreExplanation: string;
  breakdownDetails: CommercialScoreDimensionDetail[];
  missingInformation: string[];
}

export interface BusinessOpportunityIntelligenceReport {
  businessOverview: {
    id: string;
    name: string;
    industry: string;
    location: string;
    websiteUrl?: string;
    hasWebsite: boolean;
    digitalPresenceScore?: number;
  };
  decisionMakerIntelligence: {
    verifiedDecisionMakersCount: number;
    keyDecisionMakers: Array<{
      name: string;
      role: string;
      verificationStatus: string;
      email?: string;
      phone?: string;
    }>;
    contactChannelsAvailable: string[];
  };
  identifiedOpportunities: OpportunityEvidenceModel[];
  commercialPriority: CommercialOpportunityScore;
  generatedAt: string;
}
