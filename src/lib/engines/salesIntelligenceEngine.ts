import type {
  Business,
  WebsiteAudit,
  LocalSeoProfile,
  Opportunity,
  CompetitorChange,
  Contact,
  BuyerSignal,
  BuyerSignalCategory,
  BuyerSignalConfidence,
  BuyerSignalReliability,
  SalesReadinessWeights,
  SalesReadinessRecord,
  SalesReadinessDimensionScore,
  SalesReadinessCategory,
  BuyingIntentLevel,
  BuyerRoleRecommendation,
} from '@/types';

export const DEFAULT_SALES_READINESS_WEIGHTS: SalesReadinessWeights = {
  businessNeedEvidence: 25,
  growthSignals: 15,
  buyingInvestmentSignals: 15,
  digitalImprovementPotential: 15,
  watechServiceFit: 15,
  decisionMakerAccessibility: 10,
  evidenceRecencyReliability: 5,
};

/**
 * Calculates time-decay weight based on the freshness of the evidence (Prompt 17)
 * <= 30 days: 1.0 (Fresh)
 * 31 - 90 days: 0.75 (Recent)
 * 91 - 180 days: 0.50 (Aging)
 * > 180 days: 0.25 (Decayed)
 */
export function calculateSignalRecencyWeight(lastVerifiedDate: string): number {
  if (!lastVerifiedDate) return 0.5;
  const verifiedTime = new Date(lastVerifiedDate).getTime();
  if (isNaN(verifiedTime)) return 0.5;
  
  const diffDays = Math.max(0, (Date.now() - verifiedTime) / (1000 * 60 * 60 * 24));
  if (diffDays <= 30) return 1.0;
  if (diffDays <= 90) return 0.75;
  if (diffDays <= 180) return 0.5;
  return 0.25;
}

/**
 * Automatically discovers publicly observable buyer signals from real business audit findings,
 * local SEO metrics, reviews, and competitor movements.
 */
export function detectBuyerSignals(
  business: Business,
  audit?: WebsiteAudit,
  localSeo?: LocalSeoProfile,
  opportunities: Opportunity[] = [],
  competitorChanges: CompetitorChange[] = [],
  contacts: Contact[] = []
): BuyerSignal[] {
  const signals: BuyerSignal[] = [];
  const now = new Date().toISOString();

  // 1. Digital Transformation Signals
  if (audit) {
    const uxScore = audit.dimensions?.userExperience ?? audit.totalScore;
    const perfScore = audit.dimensions?.performance ?? audit.pageSpeedData?.performance ?? 50;

    if (uxScore < 60) {
      signals.push({
        id: `sig-dt-mobile-${business.id}`,
        businessId: business.id,
        projectId: business.projectId,
        category: 'digital_transformation',
        signalType: 'poor_mobile_experience',
        title: 'Failing Mobile Conversion & Responsiveness',
        description: `Mobile UX evaluated at ${uxScore}/100. High bounce rate likely causing immediate abandonment from smartphone searchers.`,
        evidenceExcerpt: `User Experience Score: ${uxScore}/100; Viewport formatting or responsive bottlenecks detected.`,
        sourceUrl: audit.targetUrl,
        sourceType: 'website_audit',
        confidence: 'high',
        reliability: 'directly_observed',
        firstDetectedDate: audit.inspectedAt,
        lastVerifiedDate: audit.inspectedAt,
        recencyWeight: calculateSignalRecencyWeight(audit.inspectedAt),
        status: 'active',
      });
    }

    if (perfScore < 50) {
      signals.push({
        id: `sig-dt-speed-${business.id}`,
        businessId: business.id,
        projectId: business.projectId,
        category: 'digital_transformation',
        signalType: 'slow_page_load',
        title: 'Severe Mobile Page Speed Bottlenecks',
        description: `Performance score evaluated at ${perfScore}/100, slowing down urgent emergency service requests.`,
        evidenceExcerpt: `Speed Performance: ${perfScore}/100; High server latency or unoptimized assets.`,
        sourceUrl: audit.targetUrl,
        sourceType: 'website_audit',
        confidence: 'high',
        reliability: 'directly_observed',
        firstDetectedDate: audit.inspectedAt,
        lastVerifiedDate: audit.inspectedAt,
        recencyWeight: calculateSignalRecencyWeight(audit.inspectedAt),
        status: 'active',
      });
    }

    if (audit.totalScore < 55) {
      signals.push({
        id: `sig-dt-legacy-${business.id}`,
        businessId: business.id,
        projectId: business.projectId,
        category: 'digital_transformation',
        signalType: 'legacy_website_architecture',
        title: 'Legacy Website Infrastructure & Security Gaps',
        description: `Overall audit score of ${audit.totalScore}/100 indicates outdated CMS or static architecture lacking modern lead capture widgets.`,
        evidenceExcerpt: `Overall Technical Health: ${audit.totalScore}/100; Grade: ${audit.grade}`,
        sourceUrl: audit.targetUrl,
        sourceType: 'website_audit',
        confidence: 'high',
        reliability: 'directly_observed',
        firstDetectedDate: audit.inspectedAt,
        lastVerifiedDate: audit.inspectedAt,
        recencyWeight: calculateSignalRecencyWeight(audit.inspectedAt),
        status: 'active',
      });
    }
  }

  // 2. Marketing Need Signals
  if (localSeo) {
    if (localSeo.reviewCount < 25) {
      signals.push({
        id: `sig-mkt-review-${business.id}`,
        businessId: business.id,
        projectId: business.projectId,
        category: 'marketing_need',
        signalType: 'low_review_volume',
        title: 'Vulnerable Google Review Defense & Volume',
        description: `Only ${localSeo.reviewCount} total Google reviews. Vulnerable to competitor displacement in local map pack.`,
        evidenceExcerpt: `Review Count: ${localSeo.reviewCount} (Average rating: ${localSeo.averageRating.toFixed(1)}/5)`,
        sourceUrl: localSeo.googleBusinessProfileUrl,
        sourceType: 'google_business_profile',
        confidence: 'high',
        reliability: 'directly_observed',
        firstDetectedDate: localSeo.lastAuditedAt || now,
        lastVerifiedDate: localSeo.lastAuditedAt || now,
        recencyWeight: calculateSignalRecencyWeight(localSeo.lastAuditedAt || now),
        status: 'active',
      });
    }

    if (!localSeo.googleBusinessProfileUrl) {
      signals.push({
        id: `sig-mkt-gbp-${business.id}`,
        businessId: business.id,
        projectId: business.projectId,
        category: 'marketing_need',
        signalType: 'unclaimed_gbp',
        title: 'Unclaimed or Unlinked Google Business Profile',
        description: 'Google Business Profile is unlinked or unverified, leaving primary local search real estate exposed.',
        evidenceExcerpt: 'GBP Link Status: Missing or Unclaimed. High risk of profile takeover or missing citation authority.',
        sourceType: 'google_business_profile',
        confidence: 'high',
        reliability: 'directly_observed',
        firstDetectedDate: localSeo.lastAuditedAt || now,
        lastVerifiedDate: localSeo.lastAuditedAt || now,
        recencyWeight: calculateSignalRecencyWeight(localSeo.lastAuditedAt || now),
        status: 'active',
      });
    }
  }

  // 3. Operational Efficiency Signals
  const bookingOpp = opportunities.find(o => 
    o.identifiedProblem.toLowerCase().includes('booking') || 
    o.identifiedProblem.toLowerCase().includes('intake') ||
    o.identifiedProblem.toLowerCase().includes('form') ||
    o.identifiedProblem.toLowerCase().includes('automation')
  );
  if (bookingOpp) {
    signals.push({
      id: `sig-op-intake-${business.id}`,
      businessId: business.id,
      projectId: business.projectId,
      category: 'operational_efficiency',
      signalType: 'manual_intake_friction',
      title: 'Manual Lead Intake & Friction-Heavy Enquiry Flow',
      description: 'Lack of instant 24/7 self-service scheduling or quote estimation forces prospective customers to wait for manual callbacks.',
      evidenceExcerpt: bookingOpp.evidence || bookingOpp.businessRelevance,
      sourceType: 'opportunity_analysis',
      confidence: 'medium',
      reliability: 'automated_interpretation',
      firstDetectedDate: now,
      lastVerifiedDate: now,
      recencyWeight: 1.0,
      status: 'active',
    });
  }

  // 4. Growth & Expansion Signals
  if (business.fullAddress && business.phone) {
    signals.push({
      id: `sig-gro-expansion-${business.id}`,
      businessId: business.id,
      projectId: business.projectId,
      category: 'growth',
      signalType: 'multi_location_or_phone',
      title: 'Active Regional Operational Footprint',
      description: 'Published physical facility address and active direct dispatch line indicate verified operational presence.',
      evidenceExcerpt: `Verified headquarters: ${business.fullAddress}. Phone: ${business.phone}.`,
      sourceType: 'business_discovery',
      confidence: 'medium',
      reliability: 'directly_observed',
      firstDetectedDate: business.createdAt || now,
      lastVerifiedDate: business.lastCheckedDate || now,
      recencyWeight: calculateSignalRecencyWeight(business.lastCheckedDate || now),
      status: 'active',
    });
  }

  // 5. Competitive Pressure Signals
  const recentChanges = competitorChanges.filter(c => c.status !== 'dismissed');
  if (recentChanges.length > 0) {
    signals.push({
      id: `sig-comp-pressure-${business.id}`,
      businessId: business.id,
      projectId: business.projectId,
      category: 'competitive_pressure',
      signalType: 'competitor_activity_surge',
      title: 'Direct Competitor Movement & Territory Campaign',
      description: `${recentChanges.length} recent competitor marketing or website change(s) detected in the local market.`,
      evidenceExcerpt: `Observed changes: ${recentChanges.map(c => c.description).slice(0, 2).join('; ')}`,
      sourceType: 'competitor_surveillance',
      confidence: 'high',
      reliability: 'third_party_public',
      firstDetectedDate: recentChanges[0].detectedAt,
      lastVerifiedDate: recentChanges[0].detectedAt,
      recencyWeight: calculateSignalRecencyWeight(recentChanges[0].detectedAt),
      status: 'active',
    });
  }

  // 6. Customer Experience Signals
  if (localSeo && localSeo.averageRating < 4.2 && localSeo.reviewCount > 5) {
    signals.push({
      id: `sig-cx-reviews-${business.id}`,
      businessId: business.id,
      projectId: business.projectId,
      category: 'customer_experience',
      signalType: 'review_friction_sentiment',
      title: 'Noticeable Customer Friction in Public Reviews',
      description: `Public rating of ${localSeo.averageRating.toFixed(1)} indicates recurring service, responsiveness, or dispatch communication complaints.`,
      evidenceExcerpt: `Public Rating: ${localSeo.averageRating.toFixed(1)}/5 stars across ${localSeo.reviewCount} customer reviews.`,
      sourceUrl: localSeo.googleBusinessProfileUrl,
      sourceType: 'local_reviews',
      confidence: 'high',
      reliability: 'directly_observed',
      firstDetectedDate: localSeo.lastAuditedAt || now,
      lastVerifiedDate: localSeo.lastAuditedAt || now,
      recencyWeight: calculateSignalRecencyWeight(localSeo.lastAuditedAt || now),
      status: 'active',
    });
  }

  return signals;
}

/**
 * Calculates transparent 0–100 Sales Readiness score across 7 dimensions (Prompt 17)
 */
export function calculateSalesReadiness(
  business: Business,
  signals: BuyerSignal[],
  audit?: WebsiteAudit,
  localSeo?: LocalSeoProfile,
  contacts: Contact[] = [],
  opportunities: Opportunity[] = [],
  weights: SalesReadinessWeights = DEFAULT_SALES_READINESS_WEIGHTS
): SalesReadinessRecord {
  const activeSignals = signals.filter(s => s.status === 'active');
  const uxScore = audit?.dimensions?.userExperience ?? audit?.totalScore ?? 70;
  const perfScore = audit?.dimensions?.performance ?? audit?.pageSpeedData?.performance ?? 70;

  // Dimension 1: Business Need Evidence (Max 25 pts)
  let needPts = 5; // Baseline
  if (audit && audit.totalScore < 60) needPts += 8;
  if (audit && uxScore < 60) needPts += 6;
  if (localSeo && localSeo.reviewCount < 30) needPts += 4;
  if (opportunities.length >= 3) needPts += 2;
  needPts = Math.min(25, needPts);
  const needWeighted = (needPts / 25) * weights.businessNeedEvidence;

  // Dimension 2: Growth Signals (Max 15 pts)
  const growthSignals = activeSignals.filter(s => s.category === 'growth');
  let growthPts = growthSignals.length > 0 ? 10 : 3;
  if (business.fullAddress && business.phone) growthPts += 5;
  growthPts = Math.min(15, growthPts);
  const growthWeighted = (growthPts / 15) * weights.growthSignals;

  // Dimension 3: Buying / Investment Signals (Max 15 pts)
  const compOrMktSignals = activeSignals.filter(s => s.category === 'competitive_pressure' || s.category === 'marketing_need');
  let buyPts = 4;
  if (compOrMktSignals.length > 0) buyPts += 7;
  if (activeSignals.some(s => s.recencyWeight >= 0.75)) buyPts += 4;
  buyPts = Math.min(15, buyPts);
  const buyWeighted = (buyPts / 15) * weights.buyingInvestmentSignals;

  // Dimension 4: Digital Improvement Potential (Max 15 pts)
  let digPts = 4;
  if (audit && audit.totalScore < 50) digPts += 7;
  else if (audit && audit.totalScore < 70) digPts += 4;
  if (audit && perfScore < 50) digPts += 4;
  digPts = Math.min(15, digPts);
  const digWeighted = (digPts / 15) * weights.digitalImprovementPotential;

  // Dimension 5: Watech Service Fit (Max 15 pts)
  let fitPts = 5;
  if (opportunities.some(o => o.relevantWatechService === 'website_development' || o.relevantWatechService === 'local_seo')) fitPts += 6;
  if (opportunities.some(o => o.relevantWatechService === 'automation' || o.relevantWatechService === 'crm')) fitPts += 4;
  fitPts = Math.min(15, fitPts);
  const fitWeighted = (fitPts / 15) * weights.watechServiceFit;

  // Dimension 6: Decision-Maker Accessibility (Max 10 pts)
  const decisionMakers = contacts.filter(c => c.isDecisionMaker);
  let dmPts = 2;
  if (decisionMakers.length > 0) dmPts += 5;
  if (decisionMakers.some(dm => dm.verificationStatus === 'verified' && dm.email)) dmPts += 3;
  dmPts = Math.min(10, dmPts);
  const dmWeighted = (dmPts / 10) * weights.decisionMakerAccessibility;

  // Dimension 7: Evidence Recency & Reliability (Max 5 pts)
  let recPts = 2;
  const avgRecency = activeSignals.length > 0 
    ? activeSignals.reduce((acc, s) => acc + s.recencyWeight, 0) / activeSignals.length
    : 0.5;
  if (avgRecency >= 0.75) recPts += 2;
  if (activeSignals.some(s => s.reliability === 'directly_observed')) recPts += 1;
  recPts = Math.min(5, recPts);
  const recWeighted = (recPts / 5) * weights.evidenceRecencyReliability;

  // Total Normalized Score (0 - 100)
  const totalWeightSum = Object.values(weights).reduce((a, b) => a + b, 0);
  const totalRawWeighted = needWeighted + growthWeighted + buyWeighted + digWeighted + fitWeighted + dmWeighted + recWeighted;
  const overallScore = Math.min(100, Math.max(0, Math.round((totalRawWeighted / totalWeightSum) * 100)));

  // Categorize Readiness
  let readinessCategory: SalesReadinessCategory = 'insufficient_evidence';
  if (overallScore >= 75) readinessCategory = 'priority_sales_opportunity';
  else if (overallScore >= 60) readinessCategory = 'strong_potential';
  else if (overallScore >= 40) readinessCategory = 'research_further';
  else readinessCategory = 'low_immediate_priority';

  // Classify Buying Intent
  let buyingIntent: BuyingIntentLevel = 'unknown';
  if (growthSignals.length > 0 && needPts >= 18 && avgRecency >= 0.75) {
    buyingIntent = 'strong_signal';
  } else if (activeSignals.length >= 3 && avgRecency >= 0.5) {
    buyingIntent = 'emerging_signal';
  } else if (needPts >= 12) {
    buyingIntent = 'potential_need';
  }

  // Recommended Buyer Role
  const buyerRole = recommendBuyerRole(business, audit, opportunities, contacts);

  // Recommended Next Action
  let nextAction = 'Review audit findings and research executive contacts';
  if (overallScore >= 75 && buyerRole.matchedContactName) {
    nextAction = `Execute targeted outreach to ${buyerRole.recommendedRole} (${buyerRole.matchedContactName}) with conversion audit angle`;
  } else if (overallScore >= 75) {
    nextAction = `Enrich email for ${buyerRole.recommendedRole} and initiate multi-touch sequence`;
  } else if (overallScore >= 60) {
    nextAction = 'Monitor competitor movements and queue website modernization pitch';
  }

  // Primary Bottleneck summary
  let bottleneck = 'General digital presence review needed';
  if (audit && uxScore < 60) bottleneck = 'Critical mobile conversion and layout breakdown';
  else if (localSeo && localSeo.reviewCount < 20) bottleneck = 'Low Google review defense vs aggressive local rivals';
  else if (audit && perfScore < 50) bottleneck = 'Slow mobile page load causing quote abandonment';

  const dimensionScores: Record<keyof SalesReadinessWeights, SalesReadinessDimensionScore> = {
    businessNeedEvidence: {
      dimension: 'businessNeedEvidence',
      name: 'Business Need Evidence',
      pointsAwarded: needPts,
      maxPoints: 25,
      weight: weights.businessNeedEvidence,
      weightedScore: Math.round(needWeighted),
      rawMetricSummary: `${needPts}/25 raw points`,
      evidenceRationale: audit ? `Technical health ${audit.totalScore}/100, ${opportunities.length} identified bottlenecks` : 'Preliminary baseline without audit',
    },
    growthSignals: {
      dimension: 'growthSignals',
      name: 'Growth & Expansion Signals',
      pointsAwarded: growthPts,
      maxPoints: 15,
      weight: weights.growthSignals,
      weightedScore: Math.round(growthWeighted),
      rawMetricSummary: `${growthSignals.length} observable growth indicators`,
      evidenceRationale: growthSignals.length > 0 ? 'Active fleet/phone or service expansion indicators present' : 'Stable single-location operation',
    },
    buyingInvestmentSignals: {
      dimension: 'buyingInvestmentSignals',
      name: 'Buying & Investment Signals',
      pointsAwarded: buyPts,
      maxPoints: 15,
      weight: weights.buyingInvestmentSignals,
      weightedScore: Math.round(buyWeighted),
      rawMetricSummary: `${buyPts}/15 raw points`,
      evidenceRationale: 'Market competition and recent signal freshness suggest commercial awareness',
    },
    digitalImprovementPotential: {
      dimension: 'digitalImprovementPotential',
      name: 'Digital Improvement Potential',
      pointsAwarded: digPts,
      maxPoints: 15,
      weight: weights.digitalImprovementPotential,
      weightedScore: Math.round(digWeighted),
      rawMetricSummary: `${digPts}/15 raw points`,
      evidenceRationale: audit ? `Technical health rated ${audit.totalScore}/100 with tangible room for conversion gains` : 'Standard industry upside',
    },
    watechServiceFit: {
      dimension: 'watechServiceFit',
      name: 'Watech Service Alignment',
      pointsAwarded: fitPts,
      maxPoints: 15,
      weight: weights.watechServiceFit,
      weightedScore: Math.round(fitWeighted),
      rawMetricSummary: `${fitPts}/15 raw points`,
      evidenceRationale: 'High alignment with Watech website overhaul, local SEO, and booking automation offerings',
    },
    decisionMakerAccessibility: {
      dimension: 'decisionMakerAccessibility',
      name: 'Decision-Maker Accessibility',
      pointsAwarded: dmPts,
      maxPoints: 10,
      weight: weights.decisionMakerAccessibility,
      weightedScore: Math.round(dmWeighted),
      rawMetricSummary: `${decisionMakers.length} decision-makers identified`,
      evidenceRationale: decisionMakers.length > 0 ? `${decisionMakers[0].fullName} (${decisionMakers[0].roleOrTitle || 'Executive'}) discovered` : 'Contact discovery required',
    },
    evidenceRecencyReliability: {
      dimension: 'evidenceRecencyReliability',
      name: 'Evidence Recency & Reliability',
      pointsAwarded: recPts,
      maxPoints: 5,
      weight: weights.evidenceRecencyReliability,
      weightedScore: Math.round(recWeighted),
      rawMetricSummary: `${(avgRecency * 100).toFixed(0)}% average signal freshness`,
      evidenceRationale: 'Directly verified from recent domain audits and public Google profile data',
    },
  };

  return {
    id: `sr-${business.id}`,
    businessId: business.id,
    projectId: business.projectId,
    overallScore,
    readinessCategory,
    buyingIntent,
    dimensionScores,
    buyerRoleRecommendation: buyerRole,
    recommendedNextAction: nextAction,
    primaryObservableBottleneck: bottleneck,
    calculatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Recommends the specific target buyer role based on identified bottlenecks
 */
export function recommendBuyerRole(
  business: Business,
  audit?: WebsiteAudit,
  opportunities: Opportunity[] = [],
  contacts: Contact[] = []
): BuyerRoleRecommendation {
  let targetRole = 'Owner / Founder / President';
  let rationale = 'For small-to-mid commercial & residential HVAC contractors, equity owners hold direct P&L responsibility for customer acquisition and website investments.';
  let conversationStarter = 'I noticed your website is experiencing mobile display bottlenecks that could be causing emergency repair enquiries to slip away.';

  const hasOpsFriction = opportunities.some(o => o.relevantWatechService === 'automation' || o.relevantWatechService === 'crm');
  const hasMarketingNeed = opportunities.some(o => o.relevantWatechService === 'local_seo' || o.relevantWatechService === 'social_media_marketing');

  if (hasOpsFriction && !hasMarketingNeed) {
    targetRole = 'Operations Director / General Manager';
    rationale = 'Operational automation and dispatch workflows directly impact daily technician scheduling and dispatch overhead managed by Operations.';
    conversationStarter = 'We noticed your online booking flow requires manual callbacks, creating dispatch latency compared to top local competitors.';
  } else if (hasMarketingNeed && (audit?.totalScore || 100) > 75) {
    targetRole = 'Head of Marketing / Growth Director';
    rationale = 'The website infrastructure is sound, but local search visibility and Google review velocity require dedicated marketing focus.';
    conversationStarter = 'Your site looks great, but your Google Business Profile is currently lagging behind top local competitors in monthly review velocity.';
  }

  // Find matching contact
  const matchedContact = contacts.find(c => {
    if (!c.isDecisionMaker) return false;
    const title = (c.roleOrTitle || '').toLowerCase();
    if (targetRole.includes('Owner') && /owner|founder|president|ceo|principal/i.test(title)) return true;
    if (targetRole.includes('Operations') && /operations|general manager|coo|dispatch/i.test(title)) return true;
    if (targetRole.includes('Marketing') && /marketing|growth|digital/i.test(title)) return true;
    return true; // Fallback to any decision-maker
  });

  return {
    recommendedRole: targetRole,
    rationale,
    suggestedConversationStarter: conversationStarter,
    matchedContactId: matchedContact?.id,
    matchedContactName: matchedContact?.fullName,
  };
}
