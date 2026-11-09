import {
  Business,
  WebsiteAudit,
  LocalSeoProfile,
  BusinessServiceRecommendation,
  WatechServiceItem,
  BusinessProposal,
  ProposalQuotation,
  QuotationLineItem,
  ProposalTemplateType,
  ProposalCurrency,
  ProposalMetricsSummary,
  ServiceCatalogCategory,
} from '@/types';
import { PROPOSAL_TEMPLATES, STANDARD_TERMS_AND_CONDITIONS } from './proposalTemplatesData';

export interface PricingIntelligenceReport {
  recommendedMin: number | null;
  recommendedSuggested: number | null;
  recommendedMax: number | null;
  currency: ProposalCurrency;
  complexityGrade: 'low' | 'moderate' | 'high' | 'enterprise';
  lineItemCount: number;
  hasRecurring: boolean;
  notes: string[];
  rationale: string;
}

export function formatCurrency(
  amount: number | null | undefined,
  currency: ProposalCurrency = 'USD'
): string {
  if (amount === null || amount === undefined) {
    return 'Pricing not configured';
  }

  const formattedNum = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);

  switch (currency) {
    case 'USD':
      return `$${formattedNum}`;
    case 'PKR':
      return `Rs. ${formattedNum}`;
    case 'AED':
      return `AED ${formattedNum}`;
    case 'GBP':
      return `£${formattedNum}`;
    case 'EUR':
      return `€${formattedNum}`;
    default:
      return `$${formattedNum}`;
  }
}

export function calculateQuotationTotals(
  lineItems: QuotationLineItem[],
  _currency: ProposalCurrency = 'USD'
): {
  subtotal: number | null;
  totalDiscount: number;
  totalTax: number;
  totalAmount: number | null;
  hasUnconfiguredPricing: boolean;
  computedItems: QuotationLineItem[];
} {
  let hasUnconfigured = false;
  let subtotalSum = 0;
  let discountSum = 0;
  let taxSum = 0;

  const computedItems = lineItems.map((item) => {
    const qty = Math.max(1, item.quantity || 1);
    const unitPrice = item.unitPrice;

    if (unitPrice === null || unitPrice === undefined) {
      hasUnconfigured = true;
      return {
        ...item,
        quantity: qty,
        unitPrice: null,
        subtotal: null,
      };
    }

    const base = qty * unitPrice;
    const discount = base * (Math.max(0, Math.min(100, item.discountPercent || 0)) / 100);
    const taxableAmount = Math.max(0, base - discount);
    const tax = taxableAmount * (Math.max(0, item.taxPercent || 0) / 100);
    const finalItemTotal = Math.round((taxableAmount + tax) * 100) / 100;

    subtotalSum += base;
    discountSum += discount;
    taxSum += tax;

    return {
      ...item,
      quantity: qty,
      subtotal: finalItemTotal,
    };
  });

  if (hasUnconfigured) {
    return {
      subtotal: null,
      totalDiscount: Math.round(discountSum * 100) / 100,
      totalTax: Math.round(taxSum * 100) / 100,
      totalAmount: null,
      hasUnconfiguredPricing: true,
      computedItems,
    };
  }

  const finalTotal = Math.round((subtotalSum - discountSum + taxSum) * 100) / 100;

  return {
    subtotal: Math.round(subtotalSum * 100) / 100,
    totalDiscount: Math.round(discountSum * 100) / 100,
    totalTax: Math.round(taxSum * 100) / 100,
    totalAmount: finalTotal,
    hasUnconfiguredPricing: false,
    computedItems,
  };
}

export function generateProposalFromBusiness(params: {
  business: Business;
  audit?: WebsiteAudit;
  localSeo?: LocalSeoProfile;
  recommendation?: BusinessServiceRecommendation;
  availableServices?: WatechServiceItem[];
  templateType?: ProposalTemplateType;
  currency?: ProposalCurrency;
}): { proposal: BusinessProposal; quotation: ProposalQuotation } {
  const {
    business,
    audit,
    localSeo,
    recommendation,
    availableServices = [],
    templateType = 'premium_business',
    currency = 'USD',
  } = params;

  const now = new Date();
  const proposalId = `prop_${business.id}_${now.getTime()}`;
  const quotationId = `quo_${business.id}_${now.getTime()}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const proposalNumber = `PROP-${now.getFullYear()}-${randomSuffix}`;
  const quotationNumber = `QUO-${now.getFullYear()}-${randomSuffix}`;

  // Grounded findings extraction
  const auditExcerpt = audit
    ? `Technical inspection performed on ${audit.inspectedAt ? new Date(audit.inspectedAt).toLocaleDateString() : 'recent audit'}: Total audit score ${audit.totalScore}/100. Performance score: ${audit.dimensions?.performance || 0}/100. Mobile UX score: ${audit.dimensions?.userExperience || 0}/100. Status: ${audit.hasSsl ? 'SSL active' : 'Missing SSL encryption'}. SEO readiness: ${audit.dimensions?.seoReadiness || 0}/100.`
    : `Preliminary digital assessment shows unoptimized mobile loading speeds and gaps in structured data markup on ${business.websiteUrl || 'business website'}.`;

  const seoExcerpt = localSeo
    ? `Local Search Profile: ${localSeo.averageRating.toFixed(1)}/5.0 stars across ${localSeo.reviewCount} customer reviews. Google Business Profile status: ${localSeo.googleBusinessProfileUrl ? 'Identified' : 'Unclaimed / unverified'}. Local map pack visibility requires targeted category optimization.`
    : `Local visibility check indicates untapped Google Map Pack positioning and review acquisition velocity in ${business.city || 'local service area'}.`;

  const opportunitiesIdentified: string[] = [];
  if (audit && (audit.dimensions?.userExperience || 100) < 60) {
    opportunitiesIdentified.push('Mobile UX overhaul to eliminate bounce rate and boost call conversions');
  }
  if (audit && !audit.hasSsl) {
    opportunitiesIdentified.push('Critical security and SSL compliance hardening');
  }
  if (localSeo && localSeo.reviewCount < 25) {
    opportunitiesIdentified.push('Automated customer review generation to reach 50+ 5-star Google reviews');
  }
  if (opportunitiesIdentified.length === 0) {
    opportunitiesIdentified.push('Conversion Rate Optimization (CRO) and direct customer inquiry automation');
    opportunitiesIdentified.push('Local Search Dominance and directory citation synchronization');
  }

  // Derive package title and deliverables from recommendation
  let packageTitle = 'Executive Business Growth System';
  let servicesList: string[] = [];
  let deliverables: string[] = [];
  const lineItems: QuotationLineItem[] = [];

  if (recommendation && recommendation.recommendedSolution) {
    const tier = recommendation.recommendedSolution;
    packageTitle = tier.title;
    servicesList = tier.serviceMatches.map((m) => m.serviceName);
    deliverables = [...tier.deliverables];

    // Build line items from matched services
    tier.serviceMatches.forEach((match, idx) => {
      const matched = availableServices.find((s) => s.id === match.serviceId);
      const sName = match.serviceName || (matched ? matched.name : `Strategic Service Deliverable #${idx + 1}`);
      const sCat: ServiceCatalogCategory = match.category || (matched ? matched.category : 'website_digital_experience');
      const sPrice = matched && matched.basePrice !== undefined ? matched.basePrice : null;
      const billing = matched && matched.isRecurring ? 'monthly' : 'one_time';

      lineItems.push({
        id: `item_${proposalId}_${idx}`,
        serviceId: match.serviceId,
        serviceName: sName,
        description: match.rationale || (matched ? matched.description : `Implementation and delivery of ${sName}`),
        category: sCat,
        billingType: billing,
        quantity: 1,
        unitPrice: sPrice,
        discountPercent: 0,
        taxPercent: 0,
        subtotal: sPrice,
        notes: `Tier: Recommended Scope`,
      });
    });
  }

  // Fallback line items if no recommendation was linked
  if (lineItems.length === 0) {
    const defaultSpecs = [
      {
        name: 'High-Performance Web Platform & UX Redesign',
        category: 'website_digital_experience' as ServiceCatalogCategory,
        billingType: 'one_time' as const,
        price: 2500,
        description: 'Complete mobile-first website redesign, Core Web Vitals optimization, and conversion tracking.',
      },
      {
        name: 'Local Search Dominance & Google Map Pack Optimization',
        category: 'search_visibility' as ServiceCatalogCategory,
        billingType: 'monthly' as const,
        price: 750,
        description: '40+ local citations, GBP category overhaul, review generation workflows, and monthly rank tracking.',
      },
      {
        name: 'Automated Lead Routing & Response Pipeline',
        category: 'software_business_automation' as ServiceCatalogCategory,
        billingType: 'one_time' as const,
        price: 950,
        description: 'Instant lead capture notifications, CRM synchronization, and automated customer follow-up triggers.',
      },
    ];

    defaultSpecs.forEach((spec, idx) => {
      servicesList.push(spec.name);
      deliverables.push(spec.description);
      lineItems.push({
        id: `item_${proposalId}_${idx}`,
        serviceName: spec.name,
        description: spec.description,
        category: spec.category,
        billingType: spec.billingType,
        quantity: 1,
        unitPrice: spec.price,
        discountPercent: 0,
        taxPercent: 0,
        subtotal: spec.price,
      });
    });
  }

  const totals = calculateQuotationTotals(lineItems, currency);

  const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const issueDate = now.toISOString().split('T')[0];

  const quotation: ProposalQuotation = {
    id: quotationId,
    proposalId,
    businessId: business.id,
    projectId: business.projectId,
    quotationNumber,
    status: 'draft',
    currency,
    issueDate,
    expiryDate,
    lineItems: totals.computedItems,
    subtotal: totals.subtotal,
    totalDiscount: totals.totalDiscount,
    totalTax: totals.totalTax,
    totalAmount: totals.totalAmount,
    paymentTerms: '50% upon contract authorization, 25% upon staging delivery, 25% upon production handover',
    hasUnconfiguredPricing: totals.hasUnconfiguredPricing,
    notes: 'Quotation valid for 30 calendar days. Ongoing monthly retainer services are invoiced on the 1st of each month.',
    exclusions: [
      'Third-party software subscription or API usage fees (e.g. Twilio, OpenAI, domain registrar fees)',
      'Brand trademark registration and specialized legal filings',
      'Extensive professional on-site video production (remote digital assets accommodated)',
    ],
  };

  const template = PROPOSAL_TEMPLATES[templateType] || PROPOSAL_TEMPLATES.premium_business;
  const primaryProblem = opportunitiesIdentified[0] || 'Sub-optimal digital conversion and delayed prospect response times';

  const executiveSummary = `## Executive Strategic Summary

**Prepared for:** ${business.officialName}
**Market Focus:** ${business.city || 'Regional Area'}, ${business.businessModel || 'Commercial Services'}

Through comprehensive inspection of ${business.officialName}'s digital footprint, Watech Growth Agency identified high commercial promise coupled with actionable technical bottlenecks:
- **Core Challenge:** ${primaryProblem}
- **Commercial Goal:** Elevate your brand perception, outrank local competition, and implement automated inbound customer response.

Watech proposes an integrated, phase-governed solution engineered to provide measurable improvements in customer acquisition and operational velocity.`;

  const proposal: BusinessProposal = {
    id: proposalId,
    businessId: business.id,
    projectId: business.projectId,
    crmLeadId: undefined,
    quotationId,
    proposalNumber,
    title: `${business.officialName} — ${template.name}`,
    templateType,
    status: 'draft', // Human Approval Gate: proposals must start as draft
    currentVersion: 1,
    cover: {
      clientName: business.officialName,
      clientContact: business.email || 'Executive Leadership',
      validityPeriod: '30 Days from Issue',
      date: issueDate,
    },
    executiveSummary,
    businessAssessment: {
      auditExcerpt,
      seoExcerpt,
      opportunitiesIdentified,
      competitorContext: `${business.officialName} has strong local foundation; bridging the identified infrastructure gaps will create distinct competitive separation in ${business.city || 'your market'}.`,
    },
    recommendedSolution: {
      packageTitle,
      servicesList,
      expectedOutcomes: [
        'Sub-second page load times and pristine mobile user experience',
        'Top 3 Google 3-Pack placement for high-intent local search queries',
        'Zero lost inbound leads with instantaneous inquiry alert routing',
        'Elevated brand trust through verified 5-star client review velocity',
      ],
      dependencies: [
        'Access to DNS records and web hosting console',
        'Google Business Profile manager authorization',
        'Provision of high-resolution brand assets and team bios',
      ],
    },
    scopeOfWork: {
      deliverables,
      activities: [
        'Architecture & UI/UX wireframing',
        'Frontend responsive component engineering',
        'Local citation audit and duplicate suppression',
        'Google Business Profile optimization overhaul',
        'Automated lead webhook configuration',
        'Staging review, QA testing, and DNS cutover',
      ],
      acceptanceCriteria: [
        'PageSpeed Insights mobile performance score >= 85',
        '100% NAP consistency across top 30 citation directories',
        'Real-time lead submission notification verified via end-to-end test',
        'Zero layout shifts (CLS < 0.1) across iOS and Android viewports',
      ],
      exclusions: quotation.exclusions,
    },
    implementationPhases: [
      {
        phase: 1,
        name: 'Discovery & Asset Architecture',
        duration: 'Week 1',
        milestones: 'Kickoff review, credential acquisition, sitemap sign-off, wireframes approved',
      },
      {
        phase: 2,
        name: 'Digital Platform & Content Engineering',
        duration: 'Weeks 2–3',
        milestones: 'Responsive build, mobile optimization, technical SEO implementation',
      },
      {
        phase: 3,
        name: 'Local SEO & Workflow Integration',
        duration: 'Weeks 4–5',
        milestones: 'Google Business Profile overhaul, citation synchronization, lead webhook integration',
      },
      {
        phase: 4,
        name: 'Quality Assurance & Production Launch',
        duration: 'Week 6',
        milestones: 'Cross-browser validation, DNS cutover, client walkthrough, final acceptance',
      },
    ],
    timeline: {
      estimatedStart: 'Within 3 business days of kickoff authorization',
      duration: template.recommendedTimeline,
      milestones: [
        'Milestone 1: Architecture Approval (Week 1)',
        'Milestone 2: Staging Environment Review (Week 3)',
        'Milestone 3: Local Sync & Webhook Testing (Week 5)',
        'Milestone 4: Production Deployment (Week 6)',
      ],
    },
    termsAndConditions: STANDARD_TERMS_AND_CONDITIONS,
    nextSteps: [
      'Review and formally approve this proposal and linked commercial quotation',
      'Authorize the engagement with the signature section below',
      'Schedule the 30-minute technical onboarding consultation',
      'Provide prerequisite DNS, GBP, and brand asset credentials',
    ],
    quotation,
    humanApproved: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  return { proposal, quotation };
}

export function generatePricingIntelligence(
  lineItems: QuotationLineItem[],
  _services: WatechServiceItem[] = [],
  _historicalQuotations: ProposalQuotation[] = []
): PricingIntelligenceReport {
  let knownPriceSum = 0;
  let unconfiguredCount = 0;
  let hasRecurring = false;
  const notes: string[] = [];

  lineItems.forEach((item) => {
    if (item.billingType === 'monthly') {
      hasRecurring = true;
    }
    if (item.unitPrice !== null && item.unitPrice !== undefined) {
      knownPriceSum += item.unitPrice * (item.quantity || 1);
    } else {
      unconfiguredCount++;
    }
  });

  const count = lineItems.length;
  let complexityGrade: PricingIntelligenceReport['complexityGrade'] = 'low';
  if (count >= 5 || knownPriceSum > 7000) {
    complexityGrade = 'enterprise';
  } else if (count >= 3 || knownPriceSum > 3500) {
    complexityGrade = 'high';
  } else if (count >= 2 || knownPriceSum > 1500) {
    complexityGrade = 'moderate';
  }

  let min: number | null = null;
  let suggested: number | null = null;
  let max: number | null = null;

  if (unconfiguredCount === 0 && knownPriceSum > 0) {
    suggested = Math.round(knownPriceSum);
    min = Math.round(knownPriceSum * 0.85); // 15% discount corridor
    max = Math.round(knownPriceSum * 1.25); // 25% premium / expedited corridor
    notes.push(`Base pricing synthesized from ${count} configured catalog items.`);
    if (hasRecurring) {
      notes.push('Scope includes ongoing monthly services requiring retainer agreements.');
    }
  } else {
    notes.push(
      `${unconfiguredCount} of ${count} line items have unconfigured pricing. Manual rate specification required before formal dispatch.`
    );
  }

  const rationale =
    complexityGrade === 'enterprise'
      ? 'Enterprise scope with multi-tier digital overhaul, local ranking dominance, and automation pipelines. Pricing reflects high-touch execution and multi-week engineering.'
      : complexityGrade === 'high'
      ? 'Comprehensive growth system with multiple integrated modules. Recommended pricing maintains standard agency margins and covers dedicated project management.'
      : complexityGrade === 'moderate'
      ? 'Targeted engagement addressing primary operational or digital bottlenecks. High value-to-cost ratio for mid-market business.'
      : 'Lean engagement focused on immediate single-problem resolution or initial proof-of-concept.';

  return {
    recommendedMin: min,
    recommendedSuggested: suggested,
    recommendedMax: max,
    currency: 'USD',
    complexityGrade,
    lineItemCount: count,
    hasRecurring,
    notes,
    rationale,
  };
}

export function calculateProposalMetrics(
  proposals: BusinessProposal[],
  quotations: ProposalQuotation[] = []
): ProposalMetricsSummary {
  const summary: ProposalMetricsSummary = {
    totalProposals: proposals.length,
    draftCount: 0,
    approvedCount: 0,
    sentCount: 0,
    acceptedCount: 0,
    rejectedCount: 0,
    expiredCount: 0,
    totalQuotedValue: 0,
    acceptedValue: 0,
    averageProposalValue: 0,
    acceptanceRatePercent: 0,
  };

  const quotationMap = new Map<string, ProposalQuotation>();
  quotations.forEach((q) => {
    quotationMap.set(q.proposalId, q);
    quotationMap.set(q.id, q);
  });

  let validValueCount = 0;

  proposals.forEach((p) => {
    switch (p.status) {
      case 'draft':
      case 'internal_review':
        summary.draftCount++;
        break;
      case 'approved':
        summary.approvedCount++;
        break;
      case 'sent':
        summary.sentCount++;
        break;
      case 'accepted':
        summary.acceptedCount++;
        break;
      case 'rejected':
      case 'declined':
        summary.rejectedCount++;
        break;
      case 'expired':
        summary.expiredCount++;
        break;
      default:
        break;
    }

    // Determine value from embedded quotation or linked quotation
    const quote = p.quotation || (p.quotationId ? quotationMap.get(p.quotationId) : undefined);
    if (quote && quote.totalAmount !== null && quote.totalAmount !== undefined) {
      summary.totalQuotedValue += quote.totalAmount;
      validValueCount++;
      if (p.status === 'accepted') {
        summary.acceptedValue += quote.totalAmount;
      }
    }
  });

  if (validValueCount > 0) {
    summary.averageProposalValue = Math.round(summary.totalQuotedValue / validValueCount);
  }

  const decidedCount = summary.acceptedCount + summary.rejectedCount;
  if (decidedCount > 0) {
    summary.acceptanceRatePercent = Math.round((summary.acceptedCount / decidedCount) * 100);
  } else if (summary.sentCount > 0) {
    summary.acceptanceRatePercent = Math.round((summary.acceptedCount / summary.sentCount) * 100);
  }

  return summary;
}
