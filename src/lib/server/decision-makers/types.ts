import type { DecisionMakerTier, ContactSourceLabel } from '@/types';

export type ContactVerificationStatus =
  | 'VERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'UNVERIFIED'
  | 'CONFLICTING_INFORMATION'
  | 'NOT_FOUND'
  | 'NOT_CHECKED';

export type EmailClassification =
  | 'VERIFIED_PUBLIC'
  | 'SOURCE_LISTED'
  | 'UNVERIFIED'
  | 'NOT_FOUND';

export interface DecisionMakerCandidate {
  id: string;
  businessId: string;
  projectId: string;
  fullName: string;
  roleOrTitle: string;
  normalizedTitle: string;
  decisionMakerTier: DecisionMakerTier;
  isDecisionMaker: boolean;
  company: string;
  email?: string;
  emailClassification: EmailClassification;
  phone?: string;
  publicBusinessPhone?: string;
  professionalProfileUrl?: string;
  sourceLeadershipPageUrl?: string;
  sourceName: string;
  sourceUrl?: string;
  corroboratingSources: string[];
  discoveryTimestamp: string;
  verificationStatus: ContactVerificationStatus;
  confidence: number; // 0 - 100
  confidenceBreakdown: {
    sourceAuthority: number; // Max 30
    identityMatch: number; // Max 25
    roleSeniority: number; // Max 25
    informationFreshness: number; // Max 10
    crossSourceConsistency: number; // Max 10
    rationale: string[];
  };
  notes?: string;
  matchedEntityNumber?: string;
  appointmentDate?: string;
  isCurrent: boolean;
}

export interface BusinessContactDiscoveryResult {
  businessId: string;
  companyName: string;
  decisionMakers: DecisionMakerCandidate[];
  generalContacts: DecisionMakerCandidate[];
  totalContactsFound: number;
  verifiedDecisionMakersCount: number;
  sourcesQueried: string[];
  hasOwnerOrFounder: boolean;
  officialBusinessEmail?: string;
  officialBusinessPhone?: string;
  publicContactPageUrl?: string;
  inquiryFormUrl?: string;
  whatsAppUrl?: string;
  discoveryTimestamp: string;
}

export interface DecisionMakerProvider {
  readonly name: string;
  readonly displayName: string;
  isConfigured(): boolean;
  discover(params: {
    businessId: string;
    projectId: string;
    businessName: string;
    websiteUrl?: string;
    domain?: string;
    city?: string;
    state?: string;
    country?: string;
    companyNumber?: string;
    jurisdictionCode?: string;
    subpages?: {
      aboutPageUrl?: string;
      teamPageUrl?: string;
      contactPageUrl?: string;
    };
  }): Promise<DecisionMakerCandidate[]>;
}
