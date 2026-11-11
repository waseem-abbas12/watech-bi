import type { Business, Contact, EmailDiscoveryRecord } from '@/types';
import type { BusinessContactDiscoveryResult, DecisionMakerCandidate } from './types';
import { DecisionMakerDiscoveryEngine } from './discovery';

export class DecisionMakerManager {
  private engine: DecisionMakerDiscoveryEngine;

  constructor(customEngine?: DecisionMakerDiscoveryEngine) {
    this.engine = customEngine || new DecisionMakerDiscoveryEngine();
  }

  /**
   * Discovers decision-makers and contacts from all authorized sources
   */
  async discoverDecisionMakersForBusiness(
    business: Business,
    options?: {
      aboutPageUrl?: string;
      teamPageUrl?: string;
      contactPageUrl?: string;
      companyNumber?: string;
      jurisdictionCode?: string;
    }
  ): Promise<BusinessContactDiscoveryResult> {
    return this.engine.discoverForBusiness(business, options);
  }

  /**
   * Maps decision-maker discovery candidates to pipeline Contact records
   */
  toPipelineContacts(result: BusinessContactDiscoveryResult, projectId: string): Contact[] {
    const allCandidates = [...result.decisionMakers, ...result.generalContacts];

    return allCandidates.map((cand) => {
      // Map verification status to pipeline VerificationStatus
      let verificationStatus: 'verified' | 'estimated' | 'hypothesis' | 'unverified' = 'unverified';
      if (cand.verificationStatus === 'VERIFIED') {
        verificationStatus = 'verified';
      } else if (cand.verificationStatus === 'PARTIALLY_VERIFIED') {
        verificationStatus = 'estimated';
      }

      // Map contact source label
      let contactSourceLabel: 'official_company_source' | 'public_professional_profile' | 'reputable_directory' | 'third_party_provider' = 'official_company_source';
      if (cand.sourceName.includes('Companies House') || cand.sourceName.includes('OpenCorporates')) {
        contactSourceLabel = 'reputable_directory';
      } else if (cand.sourceName.includes('Search Engine')) {
        contactSourceLabel = 'public_professional_profile';
      }

      return {
        id: cand.id,
        businessId: cand.businessId,
        projectId,
        fullName: cand.fullName,
        roleOrTitle: cand.roleOrTitle,
        company: cand.company,
        email: cand.email,
        phone: cand.phone || cand.publicBusinessPhone,
        publicBusinessPhone: cand.publicBusinessPhone,
        professionalProfileUrl: cand.professionalProfileUrl,
        sourceDirectory: cand.sourceName,
        department: cand.normalizedTitle,
        verificationStatus,
        isDecisionMaker: cand.isDecisionMaker,
        decisionMakerTier: cand.decisionMakerTier,
        contactSourceLabel,
        reviewStatus: 'pending_review',
        confidence: cand.confidence,
        history: [
          {
            id: `hist_${cand.id}_1`,
            contactId: cand.id,
            businessId: cand.businessId,
            action: 'discovered',
            timestamp: cand.discoveryTimestamp,
            details: `Discovered via ${cand.sourceName} with ${cand.confidence}% confidence`,
            actor: 'DecisionMakerDiscoveryEngine',
          },
        ],
      };
    });
  }

  /**
   * Maps valid discovered emails to pipeline EmailDiscoveryRecord models
   */
  toPipelineEmails(
    result: BusinessContactDiscoveryResult,
    projectId: string
  ): EmailDiscoveryRecord[] {
    const emailRecords: EmailDiscoveryRecord[] = [];
    const seenEmails = new Set<string>();

    const allCandidates = [...result.decisionMakers, ...result.generalContacts];

    for (const cand of allCandidates) {
      if (!cand.email) continue;
      const cleanEmail = cand.email.toLowerCase().trim();
      if (seenEmails.has(cleanEmail)) continue;
      seenEmails.add(cleanEmail);

      const isExecutive = cand.isDecisionMaker;
      const emailType = isExecutive ? 'named_professional' : 'general_business';

      emailRecords.push({
        id: `email_${cand.id}`,
        businessId: cand.businessId,
        projectId,
        email: cleanEmail,
        associatedPersonName: cand.fullName,
        roleTitle: cand.roleOrTitle,
        emailType,
        discoverySource: 'website',
        sourceUrl: cand.sourceUrl || cand.sourceLeadershipPageUrl || '',
        discoveryDate: cand.discoveryTimestamp,
        sourceType: cand.sourceName,
        confidence: cand.confidence,
        verificationStatus: cand.verificationStatus === 'VERIFIED' ? 'provider_verified' : 'domain_passed_unconfirmed',
        syntaxValid: true,
        mxRecordsPresent: true,
        isDisposable: false,
        isRoleBased: !isExecutive,
        qualityScore: {
          sourceReliability: Math.min(35, cand.confidenceBreakdown.sourceAuthority),
          roleAssociation: Math.min(30, cand.confidenceBreakdown.roleSeniority),
          verificationQuality: Math.min(25, cand.confidenceBreakdown.identityMatch),
          recency: Math.min(10, cand.confidenceBreakdown.informationFreshness),
          totalScore: cand.confidence,
          grade: cand.confidence >= 75 ? 'high_quality' : cand.confidence >= 50 ? 'acceptable' : 'low_quality',
          summary: `Identified via ${cand.sourceName} (${cand.emailClassification})`,
        },
      });
    }

    // Add official business email if present and not already added
    if (result.officialBusinessEmail) {
      const cleanOfficial = result.officialBusinessEmail.toLowerCase().trim();
      if (!seenEmails.has(cleanOfficial)) {
        seenEmails.add(cleanOfficial);
        emailRecords.push({
          id: `email_official_${result.businessId}`,
          businessId: result.businessId,
          projectId,
          email: cleanOfficial,
          emailType: 'general_business',
          discoverySource: 'website',
          sourceUrl: result.publicContactPageUrl || '',
          discoveryDate: result.discoveryTimestamp,
          sourceType: 'Official Website Header/Contact',
          confidence: 85,
          verificationStatus: 'domain_passed_unconfirmed',
          syntaxValid: true,
          mxRecordsPresent: true,
          isDisposable: false,
          isRoleBased: true,
          qualityScore: {
            sourceReliability: 30,
            roleAssociation: 20,
            verificationQuality: 20,
            recency: 10,
            totalScore: 80,
            grade: 'high_quality',
            summary: 'Official public business contact email',
          },
        });
      }
    }

    return emailRecords;
  }
}

export const decisionMakerManager = new DecisionMakerManager();
