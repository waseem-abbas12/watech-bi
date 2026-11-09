import { BrandingConfiguration, ProposalSection, ProposalTemplateType } from '@/types';

export const DEFAULT_BRANDING_CONFIG: BrandingConfiguration = {
  id: 'default_branding',
  companyName: 'Watech Growth Agency',
  logoUrl: '',
  website: 'https://watech-bi.com',
  contactEmail: 'contact@watech-bi.com',
  phone: '+1 (800) 555-WATECH',
  address: '100 Crescent Court, Suite 700, Dallas, TX 75201',
  primaryColor: '#2563eb',
  accentColor: '#0ea5e9',
  footerText: 'Watech Growth Agency — Proprietary Commercial Proposal & Systems Architecture',
  signatureName: 'Watech Commercial Solutions Architect',
  signatureTitle: 'Principal Growth Solutions Architect',
  isDefault: true,
};

export const STANDARD_TERMS_AND_CONDITIONS = `### Standard Commercial Terms & Service Agreement

1. **Payment Terms**
   - 50% deposit upon project execution and kickoff authorization.
   - 25% interim milestone invoice upon completion of Phase 2 (Core Deliverables / Staging).
   - 25% balance due prior to production handover, domain deployment, or credential transfer.
   - Recurring service retainers are billed on the 1st of each calendar month via automated direct ACH / credit card.

2. **Revisions & Iteration Scope**
   - Included deliverables accommodate up to two (2) consolidated rounds of feedback per milestone.
   - Scope expansions or additional functional requirements will be itemized via written Change Order before implementation begins.

3. **Client Responsibilities & Asset Provision**
   - The Client agrees to provide necessary access credentials (DNS, hosting, Google Business Profile, analytics) and high-resolution brand assets within five (5) business days of kickoff.
   - Project delivery timelines commence upon receipt of all prerequisite materials.

4. **Intellectual Property Rights**
   - Upon receipt of final payment, full intellectual property and ownership rights for all custom creative assets, copywriting, code modifications, and configured digital properties transfer entirely to the Client.
   - Pre-existing proprietary agency libraries, operational frameworks, and scraper architectures remain the intellectual property of Watech.

5. **Confidentiality & Data Protection**
   - Both parties agree to protect and treat all proprietary business data, customer lists, lead metrics, and technical configurations as strictly confidential.
   - Watech adheres to industry-standard data security and privacy protocols across all customer data pipelines.

6. **Cancellation & Kill Fee**
   - Either party may terminate this agreement with thirty (30) days written notice.
   - Completed milestones and work-in-progress up to the termination effective date remain payable in full.
`;

export interface TemplateDefinition {
  type: ProposalTemplateType;
  name: string;
  badge: string;
  description: string;
  recommendedTimeline: string;
  defaultPaymentTerms: string;
  sections: Array<{
    sectionType: string;
    title: string;
    defaultMarkdown: (context: {
      businessName: string;
      primaryProblem: string;
      solutionName: string;
      timeline: string;
    }) => string;
  }>;
}

export const PROPOSAL_TEMPLATES: Record<ProposalTemplateType, TemplateDefinition> = {
  premium_business: {
    type: 'premium_business',
    name: 'Executive Transformation & Growth System',
    badge: 'Enterprise 360',
    description: 'Full-spectrum digital infrastructure overhaul, high-converting web platform, local search dominance, and automated lead capture pipeline.',
    recommendedTimeline: '6 to 8 Weeks',
    defaultPaymentTerms: '50% Kickoff / 25% Staging Review / 25% Production Handover',
    sections: [
      {
        sectionType: 'cover',
        title: 'Project Title & Executive Presentation',
        defaultMarkdown: ({ businessName }) => `# Strategic Growth & Digital Modernization Proposal
**Prepared Exclusively for:** ${businessName}
**Architected by:** Watech Growth Agency
**Confidential Commercial Proposal**
*This proposal contains verified technical intelligence, market analysis, and a structured scope of work.*`,
      },
      {
        sectionType: 'executive_summary',
        title: 'Executive Summary',
        defaultMarkdown: ({ businessName, primaryProblem }) => `## Executive Summary

${businessName} operates in a highly competitive market where customer acquisition increasingly relies on speed, digital credibility, and seamless mobile engagement.

Based on our verified business intelligence audit, ${businessName} possesses high commercial reputation potential but is currently constrained by key infrastructure bottlenecks:
- **Primary Operational Constraint:** ${primaryProblem}
- **Market Opportunity:** Capturing higher-margin direct customer inquiries before competitors intercept them.

Watech proposes an integrated growth system engineered to modernize your customer-facing digital touchpoints, optimize local search capture, and automate inbound inquiry routing.`,
      },
      {
        sectionType: 'business_assessment',
        title: 'Business Assessment & Verified Findings',
        defaultMarkdown: ({ businessName }) => `## Current State Assessment

Our technical evaluation of ${businessName}'s digital assets revealed several critical areas where commercial intent is lost:

1. **Website Performance & Conversion:** Core Web Vitals audit indicates page load latency and mobile UX friction that depress conversion rates from organic and paid visitors.
2. **Local Search Visibility:** Local search coverage displays gaps in local map pack positioning and keyword ranking relative to leading regional competitors.
3. **Inbound Response Latency:** Without automated response pipelines, inbound leads experience delayed follow-ups, decreasing qualification probability.`,
      },
      {
        sectionType: 'recommended_solution',
        title: 'Recommended Solution Architecture',
        defaultMarkdown: ({ businessName, solutionName }) => `## Proposed Solution: ${solutionName}

We recommend implementing our cohesive commercial package engineered specifically for ${businessName}.

The core pillars include:
- **High-Velocity Digital Platform:** Modernized web presence built with clean code, sub-second load times, and structured call-to-action triggers.
- **Local Search Dominance Engine:** Optimized Google Business Profile, local directory synchronization, and proactive review generation workflows.
- **Automated Lead Routing:** Instant SMS/email notifications and lead capture sync directly into your operational workflow.`,
      },
      {
        sectionType: 'scope_of_work',
        title: 'Scope of Work & Deliverables',
        defaultMarkdown: () => `## Detailed Scope of Work

### Phase 1: Foundation & Asset Modernization
- Complete redesign and implementation of core business web platform.
- Full responsive optimization for mobile, tablet, and desktop viewports.
- On-page technical SEO, schema markup, and meta tag optimization.

### Phase 2: Local Authority & Reputation
- Local citation audit, duplicate suppression, and NAP consistency cleanup.
- Google Business Profile category optimization, service catalog publishing, and image geotagging.
- Automated client review solicitation workflow integration.

### Phase 3: Inbound Routing & Conversion Integration
- Interactive lead capture forms with instant notification webhooks.
- CRM or email integration for real-time prospect handoffs.
- End-to-end user journey testing and analytics tracking setup.`,
      },
      {
        sectionType: 'implementation_roadmap',
        title: 'Implementation Roadmap',
        defaultMarkdown: ({ timeline }) => `## Phased Implementation Schedule (${timeline})

- **Weeks 1–2 (Discovery & Architecture):** Technical kickoff, asset consolidation, sitemap design, and wireframing.
- **Weeks 3–4 (Build & Content Development):** Development environment build, copywriting review, and responsive styling.
- **Weeks 5–6 (Integration & Local SEO):** Local schema implementation, directory sync, and automated lead webhook testing.
- **Weeks 7–8 (Quality Assurance & Production Launch):** Cross-browser verification, DNS cutover, Google indexing, and staff training.`,
      },
      {
        sectionType: 'terms_and_conditions',
        title: 'Terms & Service Agreement',
        defaultMarkdown: () => STANDARD_TERMS_AND_CONDITIONS,
      },
      {
        sectionType: 'next_steps',
        title: 'Authorization & Next Steps',
        defaultMarkdown: ({ businessName }) => `## Next Steps to Kickoff

To proceed with this engagement:

1. **Review & Approve:** Confirm acceptance of the scope and commercial quotation below.
2. **Signatory Authorization:** Sign the authorized approval section below.
3. **Kickoff Consultation:** Complete our 30-minute technical onboarding session and submit required credentials.
4. **Commencement:** Project implementation begins within three (3) business days of kickoff deposit receipt.

---
**Authorized Acceptance for ${businessName}:**

Signature: _________________________________________ Date: ___________________

Printed Name: ______________________________________ Title: __________________`,
      },
    ],
  },

  website_digital: {
    type: 'website_digital',
    name: 'High-Performance Web Platform & UX Redesign',
    badge: 'Digital Infrastructure',
    description: 'Speed-optimized, mobile-first website revamp with sub-second page loads, conversion rate optimization, and complete technical SEO.',
    recommendedTimeline: '4 to 6 Weeks',
    defaultPaymentTerms: '50% Upon Engagement / 50% Upon Production Launch',
    sections: [
      {
        sectionType: 'cover',
        title: 'Website & Digital Platform Proposal',
        defaultMarkdown: ({ businessName }) => `# Digital Experience & Website Modernization Proposal
**Prepared For:** ${businessName}
**Agency:** Watech Growth Agency
**Focus:** Speed, Conversion Rate Optimization & Mobile UX`,
      },
      {
        sectionType: 'executive_summary',
        title: 'Executive Summary',
        defaultMarkdown: ({ businessName, primaryProblem }) => `## Executive Summary

Your website is the single most critical asset in your sales pipeline. When prospective clients research ${businessName}, their initial impression is shaped in under three seconds.

Current digital audit signals reveal:
- **Observed Challenge:** ${primaryProblem}
- **Objective:** Eliminate visitor bounce rates, elevate mobile engagement, and convert qualified visitors into paying clients.`,
      },
      {
        sectionType: 'business_assessment',
        title: 'Audit Findings & Technical Analysis',
        defaultMarkdown: () => `## Technical Audit Findings

- **Mobile Viewport Usability:** Layout shifts and non-optimized assets impede mobile visitor conversion.
- **Page Load Latency:** Lighthouse performance metrics indicate uncompressed assets and blocking scripts.
- **Technical SEO Gaps:** Missing structured data (JSON-LD LocalBusiness schema), incomplete meta descriptions, and non-canonical URL structures.`,
      },
      {
        sectionType: 'recommended_solution',
        title: 'Recommended Solution',
        defaultMarkdown: () => `## High-Performance Web Solution

Watech will engineer a clean, bespoke, lightning-fast digital platform:
- Sub-second first contentful paint (FCP) and optimal Core Web Vitals.
- Intuitive user journeys highlighting your signature services, verified reviews, and simple quote requests.
- Full responsive compatibility across all modern devices and screen resolutions.`,
      },
      {
        sectionType: 'scope_of_work',
        title: 'Scope of Work',
        defaultMarkdown: () => `## Deliverables & Technical Scope

1. Complete custom responsive website design (Homepage, About, Services, Case Studies/Reviews, Contact/Quote).
2. Modern, accessible UI/UX components with clear calls to action.
3. Content migration, copywriting polish, and high-resolution asset compression.
4. Comprehensive on-page SEO: Title tags, meta descriptions, image alt tags, XML sitemap, and Schema markup.
5. Google Analytics 4 (GA4) and Google Tag Manager conversion event tracking.`,
      },
      {
        sectionType: 'implementation_roadmap',
        title: 'Project Timeline',
        defaultMarkdown: ({ timeline }) => `## Implementation Timeline (${timeline})

- **Week 1:** UI/UX wireframes and brand design alignment.
- **Weeks 2–3:** Frontend development and mobile optimization.
- **Week 4:** Content integration, technical SEO, and conversion testing.
- **Week 5:** Staging review, client feedback revisions, and production deployment.`,
      },
      {
        sectionType: 'terms_and_conditions',
        title: 'Terms & Conditions',
        defaultMarkdown: () => STANDARD_TERMS_AND_CONDITIONS,
      },
      {
        sectionType: 'next_steps',
        title: 'Project Authorization',
        defaultMarkdown: ({ businessName }) => `## Ready to Proceed

Sign below to approve this website modernization proposal and reserve your implementation slot.

Authorized Signature: _________________________________________ Date: ___________________
For: ${businessName}`,
      },
    ],
  },

  marketing_leadgen: {
    type: 'marketing_leadgen',
    name: 'Local Search Dominance & Inbound Lead Engine',
    badge: 'Marketing & SEO',
    description: 'Dominate local Google Map Pack rankings, clean up citation directories, automate 5-star customer reviews, and capture high-intent local buyers.',
    recommendedTimeline: 'Ongoing (3-Month Initial Cycle)',
    defaultPaymentTerms: 'Monthly Retainer billed on the 1st of each month (3-month minimum commitment)',
    sections: [
      {
        sectionType: 'cover',
        title: 'Local SEO & Growth Proposal',
        defaultMarkdown: ({ businessName }) => `# Local Search Dominance & Customer Acquisition Strategy
**Target Business:** ${businessName}
**Strategy Provider:** Watech Growth Agency
**Focus Area:** Google Map Pack, Local Citations, Review Velocity & Local Inbound Demand`,
      },
      {
        sectionType: 'executive_summary',
        title: 'Strategic Overview',
        defaultMarkdown: ({ businessName, primaryProblem }) => `## Strategic Overview

Local high-intent searches represent the highest-converting customer source for regional service businesses.

For ${businessName}, our market analysis indicates:
- **Current Position:** ${primaryProblem}
- **Growth Objective:** Secure top 3 Google 3-Pack placement for target search keywords in your geographic service radius.`,
      },
      {
        sectionType: 'business_assessment',
        title: 'Competitive Market Assessment',
        defaultMarkdown: () => `## Local Competitive Assessment

- **Google Business Profile:** Profile completeness is sub-optimal; service category hierarchy and photo updates lag market leaders.
- **Citation Ecosystem:** Discrepancies identified in secondary directory listings (NAP inconsistency), eroding algorithmic trust.
- **Review Velocity:** Competitors average higher monthly review influx, giving them an algorithmic edge in Google Map Pack selection.`,
      },
      {
        sectionType: 'recommended_solution',
        title: 'Local Growth Strategy',
        defaultMarkdown: () => `## The Local Dominance Blueprint

1. **Google Business Profile Optimization:** Complete overhaul of categories, geo-tagged photo uploads, service attributes, and weekly promotional posts.
2. **Local Citation Network:** Correction and synchronization across tier-1 directories (Apple Maps, Bing Places, Yelp, YellowPages, industry catalogs).
3. **Automated Review Solicitation:** Frictionless SMS/email review request system to generate verified 5-star customer feedback.`,
      },
      {
        sectionType: 'scope_of_work',
        title: 'Deliverables & Monthly Activities',
        defaultMarkdown: () => `## Scope of Work

- Initial 40+ local business directory citations and duplicate suppression.
- Ongoing monthly Google Business Profile management (4 weekly updates, Q&A seeding, photo uploads).
- Review acceleration workflow setup with QR code and automated post-service SMS templates.
- Monthly keyword rank tracking and local visibility benchmarking reports.`,
      },
      {
        sectionType: 'implementation_roadmap',
        title: 'Execution Roadmap',
        defaultMarkdown: () => `## Implementation Roadmap

- **Month 1:** Comprehensive citation audit, NAP cleanup, and Google Business Profile optimization overhaul.
- **Month 2:** Review generation system rollout and geo-targeted service page optimization.
- **Month 3:** Rank monitoring, competitor counter-positioning, and quarterly performance review.`,
      },
      {
        sectionType: 'terms_and_conditions',
        title: 'Commercial Terms',
        defaultMarkdown: () => STANDARD_TERMS_AND_CONDITIONS,
      },
      {
        sectionType: 'next_steps',
        title: 'Campaign Activation',
        defaultMarkdown: ({ businessName }) => `## Campaign Authorization

Sign below to authorize the local search dominance program for ${businessName}.

Authorized Representative: ___________________________________ Date: ___________________`,
      },
    ],
  },

  automation_software: {
    type: 'automation_software',
    name: 'Workflow Automation & CRM Pipeline Integration',
    badge: 'Automation & CRM',
    description: 'Eliminate manual data entry, streamline lead triage, connect business software with webhooks, and automate client follow-ups.',
    recommendedTimeline: '3 to 5 Weeks',
    defaultPaymentTerms: '50% Kickoff / 50% Functional Acceptance',
    sections: [
      {
        sectionType: 'cover',
        title: 'Systems & Automation Proposal',
        defaultMarkdown: ({ businessName }) => `# Operational Workflow Automation & Systems Integration
**Prepared For:** ${businessName}
**Provider:** Watech Growth Agency
**Objective:** Operational Efficiency, Zero Lost Leads & Automated Follow-Up Workflows`,
      },
      {
        sectionType: 'executive_summary',
        title: 'Executive Summary',
        defaultMarkdown: ({ businessName, primaryProblem }) => `## Executive Summary

Manual lead processing and disconnected software tools cost businesses hours of productive time and lead to missed revenue opportunities.

For ${businessName}:
- **Operational Challenge:** ${primaryProblem}
- **Solution:** Connect your inquiry channels into an automated, error-free workflow that ensures every lead is answered within seconds.`,
      },
      {
        sectionType: 'business_assessment',
        title: 'Workflow Assessment',
        defaultMarkdown: () => `## Current Workflow Friction

- Inbound lead notifications are delayed or siloed in employee inboxes.
- Repetitive customer onboarding steps require manual data entry across multiple tools.
- Absence of structured automated reminders leads to lost follow-up opportunities.`,
      },
      {
        sectionType: 'recommended_solution',
        title: 'Automated Architecture',
        defaultMarkdown: () => `## Proposed Automation Engine

- **Real-Time Webhook Bridge:** Instant lead forwarding to CRM, Google Sheets, Slack, or SMS.
- **Automated Immediate Response:** Instant customized confirmation emails/texts confirming inquiry receipt and setting expectations.
- **Status Progression Pipeline:** Automatic milestone notifications for clients as their service progresses.`,
      },
      {
        sectionType: 'scope_of_work',
        title: 'Technical Deliverables',
        defaultMarkdown: () => `## Scope of Work

1. Integration of website capture endpoints with central lead management database.
2. Automated SMS/Email dispatch rules triggered on incoming inquiries.
3. Notification routing based on urgency, service category, or business hours.
4. Error handling, payload logging, and automated retry mechanisms.
5. System documentation and 1-hour staff training session.`,
      },
      {
        sectionType: 'implementation_roadmap',
        title: 'Implementation Schedule',
        defaultMarkdown: ({ timeline }) => `## Timeline (${timeline})

- **Week 1:** Process mapping, API credential audit, and webhook blueprint.
- **Week 2:** Automation triggers and workflow build.
- **Week 3:** Sandbox testing, edge case validation, and end-to-end simulation.
- **Week 4:** Production deployment and staff walkthrough.`,
      },
      {
        sectionType: 'terms_and_conditions',
        title: 'Standard Terms',
        defaultMarkdown: () => STANDARD_TERMS_AND_CONDITIONS,
      },
      {
        sectionType: 'next_steps',
        title: 'Approval',
        defaultMarkdown: ({ businessName }) => `## Authorization

Approved for implementation on behalf of ${businessName}:

Signature: _________________________________________ Date: ___________________`,
      },
    ],
  },

  compact_quotation: {
    type: 'compact_quotation',
    name: 'Compact Quotation & Statement of Work',
    badge: 'Quick Quote',
    description: 'Fast, concise commercial estimate with clearly itemized line items, deliverables, and payment schedule. Perfect for fast turnaround deals.',
    recommendedTimeline: '2 to 3 Weeks',
    defaultPaymentTerms: '50% Upon Acceptance / 50% Upon Delivery',
    sections: [
      {
        sectionType: 'cover',
        title: 'Commercial Quotation',
        defaultMarkdown: ({ businessName }) => `# Commercial Quotation & Work Scope
**Client:** ${businessName}
**Issued By:** Watech Growth Agency
**Quotation Validity:** 30 Days from Issue Date`,
      },
      {
        sectionType: 'recommended_solution',
        title: 'Deliverables Summary',
        defaultMarkdown: ({ solutionName }) => `## Deliverables: ${solutionName}

This quotation encompasses the deliverables itemized in the commercial schedule below, executed according to Watech's professional quality standards.`,
      },
      {
        sectionType: 'terms_and_conditions',
        title: 'Commercial Terms',
        defaultMarkdown: () => STANDARD_TERMS_AND_CONDITIONS,
      },
      {
        sectionType: 'next_steps',
        title: 'Acceptance',
        defaultMarkdown: ({ businessName }) => `## Quotation Acceptance

To accept this quotation and authorize commencement of work:

Accepted by: ________________________________________ (Signature)
Name / Title: _______________________________________ 
For: ${businessName}
Date: ________________________`,
      },
    ],
  },
};
