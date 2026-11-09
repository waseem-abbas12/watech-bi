import type {
  Business,
  WebsiteAudit,
  LocalSeoProfile,
  Opportunity,
  ContentItem,
  BuyerSignal,
  WatechServiceItem,
  WatechServicePackage,
  ServiceMatchResult,
  RecommendedTier,
  BusinessServiceRecommendation,
  PricingSummary,
  PricingModel,
  PackageType,
} from '@/types';
import { DEFAULT_WATECH_SERVICES, DEFAULT_WATECH_PACKAGES } from './serviceCatalogData';

/**
 * Evaluates match score (0–100) between a business's verified intelligence and a Watech service (Prompt 18: Part B)
 */
export function evaluateServiceMatch(
  service: WatechServiceItem,
  business: Business,
  audit?: WebsiteAudit,
  localSeo?: LocalSeoProfile,
  opportunities: Opportunity[] = [],
  contentItems: ContentItem[] = [],
  buyerSignals: BuyerSignal[] = []
): ServiceMatchResult {
  const supportingFindings: string[] = [];
  const requiredInfo: string[] = [...service.requiredCustomerAssets];
  const missingPrerequisites: string[] = [];
  let isUnnecessary = false;

  let relevancePts = 10;
  let evidencePts = 10;
  let fitPts = 15;
  let prereqPts = 15;

  const titleLower = service.name.toLowerCase();
  const catLower = service.category.toLowerCase();
  const uxScore = audit?.dimensions?.userExperience ?? audit?.totalScore ?? 70;
  const perfScore = audit?.dimensions?.performance ?? audit?.pageSpeedData?.performance ?? 70;

  // 1. Evaluate Website & Digital Experience Services
  if (catLower.includes('website') || titleLower.includes('website') || titleLower.includes('landing')) {
    if (audit) {
      if (uxScore < 60) {
        relevancePts += 35;
        evidencePts += 35;
        supportingFindings.push(`Mobile UX evaluated at ${uxScore}/100. High mobile bounce probability.`);
      } else if (uxScore >= 85 && perfScore >= 80) {
        // Unnecessary detection
        if (titleLower.includes('redesign') || titleLower.includes('speed')) {
          isUnnecessary = true;
          supportingFindings.push(`Website is already high-performing (UX: ${uxScore}, Performance: ${perfScore}). Overhaul is currently unnecessary.`);
        }
      }

      if (perfScore < 50) {
        relevancePts += 30;
        evidencePts += 30;
        supportingFindings.push(`Page speed / performance is slow (${perfScore}/100), delaying emergency contact submissions.`);
      }

      if (audit.totalScore < 60) {
        relevancePts += 25;
        evidencePts += 25;
        supportingFindings.push(`Overall website health scored ${audit.totalScore}/100 (${audit.grade}).`);
      }
    } else {
      relevancePts += 15;
      requiredInfo.push('Perform initial 10-category technical website audit');
    }

    // Check online booking opportunities
    const bookingSignal = buyerSignals.find(s => s.signalType.includes('intake') || s.signalType.includes('booking'));
    if (bookingSignal && titleLower.includes('booking')) {
      relevancePts += 35;
      evidencePts += 30;
      supportingFindings.push(bookingSignal.description);
    }
  }

  // 2. Evaluate Search & Visibility Services
  if (catLower.includes('search') || titleLower.includes('seo') || titleLower.includes('visibility')) {
    if (localSeo) {
      if (localSeo.reviewCount < 25) {
        relevancePts += 35;
        evidencePts += 35;
        supportingFindings.push(`Total Google review count is only ${localSeo.reviewCount}, lagging local market leaders.`);
      }
      if (!localSeo.googleBusinessProfileUrl) {
        relevancePts += 40;
        evidencePts += 40;
        supportingFindings.push('Google Business Profile is unlinked or unclaimed.');
      }
      if (localSeo.averageRating < 4.2 && localSeo.reviewCount > 5) {
        relevancePts += 25;
        evidencePts += 25;
        supportingFindings.push(`Average rating is ${localSeo.averageRating.toFixed(1)}/5, indicating review defense needs.`);
      }
    } else {
      relevancePts += 15;
      requiredInfo.push('Audit Google Business Profile & local citation grid');
    }
  }

  // 3. Evaluate Software & Automation Services
  if (catLower.includes('software') || catLower.includes('automation') || titleLower.includes('crm') || titleLower.includes('n8n')) {
    const opsSignals = buyerSignals.filter(s => s.category === 'operational_efficiency');
    if (opsSignals.length > 0) {
      relevancePts += 30;
      evidencePts += 30;
      opsSignals.forEach(s => supportingFindings.push(s.title));
    }
    const oppMatches = opportunities.filter(o => o.relevantWatechService === 'crm' || o.relevantWatechService === 'automation');
    if (oppMatches.length > 0) {
      relevancePts += 25;
      evidencePts += 25;
      oppMatches.forEach(o => supportingFindings.push(o.identifiedProblem));
    }
  }

  // 4. Evaluate Marketing & Customer Acquisition
  if (catLower.includes('marketing') || titleLower.includes('ads') || titleLower.includes('acquisition')) {
    const compSignals = buyerSignals.filter(s => s.category === 'competitive_pressure');
    if (compSignals.length > 0) {
      relevancePts += 30;
      evidencePts += 25;
      supportingFindings.push(`Competitor movements in local territory create urgent acquisition needs.`);
    }
    if (audit && uxScore < 50 && titleLower.includes('google ads')) {
      // Ads without conversion-ready website is a prerequisite failure
      missingPrerequisites.push('Must optimize mobile website or deploy dedicated landing pages prior to paid ad traffic');
      prereqPts = 5;
    }
  }

  // 5. Evaluate Growth Consulting
  if (catLower.includes('consulting') || titleLower.includes('growth')) {
    if (buyerSignals.some(s => s.category === 'growth')) {
      relevancePts += 30;
      evidencePts += 25;
      supportingFindings.push('Active operational growth signals suggest readiness for strategic commercial scaling.');
    }
  }

  // Bounds
  relevancePts = Math.min(100, relevancePts);
  evidencePts = Math.min(100, evidencePts);
  fitPts = Math.min(100, fitPts);
  prereqPts = missingPrerequisites.length > 0 ? 30 : 100;

  // Weighted calculation (Prompt 18: Part B)
  // Score = Relevance (40%) + Evidence (25%) + Business Fit (20%) + Prerequisites (15%)
  let finalScore = Math.round(
    relevancePts * 0.40 +
    evidencePts * 0.25 +
    fitPts * 0.20 +
    prereqPts * 0.15
  );

  if (isUnnecessary) {
    finalScore = Math.min(25, finalScore);
  }

  let rationale = `Matches ${supportingFindings.length} verified business findings.`;
  if (isUnnecessary) {
    rationale = 'Business currently demonstrates strong capability in this area; recommended to defer.';
  } else if (finalScore >= 75) {
    rationale = `High-impact commercial priority directly solving verified operational bottlenecks.`;
  } else if (finalScore >= 50) {
    rationale = `Secondary enhancement opportunity to complement core digital presence.`;
  }

  return {
    serviceId: service.id,
    serviceName: service.name,
    category: service.category,
    matchScore: finalScore,
    relevanceFactor: relevancePts,
    evidenceStrength: evidencePts,
    supportingFindings,
    rationale,
    expectedOutcome: service.intendedOutcome,
    requiredInformation: requiredInfo,
    prerequisitesMet: missingPrerequisites.length === 0,
    missingPrerequisites,
    isUnnecessaryOrNoAction: isUnnecessary,
    implementationComplexity: service.complexity,
  };
}

/**
 * Formats pricing summary with strict guardrails (Prompt 18: Part A & C)
 * If price is not configured, explicitly returns "Pricing not configured" and never calculates fake totals.
 */
export function buildPricingSummary(
  services: WatechServiceItem[],
  customModel?: PricingModel,
  customSetup?: number,
  customRecurring?: number
): PricingSummary {
  if (customModel && customModel !== 'pricing_not_configured') {
    return {
      model: customModel,
      setupText: customSetup !== undefined ? `$${customSetup.toLocaleString()}` : 'Pricing not configured',
      recurringText: customRecurring !== undefined ? `$${customRecurring.toLocaleString()}/mo` : 'N/A',
      hasUnconfiguredPricing: customSetup === undefined && customRecurring === undefined,
      estimatedTotalText: customSetup !== undefined 
        ? (customRecurring ? `$${customSetup.toLocaleString()} setup + $${customRecurring.toLocaleString()}/mo` : `$${customSetup.toLocaleString()} one-time`)
        : 'Pricing not configured',
    };
  }

  const unconfiguredCount = services.filter(s => s.pricingModel === 'pricing_not_configured' || s.basePrice === undefined).length;
  
  if (unconfiguredCount > 0) {
    return {
      model: 'pricing_not_configured',
      setupText: 'Pricing not configured',
      recurringText: 'Pricing not configured',
      hasUnconfiguredPricing: true,
      estimatedTotalText: 'Custom Quotation Required (Pricing not configured)',
    };
  }

  const setupTotal = services.filter(s => !s.isRecurring).reduce((acc, s) => acc + (s.basePrice || 0), 0);
  const recurringTotal = services.filter(s => s.isRecurring).reduce((acc, s) => acc + (s.basePrice || 0), 0);

  return {
    model: recurringTotal > 0 ? (setupTotal > 0 ? 'setup_plus_monthly' : 'monthly_retainer') : 'one_time',
    setupText: setupTotal > 0 ? `$${setupTotal.toLocaleString()}` : '$0',
    recurringText: recurringTotal > 0 ? `$${recurringTotal.toLocaleString()}/mo` : '$0/mo',
    hasUnconfiguredPricing: false,
    estimatedTotalText: recurringTotal > 0 
      ? `$${setupTotal.toLocaleString()} setup + $${recurringTotal.toLocaleString()}/mo`
      : `$${setupTotal.toLocaleString()} one-time`,
  };
}

/**
 * Builds 3-Tier package recommendation (Essential, Recommended, Comprehensive 360 System)
 */
export function buildRecommendationTiers(
  business: Business,
  serviceMatches: ServiceMatchResult[],
  catalogServices: WatechServiceItem[] = DEFAULT_WATECH_SERVICES,
  catalogPackages: WatechServicePackage[] = DEFAULT_WATECH_PACKAGES
): {
  essential: RecommendedTier;
  recommended: RecommendedTier;
  comprehensive: RecommendedTier;
} {
  const serviceMap = new Map<string, WatechServiceItem>(catalogServices.map(s => [s.id, s]));

  // Sort matches by score descending, filtering out unnecessary ones
  const actionableMatches = [...serviceMatches]
    .filter(m => !m.isUnnecessaryOrNoAction)
    .sort((a, b) => b.matchScore - a.matchScore);

  // 1. Essential Solution (1 primary service or targeted fix)
  const topMatch = actionableMatches[0] || serviceMatches[0];
  const essentialService = serviceMap.get(topMatch.serviceId) || catalogServices[0];
  const essentialMatches = [topMatch];
  const essentialPricing = buildPricingSummary([essentialService]);

  const essentialTier: RecommendedTier = {
    tierName: 'essential',
    packageType: 'individual_service',
    title: `Essential: ${essentialService.name}`,
    tagline: 'Targeted single-service intervention solving your most critical operational bottleneck.',
    description: `Focuses immediately on ${topMatch.serviceName} to resolve verified friction points without broader organizational disruption.`,
    serviceMatches: essentialMatches,
    deliverables: essentialService.deliverables,
    optionalAddOnServices: essentialService.optionalAddOns
      .map(id => serviceMap.get(id))
      .filter((s): s is WatechServiceItem => !!s)
      .map(s => ({ id: s.id, name: s.name, whyConsider: s.intendedOutcome })),
    estimatedDuration: essentialService.estimatedDuration,
    pricingSummary: essentialPricing,
    feasibilityWarnings: topMatch.missingPrerequisites,
    requiredCustomerAssets: essentialService.requiredCustomerAssets,
    customerJourneyStagesCovered: ['4. Lead Capture', '7. Conversion'],
    whyRecommended: `Directly targets ${topMatch.supportingFindings[0] || 'the primary operational vulnerability'}.`,
  };

  // 2. Recommended Solution (Combined Solution, 2–3 core complementary services)
  const recMatches = actionableMatches.slice(0, 3);
  const recServices = recMatches.map(m => serviceMap.get(m.serviceId)).filter((s): s is WatechServiceItem => !!s);
  const recDeliverables = Array.from(new Set(recServices.flatMap(s => s.deliverables)));
  const recAssets = Array.from(new Set(recServices.flatMap(s => s.requiredCustomerAssets)));
  const recWarnings = Array.from(new Set(recMatches.flatMap(m => m.missingPrerequisites)));
  const recPricing = buildPricingSummary(recServices);

  const recommendedTier: RecommendedTier = {
    tierName: 'recommended',
    packageType: 'combined_solution',
    title: 'Recommended: Local Search & Conversion Accelerator',
    tagline: 'High-leverage combination uniting digital presence, local map visibility, and reputation defense.',
    description: 'Bridges the gap between local visibility and online lead conversion by combining website optimization, Google Business Profile dominance, and automated review collection.',
    serviceMatches: recMatches,
    deliverables: recDeliverables,
    optionalAddOnServices: [
      { id: 'srv-booking-system', name: 'Online Booking & Instant Quote System', whyConsider: 'Enable instant self-service appointment scheduling 24/7' },
      { id: 'srv-google-ads', name: 'High-Intent Google Search Ads', whyConsider: 'Accelerate inbound emergency call volume immediately' },
    ],
    estimatedDuration: '5 - 7 weeks',
    pricingSummary: recPricing,
    feasibilityWarnings: recWarnings,
    requiredCustomerAssets: recAssets,
    customerJourneyStagesCovered: [
      '1. Business Visibility',
      '2. Customer Attraction',
      '4. Lead Capture',
      '7. Conversion',
      '8. Retention & Growth',
    ],
    whyRecommended: 'Solves both visibility and conversion weaknesses simultaneously, ensuring captured search traffic generates actual revenue.',
  };

  // 3. Comprehensive Solution (360 Business Growth System)
  const compServices = catalogServices.filter(s => 
    s.id === 'srv-growth-consulting' ||
    s.id === 'srv-web-redesign' ||
    s.id === 'srv-local-seo' ||
    s.id === 'srv-service-area-pages' ||
    s.id === 'srv-lead-management-crm' ||
    s.id === 'srv-n8n-automation' ||
    s.id === 'srv-review-automation'
  );
  const compMatches = compServices.map(s => {
    const existingMatch = serviceMatches.find(m => m.serviceId === s.id);
    return existingMatch || evaluateServiceMatch(s, business);
  });
  const compDeliverables = Array.from(new Set(compServices.flatMap(s => s.deliverables)));
  const compAssets = Array.from(new Set(compServices.flatMap(s => s.requiredCustomerAssets)));
  const compWarnings = Array.from(new Set(compMatches.flatMap(m => m.missingPrerequisites)));
  const compPricing = buildPricingSummary(compServices);

  const comprehensiveTier: RecommendedTier = {
    tierName: 'comprehensive',
    packageType: 'complete_growth_system',
    title: 'Comprehensive: 360° Business Growth System',
    tagline: 'End-to-end commercial transformation orchestrating all 8 stages of the contractor customer journey.',
    description: 'A phased, full-service operating framework connecting brand authority, regional search dominance, CRM pipeline tracking, and workflow automation.',
    serviceMatches: compMatches,
    deliverables: compDeliverables,
    optionalAddOnServices: [
      { id: 'srv-google-ads', name: 'Google Ads PPC Management', whyConsider: 'Drive high-volume seasonal demand during peak weather' },
      { id: 'srv-chat-assistant', name: 'AI Emergency Intake Assistant', whyConsider: 'Triage after-hours customer calls with AI' },
    ],
    estimatedDuration: '3 months phased rollout',
    pricingSummary: compPricing,
    feasibilityWarnings: compWarnings,
    requiredCustomerAssets: compAssets,
    customerJourneyStagesCovered: [
      '1. Business Visibility',
      '2. Customer Attraction',
      '3. Customer Engagement',
      '4. Lead Capture',
      '5. Lead Qualification',
      '6. Follow-up',
      '7. Conversion',
      '8. Retention & Growth',
    ],
    whyRecommended: 'Transforms the business from ad-hoc lead generation into an automated, scalable enterprise with predictable customer acquisition.',
  };

  return {
    essential: essentialTier,
    recommended: recommendedTier,
    comprehensive: comprehensiveTier,
  };
}

/**
 * Master recommendation generator for a business (Prompt 18: Parts B & C)
 */
export function generateBusinessRecommendation(
  business: Business,
  audit?: WebsiteAudit,
  localSeo?: LocalSeoProfile,
  opportunities: Opportunity[] = [],
  contentItems: ContentItem[] = [],
  buyerSignals: BuyerSignal[] = [],
  catalogServices: WatechServiceItem[] = DEFAULT_WATECH_SERVICES,
  catalogPackages: WatechServicePackage[] = DEFAULT_WATECH_PACKAGES
): BusinessServiceRecommendation {
  const serviceMatches = catalogServices
    .filter(s => s.isActive)
    .map(service => evaluateServiceMatch(service, business, audit, localSeo, opportunities, contentItems, buyerSignals))
    .sort((a, b) => b.matchScore - a.matchScore);

  const tiers = buildRecommendationTiers(business, serviceMatches, catalogServices, catalogPackages);

  return {
    id: `rec-${business.id}`,
    businessId: business.id,
    projectId: business.projectId,
    essentialSolution: tiers.essential,
    recommendedSolution: tiers.recommended,
    comprehensiveSolution: tiers.comprehensive,
    serviceMatches,
    status: 'draft',
    pushedToCrm: false,
    generatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
