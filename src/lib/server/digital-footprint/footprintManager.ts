import { websiteInspectionProvider } from './providers/websiteInspectionProvider';
import { searchVisibilityProvider } from './providers/searchVisibilityProvider';
import { calculateDigitalPresenceScore } from './scoring';
import type {
  DigitalFootprintResult,
  FootprintFinding,
  FootprintVerificationStatus,
} from './types';
import type { Business, WebsiteAudit, AuditCategoryScore, ScoreBand } from '@/types';

export class FootprintManager {
  /**
   * Performs full digital footprint discovery and intelligence extraction for a single business entity.
   */
  async extractFootprintForBusiness(business: Business): Promise<DigitalFootprintResult> {
    const rawWebsite = business.websiteUrl || (business.domain ? `https://${business.domain}` : undefined);
    const businessId = business.id;
    const businessName = business.officialName || business.brandName || 'Unknown Business';

    // 1. Direct Website Inspection (SSRF-safe)
    const webResult = rawWebsite
      ? await websiteInspectionProvider.inspect(rawWebsite, businessId, businessName)
      : {
          status: 'NOT_FOUND' as FootprintVerificationStatus,
          isHttps: false,
          coreServices: business.services || [],
          subpages: {},
          socialProfiles: business.socialProfiles || {},
          conversionInfrastructure: {
            hasContactForm: false,
            hasOnlineBooking: false,
            hasQuoteRequest: false,
            hasWhatsAppLink: false,
            hasLiveChat: false,
            hasClickToCall: Boolean(business.phone),
            detectedPhoneNumbers: business.phone ? [business.phone] : [],
          },
          technologyIndicators: {
            isHttps: false,
            isResponsive: false,
            analyticsOrTracking: [],
          },
          findings: [
            {
              businessId,
              findingType: 'website_availability',
              extractedValue: 'NOT_FOUND',
              sourceName: 'Discovery Pipeline',
              discoveryTimestamp: new Date().toISOString(),
              verificationStatus: 'NOT_FOUND' as FootprintVerificationStatus,
              confidenceScore: 90,
              limitation: 'No website URL associated with business record',
            },
          ],
          sourceUrls: [],
        };

    // 2. Search Visibility & Discovered Profiles (if API configured)
    const searchResult = await searchVisibilityProvider.discoverSearchFootprint(
      businessId,
      businessName,
      business.domain || rawWebsite,
      business.city
    );

    // Merge Social Profiles (Website direct links take precedence)
    const mergedSocials = {
      ...business.socialProfiles,
      ...searchResult.discoveredSocialProfiles,
      ...webResult.socialProfiles,
    };

    // Combine all findings
    const allFindings: FootprintFinding[] = [
      ...webResult.findings,
      ...searchResult.findings,
    ];

    // Combine source URLs
    const allSourceUrls = Array.from(
      new Set([
        ...(business.sourceUrls || []),
        ...webResult.sourceUrls,
        ...searchResult.sourceUrls,
      ])
    );

    // 3. Calculate Explainable Digital Presence Score
    const presenceScore = calculateDigitalPresenceScore({
      businessId,
      businessName,
      websiteStatus: webResult.status,
      websiteUrl: webResult.canonicalUrl || rawWebsite,
      isHttps: webResult.isHttps,
      latencyMs: webResult.latencyMs,
      subpages: webResult.subpages,
      socialProfiles: mergedSocials,
      conversionInfrastructure: webResult.conversionInfrastructure,
      technologyIndicators: webResult.technologyIndicators,
      coreServices: webResult.coreServices.length > 0 ? webResult.coreServices : (business.services || []),
      hasPhone: Boolean(business.phone),
      hasAddress: Boolean(business.fullAddress || business.city),
      findings: allFindings,
    });

    return {
      businessId,
      websiteStatus: webResult.status,
      websiteUrl: webResult.canonicalUrl || rawWebsite,
      isHttps: webResult.isHttps,
      httpStatusCode: webResult.httpStatusCode,
      latencyMs: webResult.latencyMs,
      title: webResult.title,
      description: webResult.description,
      coreServices: webResult.coreServices,
      subpages: webResult.subpages,
      socialProfiles: mergedSocials,
      conversionInfrastructure: webResult.conversionInfrastructure,
      technologyIndicators: webResult.technologyIndicators,
      businessHours: webResult.businessHours,
      presenceScore,
      findings: allFindings,
      sourceUrls: allSourceUrls,
    };
  }

  /**
   * Adapts modern DigitalFootprintResult into backwards-compatible WebsiteAudit for legacy views.
   */
  toWebsiteAuditModel(
    footprint: DigitalFootprintResult,
    business: Business
  ): WebsiteAudit {
    const now = new Date().toISOString();
    const score = footprint.presenceScore.totalScore;
    const band: ScoreBand = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'Hold';

    const categoryFindings: AuditCategoryScore[] = [
      {
        category: 'existence_and_accessibility',
        categoryName: 'Website Existence & Accessibility',
        score: Math.min(100, Math.round((footprint.presenceScore.dimensionBreakdown.websiteAccessibility.score / 30) * 100)),
        weight: 30,
        status: footprint.websiteStatus === 'VERIFIED' ? 'passed' : 'failed',
        findingsCount: footprint.websiteStatus === 'VERIFIED' ? 3 : 1,
        summary: footprint.presenceScore.dimensionBreakdown.websiteAccessibility.rationale.join('; '),
      },
      {
        category: 'mobile_responsiveness',
        categoryName: 'Mobile Responsiveness & Viewport',
        score: footprint.technologyIndicators.isResponsive ? 100 : 50,
        weight: 20,
        status: footprint.technologyIndicators.isResponsive ? 'passed' : 'warning',
        findingsCount: 1,
        summary: footprint.technologyIndicators.isResponsive ? 'Responsive viewport detected' : 'Standard viewport',
      },
      {
        category: 'visual_credibility',
        categoryName: 'Verified Social Footprint',
        score: Math.min(100, Math.round((footprint.presenceScore.dimensionBreakdown.verifiedSocialPresence.score / 20) * 100)),
        weight: 20,
        status: Object.keys(footprint.socialProfiles).length > 0 ? 'passed' : 'warning',
        findingsCount: Object.keys(footprint.socialProfiles).length,
        summary: footprint.presenceScore.dimensionBreakdown.verifiedSocialPresence.rationale.join('; '),
      },
      {
        category: 'technical_seo',
        categoryName: 'Content & Search Depth',
        score: Math.min(100, Math.round((footprint.presenceScore.dimensionBreakdown.contentAndSearchDepth.score / 15) * 100)),
        weight: 15,
        status: footprint.coreServices.length > 0 ? 'passed' : 'warning',
        findingsCount: 2,
        summary: footprint.presenceScore.dimensionBreakdown.contentAndSearchDepth.rationale.join('; '),
      },
      {
        category: 'performance_and_speed',
        categoryName: 'Server Latency & Speed',
        score: footprint.latencyMs && footprint.latencyMs < 1500 ? 90 : 60,
        weight: 15,
        status: 'passed',
        findingsCount: 1,
        summary: `HTTP response time: ${footprint.latencyMs || 0}ms`,
      },
    ];

    return {
      id: `audit-${business.id}`,
      businessId: business.id,
      projectId: business.projectId || 'proj-default',
      targetUrl: business.websiteUrl || (business.domain ? `https://${business.domain}` : 'https://example.com'),
      totalScore: score,
      grade: band,
      inspectedAt: now,
      responseTimeMs: footprint.latencyMs || 0,
      httpStatus: footprint.httpStatusCode || 200,
      hasSsl: footprint.isHttps,
      isAutomated: true,
      scoringRulesVersion: '2.0.0',
      categories: categoryFindings,
      findings: [
        {
          id: `finding-${business.id}-1`,
          auditId: `audit-${business.id}`,
          category: 'existence_and_accessibility',
          observation: footprint.websiteStatus === 'VERIFIED' ? 'Verified operational website detected' : 'Website unreachable or missing',
          evidenceUrlOrSnippet: business.websiteUrl || '',
          severity: footprint.websiteStatus === 'VERIFIED' ? 'info' : 'critical',
          confidence: 95,
          customerImpact: footprint.websiteStatus === 'VERIFIED' ? 'Prospect establishes digital baseline credibility' : 'Prospect loses customer trust due to missing web presence',
          recommendedAction: 'Verify official domain and DNS health',
          isAutomated: true,
        },
      ],
    };
  }
}

export const footprintManager = new FootprintManager();
