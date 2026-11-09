import type {
  ResearchProject,
  Business,
  WebsiteAudit,
  LocalSeoProfile,
  LeadScore,
  Opportunity,
  Contact,
  MarketAggregatedMetrics,
  MarketScoreWeights,
  DEFAULT_MARKET_SCORE_WEIGHTS,
  MarketRecommendation,
  CrossMarketBusinessComparison,
} from '@/types';
import { repository } from '@/lib/db/repository';

/**
 * Aggregates all recorded market intelligence for a specific Research Project/Territory
 */
export async function aggregateMarketMetrics(
  project: ResearchProject
): Promise<MarketAggregatedMetrics> {
  const [
    businesses,
    audits,
    localSeos,
    contacts,
    opportunities,
    scores,
  ] = await Promise.all([
    repository.getBusinesses(project.id),
    repository.getAudits(project.id),
    repository.getLocalSeoProfiles(project.id),
    repository.getContacts(undefined, project.id),
    repository.getOpportunities(undefined, project.id),
    repository.getScores(project.id),
  ]);

  const totalDiscovered = businesses.length;
  const withWebsiteCount = businesses.filter(b => b.hasWebsite || (b.websiteUrl && b.websiteUrl.length > 5)).length;
  const withoutWebsiteCount = totalDiscovered - withWebsiteCount;

  const auditedCount = audits.length;
  const auditCoveragePercent = totalDiscovered > 0 ? Math.round((auditedCount / totalDiscovered) * 100) : 0;
  const avgAuditScore = auditedCount > 0 ? Math.round(audits.reduce((acc, a) => acc + a.totalScore, 0) / auditedCount) : 0;
  const sslCoveragePercent = auditedCount > 0 ? Math.round((audits.filter(a => a.hasSsl).length / auditedCount) * 100) : 0;

  const localSeoCount = localSeos.length;
  const avgGbpRating = localSeoCount > 0 ? Number((localSeos.reduce((acc, l) => acc + (l.averageRating || 0), 0) / localSeoCount).toFixed(1)) : 0;
  const avgReviewCount = localSeoCount > 0 ? Math.round(localSeos.reduce((acc, l) => acc + (l.reviewCount || 0), 0) / localSeoCount) : 0;
  const gbpClaimedPercent = localSeoCount > 0 ? Math.round((localSeos.filter(l => Boolean(l.googleBusinessProfileUrl)).length / localSeoCount) * 100) : 0;

  const contactsDiscoveredCount = contacts.length;
  const decisionMakersCount = contacts.filter(c => c.isDecisionMaker).length;
  const businessesWithContact = businesses.filter(b => contacts.some(c => c.businessId === b.id)).length;
  const contactCoveragePercent = totalDiscovered > 0 ? Math.round((businessesWithContact / totalDiscovered) * 100) : 0;

  const totalOpportunitiesCount = opportunities.length;
  const highOpportunityLeadsCount = opportunities.filter(o => o.impact === 'high').length;
  const qualifiedBusinessesCount = scores.filter(s => s.band === 'A' || s.band === 'B').length;
  const avgLeadScore = scores.length > 0 ? Math.round(scores.reduce((acc, s) => acc + s.totalScore, 0) / scores.length) : 0;

  // Track data gaps transparently
  const dataGaps: string[] = [];
  if (totalDiscovered === 0) dataGaps.push('Zero businesses discovered in this market.');
  if (auditedCount < totalDiscovered * 0.5) dataGaps.push(`Low audit coverage (${auditCoveragePercent}% of businesses audited).`);
  if (localSeoCount === 0) dataGaps.push('No Google Business Profile / Local SEO inspections completed.');
  if (contactsDiscoveredCount === 0) dataGaps.push('No direct stakeholder contacts or email routes verified.');
  if (scores.length === 0) dataGaps.push('Lead qualification scoring matrix has not been computed.');

  // Research coverage score (0-100)
  const auditFactor = Math.min(100, auditCoveragePercent);
  const contactFactor = Math.min(100, contactCoveragePercent);
  const scoringFactor = totalDiscovered > 0 ? Math.min(100, Math.round((scores.length / totalDiscovered) * 100)) : 0;
  const researchCoverageScore = totalDiscovered > 0
    ? Math.round(auditFactor * 0.4 + contactFactor * 0.35 + scoringFactor * 0.25)
    : 0;

  // Initial calculation with default weights
  const initialMetrics: MarketAggregatedMetrics = {
    projectId: project.id,
    marketName: project.name,
    country: project.country,
    stateRegion: project.stateRegion,
    cityArea: project.cityArea,
    industry: project.industryNiche,
    researchDepth: project.researchDepth,
    targetServices: project.targetServices,
    totalDiscovered,
    withWebsiteCount,
    withoutWebsiteCount,
    auditedCount,
    auditCoveragePercent,
    avgAuditScore,
    sslCoveragePercent,
    localSeoCount,
    avgGbpRating,
    avgReviewCount,
    gbpClaimedPercent,
    contactsDiscoveredCount,
    decisionMakersCount,
    contactCoveragePercent,
    totalOpportunitiesCount,
    qualifiedBusinessesCount,
    highOpportunityLeadsCount,
    avgLeadScore,
    marketAttractivenessScore: 50,
    dimensionScores: {
      opportunityDensity: 50,
      digitalPresenceGaps: 50,
      localSeoOpportunity: 50,
      websiteImprovementOpportunity: 50,
      competitiveIntensity: 50,
      decisionMakerAccessibility: 50,
      researchCoverage: 50,
      leadQualificationPotential: 50,
    },
    researchCoverageScore,
    dataGaps,
    recommendedNextAction: totalDiscovered === 0 ? 'Run business discovery scraper' : 'Execute technical website audits',
    lastUpdated: project.updatedAt || new Date().toISOString(),
  };

  const { totalScore, dimensionScores } = calculateMarketAttractiveness(initialMetrics, {
    opportunityDensity: 15,
    digitalPresenceGaps: 15,
    localSeoOpportunity: 15,
    websiteImprovementOpportunity: 15,
    competitiveIntensity: 10,
    decisionMakerAccessibility: 10,
    researchCoverage: 10,
    leadQualificationPotential: 10,
  });

  initialMetrics.marketAttractivenessScore = totalScore;
  initialMetrics.dimensionScores = dimensionScores;

  // Determine next action
  if (auditCoveragePercent < 40) {
    initialMetrics.recommendedNextAction = 'Accelerate automated website audits to unmask technical deficits';
  } else if (contactCoveragePercent < 30) {
    initialMetrics.recommendedNextAction = 'Initiate decision-maker discovery to verify direct outreach routes';
  } else if (qualifiedBusinessesCount > 5) {
    initialMetrics.recommendedNextAction = 'Export high-tier leads and launch personalized CRM outreach sequence';
  } else {
    initialMetrics.recommendedNextAction = 'Deepen business discovery to expand market candidate pipeline';
  }

  return initialMetrics;
}

/**
 * Calculates an explainable 100-point Market Attractiveness Score based on 8 explicit dimensions
 */
export function calculateMarketAttractiveness(
  m: MarketAggregatedMetrics,
  weights: MarketScoreWeights
): { totalScore: number; dimensionScores: Record<keyof MarketScoreWeights, number> } {
  // 1. Opportunity Density (0 - 100)
  // Higher ratio of opportunities per business indicates fertile ground for agency services
  const oppRatio = m.totalDiscovered > 0 ? (m.totalOpportunitiesCount / m.totalDiscovered) : 0;
  const opportunityDensity = Math.min(100, Math.round(oppRatio * 35));

  // 2. Digital Presence Gaps (0 - 100)
  // High when businesses lack websites or have missing SSL
  const noWebRatio = m.totalDiscovered > 0 ? (m.withoutWebsiteCount / m.totalDiscovered) * 100 : 0;
  const noSslRatio = 100 - m.sslCoveragePercent;
  const digitalPresenceGaps = Math.min(100, Math.round(noWebRatio * 0.6 + noSslRatio * 0.4));

  // 3. Local SEO Opportunity (0 - 100)
  // High when review counts are low (<25) or GBP is unlinked
  const reviewDeficit = Math.max(0, 100 - Math.min(100, m.avgReviewCount * 2));
  const unlinkedGbpDeficit = 100 - m.gbpClaimedPercent;
  const localSeoOpportunity = Math.round(reviewDeficit * 0.6 + unlinkedGbpDeficit * 0.4);

  // 4. Website Improvement Opportunity (0 - 100)
  // Higher when average audit score is low (<65), indicating urgent need for redesign
  const websiteImprovementOpportunity = m.auditedCount > 0 ? Math.max(0, 100 - m.avgAuditScore) : 50;

  // 5. Competitive Intensity (0 - 100)
  // Moderately dense markets with 15-60 operators offer the highest client acquisition viability
  let competitiveIntensity = 50;
  if (m.totalDiscovered >= 15 && m.totalDiscovered <= 60) {
    competitiveIntensity = 85;
  } else if (m.totalDiscovered > 60) {
    competitiveIntensity = 65; // Highly saturated
  } else if (m.totalDiscovered > 0) {
    competitiveIntensity = 40; // Sparse market
  } else {
    competitiveIntensity = 0;
  }

  // 6. Decision-Maker Accessibility (0 - 100)
  const decisionMakerAccessibility = Math.min(100, Math.round(m.contactCoveragePercent * 0.6 + (m.decisionMakersCount > 0 ? 40 : 0)));

  // 7. Research Coverage (0 - 100)
  const researchCoverage = m.researchCoverageScore;

  // 8. Lead Qualification Potential (0 - 100)
  const qualRatio = m.totalDiscovered > 0 ? (m.qualifiedBusinessesCount / m.totalDiscovered) * 100 : 0;
  const leadQualificationPotential = Math.min(100, Math.round(qualRatio * 1.5 + (m.avgLeadScore * 0.3)));

  const dimensionScores: Record<keyof MarketScoreWeights, number> = {
    opportunityDensity,
    digitalPresenceGaps,
    localSeoOpportunity,
    websiteImprovementOpportunity,
    competitiveIntensity,
    decisionMakerAccessibility,
    researchCoverage,
    leadQualificationPotential,
  };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 100;

  let weightedSum = 0;
  for (const key of Object.keys(weights) as (keyof MarketScoreWeights)[]) {
    weightedSum += (dimensionScores[key] * (weights[key] || 0));
  }

  const totalScore = Math.min(100, Math.max(0, Math.round(weightedSum / totalWeight)));

  return { totalScore, dimensionScores };
}

/**
 * Produces evidence-backed strategic recommendations comparing multiple markets
 */
export function generateMarketRecommendations(
  markets: MarketAggregatedMetrics[]
): MarketRecommendation[] {
  if (markets.length === 0) return [];

  const recommendations: MarketRecommendation[] = [];

  // 1. Highest Overall Attractiveness
  const topAttractiveness = [...markets].sort((a, b) => b.marketAttractivenessScore - a.marketAttractivenessScore)[0];
  if (topAttractiveness && topAttractiveness.marketAttractivenessScore > 0) {
    recommendations.push({
      type: 'next_research',
      title: 'Prime Expansion Target: Highest Overall Attractiveness',
      marketName: topAttractiveness.marketName,
      projectId: topAttractiveness.projectId,
      evidence: `${topAttractiveness.marketName} achieved the top market attractiveness score (${topAttractiveness.marketAttractivenessScore}/100) with ${topAttractiveness.totalOpportunitiesCount} detected service opportunities and ${topAttractiveness.qualifiedBusinessesCount} Tier A/B leads.`,
      dataLimitations: topAttractiveness.dataGaps.length > 0 ? topAttractiveness.dataGaps.join('; ') : 'High confidence: robust research coverage.',
      suggestedAction: `Focus immediate prospecting on ${topAttractiveness.marketName}. Begin outreach to the ${topAttractiveness.decisionMakersCount} verified decision makers.`,
    });
  }

  // 2. Strongest Digital Deficit / Web Modernization Opportunity
  const topDigitalGap = [...markets].sort((a, b) => b.dimensionScores.digitalPresenceGaps - a.dimensionScores.digitalPresenceGaps)[0];
  if (topDigitalGap && topDigitalGap.dimensionScores.digitalPresenceGaps > 40) {
    recommendations.push({
      type: 'strongest_digital_gap',
      title: 'Strongest Web Modernization Pitch Angle',
      marketName: topDigitalGap.marketName,
      projectId: topDigitalGap.projectId,
      evidence: `Operators in ${topDigitalGap.marketName} exhibit an average audit score of ${topDigitalGap.avgAuditScore}/100 and ${topDigitalGap.withoutWebsiteCount} businesses completely lack a public website.`,
      dataLimitations: `Audit coverage in this market is ${topDigitalGap.auditCoveragePercent}%. Unaudited domains may alter final average.`,
      suggestedAction: `Pitch high-impact website redesign and mobile optimization packages targeting the digital deficit in this region.`,
    });
  }

  // 3. Highest Concentration of Qualified Decision-Makers
  const topQualified = [...markets].sort((a, b) => b.qualifiedBusinessesCount - a.qualifiedBusinessesCount)[0];
  if (topQualified && topQualified.qualifiedBusinessesCount > 0) {
    recommendations.push({
      type: 'highest_qualified',
      title: 'Highest Commercial Ready Lead Density',
      marketName: topQualified.marketName,
      projectId: topQualified.projectId,
      evidence: `Discovered ${topQualified.qualifiedBusinessesCount} Tier A/B prospects with average lead qualification score of ${topQualified.avgLeadScore}/100.`,
      dataLimitations: `Verified contact availability stands at ${topQualified.contactCoveragePercent}%.`,
      suggestedAction: `Deploy custom outreach sequences focused on identified business opportunities.`,
    });
  }

  // 4. Market Requiring Research Depth Completion
  const lowestCoverage = [...markets].filter(m => m.totalDiscovered > 0).sort((a, b) => a.researchCoverageScore - b.researchCoverageScore)[0];
  if (lowestCoverage && lowestCoverage.researchCoverageScore < 60) {
    recommendations.push({
      type: 'needs_more_data',
      title: 'Action Required: Incomplete Research Coverage',
      marketName: lowestCoverage.marketName,
      projectId: lowestCoverage.projectId,
      evidence: `Research coverage in ${lowestCoverage.marketName} is currently ${lowestCoverage.researchCoverageScore}%. Only ${lowestCoverage.auditedCount} of ${lowestCoverage.totalDiscovered} businesses have been audited.`,
      dataLimitations: 'Data sample is too shallow to draw definitive commercial conclusions.',
      suggestedAction: `Execute automated batch website audits and decision-maker contact discovery before committing outreach resources.`,
    });
  }

  return recommendations;
}

/**
 * Conducts a side-by-side diagnostic comparison between two businesses from different markets
 */
export function compareBusinessesCrossMarket(
  businessA: Business,
  businessB: Business,
  marketA: string,
  marketB: string,
  auditA?: WebsiteAudit,
  auditB?: WebsiteAudit,
  scoreA?: LeadScore,
  scoreB?: LeadScore,
  localA?: LocalSeoProfile,
  localB?: LocalSeoProfile,
  contactsA: Contact[] = [],
  contactsB: Contact[] = []
): CrossMarketBusinessComparison {
  const points: CrossMarketBusinessComparison['comparisonPoints'] = [];

  // 1. Technical Web Quality
  const aScore = auditA?.totalScore ?? null;
  const bScore = auditB?.totalScore ?? null;
  if (aScore !== null && bScore !== null) {
    points.push({
      dimension: 'Website Quality (Audit Score)',
      valueA: `${aScore}/100 (${auditA?.grade})`,
      valueB: `${bScore}/100 (${auditB?.grade})`,
      advantage: aScore > bScore ? 'business_a' : aScore < bScore ? 'business_b' : 'tie',
      rationale: aScore > bScore
        ? `${businessA.officialName} maintains superior technical performance and Web Vitals.`
        : aScore < bScore
        ? `${businessB.officialName} exhibits higher technical health, presenting fewer foundational flaws.`
        : 'Equal technical website rating.',
    });
  } else {
    points.push({
      dimension: 'Website Quality (Audit Score)',
      valueA: aScore !== null ? `${aScore}/100` : 'Pending Audit',
      valueB: bScore !== null ? `${bScore}/100` : 'Pending Audit',
      advantage: 'insufficient_data',
      rationale: 'One or both businesses lack a full technical audit. Missing data is not proof of poor quality.',
    });
  }

  // 2. Local SEO & GBP Presence
  const revA = localA?.reviewCount ?? businessA.reviewCount ?? null;
  const revB = localB?.reviewCount ?? businessB.reviewCount ?? null;
  points.push({
    dimension: 'Google Review Volume',
    valueA: revA !== null ? `${revA} reviews (${localA?.averageRating || businessA.reviewRating || 'N/A'} ★)` : 'Unrecorded',
    valueB: revB !== null ? `${revB} reviews (${localB?.averageRating || businessB.reviewRating || 'N/A'} ★)` : 'Unrecorded',
    advantage: (revA || 0) > (revB || 0) ? 'business_a' : (revA || 0) < (revB || 0) ? 'business_b' : 'tie',
    rationale: (revA || 0) > (revB || 0)
      ? `${businessA.officialName} has built greater public review trust in ${marketA}.`
      : (revA || 0) < (revB || 0)
      ? `${businessB.officialName} has superior public review volume in ${marketB}.`
      : 'Comparable review footprint.',
  });

  // 3. Decision Maker Accessibility
  const dmA = contactsA.filter(c => c.isDecisionMaker).length;
  const dmB = contactsB.filter(c => c.isDecisionMaker).length;
  points.push({
    dimension: 'Verified Decision-Makers',
    valueA: `${dmA} identified`,
    valueB: `${dmB} identified`,
    advantage: dmA > dmB ? 'business_a' : dmA < dmB ? 'business_b' : 'tie',
    rationale: dmA > dmB
      ? `Direct executive contact route verified for ${businessA.officialName}.`
      : dmA < dmB
      ? `Direct executive contact route verified for ${businessB.officialName}.`
      : 'Similar contact discoverability status.',
  });

  // 4. Lead Score Band
  const leadTotalA = scoreA?.totalScore ?? 0;
  const leadTotalB = scoreB?.totalScore ?? 0;
  points.push({
    dimension: 'Watech Lead Qualification Score',
    valueA: scoreA ? `Tier ${scoreA.band.toUpperCase()} (${leadTotalA}/100)` : 'Unscored',
    valueB: scoreB ? `Tier ${scoreB.band.toUpperCase()} (${leadTotalB}/100)` : 'Unscored',
    advantage: leadTotalA > leadTotalB ? 'business_a' : leadTotalA < leadTotalB ? 'business_b' : 'tie',
    rationale: leadTotalA > leadTotalB
      ? `${businessA.officialName} presents higher overall commercial agency fit and addressable deficit.`
      : leadTotalA < leadTotalB
      ? `${businessB.officialName} presents higher overall commercial agency fit and addressable deficit.`
      : 'Equal qualification score.',
  });

  const verdict = leadTotalA > leadTotalB
    ? `${businessA.officialName} (${marketA}) ranks higher primarily due to clearer service gap evidence and verified stakeholder routes.`
    : leadTotalB > leadTotalA
    ? `${businessB.officialName} (${marketB}) ranks higher primarily due to clearer service gap evidence and verified stakeholder routes.`
    : 'Both businesses represent comparable prospect profiles within their respective regional markets.';

  return {
    businessA,
    businessB,
    marketA,
    marketB,
    scoreA: leadTotalA,
    scoreB: leadTotalB,
    auditScoreA: aScore ?? undefined,
    auditScoreB: bScore ?? undefined,
    reviewCountA: revA ?? undefined,
    reviewCountB: revB ?? undefined,
    comparisonPoints: points,
    verdict,
  };
}
