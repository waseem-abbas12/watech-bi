import type {
  Business,
  WebsiteAudit,
  LocalSeoProfile,
  Opportunity,
  Contact,
  SourceRecord,
  IntelligenceFact,
  LeadScore,
  LeadScoreCategory,
  ScoreBand,
  Prompt08ScoreBreakdown,
  BuyingReadinessSignal,
  DuplicateCandidate,
  LeadQueueStatus,
} from '@/types';

export interface Prompt08Weights {
  opportunityEvidence: number; // 25
  websitePotential: number; // 15
  localSeoPotential: number; // 15
  capacityGrowthSignals: number; // 10
  watechServiceFit: number; // 15
  decisionMakerAvailability: number; // 10
  dataReliabilityRecency: number; // 10
}

export const DEFAULT_PROMPT08_WEIGHTS: Prompt08Weights = {
  opportunityEvidence: 25,
  websitePotential: 15,
  localSeoPotential: 15,
  capacityGrowthSignals: 10,
  watechServiceFit: 15,
  decisionMakerAvailability: 10,
  dataReliabilityRecency: 10,
};

/**
 * Calculates the explainable 100-point Lead Qualification Score (Prompt 08).
 * Explicit Rules:
 * 1. Missing information is marked as Unknown without penalizing business quality.
 * 2. Separate unknown from negative findings.
 * 3. Never invent revenue, employee headcount, or marketing budgets.
 * 4. Do not assume willingness to buy based on a weak website or operational signals.
 */
export function calculateAdvancedLeadScore(
  business: Business,
  audit?: WebsiteAudit,
  localProfile?: LocalSeoProfile,
  opportunities: Opportunity[] = [],
  contacts: Contact[] = [],
  sources: SourceRecord[] = [],
  facts: IntelligenceFact[] = [],
  customWeights: Partial<Prompt08Weights> = {}
): LeadScore {
  const weights: Prompt08Weights = { ...DEFAULT_PROMPT08_WEIGHTS, ...customWeights };

  const positiveEvidence: string[] = [];
  const negativeEvidence: string[] = [];
  const unknownInformation: string[] = [];
  const priorityReasons: string[] = [];

  // ---------------------------------------------------------------------------
  // A. Business Opportunity Evidence (Max 25 pts)
  // ---------------------------------------------------------------------------
  let oppCat: LeadScoreCategory;
  if (opportunities.length === 0) {
    oppCat = {
      name: 'Business Opportunity Evidence',
      pointsAwarded: 0,
      maxPoints: weights.opportunityEvidence,
      evidence: 'No verified opportunities or compound initiatives generated yet.',
      isUnknown: true,
      notes: 'Unknown: Not penalized. Pending full multi-source opportunity analysis.',
    };
    unknownInformation.push('Multi-source opportunity detection has not been completed for this business.');
  } else {
    const compoundOpp = opportunities.find(o => o.isCompound);
    const immediateOpps = opportunities.filter(o => o.priorityBand === 'immediate_opportunity');
    const highOpps = opportunities.filter(o => o.priorityBand === 'high_priority');

    let pts = 8;
    if (compoundOpp) {
      pts += 10;
      positiveEvidence.push(`Compound opportunity identified: "${compoundOpp.identifiedProblem.slice(0, 75)}..."`);
    }
    pts += Math.min(7, immediateOpps.length * 3 + highOpps.length * 2);
    pts = Math.min(weights.opportunityEvidence, pts);

    oppCat = {
      name: 'Business Opportunity Evidence',
      pointsAwarded: pts,
      maxPoints: weights.opportunityEvidence,
      evidence: `${opportunities.length} opportunities cataloged (${immediateOpps.length} immediate, ${highOpps.length} high priority, ${compoundOpp ? '1 compound' : '0 compound'}).`,
      isUnknown: false,
      notes: compoundOpp ? 'High-ticket synthesized compound opportunity available.' : 'Specific functional deficiencies identified.',
    };
    positiveEvidence.push(`${opportunities.length} evidence-backed improvement opportunities identified.`);
  }

  // ---------------------------------------------------------------------------
  // B. Website & Conversion Improvement Potential (Max 15 pts)
  // ---------------------------------------------------------------------------
  let webCat: LeadScoreCategory;
  if (!audit) {
    webCat = {
      name: 'Website & Conversion Potential',
      pointsAwarded: 0,
      maxPoints: weights.websitePotential,
      evidence: 'No technical website audit recorded.',
      isUnknown: true,
      notes: 'Unknown: Not penalized. Score pending live technical website inspection.',
    };
    unknownInformation.push('Website technical health, mobile UX, and Core Web Vitals are uninspected.');
  } else {
    const defectRatio = Math.max(0, 100 - audit.totalScore) / 100;
    const pts = Math.min(weights.websitePotential, Math.round(defectRatio * weights.websitePotential));
    const criticalFindings = audit.findings.filter(f => f.severity === 'critical' || f.severity === 'high');

    webCat = {
      name: 'Website & Conversion Potential',
      pointsAwarded: pts,
      maxPoints: weights.websitePotential,
      evidence: `Website Health Score: ${audit.totalScore}/100 with ${criticalFindings.length} critical/high defects.`,
      isUnknown: false,
      notes: criticalFindings.length > 0 ? criticalFindings[0].observation : 'Audit established baseline credibility.',
    };

    if (audit.totalScore < 65) {
      negativeEvidence.push(`Low website health score (${audit.totalScore}/100): mobile usability friction and missing sticky dispatch.`);
    } else {
      positiveEvidence.push(`Website has solid baseline credibility (${audit.totalScore}/100).`);
    }
  }

  // ---------------------------------------------------------------------------
  // C. Local SEO & Visibility Opportunities (Max 15 pts)
  // ---------------------------------------------------------------------------
  let localCat: LeadScoreCategory;
  if (!localProfile && (!audit || !audit.categories.find(c => c.category === 'local_seo'))) {
    localCat = {
      name: 'Local SEO & Visibility Opportunities',
      pointsAwarded: 0,
      maxPoints: weights.localSeoPotential,
      evidence: 'No Local SEO or Google Business Profile inspection recorded.',
      isUnknown: true,
      notes: 'Unknown: Pending Local SEO probe and schema analysis.',
    };
    unknownInformation.push('Local 3-Pack presence, Schema.org markup, and GBP completeness uninspected.');
  } else {
    let pts = 5;
    if (localProfile) {
      if (!localProfile.hasLocalBusinessSchema) {
        pts += 4;
        negativeEvidence.push('Missing Schema.org LocalBusiness/HVACBusiness structured data on website.');
      }
      if (localProfile.napConsistencyStatus === 'mismatched') {
        pts += 3;
        negativeEvidence.push('NAP Phone/Address mismatch detected across Google profile and website.');
      }
      if (localProfile.reviewCount < 40) {
        pts += 3;
        negativeEvidence.push(`Review volume (${localProfile.reviewCount}) is below local commercial benchmark (40+).`);
      }
    } else if (audit) {
      const auditLocal = audit.categories.find(c => c.category === 'local_seo');
      if (auditLocal && auditLocal.score < 60) pts += 5;
    }
    pts = Math.min(weights.localSeoPotential, pts);

    localCat = {
      name: 'Local SEO & Visibility Opportunities',
      pointsAwarded: pts,
      maxPoints: weights.localSeoPotential,
      evidence: localProfile
        ? `Schema: ${localProfile.hasLocalBusinessSchema ? 'Present' : 'Missing'}, NAP: ${localProfile.napConsistencyStatus}, Reviews: ${localProfile.reviewCount}.`
        : 'Estimated from website audit local SEO category.',
      isUnknown: false,
    };
  }

  // ---------------------------------------------------------------------------
  // D. Business Capacity & Growth Indicators (Max 10 pts)
  // ---------------------------------------------------------------------------
  let capCat: LeadScoreCategory;
  const hiringFact = facts.find(f => f.category === 'growth' || f.claim.toLowerCase().includes('hiring'));
  const hasFleet = Boolean(business.fleetCapacity && business.fleetCapacity.trim().length > 0);
  const hasTeam = Boolean(business.teamSizeEstimate && business.teamSizeEstimate.trim().length > 0);

  if (!hasFleet && !hasTeam && !hiringFact) {
    capCat = {
      name: 'Business Capacity & Growth Indicators',
      pointsAwarded: 0,
      maxPoints: weights.capacityGrowthSignals,
      evidence: 'No public headcount, fleet, or hiring records verified.',
      isUnknown: true,
      notes: 'Unknown: Revenue and operational capacity are never assumed without public verification.',
    };
    unknownInformation.push('Operational scale, fleet capacity, and employee headcount are unverified.');
  } else {
    let pts = 4;
    if (hiringFact) {
      pts += 3;
      positiveEvidence.push(`Active commercial hiring verified: "${hiringFact.claim}".`);
    }
    if (hasFleet) {
      pts += 2;
      positiveEvidence.push(`Documented fleet capacity: ${business.fleetCapacity}.`);
    }
    if (hasTeam) {
      pts += 1;
      positiveEvidence.push(`Documented team size: ${business.teamSizeEstimate}.`);
    }
    pts = Math.min(weights.capacityGrowthSignals, pts);

    capCat = {
      name: 'Business Capacity & Growth Indicators',
      pointsAwarded: pts,
      maxPoints: weights.capacityGrowthSignals,
      evidence: `Fleet: ${business.fleetCapacity || 'Unverified'}, Team: ${business.teamSizeEstimate || 'Unverified'}, Hiring: ${hiringFact ? 'Active' : 'None detected'}.`,
      isUnknown: false,
      notes: 'Publicly observable operational capacity signals (not financial proof of willingness to buy).',
    };
  }

  // ---------------------------------------------------------------------------
  // E. Service Fit with Watech (Max 15 pts)
  // ---------------------------------------------------------------------------
  const distinctServices = new Set(opportunities.map(o => o.relevantWatechService));
  let fitPts = 0;
  if (distinctServices.size >= 4) {
    fitPts = 15;
  } else if (distinctServices.size >= 2) {
    fitPts = 11;
  } else if (distinctServices.size === 1) {
    fitPts = 6;
  } else {
    fitPts = 4;
  }
  fitPts = Math.min(weights.watechServiceFit, fitPts);

  const fitCat: LeadScoreCategory = {
    name: 'Service Fit with Watech',
    pointsAwarded: fitPts,
    maxPoints: weights.watechServiceFit,
    evidence: `${distinctServices.size} Watech service verticals matched: ${Array.from(distinctServices).slice(0, 3).join(', ') || 'General'}.`,
    isUnknown: false,
    notes: 'Direct match with Watech web development, local SEO, CRM, and conversion offerings.',
  };
  if (distinctServices.size >= 2) {
    positiveEvidence.push(`Strong multi-service alignment with Watech core offerings (${distinctServices.size} categories).`);
  }

  // ---------------------------------------------------------------------------
  // F. Decision-Maker Contact Availability (Max 10 pts)
  // ---------------------------------------------------------------------------
  let dmCat: LeadScoreCategory;
  const verifiedDm = contacts.find(c => c.isDecisionMaker && c.verificationStatus === 'verified');
  const unverifiedDm = contacts.find(c => c.isDecisionMaker && c.verificationStatus !== 'verified');
  const anyContact = contacts.find(c => Boolean(c.email || c.phone));

  if (!verifiedDm && !unverifiedDm && !anyContact) {
    dmCat = {
      name: 'Decision-Maker Contact Availability',
      pointsAwarded: 0,
      maxPoints: weights.decisionMakerAvailability,
      evidence: 'No decision-maker or verified contact records found.',
      isUnknown: true,
      notes: 'Unknown: Contact discovery pending. Route to Decision-Maker queue.',
    };
    unknownInformation.push('No direct decision-maker contact details or corporate officer filing attached.');
  } else if (verifiedDm) {
    dmCat = {
      name: 'Decision-Maker Contact Availability',
      pointsAwarded: weights.decisionMakerAvailability,
      maxPoints: weights.decisionMakerAvailability,
      evidence: `Verified Decision Maker: ${verifiedDm.fullName} (${verifiedDm.roleOrTitle}) with confirmed contact channels.`,
      isUnknown: false,
    };
    positiveEvidence.push(`Verified decision-maker identified: ${verifiedDm.fullName} (${verifiedDm.roleOrTitle}).`);
  } else if (unverifiedDm) {
    dmCat = {
      name: 'Decision-Maker Contact Availability',
      pointsAwarded: Math.round(weights.decisionMakerAvailability * 0.6),
      maxPoints: weights.decisionMakerAvailability,
      evidence: `Identified Decision Maker: ${unverifiedDm.fullName} (${unverifiedDm.roleOrTitle}) awaiting email verification.`,
      isUnknown: false,
    };
    unknownInformation.push(`Decision-maker ${unverifiedDm.fullName} email status is unverified.`);
  } else {
    dmCat = {
      name: 'Decision-Maker Contact Availability',
      pointsAwarded: Math.round(weights.decisionMakerAvailability * 0.3),
      maxPoints: weights.decisionMakerAvailability,
      evidence: `Generic contact available (${anyContact?.fullName || 'General Office'}).`,
      isUnknown: false,
    };
    unknownInformation.push('Only generic office contact available; executive decision-maker unverified.');
  }

  // ---------------------------------------------------------------------------
  // G. Data Reliability & Recency (Max 10 pts)
  // ---------------------------------------------------------------------------
  let relPts = 3;
  const officialWebSrc = sources.find(s => s.sourceType === 'official_website' && s.verificationStatus === 'verified');
  const registrySrc = sources.find(s => s.sourceType === 'public_registry' && s.verificationStatus === 'verified');
  if (officialWebSrc) relPts += 3;
  if (registrySrc) relPts += 2;
  if (facts.length >= 2) relPts += 2;
  relPts = Math.min(weights.dataReliabilityRecency, relPts);

  const relCat: LeadScoreCategory = {
    name: 'Data Reliability & Recency',
    pointsAwarded: relPts,
    maxPoints: weights.dataReliabilityRecency,
    evidence: `${sources.length} sources recorded (${officialWebSrc ? 'Official DOM' : ''}${registrySrc ? ', Corporate Registry' : ''}).`,
    isUnknown: false,
    notes: 'Strict data provenance with verifiable public registry and direct DOM inspection.',
  };

  // ---------------------------------------------------------------------------
  // Total Score & Grade Calculation
  // ---------------------------------------------------------------------------
  const totalScore = Math.min(
    100,
    oppCat.pointsAwarded +
    webCat.pointsAwarded +
    localCat.pointsAwarded +
    capCat.pointsAwarded +
    fitCat.pointsAwarded +
    dmCat.pointsAwarded +
    relCat.pointsAwarded
  );

  let band: ScoreBand = 'Hold';
  if (totalScore >= 80) {
    band = 'A';
    priorityReasons.push('High-priority Tier A: Substantial business opportunity with verified decision-maker and confirmed operational scale.');
  } else if (totalScore >= 60) {
    band = 'B';
    priorityReasons.push('Moderate-priority Tier B: Clear service opportunities identified; requires contact verification or website audit refinement.');
  } else if (totalScore >= 40) {
    band = 'C';
    priorityReasons.push('Low-priority Tier C: Moderate technical deficiencies with incomplete contact routing.');
  } else {
    band = 'Hold';
    priorityReasons.push('Hold: Significant unknown data or low opportunity alignment. Route to research queue before investing outreach time.');
  }

  // ---------------------------------------------------------------------------
  // Research Completeness Calculation (0 - 100%)
  // ---------------------------------------------------------------------------
  let completenessScore = 0;
  if (business.officialName && business.domain && business.fullAddress) completenessScore += 20; // Pillar 1: Identity
  if (audit) completenessScore += 20; // Pillar 2: Website Audit
  if (localProfile) completenessScore += 20; // Pillar 3: Local SEO
  if (facts.length > 0) completenessScore += 15; // Pillar 4: Intelligence Facts
  if (contacts.some(c => c.isDecisionMaker)) completenessScore += 15; // Pillar 5: Decision Maker
  if (sources.length > 0) completenessScore += 10; // Pillar 6: Verified Sources
  const researchCompleteness = Math.min(100, completenessScore);

  // Recommended Next Step
  let recommendedNextStep = 'Review complete dossier and prepare personalized outreach.';
  if (!audit) {
    recommendedNextStep = 'Execute live 10-category website audit to identify technical leaks.';
  } else if (!contacts.some(c => c.isDecisionMaker)) {
    recommendedNextStep = 'Research Texas Secretary of State corporate registry to identify verified owner/principal.';
  } else if (contacts.some(c => c.isDecisionMaker && c.verificationStatus !== 'verified')) {
    recommendedNextStep = 'Verify decision-maker email address via live DNS MX check.';
  } else if (opportunities.length === 0) {
    recommendedNextStep = 'Run multi-source opportunity aggregation engine.';
  } else if (business.queueStatus === 'research_next') {
    recommendedNextStep = 'Advance lead to decision-maker discovery queue.';
  }

  const prompt08Breakdown: Prompt08ScoreBreakdown = {
    opportunityEvidence: oppCat,
    websitePotential: webCat,
    localSeoPotential: localCat,
    capacityGrowthSignals: capCat,
    watechServiceFit: fitCat,
    decisionMakerAvailability: dmCat,
    dataReliabilityRecency: relCat,
  };

  return {
    id: `score-${business.id}`,
    businessId: business.id,
    projectId: business.projectId,
    totalScore,
    band,
    breakdown: {
      capacityGrowthSignals: capCat,
      opportunityEvidence: oppCat,
      websitePotential: webCat,
      localSeoPotential: localCat,
      watechServiceFit: fitCat,
      decisionMakerAvailability: dmCat,
      dataReliabilityRecency: relCat,
      websiteIssues: webCat,
      seoWeaknesses: localCat,
      leadCaptureWeaknesses: webCat,
      socialContentWeaknesses: fitCat,
      reputationOpportunities: localCat,
      automationOpportunities: oppCat,
      decisionMakerRoute: dmCat,
    },
    prompt08Breakdown,
    positiveEvidence,
    negativeEvidence,
    unknownInformation,
    priorityReasons,
    recommendedNextStep,
    researchCompleteness,
    customWeightsApplied: weights as unknown as Record<string, number>,
    calculatedAt: new Date().toISOString(),
    rationale: `Lead Grade ${band} (${totalScore}/100) with ${researchCompleteness}% research completeness. ${priorityReasons[0]}`,
  };
}

/**
 * Extracts publicly observable growth signals (Prompt 08 Requirement 5).
 * Explicit Rule: Do not claim buying intent based on these signals.
 */
export function extractBuyingReadinessSignals(
  business: Business,
  facts: IntelligenceFact[] = []
): BuyingReadinessSignal[] {
  const signals: BuyingReadinessSignal[] = [];

  // 1. Hiring activity
  const hiringFact = facts.find(f => f.category === 'growth' || f.claim.toLowerCase().includes('hiring') || f.claim.toLowerCase().includes('technician'));
  if (hiringFact) {
    signals.push({
      id: `sig-hiring-${business.id}`,
      type: 'hiring_activity',
      title: 'Active Technical Recruitment',
      description: hiringFact.claim,
      sourceUrl: hiringFact.sourceUrl,
      sourceType: hiringFact.sourceType,
      dateObserved: hiringFact.dateCollected,
      isPubliclyObservable: true,
    });
  }

  // 2. Fleet & Equipment Expansion
  if (business.fleetCapacity && business.fleetCapacity.includes('vehicle')) {
    signals.push({
      id: `sig-fleet-${business.id}`,
      type: 'recent_expansion',
      title: 'Operating Service Fleet',
      description: `Disclosed capacity of ${business.fleetCapacity} active in regional service corridors.`,
      dateObserved: business.updatedAt,
      isPubliclyObservable: true,
    });
  }

  // 3. New Certifications or Services
  const certFact = facts.find(f => f.claim.toLowerCase().includes('certification') || f.claim.toLowerCase().includes('niagara') || f.claim.toLowerCase().includes('automation'));
  if (certFact) {
    signals.push({
      id: `sig-cert-${business.id}`,
      type: 'new_services',
      title: 'Commercial Technical Certification',
      description: certFact.claim,
      sourceUrl: certFact.sourceUrl,
      sourceType: certFact.sourceType,
      dateObserved: certFact.dateCollected,
      isPubliclyObservable: true,
    });
  }

  // 4. Multiple Locations / Geographic Reach
  if (business.serviceArea && business.serviceArea.includes(',')) {
    signals.push({
      id: `sig-loc-${business.id}`,
      type: 'new_locations',
      title: 'Multi-Corridor Service Coverage',
      description: `Covering regional municipal markets: ${business.serviceArea}.`,
      dateObserved: business.updatedAt,
      isPubliclyObservable: true,
    });
  }

  return signals;
}

/**
 * Detects potential duplicate business records (Prompt 08 Requirement 8).
 * Checks normalized domain, business name, phone number, and address.
 */
export function detectDuplicates(businesses: Business[]): DuplicateCandidate[] {
  const candidates: DuplicateCandidate[] = [];

  const cleanDomain = (d?: string) =>
    (d || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').trim();

  const cleanName = (n?: string) =>
    (n || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/(llc|inc|corp|co|hvac|services)$/g, '').trim();

  const cleanPhone = (p?: string) =>
    (p || '').replace(/[^0-9]/g, '').slice(-10);

  const cleanAddress = (a?: string) =>
    (a || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();

  for (let i = 0; i < businesses.length; i++) {
    for (let j = i + 1; j < businesses.length; j++) {
      const b1 = businesses[i];
      const b2 = businesses[j];

      const matchReasons: ('domain' | 'name' | 'phone' | 'address')[] = [];

      const d1 = cleanDomain(b1.domain || b1.websiteUrl);
      const d2 = cleanDomain(b2.domain || b2.websiteUrl);
      if (d1 && d2 && d1 === d2) {
        matchReasons.push('domain');
      }

      const p1 = cleanPhone(b1.phone);
      const p2 = cleanPhone(b2.phone);
      if (p1 && p2 && p1.length === 10 && p1 === p2) {
        matchReasons.push('phone');
      }

      const n1 = cleanName(b1.brandName || b1.officialName);
      const n2 = cleanName(b2.brandName || b2.officialName);
      if (n1 && n2 && (n1 === n2 || (n1.length > 5 && n2.length > 5 && (n1.includes(n2) || n2.includes(n1))))) {
        matchReasons.push('name');
      }

      const a1 = cleanAddress(b1.fullAddress);
      const a2 = cleanAddress(b2.fullAddress);
      if (a1 && a2 && a1.length > 10 && a1 === a2) {
        matchReasons.push('address');
      }

      if (matchReasons.length > 0) {
        let confidence = 0.5;
        if (matchReasons.includes('domain')) confidence = 0.98;
        else if (matchReasons.includes('phone') && matchReasons.includes('name')) confidence = 0.95;
        else if (matchReasons.includes('phone')) confidence = 0.9;
        else if (matchReasons.includes('address') && matchReasons.includes('name')) confidence = 0.88;
        else if (matchReasons.includes('name')) confidence = 0.72;

        candidates.push({
          business: b2,
          duplicateOf: b1,
          matchReasons,
          confidence,
        });
      }
    }
  }

  return candidates;
}

/**
 * Merges a duplicate business into the primary business while preserving source history.
 */
export function mergeBusinessRecords(primary: Business, duplicate: Business): Business {
  const mergedIds = Array.from(new Set([...(primary.mergedIds || []), duplicate.id]));
  const marketingChannels = Array.from(new Set([...(primary.marketingChannels || []), ...(duplicate.marketingChannels || [])]));
  const growthSignals = Array.from(new Set([...(primary.growthSignals || []), ...(duplicate.growthSignals || [])]));

  return {
    ...primary,
    brandName: primary.brandName || duplicate.brandName,
    phone: primary.phone || duplicate.phone,
    email: primary.email || duplicate.email,
    fullAddress: primary.fullAddress || duplicate.fullAddress,
    city: primary.city || duplicate.city,
    state: primary.state || duplicate.state,
    postalCode: primary.postalCode || duplicate.postalCode,
    foundingYear: primary.foundingYear || duplicate.foundingYear,
    teamSizeEstimate: primary.teamSizeEstimate || duplicate.teamSizeEstimate,
    fleetCapacity: primary.fleetCapacity || duplicate.fleetCapacity,
    ownerManagerName: primary.ownerManagerName || duplicate.ownerManagerName,
    ownerManagerRole: primary.ownerManagerRole || duplicate.ownerManagerRole,
    ownerVerificationStatus: primary.ownerVerificationStatus === 'verified' ? 'verified' : duplicate.ownerVerificationStatus,
    pricingNotes: primary.pricingNotes || duplicate.pricingNotes,
    reviewRating: primary.reviewRating || duplicate.reviewRating,
    reviewCount: Math.max(primary.reviewCount || 0, duplicate.reviewCount || 0),
    marketingChannels,
    growthSignals,
    mergedIds,
    updatedAt: new Date().toISOString(),
  };
}
