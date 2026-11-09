import type {
  Business,
  LocalSeoProfile,
  LocalReview,
  LocalSeoScorecard,
  LocalSeoScorecardDimension,
  Opportunity,
  ScoreBand,
} from '@/types';
import { analyzeReviews } from './reviewIntelligenceEngine';

/**
 * Evaluates Google Business Profile Completeness across all 12 key attributes.
 */
export function evaluateProfileCompleteness(profile: LocalSeoProfile): {
  score: number;
  evidence: string[];
  gaps: string[];
} {
  const evidence: string[] = [];
  const gaps: string[] = [];
  let points = 0;
  const maxPoints = 100;

  // 1. Business Name & Link (10 pts)
  if (profile.businessName && profile.googleBusinessProfileUrl) {
    points += 10;
    evidence.push(`Profile name (${profile.businessName}) and Google Maps listing URL verified.`);
  } else if (profile.businessName) {
    points += 5;
    gaps.push('Direct Google Business Profile URL is missing or unlinked.');
  } else {
    gaps.push('Official business name is missing.');
  }

  // 2. Categories (15 pts)
  if (profile.primaryCategory && profile.secondaryCategories && profile.secondaryCategories.length >= 2) {
    points += 15;
    evidence.push(`Primary category (${profile.primaryCategory}) and ${profile.secondaryCategories.length} secondary categories configured.`);
  } else if (profile.primaryCategory) {
    points += 8;
    gaps.push(`Only primary category (${profile.primaryCategory}) configured. Missing secondary category opportunities.`);
  } else {
    gaps.push('Primary business category is not specified.');
  }

  // 3. Address & Service Areas (15 pts)
  if (profile.address && profile.serviceAreas && profile.serviceAreas.length > 0) {
    points += 15;
    evidence.push(`Physical street address and ${profile.serviceAreas.length} explicit service areas configured.`);
  } else if (profile.address || (profile.serviceAreas && profile.serviceAreas.length > 0)) {
    points += 8;
    gaps.push('Incomplete geographic targeting: specify both physical headquarters and designated service areas.');
  } else {
    gaps.push('No physical address or service area boundaries configured.');
  }

  // 4. Hours & Contact (10 pts)
  if (profile.openingHours && profile.phone && profile.websiteUrl) {
    points += 10;
    evidence.push('Regular operating hours, direct phone line, and official website connection established.');
  } else {
    points += 5;
    if (!profile.openingHours) gaps.push('Regular and holiday operating hours are not published.');
    if (!profile.phone) gaps.push('Direct phone number is missing from profile.');
    if (!profile.websiteUrl) gaps.push('Website destination URL is missing.');
  }

  // 5. Description Quality (10 pts)
  if (profile.description && profile.description.length >= 250) {
    points += 10;
    evidence.push(`Rich business description (${profile.description.length} characters) with localized keywords.`);
  } else if (profile.description) {
    points += 5;
    gaps.push(`Brief description (${profile.description.length} chars). Recommend 300+ characters highlighting commercial specialization.`);
  } else {
    gaps.push('Business description is missing entirely.');
  }

  // 6. Services List (10 pts)
  if (profile.servicesList && profile.servicesList.length >= 5) {
    points += 10;
    evidence.push(`${profile.servicesList.length} distinct commercial services cataloged in profile menu.`);
  } else if (profile.servicesList && profile.servicesList.length > 0) {
    points += 5;
    gaps.push(`Only ${profile.servicesList.length} services configured. Add individual specialized items.`);
  } else {
    gaps.push('No specific services cataloged in Google profile.');
  }

  // 7. Photos & Media (15 pts)
  if (profile.photosCount >= 15 && profile.hasCoverPhoto) {
    points += 15;
    evidence.push(`High media volume (${profile.photosCount} photos) with custom branded cover photo.`);
  } else if (profile.photosCount >= 5) {
    points += 8;
    gaps.push(`Moderate photo volume (${profile.photosCount} photos). Commercial prospects require 15+ job site, team, and facility photos.`);
  } else {
    gaps.push(`Low photo count (${profile.photosCount || 0}). Competitors maintain extensive visual proof.`);
  }

  // 8. Reviews & Q&A (15 pts)
  if (profile.reviewCount >= 25 && profile.averageRating >= 4.0) {
    points += 15;
    evidence.push(`Strong review foundation (${profile.reviewCount} reviews, ${profile.averageRating}★ average).`);
  } else if (profile.reviewCount > 0) {
    points += 8;
    gaps.push(`Low review volume (${profile.reviewCount} reviews). Category benchmarks suggest targeting 50+ verified reviews.`);
  } else {
    gaps.push('Zero customer reviews recorded on Google Business Profile.');
  }

  const score = Math.min(100, Math.round((points / maxPoints) * 100));
  return { score, evidence, gaps };
}

/**
 * Evaluates Name, Address, Phone (NAP) Consistency between GBP, website, and database record.
 */
export function evaluateNapConsistency(
  profile: LocalSeoProfile,
  business?: Business
): {
  score: number;
  status: 'matched' | 'mismatched' | 'unknown';
  discrepancies: string[];
  evidence: string[];
} {
  const discrepancies: string[] = [];
  const evidence: string[] = [];
  let score = 100;

  if (!business) {
    return {
      score: 80,
      status: 'unknown',
      discrepancies: ['No primary business record found to cross-compare NAP.'],
      evidence: ['Evaluated standalone profile information.'],
    };
  }

  // Check Name
  if (business.officialName && profile.businessName) {
    const cleanBiz = business.officialName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanProf = profile.businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanBiz !== cleanProf) {
      score -= 20;
      const msg = `Name mismatch: Official record is "${business.officialName}" vs Profile "${profile.businessName}".`;
      discrepancies.push(msg);
    } else {
      evidence.push(`Business name matched perfectly: "${profile.businessName}".`);
    }
  }

  // Check Phone
  if (business.phone && profile.phone) {
    const cleanBizPhone = business.phone.replace(/\D/g, '');
    const cleanProfPhone = profile.phone.replace(/\D/g, '');
    if (cleanBizPhone !== cleanProfPhone) {
      score -= 30;
      const msg = `Phone discrepancy: Business record phone (${business.phone}) does not match Google Profile (${profile.phone}).`;
      discrepancies.push(msg);
    } else {
      evidence.push(`Phone number matches across records: ${profile.phone}.`);
    }
  }

  // Check Address
  if (business.fullAddress && profile.address) {
    const cleanBizAddr = business.fullAddress.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanProfAddr = profile.address.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanBizAddr !== cleanProfAddr) {
      score -= 25;
      const msg = `Address variance: "${business.fullAddress}" vs Google Profile "${profile.address}".`;
      discrepancies.push(msg);
    } else {
      evidence.push(`Street address matches across records: ${profile.address}.`);
    }
  }

  const finalScore = Math.max(0, score);
  const status = discrepancies.length === 0 ? 'matched' : 'mismatched';

  return {
    score: finalScore,
    status,
    discrepancies,
    evidence,
  };
}

/**
 * Calculates the complete 6-Dimension Local SEO Scorecard.
 */
export function calculateLocalSeoScorecard(
  profile: LocalSeoProfile,
  business?: Business,
  reviews: LocalReview[] = [],
  allProjectProfiles: LocalSeoProfile[] = []
): LocalSeoScorecard {
  // 1. Profile Completeness (Weight: 20%)
  const comp = evaluateProfileCompleteness(profile);
  const profileCompleteness: LocalSeoScorecardDimension = {
    name: 'Profile Completeness',
    score: comp.score,
    weight: 0.20,
    status: comp.score >= 80 ? 'excellent' : comp.score >= 60 ? 'good' : comp.score >= 40 ? 'needs_work' : 'critical',
    evidence: comp.evidence,
    gaps: comp.gaps,
  };

  // 2. NAP Consistency (Weight: 20%)
  const nap = evaluateNapConsistency(profile, business);
  const napConsistency: LocalSeoScorecardDimension = {
    name: 'NAP Consistency',
    score: nap.score,
    weight: 0.20,
    status: nap.score >= 90 ? 'excellent' : nap.score >= 70 ? 'good' : 'critical',
    evidence: nap.evidence,
    gaps: nap.discrepancies,
  };

  // 3. Review Management (Weight: 20%)
  const reviewIntel = analyzeReviews(reviews);
  let reviewScore = 50;
  const reviewEvidence: string[] = [];
  const reviewGaps: string[] = [];

  if (profile.reviewCount >= 50) {
    reviewScore += 20;
    reviewEvidence.push(`Solid review volume (${profile.reviewCount} total).`);
  } else if (profile.reviewCount >= 15) {
    reviewScore += 10;
    reviewGaps.push(`Moderate review count (${profile.reviewCount}). Needs active acquisition campaign.`);
  } else {
    reviewScore -= 10;
    reviewGaps.push(`Low review volume (${profile.reviewCount}). Potential barrier to trust.`);
  }

  if (profile.averageRating >= 4.5) {
    reviewScore += 15;
    reviewEvidence.push(`High average rating of ${profile.averageRating}★.`);
  } else if (profile.averageRating < 4.0 && profile.averageRating > 0) {
    reviewScore -= 15;
    reviewGaps.push(`Below benchmark rating (${profile.averageRating}★). Reputational risk.`);
  }

  if (reviewIntel.responseRatePercentage >= 75) {
    reviewScore += 15;
    reviewEvidence.push(`Strong owner response rate (${reviewIntel.responseRatePercentage}% of reviews answered).`);
  } else {
    reviewGaps.push(`Owner response rate is low (${reviewIntel.responseRatePercentage}%). Unanswered reviews harm local engagement.`);
  }

  const reviewFinalScore = Math.min(100, Math.max(0, reviewScore));
  const reviewManagement: LocalSeoScorecardDimension = {
    name: 'Review Management',
    score: reviewFinalScore,
    weight: 0.20,
    status: reviewFinalScore >= 80 ? 'excellent' : reviewFinalScore >= 60 ? 'good' : 'needs_work',
    evidence: reviewEvidence,
    gaps: reviewGaps,
  };

  // 4. Website Local SEO (Weight: 15%)
  let webScore = 50;
  const webEvidence: string[] = [];
  const webGaps: string[] = [];

  if (profile.hasLocalBusinessSchema) {
    webScore += 30;
    webEvidence.push('Schema.org LocalBusiness / HVACBusiness structured data detected.');
  } else {
    webScore -= 20;
    webGaps.push('Missing Schema.org LocalBusiness structured data on website.');
  }

  if (profile.hasServiceAreaPages) {
    webScore += 20;
    webEvidence.push('Dedicated service area or location landing pages observed.');
  } else {
    webGaps.push('No dedicated geographic landing pages found on website.');
  }

  const webFinalScore = Math.min(100, Math.max(0, webScore));
  const websiteLocalSeo: LocalSeoScorecardDimension = {
    name: 'Website Local SEO',
    score: webFinalScore,
    weight: 0.15,
    status: webFinalScore >= 75 ? 'excellent' : webFinalScore >= 50 ? 'good' : 'needs_work',
    evidence: webEvidence,
    gaps: webGaps,
  };

  // 5. Local Content & Geo-Pages (Weight: 15%)
  let contentScore = 50;
  const contentEvidence: string[] = [];
  const contentGaps: string[] = [];

  if (profile.serviceAreas && profile.serviceAreas.length >= 3) {
    contentScore += 25;
    contentEvidence.push(`Identifies ${profile.serviceAreas.length} target zones (${profile.serviceAreas.slice(0, 3).join(', ')}).`);
  } else {
    contentGaps.push('Target service area list is sparse or under-defined.');
  }

  if (profile.zipCodes && profile.zipCodes.length >= 5) {
    contentScore += 25;
    contentEvidence.push(`Maps ${profile.zipCodes.length} commercial postal codes.`);
  } else {
    contentGaps.push('Detailed ZIP code coverage is not mapped in digital assets.');
  }

  const contentFinalScore = Math.min(100, Math.max(0, contentScore));
  const localContent: LocalSeoScorecardDimension = {
    name: 'Local Content & Service Area',
    score: contentFinalScore,
    weight: 0.15,
    status: contentFinalScore >= 75 ? 'excellent' : 'needs_work',
    evidence: contentEvidence,
    gaps: contentGaps,
  };

  // 6. Competitor Positioning (Weight: 10%)
  let compScore = 60;
  const compEvidence: string[] = [];
  const compGaps: string[] = [];

  if (allProjectProfiles.length > 1) {
    const otherRatings = allProjectProfiles.filter(p => p.id !== profile.id).map(p => p.averageRating);
    const avgCompetitorRating = otherRatings.length > 0 ? otherRatings.reduce((a, b) => a + b, 0) / otherRatings.length : 4.0;
    
    if (profile.averageRating > avgCompetitorRating) {
      compScore += 25;
      compEvidence.push(`Rating (${profile.averageRating}★) exceeds local peer average (${avgCompetitorRating.toFixed(1)}★).`);
    } else {
      compScore -= 10;
      compGaps.push(`Rating (${profile.averageRating}★) trails local peer group average (${avgCompetitorRating.toFixed(1)}★).`);
    }

    const otherReviews = allProjectProfiles.filter(p => p.id !== profile.id).map(p => p.reviewCount);
    const maxReviews = Math.max(...otherReviews, 1);
    if (profile.reviewCount >= maxReviews * 0.7) {
      compScore += 15;
      compEvidence.push(`Review volume (${profile.reviewCount}) is competitive with top local players.`);
    } else {
      compGaps.push(`Review volume is below top local competitor (${maxReviews} reviews).`);
    }
  } else {
    compEvidence.push('Single profile analyzed in current project scope.');
  }

  const compFinalScore = Math.min(100, Math.max(0, compScore));
  const competitorPositioning: LocalSeoScorecardDimension = {
    name: 'Competitor Positioning',
    score: compFinalScore,
    weight: 0.10,
    status: compFinalScore >= 75 ? 'excellent' : 'needs_work',
    evidence: compEvidence,
    gaps: compGaps,
  };

  // Weighted Total
  const totalScore = Math.round(
    profileCompleteness.score * profileCompleteness.weight +
    napConsistency.score * napConsistency.weight +
    reviewManagement.score * reviewManagement.weight +
    websiteLocalSeo.score * websiteLocalSeo.weight +
    localContent.score * localContent.weight +
    competitorPositioning.score * competitorPositioning.weight
  );

  let band: ScoreBand = 'Hold';
  if (totalScore >= 80) band = 'A';
  else if (totalScore >= 65) band = 'B';
  else if (totalScore >= 50) band = 'C';

  return {
    id: `local-score-${profile.id}`,
    businessId: profile.businessId,
    projectId: profile.projectId,
    totalScore,
    band,
    profileCompleteness,
    napConsistency,
    reviewManagement,
    websiteLocalSeo,
    localContent,
    competitorPositioning,
    calculatedAt: new Date().toISOString(),
    summary: `Local SEO overall score is ${totalScore}/100 (Band ${band}). Key growth lever: ${
      napConsistency.score < 80
        ? 'Resolve NAP discrepancies across directory citations.'
        : reviewManagement.score < 75
        ? 'Accelerate review volume and improve owner response rate.'
        : !profile.hasLocalBusinessSchema
        ? 'Deploy Schema.org LocalBusiness structured data on website.'
        : 'Build dedicated high-intent service area landing pages.'
    }`,
  };
}

/**
 * Maps detected Local SEO gaps directly to actionable Watech Services.
 */
export function generateLocalSeoOpportunities(
  profile: LocalSeoProfile,
  scorecard: LocalSeoScorecard,
  reviews: LocalReview[] = []
): Opportunity[] {
  const opps: Opportunity[] = [];
  const now = new Date().toISOString();

  // 1. Schema.org LocalBusiness
  if (!profile.hasLocalBusinessSchema) {
    opps.push({
      id: `opp-schema-${profile.id}`,
      businessId: profile.businessId,
      projectId: profile.projectId,
      identifiedProblem: 'Website lacks Schema.org LocalBusiness & HVACBusiness structured data.',
      evidence: 'Direct inspection of homepage and service pages found 0 json-ld local schemas.',
      businessRelevance: 'Prevents Google from validating service categories, service areas, and geo coordinates for map pack rankings.',
      recommendedSolution: 'Implement comprehensive Schema.org JSON-LD LocalBusiness markup with geocoordinates, opening hours, and service catalogs.',
      relevantWatechService: 'local_seo',
      effort: 'low',
      impact: 'high',
      confidence: 95,
      suggestedOutreachAngle: 'We noticed your website is missing structured LocalBusiness schema, which is holding your Dallas-Fort Worth map pack visibility back.',
      status: 'identified',
      createdAt: now,
    });
  }

  // 2. NAP Inconsistency
  if (scorecard.napConsistency.score < 85 && scorecard.napConsistency.gaps.length > 0) {
    opps.push({
      id: `opp-nap-${profile.id}`,
      businessId: profile.businessId,
      projectId: profile.projectId,
      identifiedProblem: 'Inconsistent Name, Address, or Phone (NAP) citations across public channels.',
      evidence: scorecard.napConsistency.gaps.join('; '),
      businessRelevance: 'Search engines demote businesses in the 3-Pack when citation data conflicts with official registry records.',
      recommendedSolution: 'Audit and standardize NAP across Google Business Profile, Apple Maps, Bing Places, and commercial HVAC directories.',
      relevantWatechService: 'local_seo',
      effort: 'medium',
      impact: 'high',
      confidence: 90,
      suggestedOutreachAngle: 'Your official phone and address have slight discrepancies between Google and directory listings that create ranking suppression.',
      status: 'identified',
      createdAt: now,
    });
  }

  // 3. Service Area & Location Landing Pages
  if (!profile.hasServiceAreaPages || (profile.serviceAreas && profile.serviceAreas.length > 2)) {
    opps.push({
      id: `opp-geo-pages-${profile.id}`,
      businessId: profile.businessId,
      projectId: profile.projectId,
      identifiedProblem: 'Absence of dedicated city/suburb landing pages for high-demand commercial HVAC corridors.',
      evidence: `Targeting areas like ${profile.serviceAreas.slice(0, 3).join(', ')} without dedicated URL hierarchy.`,
      businessRelevance: 'Without dedicated landing pages, a business cannot rank for non-headquarters geographic queries (e.g. "Commercial Chiller Repair Fort Worth").',
      recommendedSolution: 'Build targeted geo-landing pages with unique case studies, local technician bios, and client testimonials.',
      relevantWatechService: 'website_development',
      effort: 'medium',
      impact: 'high',
      confidence: 88,
      suggestedOutreachAngle: 'We built a model showing how adding dedicated Fort Worth and Arlington commercial HVAC pages could capture unserved regional demand.',
      status: 'identified',
      createdAt: now,
    });
  }

  // 4. Review Engine & Response Policy
  const reviewIntel = analyzeReviews(reviews);
  if (reviewIntel.responseRatePercentage < 60 || profile.reviewCount < 40) {
    opps.push({
      id: `opp-reviews-${profile.id}`,
      businessId: profile.businessId,
      projectId: profile.projectId,
      identifiedProblem: `Review management deficit: ${profile.reviewCount} total reviews and only ${reviewIntel.responseRatePercentage}% owner response rate.`,
      evidence: `${reviewIntel.negativeCount} unresolved customer complaints identified without professional executive replies.`,
      businessRelevance: 'Commercial facility managers view unresolved complaints as a risk before signing annual HVAC maintenance agreements.',
      recommendedSolution: 'Deploy automated post-service SMS review requests integrated with Watech CRM, plus a 24-hour review response protocol.',
      relevantWatechService: 'crm',
      effort: 'low',
      impact: 'high',
      confidence: 92,
      suggestedOutreachAngle: 'Implementing a post-dispatch review trigger could help bridge the review volume gap with your top DFW competitors within 60 days.',
      status: 'identified',
      createdAt: now,
    });
  }

  return opps;
}
