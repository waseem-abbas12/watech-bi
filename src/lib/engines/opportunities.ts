import type {
  Business,
  WebsiteAudit,
  Opportunity,
  WatechService,
  IntelligenceFact,
} from '@/types';
import { scoreOpportunity } from './opportunityIntelligenceEngine';

export function generateOpportunities(
  business: Business,
  audit?: WebsiteAudit,
  facts: IntelligenceFact[] = []
): Opportunity[] {
  const opps: Opportunity[] = [];
  const now = new Date().toISOString();

  let readinessPoints = 8;
  const hiringFact = facts.find(f => f.category === 'growth' || f.claim.toLowerCase().includes('hiring'));
  if (hiringFact) readinessPoints += 4;
  if (business.teamSizeEstimate || business.fleetCapacity) readinessPoints += 3;
  readinessPoints = Math.min(15, readinessPoints);

  if (audit) {
    // 1. Website Redesign / Usability
    const usability = audit.categories.find(c => c.category === 'visual_credibility' || c.category === 'mobile_responsiveness');
    if (usability && usability.score < 65) {
      const { scoreBreakdown, priority } = scoreOpportunity(
        22,
        24,
        19,
        12,
        readinessPoints,
        'Dated visual hierarchy and mobile layout friction affecting trust with commercial buyers.'
      );

      opps.push({
        id: `opp-web-${business.id}-1`,
        businessId: business.id,
        projectId: business.projectId,
        identifiedProblem: 'Dated visual hierarchy and mobile layout friction affecting trust with commercial buyers.',
        evidence: usability.summary || 'Inspected viewport layout and mobile responsive criteria.',
        businessRelevance: 'Modern corporate clients compare 3-4 contractors before calling; outdated design reduces inbound inquiries.',
        businessConsequence: 'Lost commercial quote requests and high mobile bounce rate on primary service pages.',
        recommendedSolution: 'Design a clean, high-performance responsive web portal with dedicated commercial and residential landing zones.',
        relevantWatechService: 'website_development',
        category: 'website_development',
        priorityBand: priority,
        scoreBreakdown,
        smallestUsefulFirstStep: 'Deploy a mobile-responsive navigation bar and high-contrast commercial quote header button.',
        implementationComplexity: 'medium',
        effort: 'medium',
        impact: 'high',
        confidence: 0.88,
        suggestedOutreachAngle: 'Point out specific mobile layout friction points and share a benchmark design suited to their service tier.',
        status: 'identified',
        createdAt: now,
      });
    }

    // 2. Technical & Local SEO
    const techSeo = audit.categories.find(c => c.category === 'technical_seo');
    const localSeo = audit.categories.find(c => c.category === 'local_seo');
    if ((techSeo && techSeo.score < 70) || (localSeo && localSeo.score < 70)) {
      const { scoreBreakdown, priority } = scoreOpportunity(
        22,
        25,
        20,
        14,
        readinessPoints,
        'Missing structured schema markup and thin local geographic service page coverage.'
      );

      opps.push({
        id: `opp-seo-${business.id}-2`,
        businessId: business.id,
        projectId: business.projectId,
        identifiedProblem: 'Missing structured schema markup and thin local geographic service page coverage.',
        evidence: `Tech SEO score: ${techSeo?.score ?? 'N/A'}/100, Local SEO score: ${localSeo?.score ?? 'N/A'}/100.`,
        businessRelevance: 'Search engines struggle to accurately associate the business with high-value municipal commercial corridors.',
        businessConsequence: 'Suppression in local map pack rankings for key commercial cities like Fort Worth, Plano, and Irving.',
        recommendedSolution: 'Implement LocalBusiness JSON-LD schema, canonical tags, and city/suburb landing page architecture.',
        relevantWatechService: 'local_seo',
        category: 'local_seo',
        priorityBand: priority,
        scoreBreakdown,
        smallestUsefulFirstStep: 'Add Schema.org JSON-LD LocalBusiness code to the homepage head tag.',
        implementationComplexity: 'low',
        effort: 'low',
        impact: 'high',
        confidence: 0.92,
        suggestedOutreachAngle: 'Highlight that nearby competitors are ranking for key sub-markets due to structured location pages.',
        status: 'identified',
        createdAt: now,
      });
    }

    // 3. Lead Capture & Quote Requests
    const capture = audit.categories.find(c => c.category === 'lead_capture' || c.category === 'conversion_focus');
    if (capture && capture.score < 70) {
      const { scoreBreakdown, priority } = scoreOpportunity(
        23,
        24,
        19,
        13,
        readinessPoints,
        'Form inspection showed single basic contact form with no phone tap-to-call sticky header.'
      );

      opps.push({
        id: `opp-conv-${business.id}-3`,
        businessId: business.id,
        projectId: business.projectId,
        identifiedProblem: 'High-friction generic contact forms without instant estimate or direct service selector.',
        evidence: capture.summary || 'Form inspection showed single basic contact form with no phone tap-to-call sticky header.',
        businessRelevance: 'Emergency or urgent commercial service callers abandon when forced to fill out long text areas on mobile.',
        businessConsequence: 'Emergency after-hours commercial callers call competitor phone lines instead.',
        recommendedSolution: 'Deploy high-converting 2-step quote selector with tap-to-call sticky bar and instant dispatch confirmation.',
        relevantWatechService: 'conversion_optimization',
        category: 'conversion_optimization',
        priorityBand: priority,
        scoreBreakdown,
        smallestUsefulFirstStep: 'Add a sticky bottom phone bar on mobile screens with direct tap-to-call functionality.',
        implementationComplexity: 'low',
        effort: 'low',
        impact: 'high',
        confidence: 0.85,
        suggestedOutreachAngle: 'Demonstrate how a lightweight 2-step estimator captures emergency after-hours leads without phone bottlenecks.',
        status: 'identified',
        createdAt: now,
      });
    }

    // 4. Follow-up & Automation
    const followup = audit.categories.find(c => c.category === 'follow_up_readiness');
    if (followup && followup.score < 60) {
      const { scoreBreakdown, priority } = scoreOpportunity(
        20,
        22,
        18,
        13,
        readinessPoints,
        'No automated SMS or CRM integration detected for inbound form submissions.'
      );

      opps.push({
        id: `opp-auto-${business.id}-4`,
        businessId: business.id,
        projectId: business.projectId,
        identifiedProblem: 'No automated SMS or CRM integration detected for inbound form submissions.',
        evidence: followup.summary || 'No tracking or automation endpoints found on form submission elements.',
        businessRelevance: 'Lead response times over 15 minutes drop qualification rates by over 60%.',
        businessConsequence: 'Commercial inquiries go stale during dispatch delays, resulting in lost maintenance retainers.',
        recommendedSolution: 'Connect website lead forms directly to automated instant SMS acknowledgment and CRM pipeline dispatch.',
        relevantWatechService: 'crm',
        category: 'crm',
        priorityBand: priority,
        scoreBreakdown,
        smallestUsefulFirstStep: 'Configure an instant automated confirmation email and SMS dispatch ping on form submission.',
        implementationComplexity: 'low',
        effort: 'medium',
        impact: 'high',
        confidence: 0.82,
        suggestedOutreachAngle: 'Offer an automated workflow blueprint connecting their forms directly to technicians in the field.',
        status: 'identified',
        createdAt: now,
      });
    }
  }

  // 5. Reputation & Proof Presentation
  if (business.reviewCount && business.reviewCount > 25 && business.reviewRating && business.reviewRating >= 4.5) {
    const { scoreBreakdown, priority } = scoreOpportunity(
      18,
      25,
      17,
      14,
      readinessPoints,
      `Verified ${business.reviewRating}★ rating across ${business.reviewCount} public reviews not highlighted on website.`
    );

    opps.push({
      id: `opp-rep-${business.id}-5`,
      businessId: business.id,
      projectId: business.projectId,
      identifiedProblem: 'Strong 4.5+ star customer ratings are buried on third-party sites and not showcased on service quote pages.',
      evidence: `Verified ${business.reviewRating}★ rating across ${business.reviewCount} public reviews.`,
      businessRelevance: 'Social proof placed directly next to quote submission buttons dramatically reduces prospect hesitation.',
      businessConsequence: 'Prospects hesitate on high-ticket service quotes due to missing immediate credibility indicators.',
      recommendedSolution: 'Integrate dynamic, verified review stream widget and testimonial highlights on high-intent landing pages.',
      relevantWatechService: 'conversion_optimization',
      category: 'reputation_management',
      priorityBand: priority,
      scoreBreakdown,
      smallestUsefulFirstStep: 'Embed top 3 verified Google reviews with reviewer names directly below the quote form.',
      implementationComplexity: 'low',
      effort: 'low',
      impact: 'medium',
      confidence: 0.9,
      suggestedOutreachAngle: 'Congratulate them on their strong reputation and share a preview of how highlighting it can lift quote conversions.',
      status: 'identified',
      createdAt: now,
    });
  }

  // 6. Growth & Capacity Expansion
  const growthSignal = business.growthSignals?.find(s => s.toLowerCase().includes('hiring') || s.toLowerCase().includes('fleet') || s.toLowerCase().includes('location'));
  if (growthSignal) {
    const { scoreBreakdown, priority } = scoreOpportunity(
      21,
      22,
      18,
      12,
      readinessPoints,
      `Growth signal detected: "${growthSignal}". Expanding fleets require centralized lead pipeline visibility.`
    );

    opps.push({
      id: `opp-crm-${business.id}-6`,
      businessId: business.id,
      projectId: business.projectId,
      identifiedProblem: 'Rapid operational expansion without centralized pipeline visibility.',
      evidence: `Growth signal detected: "${growthSignal}".`,
      businessRelevance: 'Expanding fleets require predictable inbound pipeline management to prevent technician downtime.',
      businessConsequence: 'Underutilized technical capacity and inconsistent customer re-engagement follow-ups.',
      recommendedSolution: 'Implement Watech custom CRM pipeline tracking job sources, dispatch status, and client re-engagement campaigns.',
      relevantWatechService: 'crm',
      category: 'crm',
      priorityBand: priority,
      scoreBreakdown,
      smallestUsefulFirstStep: 'Establish a central inbound deal pipeline to track quote acceptance and follow-up cadences.',
      implementationComplexity: 'medium',
      effort: 'medium',
      impact: 'high',
      confidence: 0.8,
      suggestedOutreachAngle: 'Frame the conversation around scaling operational capacity without adding admin overhead.',
      status: 'identified',
      createdAt: now,
    });
  }

  // 7. Compound Opportunity Synthesis
  if (opps.length >= 3) {
    const compoundFindings = opps.slice(0, 4).map(o => o.identifiedProblem);
    const { scoreBreakdown, priority } = scoreOpportunity(
      25, // Maximum commercial impact
      24, // Aggregated evidence
      20, // Full Watech solution
      12, // Coordinated implementation
      readinessPoints,
      'Turnkey commercial growth initiative synthesizing conversion optimization, local map visibility, and customer proof.'
    );

    opps.unshift({
      id: `opp-compound-${business.id}`,
      businessId: business.id,
      projectId: business.projectId,
      identifiedProblem: 'Fragmented digital acquisition system: Mobile conversion friction, local map suppression, and lack of regional geo-pages.',
      evidence: `Synthesized findings: ${compoundFindings.join('; ')}`,
      businessRelevance: 'Addressing these gaps individually yields incremental gains; synthesizing them into a turnkey commercial acquisition engine creates compounding market share.',
      businessConsequence: 'Continued leakage of high-ticket commercial accounts to corporate competitors like TDIndustries and Brandt.',
      recommendedSolution: 'Deploy the Watech Commercial Growth Engine: Mobile CRO overhaul, Schema.org local pack dominance, 3 regional landing pages, and automated review capture.',
      relevantWatechService: 'conversion_optimization',
      category: 'conversion_optimization',
      priorityBand: priority,
      scoreBreakdown,
      smallestUsefulFirstStep: 'Phase 1 Quick-Win: Deploy mobile click-to-call header, fix NAP phone number, and publish executive replies to past complaints.',
      implementationComplexity: 'high',
      isCompound: true,
      compoundFindings,
      effort: 'high',
      impact: 'high',
      confidence: 0.95,
      suggestedOutreachAngle: 'We synthesized a 3-part growth blueprint for your DFW commercial operations that resolves your mobile conversion leaks and local map demotions in 30 days.',
      status: 'identified',
      createdAt: now,
    });
  }

  return opps;
}
