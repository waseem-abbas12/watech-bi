import type { Business } from '@/types';
import type {
  DecisionMakerCandidate,
  BusinessContactDiscoveryResult,
  DecisionMakerProvider,
} from './types';
import { WebsiteLeadershipProvider } from './providers/websiteLeadershipProvider';
import { CorporateRegistryOfficerProvider } from './providers/corporateRegistryOfficerProvider';
import { SearchLeadershipProvider } from './providers/searchLeadershipProvider';
import { deduplicateCandidates, classifySeniorityTier } from './normalization';
import { verifyDecisionMakerCandidate, detectConflictingLeadership } from './verification';

export class DecisionMakerDiscoveryEngine {
  private providers: DecisionMakerProvider[];

  constructor(customProviders?: DecisionMakerProvider[]) {
    this.providers = customProviders || [
      new WebsiteLeadershipProvider(),
      new CorporateRegistryOfficerProvider(),
      new SearchLeadershipProvider(),
    ];
  }

  /**
   * Discovers decision-makers and business contacts from authorized sources for a given business
   */
  async discoverForBusiness(
    business: Business,
    options?: {
      aboutPageUrl?: string;
      teamPageUrl?: string;
      contactPageUrl?: string;
      companyNumber?: string;
      jurisdictionCode?: string;
    }
  ): Promise<BusinessContactDiscoveryResult> {
    const businessId = business.id;
    const projectId = business.projectId || 'default';
    const businessName = business.officialName || business.brandName || '';
    const domain = business.domain || (business.websiteUrl ? new URL(business.websiteUrl).hostname : undefined);
    const now = new Date().toISOString();

    const sourcesQueried: string[] = [];
    const rawCandidates: DecisionMakerCandidate[] = [];

    // Run all configured providers concurrently
    const queryPromises = this.providers.map(async (provider) => {
      if (!provider.isConfigured()) {
        return;
      }
      sourcesQueried.push(provider.displayName);

      try {
        const results = await provider.discover({
          businessId,
          projectId,
          businessName,
          websiteUrl: business.websiteUrl,
          domain,
          city: business.city,
          state: business.state,
          country: business.country,
          companyNumber: options?.companyNumber,
          jurisdictionCode: options?.jurisdictionCode,
          subpages: {
            aboutPageUrl: options?.aboutPageUrl,
            teamPageUrl: options?.teamPageUrl,
            contactPageUrl: options?.contactPageUrl,
          },
        });

        if (Array.isArray(results) && results.length > 0) {
          rawCandidates.push(...results);
        }
      } catch (err: any) {
        // Log provider error without failing the discovery pipeline
        console.warn(`[DecisionMakerDiscovery] Provider ${provider.name} failed for ${businessName}:`, err?.message || err);
      }
    });

    await Promise.allSettled(queryPromises);

    // 1. Deduplicate candidates across sources (merging provenance, corroboration, higher titles, valid emails)
    let candidates = deduplicateCandidates(rawCandidates);

    // 2. Validate business association and seniority
    candidates = candidates.map((cand) => {
      const { status, conflictNotes } = verifyDecisionMakerCandidate(cand, business);
      if (conflictNotes && !cand.notes) {
        cand.notes = conflictNotes;
      }
      cand.verificationStatus = status;
      return cand;
    });

    // 3. Conflict detection for exclusive leadership claims
    candidates = detectConflictingLeadership(candidates);

    // 4. Split into decision-makers vs general operational contacts
    const decisionMakers = candidates.filter((c) => c.isDecisionMaker);
    const generalContacts = candidates.filter((c) => !c.isDecisionMaker);

    // 5. Check if owner or founder was discovered
    const hasOwnerOrFounder = decisionMakers.some((c) => {
      const tierRank = classifySeniorityTier(c.roleOrTitle).seniorityRank;
      return tierRank === 1;
    });

    const verifiedDecisionMakersCount = decisionMakers.filter(
      (c) => c.verificationStatus === 'VERIFIED' || c.verificationStatus === 'PARTIALLY_VERIFIED'
    ).length;

    return {
      businessId,
      companyName: businessName,
      decisionMakers,
      generalContacts,
      totalContactsFound: candidates.length,
      verifiedDecisionMakersCount,
      sourcesQueried,
      hasOwnerOrFounder,
      officialBusinessEmail: business.email,
      officialBusinessPhone: business.phone,
      publicContactPageUrl: options?.contactPageUrl,
      discoveryTimestamp: now,
    };
  }
}
