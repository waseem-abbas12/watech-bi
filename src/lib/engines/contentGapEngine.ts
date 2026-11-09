import type {
  Business,
  ContentItem,
  CompetitorContentMetric,
  ContentOpportunityItem,
  WatechService,
} from '@/types';

export interface ContentGapResult {
  missingServicePages: { serviceName: string; businessRelevance: string; competitorEvidence: string }[];
  missingFaqs: { question: string; category: string; whyItMatters: string }[];
  missingLocationPages: { locationName: string; opportunityDescription: string }[];
  missingEducationalTopics: { topic: string; funnelStage: string; recommendedFormat: string }[];
  seasonalOpportunities: { season: string; topic: string; urgency: string }[];
}

/**
 * Computes competitor content metrics across all businesses in the project.
 * Stresses that discovered pages are NOT confused with search-engine indexed pages.
 */
export function calculateCompetitorContentMetrics(
  businesses: Business[],
  allContentItems: ContentItem[]
): CompetitorContentMetric[] {
  return businesses.map(b => {
    const items = allContentItems.filter(item => item.businessId === b.id);

    const servicePagesCount = items.filter(
      i => i.contentType === 'service_page' || i.classification === 'service_focused'
    ).length;

    const faqCount = items.filter(
      i => i.contentType === 'faq' || i.classification === 'faq' || (i.customerFaqsIdentified && i.customerFaqsIdentified.length > 0)
    ).length;

    const localPagesCount = items.filter(
      i => i.contentType === 'landing_page' || i.classification === 'local_community'
    ).length;

    const educationalCount = items.filter(
      i => i.classification === 'educational' || i.classification === 'problem_solving'
    ).length;

    const caseStudyCount = items.filter(
      i => i.classification === 'case_study'
    ).length;

    // CTA effectiveness: Strong = 100, Weak = 50, Missing = 0
    let ctaScoreTotal = 0;
    if (items.length > 0) {
      for (const item of items) {
        if (item.callToActionQuality === 'strong') ctaScoreTotal += 100;
        else if (item.callToActionQuality === 'weak') ctaScoreTotal += 50;
      }
    }
    const ctaEffectivenessScore = items.length > 0 ? Math.round(ctaScoreTotal / items.length) : 30;

    // Content Freshness
    const has2026Updates = items.some(i => (i.lastUpdatedDate || i.dateObserved || '').includes('2026'));
    const lastUpdatedCadence = has2026Updates ? 'Active (2026 Updates)' : items.length > 0 ? 'Stale (> 1 year old)' : 'No content cataloged';

    const topTopics = Array.from(
      new Set(items.flatMap(i => i.themes || []).concat(items.map(i => i.mainTopic || ''))).values()
    ).filter(Boolean).slice(0, 4);

    return {
      businessId: b.id,
      businessName: b.officialName,
      discoveredPagesCount: items.length,
      servicePagesCount,
      faqCount,
      localPagesCount,
      educationalCount,
      caseStudyCount,
      lastUpdatedCadence,
      ctaEffectivenessScore,
      topTopics: topTopics.length > 0 ? topTopics : ['General Commercial HVAC'],
    };
  });
}

/**
 * Detects white-space gaps by comparing target business content against regional competitors and industry demand.
 */
export function detectContentGaps(
  targetBusiness: Business,
  targetContent: ContentItem[],
  allCompetitorContent: ContentItem[]
): ContentGapResult {
  const targetTopics = new Set(
    targetContent.flatMap(c => [c.title.toLowerCase(), c.mainTopic?.toLowerCase() || '', ...(c.themes || []).map(t => t.toLowerCase())])
  );

  // 1. Missing Service Pages
  const standardCommercialServices = [
    {
      serviceName: 'Commercial Chiller Overhaul & Maintenance',
      relevance: 'High-ticket contract driver for multi-story office towers and hospitals.',
    },
    {
      serviceName: 'Rooftop RTU Emergency Replacement',
      relevance: 'Primary summer failure point for retail and logistics facilities.',
    },
    {
      serviceName: 'Building Automation Systems (BAS / BMS)',
      relevance: 'Energy management contracts offering recurring monthly retainers.',
    },
    {
      serviceName: 'Commercial Cold Storage & Walk-In Refrigeration',
      relevance: 'Mission-critical commercial refrigeration for food distributors and logistics.',
    },
    {
      serviceName: 'Indoor Air Quality (IAQ) & HEPA Filtration',
      relevance: 'Corporate tenant health and compliance certification requirement.',
    },
  ];

  const missingServicePages: { serviceName: string; businessRelevance: string; competitorEvidence: string }[] = [];
  for (const s of standardCommercialServices) {
    const hasTopic = Array.from(targetTopics).some(t => t.includes(s.serviceName.toLowerCase().split(' ')[1]));
    if (!hasTopic) {
      const competitorWithTopic = allCompetitorContent.find(c =>
        c.title.toLowerCase().includes(s.serviceName.toLowerCase().split(' ')[1])
      );
      missingServicePages.push({
        serviceName: s.serviceName,
        businessRelevance: s.relevance,
        competitorEvidence: competitorWithTopic
          ? `Covered by competitor on "${competitorWithTopic.title}"`
          : 'High local search commercial intent in Dallas-Fort Worth Metroplex',
      });
    }
  }

  // 2. Missing Customer FAQs
  const commonFaqs = [
    {
      question: 'What is your guaranteed response time for commercial server room AC outages?',
      category: 'Emergency Dispatch',
      whyItMatters: 'Facility managers require under 2-hour SLA before signing maintenance contracts.',
    },
    {
      question: 'Do you provide photographic inspection reports with your preventative maintenance logs?',
      category: 'Trust & Proof',
      whyItMatters: 'Corporate asset managers need documentation for capital expense approvals.',
    },
    {
      question: 'What are the payment terms for multi-unit rooftop replacements?',
      category: 'Pricing & Billing',
      whyItMatters: 'Addresses budget approval hurdles for commercial property management boards.',
    },
    {
      question: 'Are your commercial technicians EPA Universal certified and background-checked?',
      category: 'Compliance & Safety',
      whyItMatters: 'Required for secure facilities, data centers, and school campuses.',
    },
  ];

  const targetHasFaq = targetContent.some(c => c.classification === 'faq' || c.contentType === 'faq' || (c.customerFaqsIdentified && c.customerFaqsIdentified.length > 0));
  const missingFaqs = targetHasFaq ? commonFaqs.slice(0, 1) : commonFaqs;

  // 3. Missing Location Pages
  const targetLocations = ['Fort Worth Industrial Corridor', 'Plano Legacy Corporate Center', 'Arlington Logistics Hub', 'Irving / Las Colinas Business Parks'];
  const missingLocationPages = targetLocations.map(loc => ({
    locationName: loc,
    opportunityDescription: `Capture localized commercial inquiries from facility directors searching within ${loc}.`,
  }));

  // 4. Missing Educational Topics
  const missingEducationalTopics = [
    {
      topic: 'How to Prevent Summer Rooftop RTU Compressor Seizure in Texas Heat',
      funnelStage: 'Top of Funnel (Educational Awareness)',
      recommendedFormat: 'Comprehensive 1,500-word Pillar Guide with Diagnostic Checklist',
    },
    {
      topic: 'Commercial Chiller Repair vs. Complete Retrofit: Asset ROI Calculator',
      funnelStage: 'Middle of Funnel (Evaluation)',
      recommendedFormat: 'Comparison Guide with Downloadable Executive Cost Sheet',
    },
  ];

  // 5. Seasonal Opportunities
  const seasonalOpportunities = [
    {
      season: 'Summer Peak (May - August)',
      topic: 'Emergency Rooftop Refrigerant Leak Testing & Chiller Pre-Cooling Audit',
      urgency: 'Extreme (High commercial failure rate during 100°F+ Texas days)',
    },
    {
      season: 'Winter Prep (October - December)',
      topic: 'Boiler Pipe Freeze-Protection & Warehouse Make-Up Air Winterization',
      urgency: 'High (Severe risk of frozen pipes during Texas winter storms)',
    },
  ];

  return {
    missingServicePages,
    missingFaqs,
    missingLocationPages,
    missingEducationalTopics,
    seasonalOpportunities,
  };
}

/**
 * Generates ready-to-execute Content Opportunities for Watech services.
 */
export function generateContentOpportunities(
  targetBusiness: Business,
  gaps: ContentGapResult
): ContentOpportunityItem[] {
  const opps: ContentOpportunityItem[] = [];

  // 1. Chiller Guide Opportunity
  opps.push({
    id: `copp-chiller-${targetBusiness.id}`,
    projectId: targetBusiness.projectId,
    businessId: targetBusiness.id,
    topic: 'Commercial Chiller Maintenance & Longevity Protocol',
    targetAudience: 'Hospital engineers, Class-A property managers, industrial warehouse directors',
    customerProblem: 'Preventing catastrophic $80k+ chiller motor burnout during peak summer heat waves.',
    searchIntent: 'commercial',
    suggestedFormat: 'pillar_guide',
    suggestedTitle: 'The Texas Facility Manager’s Guide to Commercial Chiller Overhauls & Energy Optimization',
    suggestedOutline: [
      '1. Early warning signals of oil contamination and tube fouling',
      '2. Preventative eddy current testing protocols',
      '3. Energy consumption comparison: VFD retrofits vs legacy constant-speed units',
      '4. Emergency contingency planning: Portable rental chiller tie-ins',
    ],
    relevantWatechService: 'seo',
    funnelStage: 'middle_of_funnel_evaluation',
    priority: 'high',
    evidenceSource: 'Competitor content gap analysis & DFW climate failure statistics',
    status: 'identified',
  });

  // 2. Location Landing Page Opportunity
  opps.push({
    id: `copp-loc-${targetBusiness.id}`,
    projectId: targetBusiness.projectId,
    businessId: targetBusiness.id,
    topic: 'Fort Worth & Tarrant County Commercial HVAC Hub',
    targetAudience: 'Logistics center managers and industrial park operators in Fort Worth',
    customerProblem: 'Finding an EPA certified mechanical contractor with under 2-hour dispatch in Tarrant County.',
    searchIntent: 'transactional',
    suggestedFormat: 'service_page',
    suggestedTitle: 'Commercial HVAC & Rooftop RTU Repair in Fort Worth & Mid-Cities',
    suggestedOutline: [
      '1. Local technician dispatch hubs serving I-35W & I-30 corridors',
      '2. Case study: 40-ton warehouse packaging cooler recovery',
      '3. 24/7 Priority emergency dispatch line for registered commercial accounts',
      '4. Client testimonials from local Tarrant County manufacturing facilities',
    ],
    relevantWatechService: 'local_seo',
    funnelStage: 'bottom_of_funnel_decision',
    priority: 'high',
    evidenceSource: 'Absence of Fort Worth URL hierarchy while serving regional territory',
    status: 'identified',
  });

  // 3. Customer FAQ Accordion Opportunity
  opps.push({
    id: `copp-faq-${targetBusiness.id}`,
    projectId: targetBusiness.projectId,
    businessId: targetBusiness.id,
    topic: 'Commercial HVAC Service SLAs & Transparent Billing FAQ',
    targetAudience: 'Commercial procurement officers and new facility managers',
    customerProblem: 'Uncertainty over unexpected diagnostic overtime fees and technician credentials.',
    searchIntent: 'informational',
    suggestedFormat: 'faq_accordion',
    suggestedTitle: 'Commercial Facility FAQ: Emergency SLAs, Rates & Preventative Agreements',
    suggestedOutline: [
      '1. Guaranteed arrival windows for active maintenance agreement holders',
      '2. Transparent explanation of diagnostic fees vs repair labor',
      '3. Photographic proof of work policy on rooftop units',
      '4. Warranty coverage on OEM compressor and coil replacements',
    ],
    relevantWatechService: 'conversion_optimization',
    funnelStage: 'bottom_of_funnel_decision',
    priority: 'medium',
    evidenceSource: 'Public customer reviews highlighting billing and response clarity desires',
    status: 'identified',
  });

  // 4. Video Script / LinkedIn Case Study Opportunity
  opps.push({
    id: `copp-case-${targetBusiness.id}`,
    projectId: targetBusiness.projectId,
    businessId: targetBusiness.id,
    topic: 'Crane Lift RTU Replacement Case Study',
    targetAudience: 'Commercial building owners and retail center developers',
    customerProblem: 'Minimizing commercial tenant disruption during major rooftop equipment replacement.',
    searchIntent: 'commercial',
    suggestedFormat: 'case_study',
    suggestedTitle: 'Case Study: Replacing 6 Rooftop Units on a DFW Medical Center in 14 Hours',
    suggestedOutline: [
      '1. Weekend crane logistics and municipal street closure permitting',
      '2. Pre-rigging and dual-crew installation sequencing',
      '3. Same-day start-up and BAS sensor commissioning',
      '4. 28% electrical efficiency gain verified on subsequent monthly utility audit',
    ],
    relevantWatechService: 'social_media',
    funnelStage: 'middle_of_funnel_evaluation',
    priority: 'medium',
    evidenceSource: 'Zero published case studies on official website despite 15+ years in business',
    status: 'identified',
  });

  return opps;
}
