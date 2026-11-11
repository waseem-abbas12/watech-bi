import type {
  DigitalPresenceScoreResult,
  DigitalPresenceGap,
  FootprintFinding,
  ConversionInfrastructure,
  TechnologyIndicators,
  FootprintVerificationStatus,
} from './types';
import type { SocialProfiles, DiscoveredSubpages, BusinessHours } from '@/types';

export interface ScoreInput {
  businessId: string;
  businessName: string;
  websiteStatus: FootprintVerificationStatus;
  websiteUrl?: string;
  isHttps: boolean;
  latencyMs?: number;
  subpages: DiscoveredSubpages;
  socialProfiles: SocialProfiles;
  conversionInfrastructure: ConversionInfrastructure;
  technologyIndicators: TechnologyIndicators;
  coreServices: string[];
  businessHours?: BusinessHours;
  hasPhone: boolean;
  hasAddress: boolean;
  findings: FootprintFinding[];
}

export function calculateDigitalPresenceScore(input: ScoreInput): DigitalPresenceScoreResult {
  const gaps: DigitalPresenceGap[] = [];
  const strengths: string[] = [];

  // =========================================================================
  // Dimension 1: Website Accessibility & Security (Max 30)
  // =========================================================================
  let webScore = 0;
  const webRationale: string[] = [];

  if (input.websiteStatus === 'VERIFIED' && input.websiteUrl) {
    webScore += 15;
    webRationale.push('Official domain exists and is accessible (+15 pts)');
    strengths.push(`Active website online at ${input.websiteUrl}`);

    if (input.isHttps) {
      webScore += 10;
      webRationale.push('Enforces modern HTTPS encryption (+10 pts)');
    } else {
      webRationale.push('Insecure connection: missing HTTPS (0 pts)');
      gaps.push({
        code: 'NO_HTTPS',
        category: 'website',
        title: 'Missing HTTPS Security Encryption',
        description: 'Website operates on insecure HTTP, reducing customer trust and search rankings.',
        status: 'UNAVAILABLE',
        commercialOpportunity: 'Implement SSL/TLS certificates and automated HTTPS redirects.',
      });
    }

    if (typeof input.latencyMs === 'number' && input.latencyMs < 2000) {
      webScore += 5;
      webRationale.push(`Fast response latency: ${input.latencyMs}ms (+5 pts)`);
    } else if (typeof input.latencyMs === 'number' && input.latencyMs >= 2000) {
      webRationale.push(`Elevated response latency: ${input.latencyMs}ms (0 pts)`);
      gaps.push({
        code: 'SLOW_LATENCY',
        category: 'website',
        title: 'Slow Server Response Latency',
        description: `Page load latency exceeds 2000ms (${input.latencyMs}ms), causing lead drop-off.`,
        status: 'UNAVAILABLE',
        commercialOpportunity: 'Deploy edge CDN caching and performance optimization.',
      });
    }
  } else if (input.websiteStatus === 'UNAVAILABLE') {
    webScore = 0;
    webRationale.push('Website configured but server timed out or returned HTTP error (0 pts)');
    gaps.push({
      code: 'WEBSITE_UNAVAILABLE',
      category: 'website',
      title: 'Official Website Downtime / Unreachable',
      description: 'The registered company domain failed to respond or returned an error.',
      status: 'UNAVAILABLE',
      commercialOpportunity: 'Provide reliable cloud hosting and uptime monitoring.',
    });
  } else {
    webScore = 0;
    webRationale.push('No official website detected for this business (0 pts)');
    gaps.push({
      code: 'MISSING_WEBSITE',
      category: 'website',
      title: 'No Official Website Detected',
      description: 'Business relies exclusively on directories without an owned web property.',
      status: 'NOT_FOUND',
      commercialOpportunity: 'Build modern high-converting agency website with direct booking pathways.',
    });
  }

  // =========================================================================
  // Dimension 2: Conversion Infrastructure (Max 25)
  // =========================================================================
  let convScore = 0;
  const convRationale: string[] = [];
  const conv = input.conversionInfrastructure;

  if (conv.hasContactForm) {
    convScore += 10;
    convRationale.push('Online contact form detected (+10 pts)');
    strengths.push('Inquiry capture form active on website');
  } else {
    convRationale.push('No contact form detected (0 pts)');
    gaps.push({
      code: 'NO_CONTACT_FORM',
      category: 'conversion',
      title: 'Missing Online Contact Form',
      description: 'Prospective clients cannot submit inquiries directly through the website.',
      status: 'NOT_FOUND',
      commercialOpportunity: 'Integrate streamlined lead-capture forms with email notifications.',
    });
  }

  if (conv.hasOnlineBooking) {
    convScore += 10;
    convRationale.push(`Online booking/scheduling active via ${conv.bookingProvider || 'system'} (+10 pts)`);
    strengths.push(`Automated scheduling via ${conv.bookingProvider || 'calendar'}`);
  } else if (conv.hasQuoteRequest) {
    convScore += 7;
    convRationale.push('Dedicated quote/estimate request pathway active (+7 pts)');
    strengths.push('Direct estimate request pathway active');
  } else {
    convRationale.push('No online booking or quote request mechanism (0 pts)');
    gaps.push({
      code: 'NO_BOOKING_OR_QUOTE',
      category: 'conversion',
      title: 'No Instant Booking or Quote Pathway',
      description: 'No automated calendar scheduling or estimate calculator available for visitors.',
      status: 'NOT_FOUND',
      commercialOpportunity: 'Implement self-serve quote calculators or automated booking calendars.',
    });
  }

  if (conv.hasWhatsAppLink) {
    convScore += 5;
    convRationale.push('Direct WhatsApp click-to-chat active (+5 pts)');
    strengths.push('Instant WhatsApp inquiry pathway available');
  } else if (conv.hasLiveChat) {
    convScore += 5;
    convRationale.push(`Live chat widget active (${conv.liveChatProvider}) (+5 pts)`);
    strengths.push(`Live chat support powered by ${conv.liveChatProvider}`);
  } else {
    convRationale.push('No instant messaging (WhatsApp / Live Chat) detected (0 pts)');
    gaps.push({
      code: 'NO_INSTANT_MESSAGING',
      category: 'conversion',
      title: 'No Instant Chat Channel',
      description: 'No WhatsApp or live chat widget detected for rapid visitor engagement.',
      status: 'NOT_FOUND',
      commercialOpportunity: 'Add WhatsApp widget and automated lead-qualification chat bot.',
    });
  }

  // =========================================================================
  // Dimension 3: Verified Social Presence (Max 20)
  // =========================================================================
  let socialScore = 0;
  const socialRationale: string[] = [];
  const social = input.socialProfiles;
  const activeSocials = Object.entries(social).filter(([_, url]) => Boolean(url));

  if (activeSocials.length >= 2) {
    socialScore = 20;
    socialRationale.push(`Multi-channel social footprint (${activeSocials.length} verified profiles) (+20 pts)`);
    strengths.push(`Active social presence across ${activeSocials.map(([k]) => k).join(', ')}`);
  } else if (activeSocials.length === 1) {
    socialScore = 10;
    socialRationale.push(`Single verified social channel (${activeSocials[0][0]}) (+10 pts)`);
    gaps.push({
      code: 'LIMITED_SOCIAL_CHANNELS',
      category: 'social',
      title: 'Limited Social Footprint',
      description: `Only 1 active social profile detected (${activeSocials[0][0]}). Missing other core channels.`,
      status: 'NOT_FOUND',
      commercialOpportunity: 'Establish cross-platform social branding and local community engagement.',
    });
  } else {
    socialScore = 0;
    socialRationale.push('No verified social media profiles detected (0 pts)');
    gaps.push({
      code: 'NO_SOCIAL_PRESENCE',
      category: 'social',
      title: 'No Verified Social Media Presence',
      description: 'Zero verified business social profiles found on major platforms.',
      status: 'NOT_FOUND',
      commercialOpportunity: 'Launch optimized profiles on LinkedIn, Facebook, and Instagram.',
    });
  }

  // =========================================================================
  // Dimension 4: Content & Search Depth (Max 15)
  // =========================================================================
  let contentScore = 0;
  const contentRationale: string[] = [];

  const subpages = input.subpages;
  const hasSubpages = Boolean(subpages.servicesPageUrl || subpages.aboutPageUrl || subpages.contactPageUrl);
  if (hasSubpages) {
    contentScore += 5;
    contentRationale.push('Dedicated structured subpages (About/Services/Contact) detected (+5 pts)');
  } else {
    contentRationale.push('No dedicated subpages detected (0 pts)');
    gaps.push({
      code: 'NO_SUBPAGES',
      category: 'seo',
      title: 'Missing Dedicated Subpages',
      description: 'Single-page or flat structure without dedicated pages for search indexing.',
      status: 'NOT_FOUND',
      commercialOpportunity: 'Develop multi-page architecture with separate landing pages for each service.',
    });
  }

  if (input.coreServices.length >= 3) {
    contentScore += 5;
    contentRationale.push(`Clear service offerings identified (${input.coreServices.length} services) (+5 pts)`);
  } else {
    contentRationale.push('Vague or sparse service definitions on page (0 pts)');
  }

  if (input.technologyIndicators.analyticsOrTracking.length > 0) {
    contentScore += 5;
    contentRationale.push(`Analytics tracking active (${input.technologyIndicators.analyticsOrTracking.join(', ')}) (+5 pts)`);
  } else {
    contentRationale.push('No conversion analytics or pixel tracking detected (0 pts)');
    gaps.push({
      code: 'NO_ANALYTICS',
      category: 'conversion',
      title: 'Missing Digital Analytics & Tracking',
      description: 'No Google Analytics 4 or Meta Pixel detected to track conversion performance.',
      status: 'NOT_FOUND',
      commercialOpportunity: 'Install Google Tag Manager, GA4 event tracking, and conversion funnels.',
    });
  }

  // =========================================================================
  // Dimension 5: Information Consistency (Max 10)
  // =========================================================================
  let infoScore = 0;
  const infoRationale: string[] = [];

  if (input.hasPhone) {
    infoScore += 4;
    infoRationale.push('Public phone contact verified (+4 pts)');
  }
  if (input.hasAddress) {
    infoScore += 4;
    infoRationale.push('Physical location verified (+4 pts)');
  }
  if (input.businessHours) {
    infoScore += 2;
    infoRationale.push('Operating hours published (+2 pts)');
  } else {
    infoRationale.push('No operating hours published (0 pts)');
    gaps.push({
      code: 'NO_OPERATING_HOURS',
      category: 'consistency',
      title: 'Missing Operating Hours',
      description: 'Public business hours not detected in schema or page markup.',
      status: 'NOT_FOUND',
      commercialOpportunity: 'Publish schema.org LocalBusiness operating hours.',
    });
  }

  const totalScore = Math.min(100, webScore + convScore + socialScore + contentScore + infoScore);

  let confidenceLevel: 'high' | 'medium' | 'low' = 'low';
  if (input.websiteStatus === 'VERIFIED') {
    confidenceLevel = 'high';
  } else if (input.websiteStatus === 'UNAVAILABLE' || input.hasPhone) {
    confidenceLevel = 'medium';
  }

  return {
    totalScore,
    confidenceLevel,
    dimensionBreakdown: {
      websiteAccessibility: {
        name: 'Website Accessibility & Security',
        score: webScore,
        maxScore: 30,
        weight: 0.3,
        rationale: webRationale,
      },
      conversionInfrastructure: {
        name: 'Conversion Infrastructure',
        score: convScore,
        maxScore: 25,
        weight: 0.25,
        rationale: convRationale,
      },
      verifiedSocialPresence: {
        name: 'Verified Social Footprint',
        score: socialScore,
        maxScore: 20,
        weight: 0.2,
        rationale: socialRationale,
      },
      contentAndSearchDepth: {
        name: 'Content & Search Depth',
        score: contentScore,
        maxScore: 15,
        weight: 0.15,
        rationale: contentRationale,
      },
      informationConsistency: {
        name: 'Information Consistency',
        score: infoScore,
        maxScore: 10,
        weight: 0.1,
        rationale: infoRationale,
      },
    },
    detectedGaps: gaps,
    strengths,
    findings: input.findings,
  };
}
