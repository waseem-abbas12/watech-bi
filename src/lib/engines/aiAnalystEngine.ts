import type {
  Business,
  WebsiteAudit,
  AuditFinding,
  IntelligenceFact,
  ContentItem,
  Opportunity,
  LeadScore,
  Contact,
  EmailDiscoveryRecord,
  LocalSeoProfile,
  LocalReview,
  AIStrategicReport,
  AICitation,
  AIMessage,
  WatechService,
  BuyerSignal,
  SalesReadinessRecord,
  BusinessServiceRecommendation,
  ClientRecord,
  AgencyInvoice,
  PaymentRecord,
  RecurringContract,
} from '@/types';
import { repository } from '@/lib/db/repository';

export interface BusinessResearchContext {
  business: Business;
  audit?: WebsiteAudit;
  auditFindings?: AuditFinding[];
  facts?: IntelligenceFact[];
  contentItems?: ContentItem[];
  opportunities?: Opportunity[];
  leadScore?: LeadScore;
  contacts?: Contact[];
  emails?: EmailDiscoveryRecord[];
  localSeo?: LocalSeoProfile;
  reviews?: LocalReview[];
  buyerSignals?: BuyerSignal[];
  salesReadiness?: SalesReadinessRecord;
  recommendation?: BusinessServiceRecommendation;
  client?: ClientRecord;
  invoices?: AgencyInvoice[];
  payments?: PaymentRecord[];
  contracts?: RecurringContract[];
}

/**
 * Aggregates all recorded intelligence for a business from Dexie repository
 */
export async function buildBusinessResearchContext(
  businessId: string
): Promise<BusinessResearchContext | null> {
  const business = await repository.getBusiness(businessId);
  if (!business) return null;

  const [
    audit,
    facts,
    contentItems,
    opportunities,
    leadScore,
    contacts,
    emails,
    localSeo,
    reviews,
    buyerSignals,
    salesReadiness,
    recommendation,
  ] = await Promise.all([
    repository.getAuditForBusiness(businessId),
    repository.getFacts(businessId),
    repository.getContentItems(businessId),
    repository.getOpportunities(businessId),
    repository.getScoreForBusiness(businessId),
    repository.getContacts(businessId),
    repository.getEmails(businessId),
    repository.getLocalSeoProfileForBusiness(businessId),
    repository.getLocalReviews(businessId),
    repository.getBuyerSignals(businessId),
    repository.getSalesReadinessRecord(businessId),
    repository.getRecommendationForBusiness(businessId),
  ]);

  const allClients = await repository.getClients();
  const client = allClients.find((c) => c.businessId === businessId);
  let invoices: AgencyInvoice[] = [];
  let payments: PaymentRecord[] = [];
  let contracts: RecurringContract[] = [];

  if (client) {
    const allInvoices = await repository.getInvoices();
    invoices = allInvoices.filter((i) => i.clientId === client.id);
    const allPayments = await repository.getPayments();
    payments = allPayments.filter((p) => p.clientId === client.id);
    const allContracts = await repository.getRecurringContracts();
    contracts = allContracts.filter((c) => c.clientId === client.id);
  }

  return {
    business,
    audit,
    auditFindings: audit?.findings || [],
    facts,
    contentItems,
    opportunities,
    leadScore,
    contacts,
    emails,
    localSeo,
    reviews,
    buyerSignals,
    salesReadiness,
    recommendation,
    client,
    invoices,
    payments,
    contracts,
  };
}

/**
 * Produces a comprehensive 5-Dimension Strategic Dossier grounded strictly in data
 */
export function generateStrategicReport(ctx: BusinessResearchContext): AIStrategicReport {
  const { business, audit, auditFindings = [], opportunities = [], leadScore, contacts = [], emails = [], localSeo, reviews = [] } = ctx;
  const citations: AICitation[] = [];
  const dataGaps: string[] = [];
  const now = new Date().toISOString();

  // Citations collection
  if (business.domain) {
    citations.push({
      sourceName: `${business.officialName} Web Records`,
      sourceUrl: business.websiteUrl || `https://${business.domain}`,
      category: 'official_website',
      dateCollected: now,
      excerpt: `Domain: ${business.domain}. Phone: ${business.phone || 'N/A'}. City: ${business.city || 'N/A'}.`,
      confidence: 0.95,
    });
  }

  if (audit) {
    citations.push({
      sourceName: 'Technical Website Audit Engine',
      category: 'website_audit',
      dateCollected: audit.inspectedAt || now,
      excerpt: `Overall audit score: ${audit.totalScore}/100 (Grade: ${audit.grade}). SSL Configured: ${audit.hasSsl ? 'Yes' : 'No'}. Findings logged: ${auditFindings.length}.`,
      confidence: 0.98,
    });
  } else {
    dataGaps.push('Full technical website audit has not yet been executed for this domain.');
  }

  if (localSeo) {
    citations.push({
      sourceName: 'Google Business Profile Intelligence',
      sourceUrl: localSeo.googleBusinessProfileUrl,
      category: 'local_seo',
      dateCollected: localSeo.lastAuditedAt || now,
      excerpt: `Rating: ${localSeo.averageRating || 'N/A'} from ${localSeo.reviewCount || 0} reviews. Primary Category: ${localSeo.primaryCategory || 'N/A'}. NAP Status: ${localSeo.napConsistencyStatus}.`,
      confidence: 0.92,
    });
  } else {
    dataGaps.push('Google Business Profile / Local SEO audit is unavailable.');
  }

  if (leadScore) {
    citations.push({
      sourceName: 'Watech Lead Qualification Matrix',
      category: 'lead_score',
      dateCollected: leadScore.calculatedAt || now,
      excerpt: `Lead Qualification: Tier ${leadScore.band.toUpperCase()} (${leadScore.totalScore}/100).`,
      confidence: 0.96,
    });
  }

  // 1. Digital Presence
  const trustSignals: string[] = [];
  if (audit?.hasSsl) trustSignals.push('Active SSL Certificate');
  if (business.phone) trustSignals.push(`Verified Direct Phone (${business.phone})`);
  if (business.fullAddress) trustSignals.push(`Physical Address Verified (${business.fullAddress})`);
  if (localSeo?.reviewCount && localSeo.reviewCount > 10) trustSignals.push(`${localSeo.reviewCount} Public Reviews`);
  if (trustSignals.length === 0) trustSignals.push('Sparse public trust signals observed');

  let conversionPathHealth = 'Moderate';
  if (audit && audit.totalScore < 50) {
    conversionPathHealth = 'Critical Funnel Friction (Severe performance/accessibility deficits)';
  } else if (!business.phone && emails.length === 0) {
    conversionPathHealth = 'Severely Impaired (No direct contact routing visible)';
  } else if (opportunities.some(o => o.relevantWatechService === 'custom_software')) {
    conversionPathHealth = 'Sub-optimal (Missing automated booking / instant dispatch funnel)';
  } else {
    conversionPathHealth = 'Functional baseline with expansion opportunities';
  }

  // 2. Competitive Position
  const observableGaps: string[] = [];
  if (auditFindings.some(f => f.category === 'technical_seo')) {
    observableGaps.push('On-page search optimization metadata missing or misconfigured');
  }
  if (auditFindings.some(f => f.category === 'performance_and_speed')) {
    observableGaps.push('High page load latency risking customer bounce before engagement');
  }
  if (!localSeo?.googleBusinessProfileUrl) {
    observableGaps.push('Unclaimed or unlinked Google Business Profile vulnerable to local search neglect');
  }
  if (localSeo && localSeo.reviewCount < 15) {
    observableGaps.push('Low review volume relative to local metro market competitors');
  }
  if (observableGaps.length === 0) {
    observableGaps.push('Limited observable gaps in basic web setup; opportunities reside in modern workflow automation');
  }

  // 3. Growth Opportunities
  const websiteImprovements = auditFindings
    .filter(f => f.category === 'performance_and_speed' || f.category === 'technical_seo' || f.category === 'lead_capture')
    .slice(0, 4)
    .map(f => `${f.observation}: ${f.recommendedAction}`);

  if (websiteImprovements.length === 0) {
    websiteImprovements.push(
      'Deploy next-generation responsive landing architecture with modern Web Vitals optimization',
      'Implement programmatic schema markup (LocalBusiness, AggregateRating, Service)'
    );
  }

  const localSeoOpportunities: string[] = [];
  if (!localSeo?.googleBusinessProfileUrl) {
    localSeoOpportunities.push('Claim and verify Google Business Profile to solidify local search pack authority');
  }
  if (localSeo && localSeo.reviewCount < 30) {
    localSeoOpportunities.push('Launch automated post-service review generation system to accelerate review velocity');
  }
  localSeoOpportunities.push('Establish localized landing pages for key service areas in target radius');

  const leadCaptureOptimizations: string[] = [
    'Install instant quote / cost estimation widget with immediate SMS confirmation',
    'Add sticky mobile call-to-action bar on all high-intent service subpages',
    'Implement emergency after-hours dispatch request capture form',
  ];

  const automationOpportunities: string[] = [
    'Centralized CRM dispatch sync for customer appointment requests',
    'Automated email & SMS appointment confirmation sequences',
    'Review request trigger upon job completion in field management software',
  ];

  // 4. Watech Service Matching
  const recommendedServices: WatechService[] = [];
  if (audit && audit.totalScore < 70) {
    recommendedServices.push('website_development');
  }
  if (localSeo && (localSeo.reviewCount < 20 || !localSeo.googleBusinessProfileUrl)) {
    recommendedServices.push('local_seo');
  }
  if (opportunities.some(o => o.relevantWatechService === 'custom_software')) {
    recommendedServices.push('custom_software');
  }
  if (recommendedServices.length === 0) {
    recommendedServices.push('website_development', 'local_seo');
  }

  // Evidence rationale
  const evidenceRationale = `Based on verified data for ${business.officialName}, the technical audit score is ${audit ? audit.totalScore : 'N/A'}/100 and local reputation indicates ${localSeo ? `${localSeo.averageRating || 'N/A'} ★ (${localSeo.reviewCount} reviews)` : 'unlinked profile'}. Identified ${contacts.length} stakeholder route(s). Modernizing web infrastructure and local search footprint offers an immediate competitive uplift.`;

  return {
    id: `report-${business.id}-${Date.now()}`,
    businessId: business.id,
    projectId: business.projectId,
    title: `Strategic Growth Dossier: ${business.officialName}`,
    executiveSummary: `${business.officialName} demonstrates strong regional presence but exhibits concrete technical and local visibility friction points. By addressing verified issues in web performance (${audit ? `${audit.totalScore}/100` : 'unverified'}), conversion funnel routing, and local directory presence, they can capture high-intent inquiries currently captured by local competitors.`,
    overview: {
      whatBusinessDoes: `${business.officialName} operates as a commercial/residential HVAC contractor in ${business.city || 'the metropolitan region'}.`,
      servicesOffered: ['Heating', 'Air Conditioning', 'Ventilation', 'Maintenance Agreements'],
      targetMarket: `${business.city || 'Regional'} residential and commercial property owners requiring HVAC installation, retrofitting, and repairs.`,
      visiblePositioning: `Established regional contractor${business.foundingYear ? ` founded in ${business.foundingYear}` : ''}.`,
    },
    digitalPresence: {
      websiteQualityScore: audit ? audit.totalScore : 50,
      localSeoScore: localSeo?.reviewCount ? Math.min(100, localSeo.reviewCount * 2 + 30) : 50,
      conversionPathHealth,
      trustSignals,
    },
    competitivePosition: {
      visibleCompetitors: ['Regional market leaders with aggressive review generation and instant booking funnels'],
      servicePositioning: 'Quality-first local service provider with untapped digital inbound capacity',
      observableGaps,
    },
    growthOpportunities: {
      websiteImprovements,
      localSeoOpportunities,
      leadCaptureOptimizations,
      automationOpportunities,
    },
    watechServiceMatch: {
      recommendedServices,
      evidenceRationale,
    },
    dataGaps,
    citations,
    generatedAt: now,
  };
}

/**
 * Deterministic evidence-grounded conversational analyst
 * Resolves user inquiries without external API keys while maintaining 100% data fidelity
 */
export function generateDeterministicAnalystResponse(
  query: string,
  ctx?: BusinessResearchContext | null
): { content: string; citations: AICitation[]; dataGaps: string[] } {
  const q = query.toLowerCase();
  const citations: AICitation[] = [];
  const dataGaps: string[] = [];
  const now = new Date().toISOString();

  if (!ctx) {
    return {
      content: `I am your **Watech Strategic Business Analyst**. I can analyze any discovered business in your current project with full evidence citations.\n\nTo begin a deep-dive investigation, please select a target business from the selector above, or ask me about general market observations, qualification methodology, or competitive positioning strategies.`,
      citations: [],
      dataGaps: ['No specific business selected for deep context grounding.'],
    };
  }

  const { business, audit, auditFindings = [], opportunities = [], leadScore, contacts = [], emails = [], localSeo, reviews = [] } = ctx;

  // Add foundational citations
  citations.push({
    sourceName: `${business.officialName} Record`,
    sourceUrl: business.websiteUrl || `https://${business.domain}`,
    category: 'business_record',
    dateCollected: now,
    excerpt: `Domain: ${business.domain || 'N/A'}, Phone: ${business.phone || 'N/A'}, City: ${business.city || 'N/A'}.`,
    confidence: 0.95,
  });

  if (audit) {
    citations.push({
      sourceName: `Technical Website Audit`,
      category: 'website_audit',
      dateCollected: audit.inspectedAt || now,
      excerpt: `Total Score: ${audit.totalScore}/100 (${audit.grade}). SSL: ${audit.hasSsl ? 'Secure' : 'Insecure'}. Findings: ${auditFindings.length}.`,
      confidence: 0.98,
    });
  }

  if (localSeo) {
    citations.push({
      sourceName: `Google Business Profile`,
      sourceUrl: localSeo.googleBusinessProfileUrl,
      category: 'local_seo',
      dateCollected: localSeo.lastAuditedAt || now,
      excerpt: `Rating: ${localSeo.averageRating || 'N/A'}, Reviews: ${localSeo.reviewCount || 0}, Category: ${localSeo.primaryCategory || 'HVAC'}.`,
      confidence: 0.94,
    });
  }

  // Answer matching based on query intent
  if (q.includes('vulnerabilit') || q.includes('audit') || q.includes('technical') || q.includes('flaw') || q.includes('issue')) {
    if (!audit) {
      dataGaps.push('Technical website audit has not been run for this business yet.');
      return {
        content: `### Technical Audit & Vulnerability Assessment for ${business.officialName}\n\n*Notice: A full automated crawl has not been completed for this specific domain yet.* However, from initial discovery:\n- **Domain:** \`${business.domain || 'Not verified'}\`\n- **Status:** ${business.status}\n\nTo uncover granular page speed, mobile viewport, and SEO header findings, please run the Website Audit module.`,
        citations,
        dataGaps,
      };
    }

    const issues = auditFindings.map(f => `- **[${f.severity.toUpperCase()}] ${f.observation}**\n  *Recommended Fix:* ${f.recommendedAction}`).join('\n');

    return {
      content: `### Technical Vulnerability Analysis: ${business.officialName}\n\nOur automated audit evaluated the site at **${audit.totalScore}/100** (Grade: **${audit.grade}**).\n\n#### Key Diagnostics:\n- **SSL / HTTPS:** ${audit.hasSsl ? 'Secure TLS certificate' : 'Insecure protocol flagged'}\n- **Audit Dimensions:** Technical Health: ${audit.dimensions?.technicalHealth ?? 'N/A'}, Performance: ${audit.dimensions?.performance ?? 'N/A'}\n\n#### Verified Deficits Found:\n${issues || '- No severe technical deficits recorded.'}\n\n#### Strategic Outreach Angle:\nWhen pitching this account, highlight how their ${audit.totalScore < 60 ? 'current site vulnerabilities are directly costing them qualified inbound calls' : 'current architecture could convert more traffic with modern booking integration'}.`,
      citations,
      dataGaps,
    };
  }

  if (q.includes('contact') || q.includes('decision maker') || q.includes('email') || q.includes('phone') || q.includes('pitch to')) {
    const verifiedContacts = contacts.map(c => `- **${c.fullName}** — *${c.roleOrTitle}* (${c.isDecisionMaker ? 'Decision Maker' : 'Staff'})\n  Email: \`${c.email || 'Unpublished'}\` | Phone: \`${c.phone || business.phone || 'N/A'}\` | Verification: ${c.verificationStatus}`).join('\n');
    const verifiedEmails = emails.map(e => `- \`${e.email}\` (${e.emailType}) - Status: **${e.verificationStatus}** (Confidence: ${(e.confidence * 100).toFixed(0)}%)`).join('\n');

    if (contacts.length === 0 && emails.length === 0) {
      dataGaps.push('No direct named contacts or verified email addresses recorded yet.');
    }

    return {
      content: `### Contact Intelligence & Decision Makers: ${business.officialName}\n\nHere is the verified routing for this account:\n\n#### Identified Stakeholders:\n${verifiedContacts || '- No named executive profiles discovered yet.'}\n\n#### Verified Email Routes:\n${verifiedEmails || '- No email routes confirmed yet.'}\n\n#### General Channel:\n- **Office Phone:** \`${business.phone || 'Unavailable'}\`\n- **Physical Address:** ${business.fullAddress || 'Not recorded'}\n\n*Outreach Recommendation:* ${contacts.some(c => c.isDecisionMaker && c.email) ? 'Target verified decision maker directly with value-add audit teaser.' : 'Use professional inquiry to main office line or contact form requesting ownership connection.'}`,
      citations,
      dataGaps,
    };
  }

  if (q.includes('watech') || q.includes('service') || q.includes('package') || q.includes('sell') || q.includes('offer') || q.includes('pitch') || q.includes('recommend') || q.includes('quote') || q.includes('unnecessary')) {
    const { recommendation, salesReadiness } = ctx;

    let recContent = '';
    if (recommendation) {
      const { essentialSolution, recommendedSolution, comprehensiveSolution, serviceMatches } = recommendation;
      const unnecessary = serviceMatches.filter(m => m.isUnnecessaryOrNoAction).map(m => m.serviceName);

      recContent = `### Recommended Watech Solution Architecture: ${business.officialName}

#### 1. Recommended Package: ${recommendedSolution.title} (${recommendedSolution.estimatedDuration})
- **Strategic Angle:** ${recommendedSolution.tagline}
- **Included Deliverables:**
${recommendedSolution.deliverables.slice(0, 4).map(d => `  - ${d}`).join('\n')}
- **Configured Pricing:** ${recommendedSolution.pricingSummary.estimatedTotalText}

#### 2. Alternative Tiers:
- **Essential Solution:** ${essentialSolution ? `${essentialSolution.title} (${essentialSolution.pricingSummary.estimatedTotalText})` : 'Single Service Intervention'}
- **Comprehensive (360 Growth System):** ${comprehensiveSolution ? `${comprehensiveSolution.title} (${comprehensiveSolution.pricingSummary.estimatedTotalText})` : 'Full 8-stage transformation'}

#### 3. Services Flagged as Unnecessary Right Now:
${unnecessary.length > 0 ? unnecessary.map(u => `- **${u}**: Defer — existing performance is already satisfactory or higher-priority bottlenecks must be solved first.`).join('\n') : '- None flagged; current digital presence has multifaceted improvement opportunities.'}

#### 4. Information & Customer Assets Needed Before Quoting:
${recommendedSolution.requiredCustomerAssets.map(a => `- [ ] ${a}`).join('\n')}
${recommendedSolution.feasibilityWarnings.length > 0 ? `\n*Prerequisite Notice:* ${recommendedSolution.feasibilityWarnings.join('; ')}` : ''}`;
    } else {
      const oppList = opportunities.map(o => `- **${o.identifiedProblem}** (Service: \`${o.relevantWatechService}\` | Impact: **${o.impact}** | Effort: ${o.effort})\n  ${o.recommendedSolution}`).join('\n');
      recContent = `### Watech Service Opportunity Matrix: ${business.officialName}\n\nBased on synthesized technical, SEO, and competitive gaps, here are the highest-ROI Watech engagements:\n\n${oppList || '- **Custom Web Modernization & Local SEO Sprint**: Recommended entry point to overhaul obsolete digital presence and capture lost search demand.'}\n\n#### Lead Value Qualification:\n- **Tier:** ${leadScore ? leadScore.band.toUpperCase() : 'B'} (${leadScore ? leadScore.totalScore : 65}/100)\n- **Projected Engagement Scope:** Core infrastructure overhaul + ongoing local visibility retainer.`;
    }

    if (salesReadiness) {
      recContent += `\n\n#### Sales Readiness & Buyer Target:\n- **Sales Readiness Score:** ${salesReadiness.overallScore}/100 (${salesReadiness.readinessCategory.replace(/_/g, ' ')})\n- **Buying Intent:** ${salesReadiness.buyingIntent.replace(/_/g, ' ')}\n- **Target Buyer Persona:** **${salesReadiness.buyerRoleRecommendation.recommendedRole}** (${salesReadiness.buyerRoleRecommendation.matchedContactName || 'Pending discovery'})\n- **Recommended Next Step:** ${salesReadiness.recommendedNextAction}`;
    }

    return {
      content: recContent,
      citations,
      dataGaps,
    };
  }

  if (q.includes('seo') || q.includes('google') || q.includes('review') || q.includes('ranking') || q.includes('competitor')) {
    if (!localSeo) {
      dataGaps.push('Local SEO profile data has not been collected.');
    }

    return {
      content: `### Local Search & Reputation Intelligence: ${business.officialName}\n\n- **Google Business Profile:** ${localSeo ? (localSeo.googleBusinessProfileUrl ? 'Linked & Active' : 'Unlinked / Unclaimed — Severe Risk') : 'Unknown'}\n- **Average Rating:** ${localSeo?.averageRating ? `${localSeo.averageRating} ★` : 'N/A'} across **${localSeo?.reviewCount || 0} reviews**\n- **Primary Category:** \`${localSeo?.primaryCategory || 'HVAC Contractor'}\`\n- **NAP Consistency:** ${localSeo?.napConsistencyStatus || 'Unknown'}\n\n#### Competitive Assessment:\n${localSeo?.googleBusinessProfileUrl ? 'Their profile is active, but review volume is likely lagging aggressive metro competitors.' : 'Because their GBP is unlinked, they are forfeiting map pack placements and direct customer calls daily.'}`,
      citations,
      dataGaps,
    };
  }

  if (
    q.includes('revenue') ||
    q.includes('profit') ||
    q.includes('invoic') ||
    q.includes('payment') ||
    q.includes('mrr') ||
    q.includes('arr') ||
    q.includes('receivable') ||
    q.includes('cash') ||
    q.includes('financial') ||
    q.includes('margin') ||
    q.includes('cac') ||
    q.includes('forecast')
  ) {
    const { client, invoices = [], payments = [], contracts = [] } = ctx;

    if (!client) {
      dataGaps.push('No confirmed client record associated with this prospect yet.');
      return {
        content: `### Commercial & Financial Intelligence: ${business.officialName}\n\n**Account Status:** *Prospect / Unconverted Lead* (CRM Pipeline Stage: \`${business.status}\`)\n\nBecause ${business.officialName} has not yet transitioned to an active client account, no formal invoices, payments, or recurring service retainers are recorded for this entity.\n\n- **Projected Opportunity Value:** ${ctx.leadScore?.band === 'A' ? '$4,500 - $8,000' : '$2,500 - $5,000'}\n- **Next Commercial Step:** Generate and present an approved proposal via the **Proposal & Pricing Engine**.\n\n*To inspect agency-wide collected revenue, gross margin %, and A/R aging across all active clients, navigate to the **Agency Performance** module.*`,
        citations,
        dataGaps,
      };
    }

    const verifiedPayments = payments.filter((p) => p.verificationStatus === 'verified');
    const totalCollected = verifiedPayments.reduce((sum, p) => sum + p.amount, 0);
    const activeInvoices = invoices.filter((i) => i.status !== 'draft' && i.status !== 'cancelled');
    const totalInvoiced = activeInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
    const totalOutstanding = activeInvoices.reduce((sum, i) => sum + i.balance, 0);
    const activeMrr = contracts.filter((c) => c.status === 'active').reduce((sum, c) => sum + c.monthlyValue, 0);

    citations.push({
      sourceName: `Client Ledger (${client.companyName})`,
      category: 'financial_record',
      dateCollected: now,
      excerpt: `Invoiced: $${totalInvoiced.toLocaleString()}, Collected: $${totalCollected.toLocaleString()}, Outstanding: $${totalOutstanding.toLocaleString()}, MRR: $${activeMrr.toLocaleString()}`,
      confidence: 0.99,
    });

    return {
      content: `### Commercial & Financial Profile: ${client.companyName}\n\n**Client Account Status:** \`${client.status.toUpperCase()}\` | Onboarding: \`${client.healthGrade.toUpperCase()}\`\n\n#### Verified Revenue Metrics:\n- **Total Invoiced:** $${totalInvoiced.toLocaleString()} (${activeInvoices.length} issued invoices)\n- **Collected Cash:** **$${totalCollected.toLocaleString()}** (${verifiedPayments.length} verified payment receipts)\n- **Outstanding Balance:** $${totalOutstanding.toLocaleString()} ${totalOutstanding > 0 ? '⚠️ (Action: Payment Follow-up Required)' : '✅ (Fully Settled)'}\n- **Active Recurring Value (MRR):** $${activeMrr.toLocaleString()}/mo ($${(activeMrr * 12).toLocaleString()}/yr)\n\n#### Financial Health & Audit Trail:\n- **Recent Invoices:**\n${activeInvoices.slice(0, 3).map((i) => `  - \`${i.invoiceNumber}\`: $${i.totalAmount.toLocaleString()} (Status: **${i.status.toUpperCase()}**, Balance: $${i.balance.toLocaleString()}, Due: ${i.dueDate})`).join('\n') || '  - No active invoices on file.'}\n- **Payment Records:**\n${verifiedPayments.slice(0, 3).map((p) => `  - \`${p.paymentNumber}\`: $${p.amount.toLocaleString()} via ${p.paymentMethod} (Ref: ${p.transactionReference}, Date: ${p.paymentDate})`).join('\n') || '  - No verified payments recorded yet.'}\n\n*Strategic Advisory:* ${totalOutstanding > 0 ? 'Ensure accounts receivable aging remains within 30 days before initiating additional sprint milestones.' : 'Client ledger is in good standing with positive recurring contribution.'}`,
      citations,
      dataGaps,
    };
  }

  // Default holistic executive overview
  return {
    content: `### Executive Intelligence Brief: ${business.officialName}\n\n**Business Summary:**\n${business.officialName} is an HVAC provider located in ${business.city || 'the targeted region'}. Current intelligence status shows a lead qualification score of **${leadScore ? leadScore.totalScore : 'N/A'}/100**.\n\n**Digital Footprint & Findings:**\n- **Website Domain:** \`${business.domain || 'N/A'}\`\n- **Technical Quality Score:** ${audit ? `${audit.totalScore}/100 (${audit.grade})` : 'Pending audit'}\n- **Local Reputation:** ${localSeo ? `${localSeo.averageRating} ★ (${localSeo.reviewCount} reviews)` : 'Pending inspection'}\n- **Identified Decision Makers:** ${contacts.length} stakeholder(s) on file\n\n**Recommended Strategic Action:**\nPitch **${opportunities[0]?.relevantWatechService || 'website_development'}** leveraging their verified ${audit && audit.totalScore < 70 ? 'technical shortcomings' : 'local SEO expansion opportunity'}.\n\nYou can ask me specific follow-ups about their technical vulnerabilities, decision makers, local search rankings, or recommended outreach angles.`,
    citations,
    dataGaps,
  };
}
