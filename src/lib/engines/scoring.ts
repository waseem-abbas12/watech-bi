import type {
  Business,
  WebsiteAudit,
  LeadScore,
  LeadScoreCategory,
  ScoreBand,
  Contact,
  IntelligenceFact,
} from '@/types';

export {
  calculateAdvancedLeadScore,
  extractBuyingReadinessSignals,
  detectDuplicates,
  mergeBusinessRecords,
  DEFAULT_PROMPT08_WEIGHTS,
} from './leadQualificationEngine';
export type { Prompt08Weights } from './leadQualificationEngine';

export interface ScoringWeights {
  websiteIssues: number; // default 20
  seoWeaknesses: number; // default 15
  leadCaptureWeaknesses: number; // default 15
  socialContentWeaknesses: number; // default 10
  reputationOpportunities: number; // default 10
  automationOpportunities: number; // default 10
  capacityGrowthSignals: number; // default 10
  decisionMakerRoute: number; // default 10
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  websiteIssues: 20,
  seoWeaknesses: 15,
  leadCaptureWeaknesses: 15,
  socialContentWeaknesses: 10,
  reputationOpportunities: 10,
  automationOpportunities: 10,
  capacityGrowthSignals: 10,
  decisionMakerRoute: 10,
};

export function calculateLeadScore(
  business: Business,
  audit?: WebsiteAudit,
  contacts: Contact[] = [],
  facts: IntelligenceFact[] = [],
  customWeights: Partial<ScoringWeights> = {}
): LeadScore {
  const weights: ScoringWeights = { ...DEFAULT_WEIGHTS, ...customWeights };

  // 1. Website absent/outdated or usability issues (max default 20)
  let websiteIssues: LeadScoreCategory;
  if (!audit) {
    websiteIssues = {
      name: 'Website Usability & Tech Weaknesses',
      pointsAwarded: 0,
      maxPoints: weights.websiteIssues,
      evidence: 'No website audit has been conducted yet.',
      isUnknown: true,
      notes: 'Unknown: Not penalized. Score pending live audit.',
    };
  } else {
    // If audit total score is low, it represents higher opportunity for Watech to rebuild/upgrade
    // e.g. Audit score 40% means 60% weakness => 12/20 points awarded
    const defectRatio = Math.max(0, 100 - audit.totalScore) / 100;
    const points = Math.round(defectRatio * weights.websiteIssues);
    const criticalFindings = audit.findings.filter(f => f.severity === 'critical' || f.severity === 'high');

    websiteIssues = {
      name: 'Website Usability & Tech Weaknesses',
      pointsAwarded: points,
      maxPoints: weights.websiteIssues,
      evidence: `Website Health Score: ${audit.totalScore}/100 with ${criticalFindings.length} critical/high issues detected.`,
      isUnknown: false,
      notes: criticalFindings.length > 0 ? criticalFindings[0].observation : 'Audit established baseline credibility.',
    };
  }

  // 2. SEO & Local Visibility Weaknesses (max default 15)
  let seoWeaknesses: LeadScoreCategory;
  if (!audit) {
    seoWeaknesses = {
      name: 'SEO & Local Visibility Weaknesses',
      pointsAwarded: 0,
      maxPoints: weights.seoWeaknesses,
      evidence: 'No SEO inspection recorded.',
      isUnknown: true,
    };
  } else {
    const techSeo = audit.categories?.find(c => c.category === 'technical_seo');
    const localSeo = audit.categories?.find(c => c.category === 'local_seo');
    const avgScore = ((techSeo?.score ?? 50) + (localSeo?.score ?? 50)) / 2;
    const points = Math.round(((100 - avgScore) / 100) * weights.seoWeaknesses);

    seoWeaknesses = {
      name: 'SEO & Local Visibility Weaknesses',
      pointsAwarded: points,
      maxPoints: weights.seoWeaknesses,
      evidence: `Tech SEO score: ${techSeo?.score ?? 'N/A'}/100, Local SEO score: ${localSeo?.score ?? 'N/A'}/100.`,
      isUnknown: false,
      notes: techSeo?.summary || 'SEO audit verified.',
    };
  }

  // 3. Lead Capture & Conversion Weaknesses (max default 15)
  let leadCaptureWeaknesses: LeadScoreCategory;
  if (!audit) {
    leadCaptureWeaknesses = {
      name: 'Lead Capture & Conversion Weaknesses',
      pointsAwarded: 0,
      maxPoints: weights.leadCaptureWeaknesses,
      evidence: 'No conversion audit recorded.',
      isUnknown: true,
    };
  } else {
    const conv = audit.categories?.find(c => c.category === 'conversion_focus');
    const capture = audit.categories?.find(c => c.category === 'lead_capture');
    const avgScore = ((conv?.score ?? 50) + (capture?.score ?? 50)) / 2;
    const points = Math.round(((100 - avgScore) / 100) * weights.leadCaptureWeaknesses);

    leadCaptureWeaknesses = {
      name: 'Lead Capture & Conversion Weaknesses',
      pointsAwarded: points,
      maxPoints: weights.leadCaptureWeaknesses,
      evidence: `Conversion score: ${conv?.score ?? 'N/A'}/100, Lead Capture score: ${capture?.score ?? 'N/A'}/100.`,
      isUnknown: false,
      notes: capture?.summary || 'Conversion signals checked.',
    };
  }

  // 4. Social & Content Weaknesses (max default 10)
  const socialChannels = business.marketingChannels || [];
  let socialContentWeaknesses: LeadScoreCategory;
  if (socialChannels.length === 0) {
    socialContentWeaknesses = {
      name: 'Social & Content Weaknesses',
      pointsAwarded: Math.round(weights.socialContentWeaknesses * 0.8),
      maxPoints: weights.socialContentWeaknesses,
      evidence: 'No public social channels detected on official domain or listings.',
      isUnknown: false,
      notes: 'Strong opportunity for social presence & content creation.',
    };
  } else if (socialChannels.length <= 2) {
    socialContentWeaknesses = {
      name: 'Social & Content Weaknesses',
      pointsAwarded: Math.round(weights.socialContentWeaknesses * 0.5),
      maxPoints: weights.socialContentWeaknesses,
      evidence: `Limited channels detected (${socialChannels.join(', ')}).`,
      isUnknown: false,
    };
  } else {
    socialContentWeaknesses = {
      name: 'Social & Content Weaknesses',
      pointsAwarded: 2,
      maxPoints: weights.socialContentWeaknesses,
      evidence: `Active multi-channel presence (${socialChannels.join(', ')}).`,
      isUnknown: false,
    };
  }

  // 5. Reputation Presentation Opportunities (max default 10)
  let reputationOpportunities: LeadScoreCategory;
  if (business.reviewCount === undefined || business.reviewRating === undefined) {
    reputationOpportunities = {
      name: 'Reputation Presentation Opportunities',
      pointsAwarded: 0,
      maxPoints: weights.reputationOpportunities,
      evidence: 'Public review metrics not yet verified.',
      isUnknown: true,
      notes: 'Missing data not penalized.',
    };
  } else if (business.reviewCount < 15 || business.reviewRating < 4.2) {
    reputationOpportunities = {
      name: 'Reputation Presentation Opportunities',
      pointsAwarded: Math.round(weights.reputationOpportunities * 0.85),
      maxPoints: weights.reputationOpportunities,
      evidence: `Rating: ${business.reviewRating}★ (${business.reviewCount} reviews). High leverage for review acquisition/display.`,
      isUnknown: false,
    };
  } else {
    reputationOpportunities = {
      name: 'Reputation Presentation Opportunities',
      pointsAwarded: Math.round(weights.reputationOpportunities * 0.4),
      maxPoints: weights.reputationOpportunities,
      evidence: `Rating: ${business.reviewRating}★ (${business.reviewCount} reviews). Focus on showcasing verified proof.`,
      isUnknown: false,
    };
  }

  // 6. Automation & Follow-Up Opportunities (max default 10)
  let automationOpportunities: LeadScoreCategory;
  if (!audit) {
    automationOpportunities = {
      name: 'Automation & Follow-Up Readiness',
      pointsAwarded: 0,
      maxPoints: weights.automationOpportunities,
      evidence: 'No follow-up readiness audit.',
      isUnknown: true,
    };
  } else {
    const followup = audit.categories.find(c => c.category === 'follow_up_readiness');
    const score = followup?.score ?? 50;
    const points = Math.round(((100 - score) / 100) * weights.automationOpportunities);

    automationOpportunities = {
      name: 'Automation & Follow-Up Readiness',
      pointsAwarded: points,
      maxPoints: weights.automationOpportunities,
      evidence: `Follow-up tech score: ${score}/100.`,
      isUnknown: false,
      notes: followup?.summary || 'Automated CRM / booking signals checked.',
    };
  }

  // 7. Business Capacity & Growth Signals (max default 10)
  let capacityGrowthSignals: LeadScoreCategory;
  const growthFacts = facts.filter(f => f.category === 'growth' || f.category === 'operations');
  const signals = business.growthSignals || [];
  if (signals.length > 0 || growthFacts.length > 0) {
    capacityGrowthSignals = {
      name: 'Business Capacity & Growth Signals',
      pointsAwarded: weights.capacityGrowthSignals,
      maxPoints: weights.capacityGrowthSignals,
      evidence: signals.length > 0 ? `Confirmed signals: ${signals.join('; ')}` : `${growthFacts.length} verified operational signals.`,
      isUnknown: false,
      notes: 'Demonstrates active investment budget and capacity to handle growth.',
    };
  } else if (business.teamSizeEstimate || business.fleetCapacity) {
    capacityGrowthSignals = {
      name: 'Business Capacity & Growth Signals',
      pointsAwarded: Math.round(weights.capacityGrowthSignals * 0.7),
      maxPoints: weights.capacityGrowthSignals,
      evidence: `Capacity indicators: Team ${business.teamSizeEstimate || 'N/A'}, Fleet ${business.fleetCapacity || 'N/A'}.`,
      isUnknown: false,
    };
  } else {
    capacityGrowthSignals = {
      name: 'Business Capacity & Growth Signals',
      pointsAwarded: 0,
      maxPoints: weights.capacityGrowthSignals,
      evidence: 'No publicly verified growth signals found yet.',
      isUnknown: true,
      notes: 'Unknown: Not penalized.',
    };
  }

  // 8. Verified Decision-Maker & Contact Route (max default 10)
  let decisionMakerRoute: LeadScoreCategory;
  const decisionMaker = contacts.find(c => c.isDecisionMaker && c.verificationStatus === 'verified');
  const anyVerified = contacts.find(c => c.verificationStatus === 'verified');

  if (decisionMaker) {
    decisionMakerRoute = {
      name: 'Decision-Maker & Contact Route',
      pointsAwarded: weights.decisionMakerRoute,
      maxPoints: weights.decisionMakerRoute,
      evidence: `Verified decision-maker: ${decisionMaker.fullName} (${decisionMaker.roleOrTitle}). Reachable direct route.`,
      isUnknown: false,
    };
  } else if (anyVerified) {
    decisionMakerRoute = {
      name: 'Decision-Maker & Contact Route',
      pointsAwarded: Math.round(weights.decisionMakerRoute * 0.6),
      maxPoints: weights.decisionMakerRoute,
      evidence: `Verified contact route: ${anyVerified.fullName} (${anyVerified.roleOrTitle}).`,
      isUnknown: false,
    };
  } else if (business.phone || business.email) {
    decisionMakerRoute = {
      name: 'Decision-Maker & Contact Route',
      pointsAwarded: Math.round(weights.decisionMakerRoute * 0.3),
      maxPoints: weights.decisionMakerRoute,
      evidence: `General business channels identified (${business.phone || business.email}). Owner not yet verified.`,
      isUnknown: false,
      notes: 'Unverified owner detail: Requires direct research before outreach.',
    };
  } else {
    decisionMakerRoute = {
      name: 'Decision-Maker & Contact Route',
      pointsAwarded: 0,
      maxPoints: weights.decisionMakerRoute,
      evidence: 'No verified contact routes found.',
      isUnknown: true,
    };
  }

  // Total Score Calculation
  const totalScore = Math.min(
    100,
    websiteIssues.pointsAwarded +
    seoWeaknesses.pointsAwarded +
    leadCaptureWeaknesses.pointsAwarded +
    socialContentWeaknesses.pointsAwarded +
    reputationOpportunities.pointsAwarded +
    automationOpportunities.pointsAwarded +
    capacityGrowthSignals.pointsAwarded +
    decisionMakerRoute.pointsAwarded
  );

  let band: ScoreBand = 'Hold';
  if (totalScore >= 80) band = 'A';
  else if (totalScore >= 60) band = 'B';
  else if (totalScore >= 40) band = 'C';
  else band = 'Hold';

  const prompt08Breakdown = {
    opportunityEvidence: { name: 'Business Opportunity Evidence', pointsAwarded: Math.min(25, Math.round(totalScore * 0.25)), maxPoints: 25, evidence: 'Evaluated against multi-source findings', isUnknown: false },
    websitePotential: websiteIssues,
    localSeoPotential: seoWeaknesses,
    capacityGrowthSignals,
    watechServiceFit: { name: 'Service Fit with Watech', pointsAwarded: 12, maxPoints: 15, evidence: 'Matches Watech commercial core services', isUnknown: false },
    decisionMakerAvailability: decisionMakerRoute,
    dataReliabilityRecency: { name: 'Data Reliability & Recency', pointsAwarded: 8, maxPoints: 10, evidence: 'Verified official public registry', isUnknown: false },
  };

  return {
    id: `score-${business.id}`,
    businessId: business.id,
    projectId: business.projectId,
    totalScore,
    band,
    breakdown: {
      websiteIssues,
      seoWeaknesses,
      leadCaptureWeaknesses,
      socialContentWeaknesses,
      reputationOpportunities,
      automationOpportunities,
      capacityGrowthSignals,
      decisionMakerRoute,
      opportunityEvidence: prompt08Breakdown.opportunityEvidence,
      websitePotential: websiteIssues,
      localSeoPotential: seoWeaknesses,
      watechServiceFit: prompt08Breakdown.watechServiceFit,
      decisionMakerAvailability: decisionMakerRoute,
      dataReliabilityRecency: prompt08Breakdown.dataReliabilityRecency,
    },
    prompt08Breakdown,
    positiveEvidence: ['Documented technical and local SEO opportunities identified.'],
    negativeEvidence: ['Conversion leaks and mobile viewport friction.'],
    unknownInformation: ['Marketing budget and revenue unverified without penalty.'],
    priorityReasons: [`Tier ${band} prioritization based on confirmed evidence.`],
    recommendedNextStep: 'Review complete dossier and prepare outreach.',
    researchCompleteness: audit ? (contacts.some(c => c.isDecisionMaker) ? 90 : 70) : 40,
    customWeightsApplied: weights as unknown as Record<string, number>,
    calculatedAt: new Date().toISOString(),
    rationale: `Prioritization Grade ${band} (${totalScore}/100) based on transparent criteria. Missing evidence was preserved as Unknown without penalty.`,
  };
}
