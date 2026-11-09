import type {
  ResearchProject,
  MarketArea,
  Business,
  WebsiteAudit,
  AuditFinding,
  IntelligenceFact,
  ContentItem,
  Opportunity,
  LeadScore,
  Contact,
  EmailDiscoveryRecord,
  SourceRecord,
  OutreachDraft,
  LocalSeoProfile,
  LocalReview,
  ContentCalendarItem,
  CustomerQuestionInsight,
  FollowUpSchedule,
  CrmActivity,
  BusinessProposal,
  ProposalQuotation,
  ClientProfile,
  ClientOnboarding,
  ClientRequirement,
  ClientAsset,
  ClientProject,
  ProjectMilestone,
  ProjectTask,
  TeamMember,
  Deliverable,
  DeliverableRevision,
  ClientCommunication,
  ProjectExpense,
  AgencyInvoice,
  PaymentRecord,
  AgencyExpense,
  RecurringContract,
  FinancialAuditLog,
  ClientPortalUser,
  ClientRequest,
  ClientNotification,
  ClientApprovalRecord,
  AutomationWorkflow,
  AutomationExecution,
  AutomationApproval,
  IntegrationConnection,
  WebhookEndpoint,
  WebhookDelivery,
  CeoTarget,
  CeoDailyBriefing,
  CeoWeeklyReview,
  CeoNextBestAction,
  Tenant,
  TenantBranding,
  TenantPlan,
  TenantSubscription,
  TenantUser,
  TenantModuleConfig,
  TenantUsage,
  TenantDomain,
} from '@/types';
import { repository } from './repository';
import { calculateLeadScore } from '@/lib/engines/scoring';
import { generateOpportunities } from '@/lib/engines/opportunities';
import { generateOutreachBrief } from '@/lib/engines/outreach';
import { generateProspectOutreachStrategy } from '@/lib/engines/outreachStrategyEngine';
import { DEFAULT_WATECH_SERVICES, DEFAULT_WATECH_PACKAGES } from '@/lib/engines/serviceCatalogData';
import { DEFAULT_BRANDING_CONFIG, STANDARD_TERMS_AND_CONDITIONS } from '@/lib/engines/proposalTemplatesData';
import { DEFAULT_TEAM_MEMBERS, ONBOARDING_TEMPLATES } from '@/lib/engines/projectTemplatesData';
import { AUTOMATION_TEMPLATES } from '@/lib/engines/automationTemplates';
import { seedCantonRealData } from './cantonHvacRealSeed';

export const DEMO_PROJECT: ResearchProject = {
  id: 'proj-demo-dfw-hvac',
  name: '[DEMO] Dallas-Fort Worth Commercial HVAC & Mechanical Intelligence',
  country: 'United States',
  stateRegion: 'Texas',
  cityArea: 'Dallas-Fort Worth Metroplex',
  industryNiche: 'Commercial HVAC, Refrigeration & Mechanical Services',
  businessModel: 'commercial',
  targetBusinessSize: '15-100 technicians / $3M-$25M revenue',
  targetServices: 'Chiller maintenance, rooftop units (RTU), commercial building automation, emergency repair',
  targetCustomerSegment: 'Facility managers, commercial property managers, industrial warehouses',
  competitorNames: 'TDIndustries, Brandt Companies, Encompass Supply',
  watechServicesToEvaluate: [
    'website_development',
    'local_seo',
    'conversion_optimization',
    'automation',
    'crm',
    'lead_generation',
  ],
  researchDepth: 'standard',
  notesAndExclusions: 'Focus on independent mechanical contractors with 5+ service vehicles. Exclude national franchises.',
  isDemo: true,
  createdAt: '2026-10-15T09:00:00.000Z',
  updatedAt: '2026-11-01T14:30:00.000Z',
};

export const DEMO_MARKET_AREA: MarketArea = {
  id: 'market-dfw-1',
  projectId: DEMO_PROJECT.id,
  name: 'Dallas-Fort Worth Metroplex Primary Industrial Corridor',
  country: 'United States',
  region: 'Texas',
  geographicBoundaries: 'DFW Metroplex including Dallas, Tarrant, Collin, and Denton counties (I-35E, I-35W, I-635 loops)',
  relevantCategories: [
    'Commercial Mechanical Contractors',
    'Industrial HVAC/R Service',
    'Building Automation Controls',
    'Chiller & Boiler Maintenance',
  ],
  estimatedBusinessCount: 142,
  countSourceUrl: 'https://census.gov/naics/238220/dfw-benchmarks',
  countConfidence: 0.85,
  independentVsFranchiseRatio: '72% Independent / 28% Corporate Chains & PE-backed rollups',
  residentialCommercialSplit: '65% Commercial Only / 35% Mixed Residential-Commercial',
  seasonalityAndDemandNotes: 'Extreme summer peak (May-September) driven by rooftop chiller failure rates. Winter freeze spikes (Jan-Feb). Spring preventative maintenance window (March-April).',
  competitorsOverview: 'Dominant regional players hold major corporate accounts; middle-tier contractors ($3M-$12M) lack digital quoting systems.',
  digitalMaturityPattern: 'Low-to-medium. 62% of regional contractors lack mobile-responsive service pages; only 14% offer after-hours instant dispatch booking.',
  underservedGaps: 'Commercial building automation monitoring, rapid chiller emergency quote response, suburbs north of Plano/Frisco.',
  marketRisks: 'Labor shortages for EPA Universal certified technicians, rising refrigerant costs, PE consolidation acquiring mid-tier operators.',
  coveragePercentage: 78,
  createdAt: '2026-10-15T10:00:00.000Z',
};

let activeSeedingPromise: Promise<void> | null = null;

export async function seedDemoData(): Promise<void> {
  if (activeSeedingPromise) {
    return activeSeedingPromise;
  }

  activeSeedingPromise = (async () => {
    try {
      await executeSeedDemoData();
    } finally {
      activeSeedingPromise = null;
    }
  })();

  return activeSeedingPromise;
}

async function executeSeedDemoData(): Promise<void> {
  const existingProject = await repository.getProject(DEMO_PROJECT.id);
  if (existingProject) {
    const existingTenants = await repository.getTenants();
    if (existingTenants.length === 0) {
      await seedMultiTenantDemoData();
    }
    const existingLocalProfiles = await repository.getLocalSeoProfiles(DEMO_PROJECT.id);
    if (existingLocalProfiles.length === 0) {
      await seedLocalSeoDemoData();
    }
    const existingCalendar = await repository.getContentCalendarItems(undefined, DEMO_PROJECT.id);
    if (existingCalendar.length === 0) {
      await seedContentIntelligenceDemoData();
    }
    const existingSchedules = await repository.getFollowUpSchedules(DEMO_PROJECT.id);
    if (existingSchedules.length === 0) {
      await seedCrmDemoData();
    }
    const existingServices = await repository.getServices();
    if (existingServices.length === 0) {
      await repository.saveServices(DEFAULT_WATECH_SERVICES);
      await repository.savePackages(DEFAULT_WATECH_PACKAGES);
    }
    const existingProposals = await repository.getProposals(DEMO_PROJECT.id);
    if (existingProposals.length === 0) {
      await seedProposalsDemoData();
    }
    const existingClients = await repository.getClients();
    if (existingClients.length === 0) {
      await seedClientProjectsDemoData();
    }
    const existingInvoices = await repository.getInvoices();
    if (existingInvoices.length === 0) {
      await seedAgencyPerformanceDemoData();
    }
    const existingPortalUsers = await repository.getClientPortalUsers();
    if (existingPortalUsers.length === 0) {
      await seedClientPortalDemoData();
    }
    const existingWorkflows = await repository.getAutomationWorkflows();
    if (existingWorkflows.length === 0) {
      await seedAutomationDemoData();
    }
    const existingTargets = await repository.getCeoTargets();
    if (existingTargets.length === 0) {
      await seedCeoCommandCenterDemoData();
    }
    await seedAustinDemoData();
    await seedCantonRealData();
    return; // Already seeded primary
  }

  // Seed Multi-Tenant & Platform Configuration First so TenantProvider immediately resolves
  await seedMultiTenantDemoData();

  // Seed Catalog
  await repository.saveServices(DEFAULT_WATECH_SERVICES);
  await repository.savePackages(DEFAULT_WATECH_PACKAGES);

  // 1. Save Project & Market Area
  await repository.saveProject(DEMO_PROJECT);
  await repository.saveMarketArea(DEMO_MARKET_AREA);
  await seedAustinDemoData();
  await seedCantonRealData();

  // 2. Businesses
  const businesses: Business[] = [
    {
      id: 'biz-apex-mechanical',
      projectId: DEMO_PROJECT.id,
      officialName: 'Apex Mechanical Solutions Inc',
      brandName: 'Apex Mechanical TX',
      domain: 'apexmechanicaltx.com',
      websiteUrl: 'https://apexmechanicaltx.com',
      phone: '(214) 555-0144',
      email: 'service@apexmechanicaltx.com',
      fullAddress: '11420 Emerald St, Dallas, TX 75229',
      city: 'Dallas',
      state: 'Texas',
      country: 'United States',
      postalCode: '75229',
      serviceArea: 'Dallas, Irving, Carrollton, Farmers Branch',
      businessModel: 'Commercial HVAC & Chiller Services',
      foundingYear: 2011,
      teamSizeEstimate: '28-35 employees (18 field techs)',
      fleetCapacity: '16 wrapped service vans',
      ownerManagerName: 'Marcus Vance',
      ownerManagerRole: 'President & Founder',
      ownerVerificationStatus: 'verified',
      pricingNotes: 'Commercial preventative maintenance agreements starting at $450/mo. Emergency rates $185/hr.',
      reviewRating: 4.8,
      reviewCount: 64,
      reviewSentimentSummary: 'Strong praise for rapid emergency chiller response; customers noted phone dispatch is occasionally slow.',
      marketingChannels: ['Google Local Services', 'LinkedIn Company Page'],
      growthSignals: ['Posted job listing for 3 Commercial Lead Techs', 'Added 4 service vans in Q3'],
      status: 'qualified',
      queueStatus: 'prepare_outreach',
      researchCompleteness: 95,
      isDemo: true,
      createdAt: '2026-10-16T11:00:00.000Z',
      updatedAt: '2026-11-02T10:00:00.000Z',
    },
    {
      id: 'biz-lonestar-climate',
      projectId: DEMO_PROJECT.id,
      officialName: 'Lone Star Climate Systems LLC',
      brandName: 'Lone Star Climate',
      domain: 'lonestarhvac-dfw.com',
      websiteUrl: 'https://lonestarhvac-dfw.com',
      phone: '(817) 555-0182',
      email: 'dispatch@lonestarhvac-dfw.com',
      fullAddress: '4200 North Fwy, Fort Worth, TX 76137',
      city: 'Fort Worth',
      state: 'Texas',
      country: 'United States',
      postalCode: '76137',
      serviceArea: 'Fort Worth, Arlington, Grand Prairie, Keller',
      businessModel: 'Commercial & Light Industrial',
      foundingYear: 2008,
      teamSizeEstimate: '15-20 employees',
      fleetCapacity: '10 service trucks',
      ownerManagerName: 'David K. Miller',
      ownerManagerRole: 'General Manager',
      ownerVerificationStatus: 'unverified',
      pricingNotes: 'Custom quotes per square footage. No pricing transparency on site.',
      reviewRating: 4.2,
      reviewCount: 31,
      reviewSentimentSummary: 'Reliable service but website contact form often went unanswered.',
      marketingChannels: ['Website only'],
      growthSignals: ['Opened satellite yard in Arlington'],
      status: 'audited',
      queueStatus: 'find_decision_maker',
      researchCompleteness: 65,
      isDemo: true,
      createdAt: '2026-10-17T09:30:00.000Z',
      updatedAt: '2026-11-03T16:00:00.000Z',
    },
    {
      id: 'biz-trinity-systems',
      projectId: DEMO_PROJECT.id,
      officialName: 'Trinity Mechanical & Automation Systems',
      brandName: 'Trinity Systems',
      domain: 'trinityairsys.com',
      websiteUrl: 'https://trinityairsys.com',
      phone: '(972) 555-0199',
      email: 'info@trinityairsys.com',
      fullAddress: '8330 Lyndon B Johnson Fwy, Dallas, TX 75243',
      city: 'Dallas',
      state: 'Texas',
      country: 'United States',
      postalCode: '75243',
      serviceArea: 'Richardson, Plano, Garland, North Dallas',
      businessModel: 'Building Automation & Mechanical Engineering',
      foundingYear: 2016,
      teamSizeEstimate: '12 employees',
      fleetCapacity: '6 service vehicles',
      ownerManagerName: 'Elena Rostova, PE',
      ownerManagerRole: 'Principal Engineer',
      ownerVerificationStatus: 'verified',
      pricingNotes: 'Engineering consult $220/hr, annual controls contracts from $8,000/yr.',
      reviewRating: 4.9,
      reviewCount: 19,
      reviewSentimentSummary: 'Extremely technically capable, clean engineering documentation.',
      marketingChannels: ['LinkedIn', 'Industry directory'],
      growthSignals: ['Secured certification for Tridium Niagara 4 systems'],
      status: 'outreach_ready',
      queueStatus: 'ready_for_review',
      researchCompleteness: 85,
      isDemo: true,
      createdAt: '2026-10-18T14:15:00.000Z',
      updatedAt: '2026-11-04T12:00:00.000Z',
    },
  ];

  await repository.saveBusinesses(businesses);

  // 3. Website Audits
  const audits: WebsiteAudit[] = [
    {
      id: 'audit-apex',
      businessId: 'biz-apex-mechanical',
      projectId: DEMO_PROJECT.id,
      targetUrl: 'https://apexmechanicaltx.com',
      totalScore: 54, // Moderate score => high opportunity for Watech redesign/SEO
      grade: 'C',
      inspectedAt: '2026-10-20T14:00:00.000Z',
      responseTimeMs: 820,
      httpStatus: 200,
      hasSsl: true,
      isAutomated: true,
      scoringRulesVersion: 'v1.0-transparent-10-cat',
      categories: [
        { category: 'existence_and_accessibility', categoryName: 'Existence & Accessibility', score: 90, weight: 10, status: 'passed', findingsCount: 0, summary: 'HTTPS valid, DNS resolves cleanly, no server downtime observed.' },
        { category: 'visual_credibility', categoryName: 'Visual Design & Credibility', score: 48, weight: 10, status: 'failed', findingsCount: 2, summary: 'Outdated 2016 Bootstrap template, low-contrast typography, stock photos.' },
        { category: 'mobile_responsiveness', categoryName: 'Mobile Usability', score: 55, weight: 10, status: 'warning', findingsCount: 1, summary: 'Navigation menu wraps awkwardly on iPhone screens, horizontal scroll on service tables.' },
        { category: 'performance_and_speed', categoryName: 'Performance & Speed', score: 62, weight: 10, status: 'warning', findingsCount: 2, summary: 'Uncompressed hero PNGs (3.4MB), render-blocking jQuery plugins.' },
        { category: 'technical_seo', categoryName: 'Technical SEO', score: 50, weight: 10, status: 'warning', findingsCount: 3, summary: 'Title tag is generic "Home - Apex Mechanical", missing meta descriptions, no H1 on homepage.' },
        { category: 'local_seo', categoryName: 'Local SEO & Schema', score: 40, weight: 10, status: 'failed', findingsCount: 2, summary: 'No LocalBusiness schema detected; service areas listed as flat text without dedicated city pages.' },
        { category: 'conversion_focus', categoryName: 'Conversion & CTAs', score: 45, weight: 10, status: 'failed', findingsCount: 2, summary: 'No sticky phone header, CTA buttons just say "Submit", no emergency dispatch hotline prominence.' },
        { category: 'lead_capture', categoryName: 'Lead Capture Mechanics', score: 40, weight: 10, status: 'failed', findingsCount: 1, summary: 'Only 1 lengthy 9-field generic contact form; no quick 2-step estimate form.' },
        { category: 'trust_and_proof', categoryName: 'Trust & Proof Presentation', score: 55, weight: 10, status: 'warning', findingsCount: 1, summary: 'Google reviews (4.8★) not embedded or dynamically synced on quote pages.' },
        { category: 'follow_up_readiness', categoryName: 'Follow-Up Readiness & Tech', score: 55, weight: 10, status: 'warning', findingsCount: 1, summary: 'Form posts to generic email forwarder without CRM or instant SMS notification.' },
      ],
      findings: [
        {
          id: 'find-1',
          auditId: 'audit-apex',
          category: 'conversion_focus',
          observation: 'No sticky phone button on mobile screens; phone number is buried in footer text.',
          evidenceUrlOrSnippet: 'Captured DOM: <div class="footer-contact"><span>Phone: (214) 555-0144</span></div>',
          severity: 'high',
          confidence: 0.95,
          customerImpact: 'Commercial property managers experiencing emergency chiller leaks cannot instantly tap-to-call on mobile.',
          recommendedAction: 'Deploy a high-contrast sticky header with a prominent "Emergency Dispatch (214) 555-0144" tap-to-call trigger.',
          isAutomated: true,
        },
        {
          id: 'find-2',
          auditId: 'audit-apex',
          category: 'local_seo',
          observation: 'Missing Schema.org HVACBusiness JSON-LD markup and no dedicated landing pages for Irving or Carrollton.',
          evidenceUrlOrSnippet: 'Checked <head> markup: 0 JSON-LD scripts found.',
          severity: 'critical',
          confidence: 0.98,
          customerImpact: 'Google Local Pack rankings fall behind local competitors who have dedicated suburban corridor pages.',
          recommendedAction: 'Inject structured HVACBusiness schema with geo-coordinates and create targeted suburban service landing pages.',
          isAutomated: true,
        },
        {
          id: 'find-3',
          auditId: 'audit-apex',
          category: 'lead_capture',
          observation: 'Contact form contains 9 mandatory inputs including "Fax Number" and "Mailing Address".',
          evidenceUrlOrSnippet: 'Form ID #contact-form with 9 required input elements.',
          severity: 'high',
          confidence: 0.92,
          customerImpact: 'Excessive form fields cause up to 68% drop-off in quote requests.',
          recommendedAction: 'Replace with 3-field rapid estimate request (Facility Type, Service Needed, Phone/Email).',
          isAutomated: true,
        },
      ],
    },
    {
      id: 'audit-lonestar',
      businessId: 'biz-lonestar-climate',
      projectId: DEMO_PROJECT.id,
      targetUrl: 'https://lonestarhvac-dfw.com',
      totalScore: 68,
      grade: 'B',
      inspectedAt: '2026-10-21T10:00:00.000Z',
      responseTimeMs: 640,
      httpStatus: 200,
      hasSsl: true,
      isAutomated: true,
      scoringRulesVersion: 'v1.0-transparent-10-cat',
      categories: [
        { category: 'existence_and_accessibility', categoryName: 'Existence & Accessibility', score: 95, weight: 10, status: 'passed', findingsCount: 0, summary: 'Fast TLS handshake, valid DNS.' },
        { category: 'visual_credibility', categoryName: 'Visual Design & Credibility', score: 70, weight: 10, status: 'passed', findingsCount: 0, summary: 'Clean layout, modern color contrast.' },
        { category: 'mobile_responsiveness', categoryName: 'Mobile Usability', score: 75, weight: 10, status: 'passed', findingsCount: 0, summary: 'Fluid grid renders properly on mobile devices.' },
        { category: 'performance_and_speed', categoryName: 'Performance & Speed', score: 68, weight: 10, status: 'warning', findingsCount: 1, summary: 'Large unoptimized hero banner image.' },
        { category: 'technical_seo', categoryName: 'Technical SEO', score: 65, weight: 10, status: 'warning', findingsCount: 1, summary: 'Duplicate H1 tags on homepage.' },
        { category: 'local_seo', categoryName: 'Local SEO & Schema', score: 60, weight: 10, status: 'warning', findingsCount: 1, summary: 'NAP is consistent in footer but missing structured geo schema.' },
        { category: 'conversion_focus', categoryName: 'Conversion & CTAs', score: 60, weight: 10, status: 'warning', findingsCount: 1, summary: 'Clear phone number but lacks instant online scheduling.' },
        { category: 'lead_capture', categoryName: 'Lead Capture Mechanics', score: 62, weight: 10, status: 'warning', findingsCount: 1, summary: 'Single form without service selection dropdown.' },
        { category: 'trust_and_proof', categoryName: 'Trust & Proof Presentation', score: 65, weight: 10, status: 'warning', findingsCount: 1, summary: 'Text-only quotes from customers without verified review badges.' },
        { category: 'follow_up_readiness', categoryName: 'Follow-Up Readiness & Tech', score: 60, weight: 10, status: 'warning', findingsCount: 1, summary: 'No automated booking or live webchat integration.' },
      ],
      findings: [
        {
          id: 'find-lonestar-1',
          auditId: 'audit-lonestar',
          category: 'performance_and_speed',
          observation: 'Hero image payload is 2.8MB causing First Contentful Paint delay of 2.1s.',
          evidenceUrlOrSnippet: 'Asset URL: /assets/hero-industrial.jpg (2,842 KB)',
          severity: 'medium',
          confidence: 0.9,
          customerImpact: 'Mobile visitors on 4G connections experience jarring load delays.',
          recommendedAction: 'Convert asset to modern WebP format with responsive srcset and width/height dimensions.',
          isAutomated: true,
        },
      ],
    },
  ];

  for (const a of audits) {
    await repository.saveAudit(a);
  }

  // 4. Contacts (Prompt 09 Decision-Maker Intelligence)
  const contacts: Contact[] = [
    {
      id: 'con-marcus-vance',
      businessId: 'biz-apex-mechanical',
      projectId: DEMO_PROJECT.id,
      fullName: 'Marcus Vance',
      roleOrTitle: 'President & Founder',
      company: 'Apex Mechanical Systems LLC',
      email: 'm.vance@apexmechanicaltx.com',
      phone: '(214) 555-0144 ext 101',
      publicBusinessPhone: '(214) 555-0144 ext 101',
      linkedinUrl: 'https://linkedin.com/in/demo-marcus-vance-dfw',
      verificationStatus: 'verified',
      isDecisionMaker: true,
      decisionMakerTier: 'tier1_executive',
      contactSourceLabel: 'reputable_directory',
      reviewStatus: 'approved',
      confidence: 96,
      confidenceBreakdown: {
        sourceQuality: 28,
        roleRelevance: 25,
        companyAssociation: 20,
        informationRecency: 14,
        independentCorroboration: 9,
        totalConfidence: 96,
        explanation: 'Confirmed on official Texas Secretary of State filing and verified against website About page.',
      },
      sourceUrl: 'https://texassecstate.gov/corp/demo-apex-filing',
      discoveryDate: '2026-10-21',
      corroboratingSources: [
        'https://texassecstate.gov/corp/demo-apex-filing',
        'https://apexmechanicaltx.com/about-us',
      ],
      notes: 'Confirmed on official Texas Secretary of State corporate registration filing.',
      isApproved: true,
    },
    {
      id: 'con-apex-dispatch',
      businessId: 'biz-apex-mechanical',
      projectId: DEMO_PROJECT.id,
      fullName: 'Apex Commercial Dispatch Desk',
      roleOrTitle: 'Commercial Service Dispatch & Quotes',
      company: 'Apex Mechanical Systems LLC',
      email: 'dispatch@apexmechanicaltx.com',
      phone: '(214) 555-0144',
      publicBusinessPhone: '(214) 555-0144',
      verificationStatus: 'verified',
      isDecisionMaker: false,
      decisionMakerTier: 'general_staff',
      contactSourceLabel: 'official_company_source',
      reviewStatus: 'approved',
      confidence: 88,
      sourceUrl: 'https://apexmechanicaltx.com/contact',
      discoveryDate: '2026-10-20',
      isFallbackGeneralRoute: true,
      notes: 'General business routing endpoint retained as fallback channel.',
      isApproved: true,
    },
    {
      id: 'con-david-miller',
      businessId: 'biz-lonestar-climate',
      projectId: DEMO_PROJECT.id,
      fullName: 'David K. Miller',
      roleOrTitle: 'General Manager',
      company: 'Lone Star Climate Systems LLC',
      email: 'dmiller@lonestarhvac-dfw.com',
      phone: '(817) 555-0182',
      publicBusinessPhone: '(817) 555-0182',
      verificationStatus: 'unverified',
      isDecisionMaker: true,
      decisionMakerTier: 'tier2_director',
      contactSourceLabel: 'official_company_source',
      reviewStatus: 'pending_review',
      confidence: 62,
      confidenceBreakdown: {
        sourceQuality: 30,
        roleRelevance: 20,
        companyAssociation: 10,
        informationRecency: 12,
        independentCorroboration: 4,
        totalConfidence: 76,
        explanation: 'Found on website About Us page; pending independent registry corroboration.',
      },
      sourceUrl: 'https://lonestarhvac-dfw.com/about-us',
      discoveryDate: '2026-10-21',
      corroboratingSources: ['https://lonestarhvac-dfw.com/about-us'],
      notes: 'Named on website About page; identity not cross-verified in official registry.',
      isApproved: false,
    },
    {
      id: 'con-elena-rostova',
      businessId: 'biz-trinity-systems',
      projectId: DEMO_PROJECT.id,
      fullName: 'Elena Rostova, PE',
      roleOrTitle: 'Principal Engineer & Managing Member',
      company: 'Trinity Mechanical & Automation Systems',
      email: 'elena@trinityairsys.com',
      linkedinUrl: 'https://linkedin.com/in/demo-elena-rostova-pe',
      verificationStatus: 'verified',
      isDecisionMaker: true,
      decisionMakerTier: 'tier1_executive',
      contactSourceLabel: 'reputable_directory',
      reviewStatus: 'approved',
      confidence: 98,
      confidenceBreakdown: {
        sourceQuality: 28,
        roleRelevance: 25,
        companyAssociation: 20,
        informationRecency: 15,
        independentCorroboration: 10,
        totalConfidence: 98,
        explanation: 'Verified on Texas Board of Professional Engineers official licensing roster and LinkedIn bio.',
      },
      sourceUrl: 'https://pels.texas.gov/roster/demo-elena-rostova',
      discoveryDate: '2026-10-22',
      corroboratingSources: [
        'https://pels.texas.gov/roster/demo-elena-rostova',
        'https://trinityairsys.com/leadership',
      ],
      notes: 'Verified via Texas Board of Professional Engineers official licensing roster.',
      isApproved: true,
    },
  ];

  for (const c of contacts) {
    await repository.saveContact(c);
  }

  // 5. Intelligence Facts
  const facts: IntelligenceFact[] = [
    {
      id: 'fact-1',
      businessId: 'biz-apex-mechanical',
      projectId: DEMO_PROJECT.id,
      claim: 'Operates 16 dedicated commercial service vehicles',
      value: '16 Fleet Vehicles',
      category: 'operations',
      sourceUrl: 'https://apexmechanicaltx.com/about',
      sourceType: 'Official Website & Fleet Photos',
      dateCollected: '2026-10-18',
      confidence: 0.9,
      verificationStatus: 'verified',
      notes: 'Photos confirm branded Ford Transit commercial fleet.',
    },
    {
      id: 'fact-2',
      businessId: 'biz-apex-mechanical',
      projectId: DEMO_PROJECT.id,
      claim: 'Active hiring push for 3 Senior Commercial Chiller Technicians',
      value: 'Expanding technical headcount',
      category: 'growth',
      sourceUrl: 'https://indeed.com/jobs/demo-apex-mechanical',
      sourceType: 'Public Job Board',
      dateCollected: '2026-10-22',
      confidence: 0.95,
      verificationStatus: 'verified',
      notes: 'Indicates budget and capacity for inbound service volume.',
    },
  ];

  await repository.saveFacts(facts);

  // 6. Content Items
  const contentItems: ContentItem[] = [
    {
      id: 'content-1',
      businessId: 'biz-apex-mechanical',
      projectId: DEMO_PROJECT.id,
      contentType: 'service_page',
      title: 'Commercial Refrigeration & Walk-In Coolers',
      url: 'https://apexmechanicaltx.com/refrigeration',
      themes: ['Walk-in freezers', 'Warehouse cold storage', 'Emergency repairs'],
      audience: 'Grocery store managers, cold storage logistics operators',
      observedCadence: 'Static page, last updated 2022',
      customerFaqsIdentified: ['What is your emergency response time for walk-in freezer compressor failure?'],
      missingGapsIdentified: ['No pricing benchmarks', 'No case study photos of completed industrial retrofits'],
      callToActionQuality: 'weak',
      dateObserved: '2026-10-20',
    },
  ];

  for (const item of contentItems) {
    await repository.saveContentItem(item);
  }

  // 7. Sources
  const sources: SourceRecord[] = [
    {
      id: 'src-1',
      projectId: DEMO_PROJECT.id,
      businessId: 'biz-apex-mechanical',
      url: 'https://apexmechanicaltx.com',
      sourceName: 'Apex Mechanical Official Website',
      sourceType: 'official_website',
      retrievalDate: '2026-10-20',
      excerptOrNote: 'Public website metadata, footer address, contact forms and page contents inspected directly.',
      verificationStatus: 'verified',
      confidence: 0.99,
    },
    {
      id: 'src-2',
      projectId: DEMO_PROJECT.id,
      businessId: 'biz-apex-mechanical',
      url: 'https://texassecstate.gov/corp/demo-apex-filing',
      sourceName: 'Texas Secretary of State Business Registry',
      sourceType: 'public_registry',
      retrievalDate: '2026-10-21',
      excerptOrNote: 'Officer roster lists Marcus Vance as President & Registered Agent. Entity active in good standing.',
      verificationStatus: 'verified',
      confidence: 1.0,
    },
  ];

  await repository.saveSources(sources);

  // 8. Generate & Save Opportunities, Lead Scores, and Outreach Drafts
  for (const b of businesses) {
    const audit = audits.find(a => a.businessId === b.id);
    const bContacts = contacts.filter(c => c.businessId === b.id);
    const bFacts = facts.filter(f => f.businessId === b.id);
    const bSources = sources.filter(s => s.businessId === b.id);

    // Opportunities
    const opps = generateOpportunities(b, audit, bFacts);
    await repository.saveOpportunities(opps);

    // Score
    const score = calculateLeadScore(b, audit, bContacts, bFacts);
    await repository.saveScore(score);

    // Outreach Draft
    const draft = generateOutreachBrief(b, audit, opps, bContacts, bSources, false);
    await repository.saveOutreachDraft(draft);
  }

  // 9. Seed Local SEO Profiles & Reviews
  await seedLocalSeoDemoData();

  // 10. Seed Content Intelligence & Calendar
  await seedContentIntelligenceDemoData();

  // 11. Seed Email Discovery & Verification Intelligence (Prompt 10)
  await seedEmailDiscoveryDemoData();

  // 12. Seed Outreach Strategy & Personalization Intelligence (Prompt 11)
  await seedOutreachStrategyDemoData();

  // 13. Seed Proposals & Quotations Intelligence (Prompt 19)
  await seedProposalsDemoData();

  // 14. Seed Client Projects & Delivery Intelligence (Prompt 20)
  await seedClientProjectsDemoData();

  // 15. Seed Revenue, Invoicing & Agency Performance Intelligence (Prompt 21)
  await seedAgencyPerformanceDemoData();

  // 16. Seed CEO Command Center Intelligence (Prompt 24)
  await seedCeoCommandCenterDemoData();
}

export async function seedLocalSeoDemoData(): Promise<void> {
  const localProfiles: LocalSeoProfile[] = [
    {
      id: 'lseo-apex-1',
      businessId: 'biz-apex-mechanical',
      projectId: DEMO_PROJECT.id,
      businessName: 'Apex Mechanical Solutions Inc',
      address: '11420 Emerald St, Dallas, TX 75229',
      phone: '(214) 555-0144',
      websiteUrl: 'https://apexmechanicaltx.com',
      googleBusinessProfileUrl: 'https://maps.google.com/?cid=demo_apex_mechanical_dfw',
      primaryCategory: 'HVAC Contractor',
      secondaryCategories: [
        'Mechanical Contractor',
        'Commercial Refrigeration',
        'Air Conditioning Repair Service',
      ],
      serviceAreas: ['Dallas', 'Irving', 'Carrollton', 'Farmers Branch', 'Plano'],
      zipCodes: ['75229', '75001', '75006', '75038', '75234'],
      serviceRadiusMiles: 35,
      openingHours: 'Mon-Fri: 7:00 AM - 6:00 PM | Sat: 8:00 AM - 1:00 PM | Sun: Closed (24/7 On-Call)',
      description:
        'Apex Mechanical Solutions is a premier Dallas commercial mechanical contractor specializing in rooftop chiller overhauls, industrial refrigeration systems, and 24/7 emergency dispatch for commercial property managers and logistics facilities across North Texas.',
      servicesList: [
        'Commercial Chiller Maintenance & Overhaul',
        'Rooftop RTU Replacement & Maintenance',
        'Industrial Cold Storage Refrigeration',
        'Building Automation & Energy Retrofits',
        'Preventative Maintenance Contracts',
        'Emergency 24/7 Commercial HVAC Dispatch',
      ],
      photosCount: 22,
      hasCoverPhoto: true,
      reviewCount: 48,
      averageRating: 4.4,
      respondedReviewsCount: 38,
      averageResponseTimeDays: 1.5,
      qaCount: 6,
      unansweredQaCount: 1,
      hasLocalBusinessSchema: false,
      hasServiceAreaPages: false,
      napConsistencyStatus: 'mismatched',
      napDiscrepancies: [
        'Phone number variance: GBP listing shows (214) 555-0144 vs website footer (214) 555-0199',
        'Suite number missing on Google Maps pin',
      ],
      source: 'live_inspect',
      apiConfigured: false,
      lastAuditedAt: '2026-11-04T10:00:00.000Z',
      createdAt: '2026-10-20T10:00:00.000Z',
      updatedAt: '2026-11-04T10:00:00.000Z',
    },
    {
      id: 'lseo-lonestar-2',
      businessId: 'biz-lonestar-climate',
      projectId: DEMO_PROJECT.id,
      businessName: 'Lone Star Commercial Climate Solutions',
      address: '4200 Airport Fwy #400, Fort Worth, TX 76117',
      phone: '(817) 555-0182',
      websiteUrl: 'https://lonestarclimate.com',
      googleBusinessProfileUrl: 'https://maps.google.com/?cid=demo_lonestar_climate_fw',
      primaryCategory: 'Air Conditioning Repair Service',
      secondaryCategories: ['HVAC Contractor'],
      serviceAreas: ['Fort Worth', 'Arlington', 'Grand Prairie'],
      zipCodes: ['76117', '76102', '76006', '76010'],
      serviceRadiusMiles: 25,
      openingHours: 'Mon-Fri: 8:00 AM - 5:00 PM | Sat-Sun: Closed',
      description: 'Commercial air conditioning and heating service in Fort Worth and Tarrant County.',
      servicesList: ['Commercial AC Repair', 'Heating Maintenance', 'Filter Replacement'],
      photosCount: 4,
      hasCoverPhoto: false,
      reviewCount: 14,
      averageRating: 3.9,
      respondedReviewsCount: 3,
      averageResponseTimeDays: 7,
      qaCount: 2,
      unansweredQaCount: 2,
      hasLocalBusinessSchema: false,
      hasServiceAreaPages: false,
      napConsistencyStatus: 'mismatched',
      napDiscrepancies: [
        'Suite 400 missing from Google profile pin',
        'Secondary category "Mechanical Contractor" unassigned',
      ],
      source: 'manual',
      apiConfigured: false,
      lastAuditedAt: '2026-11-04T11:00:00.000Z',
      createdAt: '2026-10-20T11:00:00.000Z',
      updatedAt: '2026-11-04T11:00:00.000Z',
    },
    {
      id: 'lseo-trinity-3',
      businessId: 'biz-trinity-systems',
      projectId: DEMO_PROJECT.id,
      businessName: 'Trinity Building Systems LLC',
      address: '8150 N Central Expy, Dallas, TX 75206',
      phone: '(214) 555-0199',
      websiteUrl: 'https://trinitybuildingsystems.com',
      googleBusinessProfileUrl: 'https://maps.google.com/?cid=demo_trinity_systems_dallas',
      primaryCategory: 'Mechanical Contractor',
      secondaryCategories: [
        'HVAC Contractor',
        'Building Automation Control',
        'Energy Management Consultant',
      ],
      serviceAreas: ['Dallas', 'Fort Worth', 'Plano', 'Frisco', 'McKinney', 'Richardson'],
      zipCodes: ['75206', '75024', '75034', '75070', '75201', '76102'],
      serviceRadiusMiles: 50,
      openingHours: 'Mon-Fri: 6:30 AM - 6:00 PM | 24/7 Monitoring Facility',
      description:
        'Trinity Building Systems delivers advanced commercial HVAC, building automation (BMS/BAS), and energy optimization for Class-A office towers, medical centers, and higher-education campuses across North Texas.',
      servicesList: [
        'Building Automation Systems (BAS)',
        'Chiller Plant Optimization',
        'Retro-Commissioning',
        'Indoor Air Quality Monitoring',
        'Preventative Service Agreements',
      ],
      photosCount: 38,
      hasCoverPhoto: true,
      reviewCount: 94,
      averageRating: 4.8,
      respondedReviewsCount: 88,
      averageResponseTimeDays: 0.8,
      qaCount: 12,
      unansweredQaCount: 0,
      hasLocalBusinessSchema: true,
      hasServiceAreaPages: true,
      napConsistencyStatus: 'matched',
      napDiscrepancies: [],
      source: 'live_inspect',
      apiConfigured: false,
      lastAuditedAt: '2026-11-04T12:00:00.000Z',
      createdAt: '2026-10-20T12:00:00.000Z',
      updatedAt: '2026-11-04T12:00:00.000Z',
    },
  ];

  await repository.saveLocalSeoProfiles(localProfiles);

  const localReviews: LocalReview[] = [
    // Apex Reviews
    {
      id: 'rev-apex-1',
      profileId: 'lseo-apex-1',
      businessId: 'biz-apex-mechanical',
      projectId: DEMO_PROJECT.id,
      authorName: 'David Sterling, Facilities Director',
      rating: 5,
      reviewDate: '2026-09-12',
      reviewText:
        'Apex dispatched a technician within 90 minutes when our server room rooftop unit failed in July. Saved our servers and kept our distribution center online.',
      ownerResponseText:
        'David, thank you for trusting Apex Mechanical with your mission-critical server room. Glad our rapid dispatch team kept your facility cool!',
      ownerResponseDate: '2026-09-13',
      sentiment: 'positive',
      detectedPraiseTopic: 'Rapid Emergency Dispatch & Punctuality',
      serviceMentioned: 'Server room rooftop unit replacement',
    },
    {
      id: 'rev-apex-2',
      profileId: 'lseo-apex-1',
      businessId: 'biz-apex-mechanical',
      projectId: DEMO_PROJECT.id,
      authorName: 'Patricia Ramirez, Operations Lead',
      rating: 4,
      reviewDate: '2026-08-28',
      reviewText:
        'Great technical diagnostic on our 20-ton chiller. The invoice was slightly higher than the initial rough estimate, but the equipment has run flawlessly since.',
      ownerResponseText:
        'Patricia, we appreciate your business. We always strive to explain parts variances upfront before completing commercial installations.',
      ownerResponseDate: '2026-08-30',
      sentiment: 'positive',
      detectedPraiseTopic: 'Technical Diagnostic Accuracy & Commercial Expertise',
      serviceMentioned: '20-ton chiller overhaul',
    },
    {
      id: 'rev-apex-3',
      profileId: 'lseo-apex-1',
      businessId: 'biz-apex-mechanical',
      projectId: DEMO_PROJECT.id,
      authorName: 'Marcus Cole, Property Manager',
      rating: 2,
      reviewDate: '2026-10-04',
      reviewText:
        'Technician arrived 2 hours late past the promised window without calling our dispatch desk first. We waited all morning in the warehouse. Good repair once on site, but communication was poor.',
      ownerResponseText: '',
      sentiment: 'negative',
      detectedComplaintTopic: 'Response Delay & Late Arrival',
      serviceMentioned: 'Warehouse RTU repair',
    },
    {
      id: 'rev-apex-4',
      profileId: 'lseo-apex-1',
      businessId: 'biz-apex-mechanical',
      projectId: DEMO_PROJECT.id,
      authorName: 'Elena Rostova, Cold Logistics VP',
      rating: 5,
      reviewDate: '2026-07-15',
      reviewText:
        'Signed an annual preventative maintenance agreement for our cold storage facility. No surprise breakdowns all summer. Clean job site and very professional technicians.',
      ownerResponseText:
        'Elena, preventative maintenance is the secret to zero downtime in cold logistics. Proud to partner with your team!',
      ownerResponseDate: '2026-07-16',
      sentiment: 'positive',
      detectedPraiseTopic: 'Preventative Maintenance & Long-term Reliability',
      serviceMentioned: 'Annual preventative maintenance contract',
    },
    // Lone Star Reviews
    {
      id: 'rev-lone-1',
      profileId: 'lseo-lonestar-2',
      businessId: 'biz-lonestar-climate',
      projectId: DEMO_PROJECT.id,
      authorName: 'Brandon Walsh',
      rating: 1,
      reviewDate: '2026-09-02',
      reviewText:
        'Could never get a straight answer on pricing. Waited 3 days for an estimate on a simple commercial blower motor replacement. Left on hold twice.',
      ownerResponseText: '',
      sentiment: 'negative',
      detectedComplaintTopic: 'Pricing Transparency & Unexpected Fees',
      serviceMentioned: 'Blower motor quote',
    },
    {
      id: 'rev-lone-2',
      profileId: 'lseo-lonestar-2',
      businessId: 'biz-lonestar-climate',
      projectId: DEMO_PROJECT.id,
      authorName: 'Sarah Jenkins',
      rating: 5,
      reviewDate: '2026-02-14',
      reviewText:
        'Fair pricing and prompt dispatch during the winter freeze. Got the warehouse heaters back up within 3 hours.',
      ownerResponseText: 'Thanks Sarah, always happy to help our Tarrant county businesses.',
      ownerResponseDate: '2026-02-18',
      sentiment: 'positive',
      detectedPraiseTopic: 'Rapid Emergency Dispatch & Punctuality',
      serviceMentioned: 'Warehouse unit heating repair',
    },
    // Trinity Reviews
    {
      id: 'rev-trin-1',
      profileId: 'lseo-trinity-3',
      businessId: 'biz-trinity-systems',
      projectId: DEMO_PROJECT.id,
      authorName: 'Robert Vance, Class A Asset Manager',
      rating: 5,
      reviewDate: '2026-10-18',
      reviewText:
        'Trinity manages BAS across 4 of our corporate office parks. Flawless chiller plant efficiency and excellent monthly energy reporting.',
      ownerResponseText:
        'Robert, our engineering team loves working on your properties. Thank you for your continued trust!',
      ownerResponseDate: '2026-10-18',
      sentiment: 'positive',
      detectedPraiseTopic: 'Technical Diagnostic Accuracy & Commercial Expertise',
      serviceMentioned: 'Building automation controls',
    },
  ];

  await repository.saveLocalReviews(localReviews);
}

export async function seedContentIntelligenceDemoData(): Promise<void> {
  const contentItems: ContentItem[] = [
    // Apex Mechanical Content
    {
      id: 'c-apex-1',
      businessId: 'biz-apex-mechanical',
      projectId: DEMO_PROJECT.id,
      contentType: 'service_page',
      classification: 'service_focused',
      title: 'Commercial Refrigeration & Walk-In Coolers',
      url: 'https://apexmechanicaltx.com/refrigeration',
      mainTopic: 'Industrial Cold Storage & Walk-In Freezers',
      summary: 'Turnkey industrial cold storage and walk-in cooler maintenance for grocery chains and distribution centers.',
      headings: ['Commercial Refrigeration Services', 'Emergency Walk-In Repair', 'Preventative Compressor Maintenance'],
      publicationDate: '2022-04-10',
      lastUpdatedDate: '2024-01-15',
      callToActionText: 'Call (214) 555-0144 For Service',
      callToActionQuality: 'weak',
      imagesCount: 3,
      internalLinksCount: 6,
      themes: ['Walk-in freezers', 'Warehouse cold storage', 'Emergency repairs'],
      audience: 'Grocery store managers, cold storage logistics operators',
      observedCadence: 'Infrequent (last updated 2024)',
      customerFaqsIdentified: ['What is your emergency response time for walk-in freezer compressor failure?'],
      missingGapsIdentified: ['No pricing benchmarks', 'No case study photos of completed industrial retrofits'],
      sourceUrl: 'https://apexmechanicaltx.com/refrigeration',
      sourceType: 'service_page',
      dateObserved: '2026-10-20',
    },
    {
      id: 'c-apex-2',
      businessId: 'biz-apex-mechanical',
      projectId: DEMO_PROJECT.id,
      contentType: 'blog',
      classification: 'problem_solving',
      title: 'Emergency Chiller Troubleshooting: 4 Steps Before Calling a Technician',
      url: 'https://apexmechanicaltx.com/blog/chiller-troubleshooting',
      mainTopic: 'Commercial Chiller Diagnostic Protocol',
      summary: 'Practical facility manager checklist for troubleshooting high-pressure cutouts and flow switch trips.',
      headings: ['Checking Chilled Water Flow Rate', 'Refrigerant Pressure Verification', 'When to Avoid Resetting High-Pressure Locks'],
      publicationDate: '2025-06-18',
      lastUpdatedDate: '2025-06-18',
      callToActionText: 'Schedule 24/7 Dispatch',
      callToActionQuality: 'strong',
      imagesCount: 4,
      internalLinksCount: 8,
      themes: ['Chiller troubleshooting', 'High pressure faults', 'Water flow switches'],
      audience: 'Building maintenance technicians, plant supervisors',
      observedCadence: 'Blog active quarterly',
      sourceUrl: 'https://apexmechanicaltx.com/blog/chiller-troubleshooting',
      sourceType: 'blog',
      dateObserved: '2026-10-22',
    },
    // Lone Star Content
    {
      id: 'c-lone-1',
      businessId: 'biz-lonestar-climate',
      projectId: DEMO_PROJECT.id,
      contentType: 'service_page',
      classification: 'service_focused',
      title: 'Commercial AC Repair Fort Worth & Tarrant County',
      url: 'https://lonestarclimate.com/commercial-ac',
      mainTopic: 'Commercial Air Conditioning Services',
      summary: 'Air conditioning repair and maintenance for retail spaces and light commercial properties.',
      headings: ['Fast AC Repairs in Tarrant County', 'Our Service Process'],
      publicationDate: '2023-08-01',
      lastUpdatedDate: '2023-08-01',
      callToActionText: 'Contact Us',
      callToActionQuality: 'weak',
      imagesCount: 2,
      internalLinksCount: 4,
      themes: ['Commercial AC', 'Filter replacement', 'Thermostat programming'],
      audience: 'Small business owners in Fort Worth',
      observedCadence: 'Static page',
      sourceUrl: 'https://lonestarclimate.com/commercial-ac',
      sourceType: 'service_page',
      dateObserved: '2026-10-21',
    },
    // Trinity Systems Content
    {
      id: 'c-trin-1',
      businessId: 'biz-trinity-systems',
      projectId: DEMO_PROJECT.id,
      contentType: 'service_page',
      classification: 'service_focused',
      title: 'Building Automation Systems (BAS / BMS) Integration',
      url: 'https://trinitybuildingsystems.com/automation',
      mainTopic: 'Class-A Building Automation & Energy Optimization',
      summary: 'Enterprise BACnet, Modbus, and LonWorks direct digital control (DDC) systems for multi-facility corporate portfolios.',
      headings: ['Enterprise Building Controls', 'Energy Efficiency Verification', 'BACnet Protocol Integration'],
      publicationDate: '2025-01-10',
      lastUpdatedDate: '2026-03-01',
      callToActionText: 'Request Facility Energy Audit',
      callToActionQuality: 'strong',
      imagesCount: 9,
      internalLinksCount: 16,
      themes: ['Building automation', 'BACnet', 'Energy audits', 'Class-A real estate'],
      audience: 'Corporate portfolio managers, commercial MEP consultants',
      observedCadence: 'Active monthly updates',
      customerFaqsIdentified: ['Can Trinity integrate with legacy non-BACnet pneumatic thermostats?'],
      sourceUrl: 'https://trinitybuildingsystems.com/automation',
      sourceType: 'service_page',
      dateObserved: '2026-10-22',
    },
    {
      id: 'c-trin-2',
      businessId: 'biz-trinity-systems',
      projectId: DEMO_PROJECT.id,
      contentType: 'blog',
      classification: 'educational',
      title: 'The Ultimate Guide to Class-A Commercial BAS Integration',
      url: 'https://trinitybuildingsystems.com/insights/bas-guide',
      mainTopic: 'Commercial Energy Reduction Through Smart Controls',
      summary: 'Deep-dive 2,400-word engineering overview comparing pneumatic vs DDC systems and ASHRAE Guideline 36 compliance.',
      headings: ['The Evolution of Commercial HVAC Controls', 'ASHRAE Guideline 36 Sequences', 'Quantifying Chiller Energy Savings'],
      publicationDate: '2026-02-14',
      lastUpdatedDate: '2026-02-14',
      callToActionText: 'Download the Engineering Whitepaper',
      callToActionQuality: 'strong',
      imagesCount: 12,
      internalLinksCount: 22,
      themes: ['ASHRAE 36', 'DDC controls', 'Energy management', 'Pillar guide'],
      audience: 'Consulting engineers, commercial developers',
      observedCadence: 'Monthly engineering insights',
      sourceUrl: 'https://trinitybuildingsystems.com/insights/bas-guide',
      sourceType: 'blog',
      dateObserved: '2026-10-24',
    },
    {
      id: 'c-trin-3',
      businessId: 'biz-trinity-systems',
      projectId: DEMO_PROJECT.id,
      contentType: 'faq',
      classification: 'faq',
      title: 'Commercial Mechanical Service Agreements FAQ',
      url: 'https://trinitybuildingsystems.com/faq',
      mainTopic: 'Commercial Maintenance Contracts & Guarantees',
      summary: 'Answers to common questions regarding preventative service agreements, 24/7 SLAs, and emergency response terms.',
      headings: ['Contract Coverage Details', 'Response Time SLAs', 'Equipment Replacement Discounts'],
      publicationDate: '2025-09-01',
      lastUpdatedDate: '2026-01-20',
      callToActionText: 'Customize Your SLA',
      callToActionQuality: 'strong',
      imagesCount: 2,
      internalLinksCount: 10,
      themes: ['Preventative SLAs', 'Commercial contracts', 'Response guarantees'],
      customerFaqsIdentified: [
        'What response time is guaranteed under the Tier-1 Platinum contract?',
        'Are refrigerant top-offs included in annual preventative agreements?',
      ],
      sourceUrl: 'https://trinitybuildingsystems.com/faq',
      sourceType: 'faq',
      dateObserved: '2026-10-25',
    },
    {
      id: 'c-trin-4',
      businessId: 'biz-trinity-systems',
      projectId: DEMO_PROJECT.id,
      contentType: 'youtube',
      classification: 'educational',
      title: 'Inside a 200-Ton Central Plant Chiller Overhaul (Dallas, TX)',
      url: 'https://youtube.com/watch?v=demo_trinity_chiller_overhaul',
      mainTopic: 'Central Plant Chiller Tube Brushing & Rigging Walkthrough',
      summary: 'Step-by-step video documentary showing Trinity technicians brushing condenser tubes and rebuilding compressor seals.',
      headings: ['Safety Lockout Tagout', 'Tube Brushing & Descaling', 'Eddy Current Testing'],
      publicationDate: '2025-11-12',
      lastUpdatedDate: '2025-11-12',
      callToActionText: 'Subscribe & Contact Trinity',
      callToActionQuality: 'strong',
      imagesCount: 1,
      internalLinksCount: 2,
      themes: ['Chiller overhaul', 'Video proof', 'Central plants'],
      audience: 'Facility managers, engineering students',
      sourceUrl: 'https://youtube.com/watch?v=demo_trinity_chiller_overhaul',
      sourceType: 'youtube',
      dateObserved: '2026-10-26',
    },
  ];

  for (const item of contentItems) {
    await repository.saveContentItem(item);
  }

  // Seed Customer Questions
  const questions: CustomerQuestionInsight[] = [
    {
      id: 'q-demo-1',
      projectId: DEMO_PROJECT.id,
      businessId: 'biz-apex-mechanical',
      question: 'What is your guaranteed emergency arrival window for server room AC failures in Dallas?',
      category: 'emergency_need',
      customerContext: 'Customer review noted 90-minute server room response, but website lacks published SLA window.',
      sourceLabel: 'Google Reviews (Apex Mechanical)',
      sourceType: 'public_reviews',
      suggestedContentAngle: 'Publish a dedicated "Mission-Critical 2-Hour Dispatch Guarantee" service page.',
      priority: 'high',
    },
    {
      id: 'q-demo-2',
      projectId: DEMO_PROJECT.id,
      businessId: 'biz-apex-mechanical',
      question: 'Why do commercial diagnostic fees differ from repair installation estimates?',
      category: 'price_concern',
      customerContext: 'Review mentioned price surprise when diagnostic revealed custom compressor coil parts were needed.',
      sourceLabel: 'Public Review Feedback',
      sourceType: 'public_reviews',
      suggestedContentAngle: 'Transparent pricing guide: "Commercial HVAC Diagnostic vs Parts Replacement Explainer".',
      priority: 'high',
    },
    {
      id: 'q-demo-3',
      projectId: DEMO_PROJECT.id,
      businessId: 'biz-apex-mechanical',
      question: 'When should a warehouse upgrade to high-efficiency VRF systems instead of multiple rooftop RTUs?',
      category: 'service_comparison',
      customerContext: 'Logistics operators comparing capital expenditure vs long-term kilowatt-hour electrical savings.',
      sourceLabel: 'Industry Commercial Inquiry Benchmark',
      sourceType: 'search_intent',
      suggestedContentAngle: 'Comparison matrix: "Commercial RTU vs VRF Multi-Zone: Capital Cost & Efficiency Breakdown".',
      priority: 'medium',
    },
    {
      id: 'q-demo-4',
      projectId: DEMO_PROJECT.id,
      businessId: 'biz-apex-mechanical',
      question: 'Do commercial technicians provide digital photographic proof of work on rooftop chillers?',
      category: 'trust_concern',
      customerContext: 'Property managers cannot climb roofs and require verified before/after photographic documentation.',
      sourceLabel: 'Commercial Property Managers Survey',
      sourceType: 'customer_feedback',
      suggestedContentAngle: 'Visual service standards guide: "How Apex Digital Inspection Reports Protect Commercial Asset Values".',
      priority: 'medium',
    },
  ];

  await repository.saveCustomerQuestions(questions);

  // Seed Content Calendar Items
  const calendarItems: ContentCalendarItem[] = [
    {
      id: 'cal-demo-1',
      projectId: DEMO_PROJECT.id,
      businessId: 'biz-apex-mechanical',
      topic: 'Texas Summer Rooftop RTU Failure Prevention Checklist',
      contentFormat: 'pillar_guide',
      platform: 'website_blog',
      plannedDate: '2026-11-15',
      status: 'planned',
      assignedPerson: 'Content Strategist',
      priority: 'high',
      targetAudience: 'DFW Commercial Property Managers',
      notes: 'Focus on high-heat ambient air cooling and coil descaling.',
    },
    {
      id: 'cal-demo-2',
      projectId: DEMO_PROJECT.id,
      businessId: 'biz-apex-mechanical',
      topic: 'Fort Worth & Tarrant County Commercial Service Hub Launch',
      contentFormat: 'service_page',
      platform: 'service_page',
      plannedDate: '2026-11-22',
      status: 'in_production',
      assignedPerson: 'Web Developer & SEO Specialist',
      priority: 'high',
      targetAudience: 'Fort Worth Industrial Facilities',
      notes: 'New localized URL hierarchy to capture unserved regional demand.',
    },
    {
      id: 'cal-demo-3',
      projectId: DEMO_PROJECT.id,
      businessId: 'biz-apex-mechanical',
      topic: 'Crane Lift RTU Replacement Case Study: 14-Hour Turnaround',
      contentFormat: 'case_study',
      platform: 'linkedin',
      plannedDate: '2026-12-02',
      status: 'ready',
      assignedPerson: 'B2B Copywriter',
      priority: 'medium',
      targetAudience: 'Hospital Engineers & Class-A Building Directors',
      notes: 'Include photographic proof of weekend crane operations.',
    },
    {
      id: 'cal-demo-4',
      projectId: DEMO_PROJECT.id,
      businessId: 'biz-apex-mechanical',
      topic: 'Commercial Facility FAQ: Emergency SLAs & Transparent Rates',
      contentFormat: 'faq_accordion',
      platform: 'website_blog',
      plannedDate: '2026-12-10',
      status: 'idea',
      assignedPerson: 'Customer Success Lead',
      priority: 'medium',
      targetAudience: 'Procurement Directors',
      notes: 'Directly address customer review confusion over diagnostic billing.',
    },
  ];

  await repository.saveContentCalendarItems(calendarItems);
}

export async function seedEmailDiscoveryDemoData(): Promise<void> {
  const emails: EmailDiscoveryRecord[] = [
    {
      id: 'em-apex-marcus',
      projectId: DEMO_PROJECT.id,
      businessId: 'biz-apex-mechanical',
      email: 'marcus.vance@apexmechanicaltx.com',
      associatedPersonName: 'Marcus Vance',
      roleTitle: 'President & Founder',
      sourceUrl: 'https://apexmechanicaltx.com/about-us',
      sourceType: 'official_website',
      discoverySource: 'website',
      emailType: 'named_professional',
      verificationStatus: 'provider_verified',
      confidence: 96,
      syntaxValid: true,
      mxRecordsPresent: true,
      isDisposable: false,
      isRoleBased: false,
      providerName: 'hunter',
      providerResponse: {
        provider: 'hunter',
        status: 'valid',
        rawScore: 98,
        disposable: false,
        freeEmail: false,
        catchAll: false,
        checkedAt: '2026-11-04T14:30:00.000Z',
      },
      qualityScore: {
        totalScore: 96,
        sourceReliability: 35,
        roleAssociation: 30,
        verificationQuality: 25,
        recency: 6,
        grade: 'high_quality',
        summary: 'Quality Score: 96/100 (high quality). Source: 35/35, Role: 30/30, Verification: 25/25, Recency: 6/10.',
      },
      isOutreachSafe: true,
      sourceHistory: [
        'Discovered on https://apexmechanicaltx.com/about-us via website sweep on 2026-10-21',
        'Verified via Hunter.io API on 2026-11-04',
      ],
      discoveryDate: '2026-10-21T09:00:00.000Z',
      notes: 'Direct decision-maker inbox verified via Hunter API and cross-checked against SOS registration.',
    },
    {
      id: 'em-apex-dispatch',
      projectId: DEMO_PROJECT.id,
      businessId: 'biz-apex-mechanical',
      email: 'dispatch@apexmechanicaltx.com',
      associatedPersonName: 'Commercial Dispatch Desk',
      roleTitle: 'Dispatch Coordinator',
      sourceUrl: 'https://apexmechanicaltx.com/contact',
      sourceType: 'official_website',
      discoverySource: 'website',
      emailType: 'department_email',
      verificationStatus: 'domain_passed_unconfirmed',
      confidence: 78,
      syntaxValid: true,
      mxRecordsPresent: true,
      isDisposable: false,
      isRoleBased: true,
      qualityScore: {
        totalScore: 77,
        sourceReliability: 35,
        roleAssociation: 18,
        verificationQuality: 18,
        recency: 6,
        grade: 'acceptable',
        summary: 'Quality Score: 77/100 (acceptable). Source: 35/35, Role: 18/30, Verification: 18/25, Recency: 6/10.',
      },
      isOutreachSafe: true,
      sourceHistory: [
        'Extracted from https://apexmechanicaltx.com/contact via DOM parser on 2026-10-20',
      ],
      discoveryDate: '2026-10-20T10:15:00.000Z',
      notes: 'Monitored general operations desk. Domain MX configured on Google Workspace.',
    },
    {
      id: 'em-lonestar-miller',
      projectId: DEMO_PROJECT.id,
      businessId: 'biz-lonestar-climate',
      email: 'dmiller@lonestarhvac-dfw.com',
      associatedPersonName: 'David K. Miller',
      roleTitle: 'General Manager',
      sourceUrl: 'https://lonestarhvac-dfw.com/team',
      sourceType: 'official_website',
      discoverySource: 'website',
      emailType: 'named_professional',
      verificationStatus: 'accept_all',
      confidence: 72,
      syntaxValid: true,
      mxRecordsPresent: true,
      isDisposable: false,
      isRoleBased: false,
      providerName: 'apollo',
      providerResponse: {
        provider: 'apollo',
        status: 'accept_all',
        rawScore: 68,
        disposable: false,
        freeEmail: false,
        catchAll: true,
        checkedAt: '2026-11-04T12:00:00.000Z',
      },
      qualityScore: {
        totalScore: 74,
        sourceReliability: 35,
        roleAssociation: 24,
        verificationQuality: 10,
        recency: 5,
        grade: 'acceptable',
        summary: 'Quality Score: 74/100 (acceptable). Source: 35/35, Role: 24/30, Verification: 10/25, Recency: 5/10.',
      },
      isOutreachSafe: true,
      sourceHistory: [
        'Discovered on https://lonestarhvac-dfw.com/team on 2026-10-22',
      ],
      discoveryDate: '2026-10-22T11:00:00.000Z',
      notes: 'Mail server responds with catch-all (accepts any mailbox). Recommend polite confirmation in initial outreach.',
    },
    {
      id: 'em-trinity-elena',
      projectId: DEMO_PROJECT.id,
      businessId: 'biz-trinity-systems',
      email: 'elena@trinityairsys.com',
      associatedPersonName: 'Elena Rostova, PE',
      roleTitle: 'Principal Engineer & Managing Member',
      sourceUrl: 'https://pels.texas.gov/roster/demo-elena-rostova',
      sourceType: 'public_registry',
      discoverySource: 'directory',
      emailType: 'named_professional',
      verificationStatus: 'provider_verified',
      confidence: 98,
      syntaxValid: true,
      mxRecordsPresent: true,
      isDisposable: false,
      isRoleBased: false,
      providerName: 'snov',
      providerResponse: {
        provider: 'snov',
        status: 'valid',
        rawScore: 99,
        disposable: false,
        freeEmail: false,
        catchAll: false,
        checkedAt: '2026-11-05T08:00:00.000Z',
      },
      qualityScore: {
        totalScore: 97,
        sourceReliability: 30,
        roleAssociation: 30,
        verificationQuality: 25,
        recency: 12,
        grade: 'high_quality',
        summary: 'Quality Score: 97/100 (high quality). Source: 30/35, Role: 30/30, Verification: 25/25, Recency: 12/10.',
      },
      isOutreachSafe: true,
      sourceHistory: [
        'Extracted from TBPE state registry on 2026-10-22',
        'Cross-referenced with https://trinityairsys.com/leadership on 2026-10-23',
      ],
      discoveryDate: '2026-10-22T14:00:00.000Z',
      notes: 'High-confidence decision maker inbox. Corroborated across TBPE state registry and official leadership roster.',
    },
    {
      id: 'em-disposable-demo',
      projectId: DEMO_PROJECT.id,
      businessId: 'biz-apex-mechanical',
      email: 'temp-contact@mailinator.com',
      associatedPersonName: 'Temporary Inbound Lead',
      sourceUrl: 'https://contact-form-import.csv',
      sourceType: 'csv_import',
      discoverySource: 'csv_import',
      emailType: 'unknown',
      verificationStatus: 'disposable',
      confidence: 12,
      syntaxValid: true,
      mxRecordsPresent: true,
      isDisposable: true,
      isRoleBased: false,
      qualityScore: {
        totalScore: 32,
        sourceReliability: 20,
        roleAssociation: 12,
        verificationQuality: 0,
        recency: 0,
        grade: 'excluded',
        summary: 'Quality Score: 32/100 (excluded). Source: 20/35, Role: 12/30, Verification: 0/25, Recency: 0/10.',
      },
      isOutreachSafe: false,
      exclusionReason: 'Disposable temporary email domain detected (mailinator.com). Excluded to protect sender reputation.',
      discoveryDate: '2026-11-01T10:00:00.000Z',
      notes: 'Detected as temporary disposable address; automatically flagged as unsafe for outreach.',
    },
    {
      id: 'em-syntax-error-demo',
      projectId: DEMO_PROJECT.id,
      businessId: 'biz-lonestar-climate',
      email: 'quotes@@lonestarhvac-dfw..com',
      associatedPersonName: 'Raw Form Input',
      sourceUrl: 'https://scraped-form-lead.html',
      sourceType: 'unverified_web',
      discoverySource: 'manual',
      emailType: 'unknown',
      verificationStatus: 'invalid',
      confidence: 5,
      syntaxValid: false,
      mxRecordsPresent: false,
      isDisposable: false,
      isRoleBased: false,
      qualityScore: {
        totalScore: 10,
        sourceReliability: 10,
        roleAssociation: 0,
        verificationQuality: 0,
        recency: 0,
        grade: 'excluded',
        summary: 'Quality Score: 10/100 (excluded). Source: 10/35, Role: 0/30, Verification: 0/25, Recency: 0/10.',
      },
      isOutreachSafe: false,
      exclusionReason: 'Invalid RFC 5322 email syntax (double @ symbol / consecutive dots). Hard bounce guaranteed.',
      discoveryDate: '2026-11-02T12:00:00.000Z',
      notes: 'Failed syntax check during regex sweep.',
    },
  ];

  await repository.saveEmails(emails);
}

export async function seedOutreachStrategyDemoData(): Promise<void> {
  const businesses = await repository.getBusinesses(DEMO_PROJECT.id);
  const audits = await repository.getAudits(DEMO_PROJECT.id);
  const localProfiles = await repository.getLocalSeoProfiles(DEMO_PROJECT.id);
  const opps = await repository.getOpportunities(undefined, DEMO_PROJECT.id);
  const contacts = await repository.getContacts(undefined, DEMO_PROJECT.id);
  const facts = await repository.getFacts(undefined, DEMO_PROJECT.id);
  const sources = await repository.getSources(DEMO_PROJECT.id);
  const contentItems = await repository.getContentItems(undefined, DEMO_PROJECT.id);
  const customerQuestions = await repository.getCustomerQuestions(undefined, DEMO_PROJECT.id);

  const strategies = businesses.map(b => {
    const audit = audits.find(a => a.businessId === b.id);
    const lProfile = localProfiles.find(lp => lp.businessId === b.id);
    const bOpps = opps.filter(o => o.businessId === b.id);
    const bContacts = contacts.filter(c => c.businessId === b.id);
    const bFacts = facts.filter(f => f.businessId === b.id);
    const bSources = sources.filter(s => s.businessId === b.id);
    const bContent = contentItems.filter(ci => ci.businessId === b.id);
    const bQuestions = customerQuestions.filter(cq => cq.businessId === b.id);

    const strat = generateProspectOutreachStrategy(
      b,
      audit,
      lProfile,
      bOpps,
      bContacts,
      bFacts,
      bSources,
      bContent,
      bQuestions
    );

    // Apply realistic demo statuses
    if (b.id === 'biz-apex-mechanical') {
      strat.status = 'approved';
      strat.approvalDate = '2026-11-04T10:00:00.000Z';
    } else if (b.id === 'biz-lonestar-climate') {
      strat.status = 'contacted';
      strat.approvalDate = '2026-11-03T11:00:00.000Z';
      strat.contactedDate = '2026-11-04T14:30:00.000Z';
      strat.scheduledFollowUpDate = '2026-11-11';
    } else if (b.id === 'biz-trinity-systems') {
      strat.status = 'replied_interested';
      strat.approvalDate = '2026-11-03T09:00:00.000Z';
      strat.contactedDate = '2026-11-03T15:00:00.000Z';
      strat.responseDate = '2026-11-05T09:30:00.000Z';
      strat.responseNotes = 'Elena replied via email: "Interesting findings regarding localized industrial automation in Tarrant county. Please send over the 2-page brief for our partners."';
    }

    return strat;
  });

  await repository.saveOutreachStrategies(strategies);
}

export async function seedCrmDemoData(): Promise<void> {
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Follow-up Schedules
  const schedules: FollowUpSchedule[] = [
    {
      id: 'sched-apex-1',
      businessId: 'biz-apex-mechanical',
      projectId: DEMO_PROJECT.id,
      firstOutreachDate: '2026-11-03',
      nextFollowUpDate: todayStr, // Due today for immediate testing
      followUpIntervalDays: 3,
      attemptNumber: 1,
      maxAttempts: 4,
      preferredChannel: 'email',
      timezone: 'America/Chicago',
      status: 'due_today',
      notes: 'Initial outreach draft reviewed and approved. Gentle nudge due today regarding RTU quoting.',
      createdAt: '2026-11-03T10:00:00.000Z',
      updatedAt: '2026-11-06T08:00:00.000Z',
    },
    {
      id: 'sched-lonestar-1',
      businessId: 'biz-lonestar-climate',
      projectId: DEMO_PROJECT.id,
      firstOutreachDate: '2026-11-01',
      nextFollowUpDate: '2026-11-04', // Overdue
      followUpIntervalDays: 5,
      attemptNumber: 2,
      maxAttempts: 4,
      preferredChannel: 'phone',
      timezone: 'America/Chicago',
      status: 'overdue',
      notes: 'Follow up with dispatch manager Marcus regarding commercial maintenance contract proposal.',
      createdAt: '2026-11-01T12:00:00.000Z',
      updatedAt: '2026-11-05T09:00:00.000Z',
    },
    {
      id: 'sched-trinity-1',
      businessId: 'biz-trinity-systems',
      projectId: DEMO_PROJECT.id,
      firstOutreachDate: '2026-11-02',
      nextFollowUpDate: '2026-11-09',
      followUpIntervalDays: 7,
      attemptNumber: 1,
      maxAttempts: 4,
      preferredChannel: 'email',
      timezone: 'America/Chicago',
      status: 'stopped',
      stopReason: 'recipient_replied',
      notes: 'Elena Vance replied asking for partner briefing document. Sequence stopped automatically.',
      createdAt: '2026-11-02T14:00:00.000Z',
      updatedAt: '2026-11-05T09:30:00.000Z',
    },
  ];

  for (const s of schedules) {
    await repository.saveFollowUpSchedule(s);
  }

  // 2. Activity Logs
  const activities = [
    {
      businessId: 'biz-apex-mechanical',
      projectId: DEMO_PROJECT.id,
      type: 'lead_discovered' as const,
      title: 'Lead Discovered & Ingested',
      description: 'Apex Mechanical Solutions identified via Dallas NAICS 238220 registry sweep.',
      actor: 'Discovery Engine',
      timestamp: '2026-11-01T09:00:00.000Z',
    },
    {
      businessId: 'biz-apex-mechanical',
      projectId: DEMO_PROJECT.id,
      type: 'audit_performed' as const,
      title: 'Technical 10-Cat Website Audit',
      description: 'Overall website grade: B (68/100). Found quote friction on mobile devices.',
      actor: 'Audit Engine',
      timestamp: '2026-11-02T11:30:00.000Z',
    },
    {
      businessId: 'biz-apex-mechanical',
      projectId: DEMO_PROJECT.id,
      type: 'draft_approved' as const,
      title: 'Outreach Sequence Approved',
      description: 'Auditor approved personalized 4-step sequence referencing mobile quote friction.',
      actor: 'Human Auditor',
      timestamp: '2026-11-03T10:15:00.000Z',
    },
    {
      businessId: 'biz-trinity-systems',
      projectId: DEMO_PROJECT.id,
      type: 'reply_received' as const,
      title: 'Prospect Reply Received',
      description: 'Elena Vance: "Interesting findings regarding localized industrial automation in Tarrant county. Please send over the 2-page brief for our partners."',
      actor: 'Elena Vance (Owner)',
      timestamp: '2026-11-05T09:30:00.000Z',
    },
  ];

  for (const act of activities) {
    await repository.logCrmActivity(act);
  }
}

export const DEMO_PROJECT_2: ResearchProject = {
  id: 'proj-demo-austin-hvac',
  name: '[DEMO] Austin-Round Rock Commercial HVAC & Clean Air Intelligence',
  country: 'United States',
  stateRegion: 'Texas',
  cityArea: 'Austin-Round Rock Metro',
  industryNiche: 'Commercial HVAC, Clean Air & Building Controls',
  businessModel: 'commercial',
  targetBusinessSize: '10-50 technicians / $2M-$15M revenue',
  targetServices: 'Cleanroom air handling, server farm cooling, commercial retrofits, emergency dispatch',
  targetCustomerSegment: 'Tech campuses, high-rise property managers, laboratory facilities',
  competitorNames: "Stan's Heating & Air, Totally Cool Austin, Schneider Electric Services",
  watechServicesToEvaluate: [
    'website_development',
    'local_seo',
    'conversion_optimization',
    'automation',
    'custom_software',
  ],
  researchDepth: 'deep',
  notesAndExclusions: 'Focus on contractors serving Travis and Williamson counties. High tech corridor demand.',
  isDemo: true,
  createdAt: '2026-10-20T10:00:00.000Z',
  updatedAt: '2026-11-04T16:00:00.000Z',
};

export async function seedAustinDemoData(): Promise<void> {
  const existing = await repository.getProject(DEMO_PROJECT_2.id);
  if (existing) return;

  await repository.saveProject(DEMO_PROJECT_2);

  const marketArea2: MarketArea = {
    id: 'market-austin-1',
    projectId: DEMO_PROJECT_2.id,
    name: 'Austin-Round Rock High-Tech Corridor',
    country: 'United States',
    region: 'Texas',
    geographicBoundaries: 'Travis & Williamson counties (US-183, MoPac, I-35 tech corridor)',
    relevantCategories: ['Cleanroom HVAC', 'Server Farm Cooling', 'Commercial Chillers'],
    estimatedBusinessCount: 96,
    countSourceUrl: 'https://austinchamber.com/economic-development/industry-clusters',
    countConfidence: 0.9,
    competitionDensity: 'moderate',
    coveragePercentage: 82,
    createdAt: '2026-10-20T10:00:00.000Z',
  };
  await repository.saveMarketArea(marketArea2);

  const b1: Business = {
    id: 'biz-austin-thermal',
    projectId: DEMO_PROJECT_2.id,
    officialName: 'Austin Thermal & Clean Air Systems',
    domain: 'austinthermalair.com',
    websiteUrl: 'https://austinthermalair.com',
    hasWebsite: true,
    phone: '(512) 555-0188',
    email: 'info@austinthermalair.com',
    fullAddress: '8200 Research Blvd, Austin, TX 78758',
    city: 'Austin',
    state: 'Texas',
    country: 'United States',
    businessModel: 'commercial',
    foundingYear: 2012,
    status: 'qualified',
    reviewRating: 4.7,
    reviewCount: 42,
    marketingChannels: ['website', 'google_local'],
    ownerVerificationStatus: 'verified',
    createdAt: '2026-10-21T09:00:00.000Z',
    updatedAt: '2026-11-04T10:00:00.000Z',
  };

  const b2: Business = {
    id: 'biz-capitol-city',
    projectId: DEMO_PROJECT_2.id,
    officialName: 'Capitol City Mechanical Contractors',
    domain: 'capitolcitymech.com',
    websiteUrl: 'https://capitolcitymech.com',
    hasWebsite: true,
    phone: '(512) 555-0144',
    email: 'service@capitolcitymech.com',
    fullAddress: '1401 N Interstate 35, Round Rock, TX 78664',
    city: 'Round Rock',
    state: 'Texas',
    country: 'United States',
    businessModel: 'commercial',
    foundingYear: 2006,
    status: 'qualified',
    reviewRating: 4.4,
    reviewCount: 29,
    marketingChannels: ['website'],
    ownerVerificationStatus: 'verified',
    createdAt: '2026-10-21T09:30:00.000Z',
    updatedAt: '2026-11-04T11:00:00.000Z',
  };

  const b3: Business = {
    id: 'biz-travis-energy',
    projectId: DEMO_PROJECT_2.id,
    officialName: 'Travis Energy & Chillers LLC',
    domain: 'travisenergytx.com',
    websiteUrl: 'https://travisenergytx.com',
    hasWebsite: true,
    phone: '(512) 555-0122',
    email: 'dispatch@travisenergytx.com',
    fullAddress: '2201 E 7th St, Austin, TX 78702',
    city: 'Austin',
    state: 'Texas',
    country: 'United States',
    businessModel: 'commercial',
    foundingYear: 2018,
    status: 'discovered',
    reviewRating: 4.1,
    reviewCount: 14,
    marketingChannels: ['website'],
    ownerVerificationStatus: 'unverified',
    createdAt: '2026-10-22T08:00:00.000Z',
    updatedAt: '2026-11-04T12:00:00.000Z',
  };

  await repository.saveBusinesses([b1, b2, b3]);

  // Audits
  const audit1: WebsiteAudit = {
    id: 'audit-austin-thermal',
    businessId: b1.id,
    projectId: DEMO_PROJECT_2.id,
    targetUrl: b1.websiteUrl,
    totalScore: 82,
    grade: 'A',
    inspectedAt: '2026-10-22T10:00:00.000Z',
    hasSsl: true,
    isAutomated: true,
    scoringRulesVersion: 'v1.0-transparent-10-cat',
    categories: [],
    findings: [],
  };

  const audit2: WebsiteAudit = {
    id: 'audit-capitol-city',
    businessId: b2.id,
    projectId: DEMO_PROJECT_2.id,
    targetUrl: b2.websiteUrl,
    totalScore: 58,
    grade: 'C',
    inspectedAt: '2026-10-22T11:00:00.000Z',
    hasSsl: true,
    isAutomated: true,
    scoringRulesVersion: 'v1.0-transparent-10-cat',
    categories: [],
    findings: [
      {
        id: 'find-cap-1',
        auditId: 'audit-capitol-city',
        category: 'mobile_responsiveness',
        observation: 'Mobile viewport overflow and tap targets overlapping.',
        evidenceUrlOrSnippet: 'Viewport meta tag missing width=device-width',
        severity: 'high',
        confidence: 0.95,
        customerImpact: 'High mobile visitor bounce rate.',
        recommendedAction: 'Rebuild responsive navigation and booking CTA.',
        isAutomated: true,
      },
    ],
  };

  await repository.saveAudit(audit1);
  await repository.saveAudit(audit2);

  // Contacts
  const c1: Contact = {
    id: 'cont-austin-nathan',
    businessId: b1.id,
    projectId: DEMO_PROJECT_2.id,
    fullName: 'Nathan Chen',
    roleOrTitle: 'VP of Operations',
    email: 'nathan.chen@austinthermalair.com',
    phone: '(512) 555-0188',
    isDecisionMaker: true,
    verificationStatus: 'verified',
    confidence: 0.94,
  };

  const c2: Contact = {
    id: 'cont-capitol-sarah',
    businessId: b2.id,
    projectId: DEMO_PROJECT_2.id,
    fullName: 'Sarah Lindqvist',
    roleOrTitle: 'Managing Partner',
    email: 'sarah@capitolcitymech.com',
    phone: '(512) 555-0144',
    isDecisionMaker: true,
    verificationStatus: 'verified',
    confidence: 0.92,
  };

  await repository.saveContacts([c1, c2]);

  // Opportunities
  const opp1: Opportunity = {
    id: 'opp-austin-1',
    businessId: b1.id,
    projectId: DEMO_PROJECT_2.id,
    identifiedProblem: 'Missing real-time cleanroom sensor telemetry integration for corporate clients.',
    evidence: 'Current website only has email contact form for technical clients.',
    businessRelevance: 'Austin tech manufacturers require sub-2-hour cleanroom SLA tracking.',
    recommendedSolution: 'Deploy client portal with live dispatch monitoring and cleanroom SLA ticketing.',
    relevantWatechService: 'custom_software',
    effort: 'medium',
    impact: 'high',
    confidence: 0.9,
    suggestedOutreachAngle: 'High-Tech Client Portal Automation',
    status: 'identified',
    createdAt: '2026-10-23T10:00:00.000Z',
  };

  const opp2: Opportunity = {
    id: 'opp-capitol-1',
    businessId: b2.id,
    projectId: DEMO_PROJECT_2.id,
    identifiedProblem: 'Slow page load (4.8s) and broken mobile layout costing inbound repair inquiries.',
    evidence: 'Mobile viewport testing flagged severe layout shift.',
    businessRelevance: 'Round Rock commercial accounts book predominantly via mobile phone.',
    recommendedSolution: 'Rebuild lightning-fast Next.js mobile landing pages with 1-tap emergency dispatch.',
    relevantWatechService: 'website_development',
    effort: 'low',
    impact: 'high',
    confidence: 0.95,
    suggestedOutreachAngle: 'Mobile Inbound Quote Recovery',
    status: 'identified',
    createdAt: '2026-10-23T11:00:00.000Z',
  };

  await repository.saveOpportunities([opp1, opp2]);

  // Lead Scores
  const score1: LeadScore = {
    id: 'score-austin-thermal',
    businessId: b1.id,
    projectId: DEMO_PROJECT_2.id,
    totalScore: 76,
    band: 'A',
    breakdown: {
      capacityGrowthSignals: { name: 'Growth Signals', pointsAwarded: 10, maxPoints: 10, evidence: 'Verified hiring', isUnknown: false },
    },
    calculatedAt: '2026-10-24T10:00:00.000Z',
    rationale: 'Established commercial presence with verified decision maker and expansion potential.',
  };

  const score2: LeadScore = {
    id: 'score-capitol-city',
    businessId: b2.id,
    projectId: DEMO_PROJECT_2.id,
    totalScore: 84,
    band: 'A',
    breakdown: {
      capacityGrowthSignals: { name: 'Growth Signals', pointsAwarded: 10, maxPoints: 10, evidence: 'Verified commercial vehicles', isUnknown: false },
    },
    calculatedAt: '2026-10-24T11:00:00.000Z',
    rationale: 'Severe website deficits combined with prime commercial positioning create immediate high-ROI engagement.',
  };

  await repository.saveScore(score1);
  await repository.saveScore(score2);

  // Local SEO
  const local1: LocalSeoProfile = {
    id: 'lseo-austin-1',
    businessId: b1.id,
    projectId: DEMO_PROJECT_2.id,
    businessName: b1.officialName,
    primaryCategory: 'HVAC Contractor',
    secondaryCategories: ['Air Conditioning Contractor'],
    serviceAreas: ['Austin', 'Round Rock', 'Pflugerville'],
    servicesList: ['Cleanroom HVAC', 'Server Room Air Conditioning', 'Commercial Chillers'],
    zipCodes: ['78758'],
    hasCoverPhoto: true,
    photosCount: 28,
    reviewCount: 42,
    averageRating: 4.7,
    googleBusinessProfileUrl: 'https://maps.google.com/?cid=austin-thermal',
    napConsistencyStatus: 'matched',
    napDiscrepancies: [],
    source: 'google_places_api',
    apiConfigured: true,
    createdAt: '2026-10-24T12:00:00.000Z',
    updatedAt: '2026-11-04T10:00:00.000Z',
  };

  await repository.saveLocalSeoProfile(local1);
}

export async function seedProposalsDemoData(): Promise<void> {
  const existing = await repository.getProposals(DEMO_PROJECT.id);
  if (existing.length > 0) return;

  // 1. Ensure branding config exists
  const existingBrand = await repository.getBrandingConfig();
  if (!existingBrand) {
    await repository.saveBrandingConfig(DEFAULT_BRANDING_CONFIG);
  }

  // 2. Demo Quotation 1 (Apex Mechanical)
  const quotation1: ProposalQuotation = {
    id: 'quo-demo-apex',
    proposalId: 'prop-demo-apex',
    businessId: 'biz-apex-mechanical',
    projectId: DEMO_PROJECT.id,
    quotationNumber: 'QUO-2026-0042',
    status: 'accepted',
    currency: 'USD',
    issueDate: '2026-10-25',
    expiryDate: '2026-11-25',
    lineItems: [
      {
        id: 'item-apex-1',
        serviceId: 'srv_web_turnkey',
        serviceName: 'High-Performance Web Platform & UX Redesign',
        description: 'Complete mobile-first website revamp, sub-second Core Web Vitals, and direct commercial quote triggers.',
        category: 'website_digital_experience',
        billingType: 'one_time',
        quantity: 1,
        unitPrice: 2500,
        discountPercent: 0,
        taxPercent: 0,
        subtotal: 2500,
      },
      {
        id: 'item-apex-2',
        serviceId: 'srv_seo_pack',
        serviceName: 'Local Search Dominance & Google 3-Pack Optimization',
        description: '40+ local citations, GBP category overhaul, review generation workflows, and monthly rank tracking.',
        category: 'search_visibility',
        billingType: 'monthly',
        quantity: 1,
        unitPrice: 750,
        discountPercent: 0,
        taxPercent: 0,
        subtotal: 750,
      },
      {
        id: 'item-apex-3',
        serviceId: 'srv_auto_leads',
        serviceName: 'Automated Lead Routing & Instant Inbound Response',
        description: 'Real-time SMS/Email lead dispatch webhook into dispatch team inbox with CRM sync.',
        category: 'software_business_automation',
        billingType: 'one_time',
        quantity: 1,
        unitPrice: 950,
        discountPercent: 0,
        taxPercent: 0,
        subtotal: 950,
      },
    ],
    subtotal: 4200,
    totalDiscount: 0,
    totalTax: 0,
    totalAmount: 4200,
    paymentTerms: '50% upon kickoff ($2,100), 25% upon staging review ($1,050), 25% upon production handover ($1,050). Retainer billed 1st of month.',
    hasUnconfiguredPricing: false,
    notes: 'Approved commercial quotation. Implementation underway.',
    exclusions: [
      'Third-party software subscription or API usage fees (e.g. Twilio, domain registrar fees)',
      'Brand trademark registration and legal filings',
    ],
  };

  // 3. Demo Proposal 1 (Apex Mechanical)
  const proposal1: BusinessProposal = {
    id: 'prop-demo-apex',
    businessId: 'biz-apex-mechanical',
    projectId: DEMO_PROJECT.id,
    crmLeadId: undefined,
    quotationId: quotation1.id,
    proposalNumber: 'PROP-2026-0042',
    title: 'Apex Mechanical Solutions — Executive 360 Growth System',
    templateType: 'premium_business',
    status: 'approved',
    currentVersion: 1,
    cover: {
      clientName: 'Apex Mechanical Solutions Inc',
      clientContact: 'Robert Vance, Managing Director',
      validityPeriod: '30 Days from Issue',
      date: '2026-10-25',
    },
    executiveSummary: `## Executive Strategic Summary

**Prepared for:** Apex Mechanical Solutions Inc
**Market Focus:** Dallas-Fort Worth Metroplex Commercial HVAC

Through technical inspection of Apex Mechanical's digital footprint, Watech identified superior local reputation (4.8/5.0 stars) contrasted with a 4.2-second mobile load latency and missing Google 3-Pack placement.

Watech proposes the 360 Growth System engineered to deliver sub-second performance, top 3 Map Pack rankings, and instant lead triage.`,
    businessAssessment: {
      auditExcerpt: 'Technical audit score 68/100. Mobile UX score: 55/100. Page load latency of 4.2 seconds on mobile viewports.',
      seoExcerpt: '4.8/5.0 stars across 34 verified reviews. Google Business Profile unclaimed in secondary categories.',
      opportunitiesIdentified: [
        'Mobile UX revamp to recover lost facility manager inquiries',
        'Google Map Pack top 3 optimization in Dallas industrial corridor',
        'Automated dispatch SMS alert workflow',
      ],
      competitorContext: 'Outperforming regional competitors in customer sentiment; closing the website speed gap guarantees market separation.',
    },
    recommendedSolution: {
      packageTitle: 'Executive 360 Growth System',
      servicesList: [
        'High-Performance Web Platform & UX Redesign',
        'Local Search Dominance & Google 3-Pack Optimization',
        'Automated Lead Routing & Instant Inbound Response',
      ],
      expectedOutcomes: [
        'Sub-second page load times and 0 layout shift',
        'Top 3 Google Map Pack placement for target mechanical keywords',
        'Instantaneous lead routing directly to dispatch coordinators',
      ],
      dependencies: [
        'Access to DNS records and web hosting',
        'Google Business Profile authorization',
      ],
    },
    scopeOfWork: {
      deliverables: [
        'Responsive web platform (Next.js 14 architecture)',
        '40+ verified local citations and NAP consistency cleanup',
        'Instant webhook integration with dispatch SMS pipeline',
      ],
      activities: [
        'Wireframing and user experience flow design',
        'Cleanroom SEO meta tag optimization',
        'Production DNS cutover and indexing submission',
      ],
      acceptanceCriteria: [
        'PageSpeed Insights mobile score >= 85',
        'Verified end-to-end webhook dispatch transmission',
      ],
      exclusions: quotation1.exclusions,
    },
    implementationPhases: [
      {
        phase: 1,
        name: 'Discovery & Architecture',
        duration: 'Week 1',
        milestones: 'Kickoff, DNS access, sitemap sign-off',
      },
      {
        phase: 2,
        name: 'Platform Engineering & Local SEO',
        duration: 'Weeks 2–4',
        milestones: 'Staging build, citation sync, GBP optimization',
      },
      {
        phase: 3,
        name: 'Automation & Production Cutover',
        duration: 'Weeks 5–6',
        milestones: 'SMS webhook integration, final client approval, DNS cutover',
      },
    ],
    timeline: {
      estimatedStart: 'Immediate upon agreement execution',
      duration: '6 Weeks',
      milestones: [
        'Architecture Approval (Week 1)',
        'Staging Review (Week 3)',
        'Production Launch (Week 6)',
      ],
    },
    termsAndConditions: STANDARD_TERMS_AND_CONDITIONS,
    nextSteps: [
      'Authorize engagement via signature block below',
      'Schedule 30-minute technical onboarding consultation',
      'Provide DNS registrar credentials and logo assets',
    ],
    quotation: quotation1,
    humanApproved: true,
    humanApprovedAt: '2026-10-25T14:00:00.000Z',
    humanApprovedBy: 'Watech Commercial Solutions Architect',
    createdAt: '2026-10-25T10:00:00.000Z',
    updatedAt: '2026-10-25T14:30:00.000Z',
  };

  // 4. Demo Quotation 2 (Lone Star Refrigeration)
  const quotation2: ProposalQuotation = {
    id: 'quo-demo-lonestar',
    proposalId: 'prop-demo-lonestar',
    businessId: 'biz-lonestar-refrig',
    projectId: DEMO_PROJECT.id,
    quotationNumber: 'QUO-2026-0089',
    status: 'draft',
    currency: 'USD',
    issueDate: '2026-10-28',
    expiryDate: '2026-11-28',
    lineItems: [
      {
        id: 'item-lone-1',
        serviceId: 'srv_web_turnkey',
        serviceName: 'High-Performance Web Platform & UX Redesign',
        description: 'Complete mobile-first website revamp, sub-second Core Web Vitals, and direct commercial quote triggers.',
        category: 'website_digital_experience',
        billingType: 'one_time',
        quantity: 1,
        unitPrice: 2500,
        discountPercent: 0,
        taxPercent: 0,
        subtotal: 2500,
      },
    ],
    subtotal: 2500,
    totalDiscount: 0,
    totalTax: 0,
    totalAmount: 2500,
    paymentTerms: '50% upon kickoff ($1,250), 50% upon production deployment ($1,250).',
    hasUnconfiguredPricing: false,
    notes: 'Draft quotation under internal evaluation.',
    exclusions: ['Custom software backend development'],
  };

  // 5. Demo Proposal 2 (Lone Star Refrigeration)
  const proposal2: BusinessProposal = {
    id: 'prop-demo-lonestar',
    businessId: 'biz-lonestar-refrig',
    projectId: DEMO_PROJECT.id,
    crmLeadId: undefined,
    quotationId: quotation2.id,
    proposalNumber: 'PROP-2026-0089',
    title: 'Lone Star Industrial Refrigeration — Digital Platform Modernization',
    templateType: 'website_digital',
    status: 'draft',
    currentVersion: 1,
    cover: {
      clientName: 'Lone Star Industrial Refrigeration LLC',
      clientContact: 'Operations Director',
      validityPeriod: '30 Days from Issue',
      date: '2026-10-28',
    },
    executiveSummary: `## Executive Summary
Targeted digital platform modernization designed to eliminate mobile bounce rates for industrial cold storage clients across Fort Worth.`,
    businessAssessment: {
      auditExcerpt: 'Audit score 48/100. Missing mobile viewport tags and slow 5.1s FCP.',
      seoExcerpt: 'Local reviews 12, rating 4.3.',
      opportunitiesIdentified: [
        'Speed optimization and modern responsive UI for cold storage clients',
      ],
      competitorContext: 'Behind market leaders in online credibility.',
    },
    recommendedSolution: {
      packageTitle: 'High-Performance Web Platform',
      servicesList: ['High-Performance Web Platform & UX Redesign'],
      expectedOutcomes: ['Sub-second page loads and mobile responsiveness'],
      dependencies: ['Domain access'],
    },
    scopeOfWork: {
      deliverables: ['Custom 5-page responsive web platform'],
      activities: ['Design, build, content migration, testing'],
      acceptanceCriteria: ['Mobile score >= 85'],
      exclusions: quotation2.exclusions,
    },
    implementationPhases: [
      {
        phase: 1,
        name: 'Design & Build',
        duration: 'Weeks 1–3',
        milestones: 'Wireframe approval, staging build',
      },
      {
        phase: 2,
        name: 'Deployment',
        duration: 'Week 4',
        milestones: 'DNS cutover and go-live',
      },
    ],
    timeline: {
      estimatedStart: 'Within 3 days of deposit',
      duration: '4 Weeks',
      milestones: ['Staging review (Week 2)', 'Launch (Week 4)'],
    },
    termsAndConditions: STANDARD_TERMS_AND_CONDITIONS,
    nextSteps: ['Review and execute agreement'],
    quotation: quotation2,
    humanApproved: false,
    createdAt: '2026-10-28T11:00:00.000Z',
    updatedAt: '2026-10-28T11:00:00.000Z',
  };

  await repository.saveQuotation(quotation1);
  await repository.saveProposal(proposal1);
  await repository.saveQuotation(quotation2);
  await repository.saveProposal(proposal2);
}

export async function seedClientProjectsDemoData(): Promise<void> {
  // 1. Team Members
  const existingTeam = await repository.getTeamMembers();
  if (existingTeam.length === 0) {
    for (const tm of DEFAULT_TEAM_MEMBERS) {
      await repository.saveTeamMember(tm);
    }
  }

  // 2. Demo Client
  const client: ClientProfile = {
    id: 'client-demo-apex',
    businessId: 'biz-apex-mechanical',
    projectId: DEMO_PROJECT.id,
    companyName: 'Apex Mechanical Solutions Inc',
    industry: 'Commercial HVAC & Chiller Services',
    website: 'https://apexmechanicaltx.com',
    country: 'United States',
    state: 'Texas',
    city: 'Dallas',
    address: '11420 Emerald St, Dallas, TX 75229',
    phone: '(214) 555-0144',
    email: 'service@apexmechanicaltx.com',
    companySize: '15-20 employees',
    primaryContact: {
      name: 'Marcus Vance',
      title: 'President & General Manager',
      email: 'm.vance@apexmechanicaltx.com',
      phone: '(214) 555-0144',
      preferredChannel: 'email',
      timezone: 'America/Chicago',
    },
    commercial: {
      acceptedProposalId: 'prop-demo-apex',
      quotationId: 'quo-demo-apex',
      purchasedPackageName: 'Commercial Digital Platform & Local Dominance',
      agreedServices: [
        'High-Performance Web Platform & UX Redesign',
        'Local SEO & Google 3-Pack Growth Engine',
        'Instant Lead Dispatch & CRM Automation',
      ],
      contractValue: 6800,
      currency: 'USD',
      paymentModel: 'milestone',
      startDate: '2026-10-25',
    },
    account: {
      assignedManagerId: 'team-pm-01',
      internalNotes: 'VIP Commercial Contractor account. Goal is to double inbound qualified chiller replacement quotes by Q2.',
    },
    status: 'in_delivery',
    healthScore: 86,
    healthGrade: 'good',
    healthFactors: [
      'Initial kickoff completed ahead of schedule',
      'Phase 1 UX wireframes signed off with praise',
      'One deliverable revision flagged as out-of-scope for scope alignment',
    ],
    createdAt: '2026-10-25T10:00:00.000Z',
    updatedAt: '2026-11-05T15:30:00.000Z',
  };
  await repository.saveClient(client);

  // 3. Onboarding
  const baseSteps = ONBOARDING_TEMPLATES.website.steps;
  const onboardingSteps = baseSteps.map((s, idx) => ({
    id: 'step-apex-' + (idx + 1),
    stepNumber: s.stepNumber,
    title: s.title,
    description: s.description,
    category: s.category,
    status: idx < 9 ? ('completed' as const) : idx === 9 ? ('in_progress' as const) : ('not_started' as const),
    completedAt: idx < 9 ? '2026-10-27T12:00:00.000Z' : undefined,
    notes: idx === 9 ? 'Staging environment deployed on Cloudflare Pages; awaiting DNS verification.' : undefined,
  }));

  const onboarding: ClientOnboarding = {
    id: 'onboard-demo-apex',
    clientId: client.id,
    projectId: DEMO_PROJECT.id,
    templateCategory: 'website',
    steps: onboardingSteps,
    overallProgress: 75,
    isCompleted: false,
    updatedAt: '2026-10-28T16:00:00.000Z',
  };
  await repository.saveClientOnboarding(onboarding);

  // 4. Client Requirements
  const requirements: ClientRequirement[] = [
    {
      id: 'req-apex-1',
      clientId: client.id,
      projectId: DEMO_PROJECT.id,
      title: 'Cloudflare DNS Registrar Access & Name Servers',
      description: 'Provide temporary DNS delegator access to point staging CNAME records.',
      requiredFileTypeOrInfo: 'Credentials / Invitation to DNS dashboard',
      priority: 'high',
      dueDate: '2026-10-28',
      status: 'approved',
      submittedContent: 'Granted delegator role to tech@watech-bi.com',
      internalNotes: 'Verified DNS propagation.',
      createdAt: '2026-10-25T11:00:00.000Z',
    },
    {
      id: 'req-apex-2',
      clientId: client.id,
      projectId: DEMO_PROJECT.id,
      title: 'High-Resolution Brand Logo & Equipment Photos',
      description: 'Vector SVG or transparent PNG of Apex Mechanical logo and photos of service fleet.',
      requiredFileTypeOrInfo: 'ZIP file containing .svg, .png, and high-res photos',
      priority: 'urgent',
      dueDate: '2026-10-27',
      status: 'approved',
      submittedContent: 'Uploaded logo_primary.svg and 14 fleet vehicle photos via local asset browser.',
      internalNotes: 'Assets passed to design lead Elena.',
      createdAt: '2026-10-25T11:00:00.000Z',
    },
    {
      id: 'req-apex-3',
      clientId: client.id,
      projectId: DEMO_PROJECT.id,
      title: 'Emergency Service Dispatch Routing Numbers & Schedules',
      description: 'After-hours escalation cell phone numbers and on-call technician schedule.',
      requiredFileTypeOrInfo: 'Text / Excel roster',
      priority: 'medium',
      dueDate: '2026-11-10',
      status: 'pending',
      internalNotes: 'Required before launching Phase 3 SMS automation.',
      createdAt: '2026-10-26T14:00:00.000Z',
    },
  ];
  for (const req of requirements) {
    await repository.saveClientRequirement(req);
  }

  // 5. Client Assets (Local Browser Storage Disclosure)
  const assets: ClientAsset[] = [
    {
      id: 'asset-apex-1',
      clientId: client.id,
      projectId: DEMO_PROJECT.id,
      fileName: 'apex_logo_vector_master.svg',
      fileType: 'image/svg+xml',
      storageType: 'local_browser_blob',
      fileSizeBytes: 48200,
      version: 1,
      description: 'Primary corporate vector logo with transparent background.',
      approvalStatus: 'approved',
      uploadedAt: '2026-10-26T12:00:00.000Z',
    },
    {
      id: 'asset-apex-2',
      clientId: client.id,
      projectId: DEMO_PROJECT.id,
      fileName: 'chiller_maintenance_pricing_matrix.pdf',
      fileType: 'application/pdf',
      storageType: 'local_browser_blob',
      fileSizeBytes: 245000,
      version: 1,
      description: 'Internal contract rate card used for quoting RTU service contracts.',
      approvalStatus: 'approved',
      uploadedAt: '2026-10-26T15:30:00.000Z',
    },
  ];
  for (const asset of assets) {
    await repository.saveClientAsset(asset);
  }

  // 6. Client Project
  const project: ClientProject = {
    id: 'proj-delivery-apex-01',
    clientId: client.id,
    researchProjectId: DEMO_PROJECT.id,
    proposalId: 'prop-demo-apex',
    packageId: 'pkg-watech-growth-tier',
    name: 'Apex Commercial Web & High-Velocity Lead Engine',
    description: 'Turnkey digital modernization replacing outdated WordPress site with 90+ Core Web Vitals Next.js site, Google 3-Pack SEO schema, and instant SMS dispatch routing.',
    services: [
      'UI/UX Wireframing & Design Prototype',
      'Next.js High-Performance Development',
      'LocalBusiness Schema & Citation Cleanse',
      'Instant Lead Dispatch Webhooks',
    ],
    deliverables: [
      'Interactive Figma Prototype',
      'Responsive Staging Web Platform',
      'GBP & Citation Cleanse Report',
      'Automated Lead Dispatch System',
    ],
    startDate: '2026-10-25',
    targetCompletionDate: '2026-11-30',
    status: 'in_progress',
    priority: 'high',
    assignedManagerId: 'team-pm-01',
    budget: 6800,
    currency: 'USD',
    notes: 'Sprint 2 in progress. Front-end development underway.',
    progressPercent: 62,
    createdAt: '2026-10-25T11:00:00.000Z',
    updatedAt: '2026-11-05T14:00:00.000Z',
  };
  await repository.saveClientProject(project);

  // 7. Milestones
  const milestones: ProjectMilestone[] = [
    {
      id: 'ms-apex-1',
      projectId: project.id,
      clientId: client.id,
      name: 'Phase 1: Architecture, Sitemap & Figma Prototype',
      description: 'Information architecture and interactive visual prototype of new commercial site.',
      targetDate: '2026-11-02',
      completionDate: '2026-11-01',
      weightPercent: 25,
      isCompleted: true,
      deliverableIds: ['deliv-apex-1'],
      approvalRequired: true,
    },
    {
      id: 'ms-apex-2',
      projectId: project.id,
      clientId: client.id,
      name: 'Phase 2: Core Web Vitals & Frontend Development',
      description: 'Responsive frontend build, mobile-first optimization, and staging deployment.',
      targetDate: '2026-11-12',
      completionDate: '2026-11-05',
      weightPercent: 35,
      isCompleted: true,
      deliverableIds: ['deliv-apex-2'],
      approvalRequired: true,
    },
    {
      id: 'ms-apex-3',
      projectId: project.id,
      clientId: client.id,
      name: 'Phase 3: Instant Dispatch Routing & Form Webhooks',
      description: 'Connect quote request forms to SMS alert dispatcher and CRM pipeline.',
      targetDate: '2026-11-20',
      weightPercent: 25,
      isCompleted: false,
      deliverableIds: ['deliv-apex-3'],
      approvalRequired: true,
    },
    {
      id: 'ms-apex-4',
      projectId: project.id,
      clientId: client.id,
      name: 'Phase 4: Production Cutover, QA & Team Handover',
      description: 'DNS cutover, SSL verification, zero-downtime switch, and client training walkthrough.',
      targetDate: '2026-11-30',
      weightPercent: 15,
      isCompleted: false,
      deliverableIds: [],
      approvalRequired: true,
    },
  ];
  for (const m of milestones) {
    await repository.saveProjectMilestone(m);
  }

  // 8. Tasks
  const tasks: ProjectTask[] = [
    {
      id: 'task-apex-1',
      projectId: project.id,
      clientId: client.id,
      milestoneId: 'ms-apex-1',
      title: 'Information Architecture & High-Converting Sitemap',
      description: 'Design sitemap highlighting Chiller Repair, RTU Maintenance, and 24/7 Emergency Dispatch.',
      assignedToTeamMemberId: 'team-des-01',
      priority: 'high',
      status: 'completed',
      startDate: '2026-10-25',
      dueDate: '2026-10-28',
      estimatedHours: 8,
      actualHours: 7,
      dependsOnTaskIds: [],
      isBlocked: false,
      checklist: [
        { id: 'c1', label: 'Commercial RTU service page architecture', isDone: true },
        { id: 'c2', label: 'Emergency dispatch button CTA placement', isDone: true },
      ],
      completedAt: '2026-10-28T16:00:00.000Z',
      createdAt: '2026-10-25T11:00:00.000Z',
      updatedAt: '2026-10-28T16:00:00.000Z',
    },
    {
      id: 'task-apex-2',
      projectId: project.id,
      clientId: client.id,
      milestoneId: 'ms-apex-1',
      title: 'Figma Interactive Mockup & Client Review',
      description: 'Produce high-fidelity desktop and mobile mockups for client sign-off.',
      assignedToTeamMemberId: 'team-des-01',
      priority: 'high',
      status: 'completed',
      startDate: '2026-10-28',
      dueDate: '2026-11-01',
      estimatedHours: 16,
      actualHours: 18,
      dependsOnTaskIds: ['task-apex-1'],
      isBlocked: false,
      checklist: [
        { id: 'c3', label: 'Produce desktop layouts', isDone: true },
        { id: 'c4', label: 'Produce mobile responsive layouts', isDone: true },
        { id: 'c5', label: 'Client walkthrough call sign-off', isDone: true },
      ],
      completedAt: '2026-11-01T17:00:00.000Z',
      createdAt: '2026-10-25T11:00:00.000Z',
      updatedAt: '2026-11-01T17:00:00.000Z',
    },
    {
      id: 'task-apex-3',
      projectId: project.id,
      clientId: client.id,
      milestoneId: 'ms-apex-2',
      title: 'Responsive Next.js Frontend Development',
      description: 'Build fast accessible pages with Tailwind CSS and sub-second load times.',
      assignedToTeamMemberId: 'team-dev-01',
      priority: 'high',
      status: 'completed',
      startDate: '2026-11-01',
      dueDate: '2026-11-05',
      estimatedHours: 24,
      actualHours: 22,
      dependsOnTaskIds: ['task-apex-2'],
      isBlocked: false,
      checklist: [
        { id: 'c6', label: 'Setup layout and navigation', isDone: true },
        { id: 'c7', label: 'Build 5 key service pages', isDone: true },
        { id: 'c8', label: 'Deploy to staging server', isDone: true },
      ],
      completedAt: '2026-11-05T14:00:00.000Z',
      createdAt: '2026-10-25T11:00:00.000Z',
      updatedAt: '2026-11-05T14:00:00.000Z',
    },
    {
      id: 'task-apex-4',
      projectId: project.id,
      clientId: client.id,
      milestoneId: 'ms-apex-2',
      title: 'Staging Environment QA & Core Web Vitals Benchmark',
      description: 'Audit staging URL across Chrome, Safari, iOS, and Android. Verify score >= 90.',
      assignedToTeamMemberId: 'team-dev-01',
      priority: 'medium',
      status: 'in_review',
      startDate: '2026-11-05',
      dueDate: '2026-11-08',
      estimatedHours: 6,
      actualHours: 4,
      dependsOnTaskIds: ['task-apex-3'],
      isBlocked: false,
      checklist: [
        { id: 'c9', label: 'Audit Mobile PageSpeed (Score: 94)', isDone: true },
        { id: 'c10', label: 'Audit Desktop PageSpeed (Score: 99)', isDone: true },
        { id: 'c11', label: 'Conduct client staging review session', isDone: false },
      ],
      createdAt: '2026-10-25T11:00:00.000Z',
      updatedAt: '2026-11-06T10:00:00.000Z',
    },
    {
      id: 'task-apex-5',
      projectId: project.id,
      clientId: client.id,
      milestoneId: 'ms-apex-3',
      title: 'Instant SMS Lead Dispatch & Twilio Webhook Setup',
      description: 'Configure automated SMS dispatch to on-duty technician when emergency form is submitted.',
      assignedToTeamMemberId: 'team-auto-01',
      priority: 'urgent',
      status: 'blocked',
      startDate: '2026-11-05',
      dueDate: '2026-11-12',
      estimatedHours: 10,
      actualHours: 3,
      dependsOnTaskIds: ['task-apex-3'],
      isBlocked: true,
      blockedReason: 'Awaiting client approval and phone number roster for after-hours on-call staff.',
      checklist: [
        { id: 'c12', label: 'Build webhook endpoint', isDone: true },
        { id: 'c13', label: 'Integrate carrier 10DLC profile', isDone: false },
        { id: 'c14', label: 'Test live SMS alert delivery', isDone: false },
      ],
      createdAt: '2026-10-25T11:00:00.000Z',
      updatedAt: '2026-11-06T09:30:00.000Z',
    },
    {
      id: 'task-apex-6',
      projectId: project.id,
      clientId: client.id,
      milestoneId: 'ms-apex-3',
      title: 'LocalBusiness JSON-LD Schema & Geo-Coordinates Injection',
      description: 'Inject structured data containing DFW coverage coordinates, business hours, and license number.',
      assignedToTeamMemberId: 'team-seo-01',
      priority: 'medium',
      status: 'in_progress',
      startDate: '2026-11-06',
      dueDate: '2026-11-15',
      estimatedHours: 6,
      actualHours: 2,
      dependsOnTaskIds: ['task-apex-3'],
      isBlocked: false,
      checklist: [
        { id: 'c15', label: 'Generate JSON-LD snippet', isDone: true },
        { id: 'c16', label: 'Test with Google Rich Results Tool', isDone: false },
      ],
      createdAt: '2026-10-25T11:00:00.000Z',
      updatedAt: '2026-11-06T11:00:00.000Z',
    },
    {
      id: 'task-apex-7',
      projectId: project.id,
      clientId: client.id,
      milestoneId: 'ms-apex-4',
      title: 'Production DNS Cutover & HTTPS Provisioning',
      description: 'Update apexmechanicaltx.com DNS records to point to modern edge deployment.',
      assignedToTeamMemberId: 'team-dev-01',
      priority: 'high',
      status: 'todo',
      startDate: '2026-11-20',
      dueDate: '2026-11-25',
      estimatedHours: 4,
      actualHours: 0,
      dependsOnTaskIds: ['task-apex-4', 'task-apex-5'],
      isBlocked: false,
      checklist: [
        { id: 'c17', label: 'Configure 301 redirects for legacy URLs', isDone: false },
        { id: 'c18', label: 'Point A/CNAME records', isDone: false },
        { id: 'c19', label: 'Verify SSL certificate validity', isDone: false },
      ],
      createdAt: '2026-10-25T11:00:00.000Z',
      updatedAt: '2026-10-25T11:00:00.000Z',
    },
    {
      id: 'task-apex-8',
      projectId: project.id,
      clientId: client.id,
      milestoneId: 'ms-apex-4',
      title: 'Client Delivery Walkthrough & Handover Report Sign-off',
      description: 'Conduct final 45-minute training for Apex dispatch team and sign handover documentation.',
      assignedToTeamMemberId: 'team-pm-01',
      priority: 'medium',
      status: 'backlog',
      startDate: '2026-11-26',
      dueDate: '2026-11-30',
      estimatedHours: 4,
      actualHours: 0,
      dependsOnTaskIds: ['task-apex-7'],
      isBlocked: false,
      checklist: [
        { id: 'c20', label: 'Deliver Handover PDF Report', isDone: false },
        { id: 'c21', label: 'Transfer admin credentials', isDone: false },
      ],
      createdAt: '2026-10-25T11:00:00.000Z',
      updatedAt: '2026-10-25T11:00:00.000Z',
    },
  ];
  for (const t of tasks) {
    await repository.saveProjectTask(t);
  }

  // 9. Deliverables
  const deliverables: Deliverable[] = [
    {
      id: 'deliv-apex-1',
      projectId: project.id,
      clientId: client.id,
      milestoneId: 'ms-apex-1',
      title: 'Interactive High-Fidelity Figma Prototype',
      description: 'Full 7-page responsive UI mockup including quote wizard and mobile navigation.',
      status: 'approved',
      approvalNotes: 'Approved by Marcus Vance during review session on Nov 1.',
      approvedAt: '2026-11-01T17:30:00.000Z',
      approvedBy: 'Marcus Vance',
      handoverUrl: 'https://figma.com/@watech/demo-apex-prototype',
    },
    {
      id: 'deliv-apex-2',
      projectId: project.id,
      clientId: client.id,
      milestoneId: 'ms-apex-2',
      title: 'Responsive Next.js Staging Environment',
      description: 'Staging web platform hosted on Cloudflare edge with live forms and dynamic meta tags.',
      status: 'ready_for_client_review',
      handoverUrl: 'https://staging.apexmechanicaltx.preview-watech.net',
    },
    {
      id: 'deliv-apex-3',
      projectId: project.id,
      clientId: client.id,
      milestoneId: 'ms-apex-3',
      title: 'Emergency SMS Dispatch Routing Pipeline',
      description: 'Twilio + Webhook pipeline alerting on-call technician within 45 seconds of form submission.',
      status: 'pending_internal_review',
    },
  ];
  for (const deliv of deliverables) {
    await repository.saveDeliverable(deliv);
  }

  // 10. Deliverable Revision (demonstrating Out-of-Scope guardrail)
  const revision: DeliverableRevision = {
    id: 'rev-apex-1',
    deliverableId: 'deliv-apex-2',
    projectId: project.id,
    clientId: client.id,
    revisionNumber: 1,
    clientFeedback: 'Can we also add an interactive commercial chiller equipment leasing and finance payment calculator on the quotes page?',
    requestedChanges: 'Embed multi-tier financing calculator with down-payment slider and credit pre-approval application.',
    isOutOfScope: true,
    outOfScopeNotes: 'Financial calculator is outside original Proposal SOW (#PROP-2026-0042). Quote change order for $650 or schedule as follow-on Phase 5 expansion.',
    priority: 'medium',
    assignedToTeamMemberId: 'team-pm-01',
    dueDate: '2026-11-10',
    status: 'open',
    createdAt: '2026-11-05T16:00:00.000Z',
  };
  await repository.saveDeliverableRevision(revision);

  // 11. Client Communications
  const communications: ClientCommunication[] = [
    {
      id: 'comm-apex-1',
      clientId: client.id,
      projectId: project.id,
      type: 'welcome',
      subject: 'Welcome to Watech — Onboarding Kickoff & Project Roadmap',
      messageBody: 'Sent welcome packet, introductory checklist, and scheduled initial kickoff call.',
      channel: 'email',
      loggedBy: 'Sarah Jenkins (PM)',
      timestamp: '2026-10-25T11:30:00.000Z',
    },
    {
      id: 'comm-apex-2',
      clientId: client.id,
      projectId: project.id,
      type: 'approval_request',
      subject: 'Milestone 1 Completed: Figma Prototype Ready for Sign-Off',
      messageBody: 'Shared interactive Figma prototype link. Marcus Vance signed off with approval.',
      channel: 'meeting',
      loggedBy: 'Sarah Jenkins (PM)',
      timestamp: '2026-11-01T17:00:00.000Z',
    },
    {
      id: 'comm-apex-3',
      clientId: client.id,
      projectId: project.id,
      type: 'delivery_notice',
      subject: 'Milestone 2 Staging Environment Deployed',
      messageBody: 'Staging preview URL delivered for review. Client requested finance calculator add-on (flagged out-of-scope).',
      channel: 'email',
      loggedBy: 'Sarah Jenkins (PM)',
      timestamp: '2026-11-05T15:00:00.000Z',
    },
  ];
  for (const comm of communications) {
    await repository.saveClientCommunication(comm);
  }

  // 12. Project Expenses
  const expenses: ProjectExpense[] = [
    {
      id: 'exp-apex-1',
      projectId: project.id,
      clientId: client.id,
      description: 'Dedicated Twilio 10DLC Registration Fee & Local Phone Number',
      amount: 25,
      currency: 'USD',
      category: 'software_api',
      loggedAt: '2026-10-26T14:00:00.000Z',
    },
    {
      id: 'exp-apex-2',
      projectId: project.id,
      clientId: client.id,
      description: 'Commercial Font License for Apex Mechanical TX Branding',
      amount: 80,
      currency: 'USD',
      category: 'asset',
      loggedAt: '2026-10-27T09:00:00.000Z',
    },
  ];
  for (const exp of expenses) {
    await repository.saveProjectExpense(exp);
  }
}

export async function seedAgencyPerformanceDemoData(): Promise<void> {
  const clientId = 'client-demo-apex';
  const projectId = 'proj-delivery-apex-01';
  const proposalId = 'prop-demo-apex';

  // 1. Invoices
  const invoices: AgencyInvoice[] = [
    {
      id: 'inv-apex-001',
      invoiceNumber: 'INV-2026-001',
      clientId,
      projectId,
      proposalId,
      issueDate: '2026-10-25',
      dueDate: '2026-11-05',
      currency: 'USD',
      lineItems: [
        {
          id: 'li-1',
          description: '50% Project Mobilization Deposit: Website Redesign & Lead Capture System',
          category: 'website_digital_experience',
          quantity: 1,
          unitPrice: 3400,
          taxPercent: 0,
          discountPercent: 0,
          subtotal: 3400,
        },
      ],
      subtotal: 3400,
      taxTotal: 0,
      discountTotal: 0,
      totalAmount: 3400,
      amountPaid: 3400,
      balance: 0,
      status: 'paid',
      paymentTerms: 'Due Upon Receipt',
      notes: 'Initial 50% mobilization deposit invoice.',
      createdAt: '2026-10-25T10:00:00.000Z',
      updatedAt: '2026-10-26T14:30:00.000Z',
    },
    {
      id: 'inv-apex-002',
      invoiceNumber: 'INV-2026-002',
      clientId,
      projectId,
      proposalId,
      issueDate: '2026-11-05',
      dueDate: '2026-11-20',
      currency: 'USD',
      lineItems: [
        {
          id: 'li-2',
          description: 'Final Milestone & Production Deployment (50% Balance)',
          category: 'website_digital_experience',
          quantity: 1,
          unitPrice: 3400,
          taxPercent: 0,
          discountPercent: 0,
          subtotal: 3400,
        },
      ],
      subtotal: 3400,
      taxTotal: 0,
      discountTotal: 0,
      totalAmount: 3400,
      amountPaid: 0,
      balance: 3400,
      status: 'issued',
      paymentTerms: 'Net 15 Days',
      notes: 'Second and final sprint milestone invoice upon staging sign-off.',
      createdAt: '2026-11-05T15:30:00.000Z',
      updatedAt: '2026-11-05T15:30:00.000Z',
    },
  ];

  for (const inv of invoices) {
    await repository.saveInvoice(inv);
  }

  // 2. Verified Payment Record
  const payments: PaymentRecord[] = [
    {
      id: 'pay-apex-001',
      paymentNumber: 'PAY-2026-001',
      invoiceId: 'inv-apex-001',
      clientId,
      projectId,
      amount: 3400,
      currency: 'USD',
      paymentDate: '2026-10-26',
      paymentMethod: 'bank_transfer',
      transactionReference: 'ACH-889124-JPMC',
      verificationStatus: 'verified',
      verifiedBy: 'Sarah Jenkins (PM)',
      notes: 'Direct ACH settlement verified in agency operating account.',
      createdAt: '2026-10-26T14:30:00.000Z',
    },
  ];

  for (const pay of payments) {
    await repository.savePayment(pay);
  }

  // 3. Agency Operational & Client-Allocated Expenses
  const agencyExpenses: AgencyExpense[] = [
    {
      id: 'aexp-001',
      category: 'software_subscriptions',
      description: 'Vercel Pro Team & Analytics Hosting Subscription',
      amount: 120,
      currency: 'USD',
      date: '2026-10-01',
      vendor: 'Vercel Inc.',
      isRecurring: true,
      recurringInterval: 'monthly',
      paymentStatus: 'paid',
      createdAt: '2026-10-01T08:00:00.000Z',
    },
    {
      id: 'aexp-002',
      category: 'software_subscriptions',
      description: 'SEMrush Agency Growth & SEO Intelligence Plan',
      amount: 250,
      currency: 'USD',
      date: '2026-10-05',
      vendor: 'SEMrush Inc.',
      isRecurring: true,
      recurringInterval: 'monthly',
      paymentStatus: 'paid',
      createdAt: '2026-10-05T08:00:00.000Z',
    },
    {
      id: 'aexp-003',
      category: 'advertising',
      description: 'Google Search Ads — B2B Local Contractor Acquisition Campaign',
      amount: 320,
      currency: 'USD',
      date: '2026-10-18',
      vendor: 'Google LLC',
      isRecurring: false,
      paymentStatus: 'paid',
      createdAt: '2026-10-18T10:00:00.000Z',
    },
    {
      id: 'aexp-004',
      category: 'contractor_payments',
      description: 'Specialist Subcontractor: Interactive HVAC System Sizing Calculator Widget',
      amount: 450,
      currency: 'USD',
      date: '2026-11-02',
      vendor: 'DevSolutions LLC',
      clientId,
      projectId,
      isRecurring: false,
      paymentStatus: 'paid',
      supportingDocRef: 'PO-2026-0881',
      createdAt: '2026-11-02T16:00:00.000Z',
    },
  ];

  for (const aexp of agencyExpenses) {
    await repository.saveAgencyExpense(aexp);
  }

  // 4. Recurring Contract (MRR)
  const contracts: RecurringContract[] = [
    {
      id: 'contract-apex-seo',
      clientId,
      serviceName: 'Local Search Visibility & Core Web Vitals Ongoing Defense',
      packageName: 'Watech 360 Local Growth Retainer',
      monthlyValue: 650,
      billingCadence: 'monthly',
      currency: 'USD',
      startDate: '2026-11-15',
      nextRenewalDate: '2026-12-15',
      status: 'active',
      createdAt: '2026-11-01T12:00:00.000Z',
      updatedAt: '2026-11-01T12:00:00.000Z',
    },
  ];

  for (const contract of contracts) {
    await repository.saveRecurringContract(contract);
  }

  // 5. Financial Audit Log
  const auditLogs: FinancialAuditLog[] = [
    {
      id: 'faudit-001',
      entityType: 'payment',
      entityId: 'pay-apex-001',
      action: 'payment_recorded',
      actor: 'Sarah Jenkins (PM)',
      previousState: 'Invoice INV-2026-001 balance $3,400',
      newState: 'Recorded $3,400 via bank_transfer (Ref: ACH-889124-JPMC). Invoice balance: $0, status: paid',
      rationale: 'Verified initial mobilization deposit settlement in Chase operating account.',
      timestamp: '2026-10-26T14:30:00.000Z',
    },
    {
      id: 'faudit-002',
      entityType: 'invoice',
      entityId: 'inv-apex-002',
      action: 'issued',
      actor: 'Sarah Jenkins (PM)',
      previousState: 'Draft milestone invoice',
      newState: 'Issued invoice INV-2026-002 for $3,400 with Net 15 terms (due 2026-11-20)',
      rationale: 'Milestone 2 staging environment approved by client.',
      timestamp: '2026-11-05T15:30:00.000Z',
    },
  ];

  for (const log of auditLogs) {
    await repository.logFinancialAudit(log);
  }
}

export async function seedClientPortalDemoData(): Promise<void> {
  const clientId = 'client-demo-apex';

  // 1. Client Portal User
  const portalUser: ClientPortalUser = {
    id: 'cpu-marcus-apex',
    clientId,
    email: 'm.vance@apexmechanicaltx.com',
    passwordHash: 'client123',
    fullName: 'Marcus Vance',
    name: 'Marcus Vance',
    role: 'primary_contact',
    status: 'active',
    lastLoginAt: '2026-11-06T09:00:00.000Z',
    createdAt: '2026-10-25T10:00:00.000Z',
  };
  await repository.saveClientPortalUser(portalUser);

  // 2. Client Requests
  const requests: ClientRequest[] = [
    {
      id: 'req-portal-apex-1',
      clientId,
      requestedByUserId: portalUser.id,
      category: 'website_content',
      priority: 'normal',
      subject: 'Add emergency dispatch callout banner on landing page',
      title: 'Add emergency dispatch callout banner on landing page',
      description: 'Can we add a prominent callout banner in the header stating "24/7 Commercial Chiller Emergency Service Available" with a direct click-to-call link?',
      status: 'in_progress',
      clientVisibleResponse: 'Our design team has updated the staging site with the emergency banner. Please review the live staging build in Deliverables.',
      staffResponse: 'Our design team has updated the staging site with the emergency banner. Please review the live staging build in Deliverables.',
      internalNotes: 'Staged on Cloudflare preview branch feature/emergency-banner.',
      submittedAt: '2026-11-04T14:00:00.000Z',
      createdAt: '2026-11-04T14:00:00.000Z',
      updatedAt: '2026-11-05T10:30:00.000Z',
    },
    {
      id: 'req-portal-apex-2',
      clientId,
      requestedByUserId: portalUser.id,
      category: 'technical_support',
      priority: 'urgent',
      subject: 'Verify Cloudflare DNS delegation & SSL staging cert',
      title: 'Verify Cloudflare DNS delegation & SSL staging cert',
      description: 'Cloudflare delegation invite was accepted. Please verify whether the SSL certificate for staging is ready.',
      status: 'resolved',
      clientVisibleResponse: 'SSL edge certificate has been successfully validated. Staging preview is active with full TLS 1.3 encryption.',
      staffResponse: 'SSL edge certificate has been successfully validated. Staging preview is active with full TLS 1.3 encryption.',
      internalNotes: 'Wildcard cert validated via Universal SSL.',
      resolvedAt: '2026-10-29T11:00:00.000Z',
      submittedAt: '2026-10-28T09:00:00.000Z',
      createdAt: '2026-10-28T09:00:00.000Z',
      updatedAt: '2026-10-29T11:00:00.000Z',
    },
  ];
  for (const req of requests) {
    await repository.saveClientRequest(req);
  }

  // 3. Client Notifications
  const notifications: ClientNotification[] = [
    {
      id: 'cnotif-apex-1',
      clientId,
      userId: portalUser.id,
      portalUserId: portalUser.id,
      type: 'deliverable_ready',
      title: 'Responsive Staging Environment Ready',
      message: 'Your staging web platform has been deployed and is ready for client review and feedback.',
      linkUrl: '/portal/deliverables',
      link: '/portal/deliverables',
      isRead: false,
      createdAt: '2026-11-05T15:00:00.000Z',
    },
    {
      id: 'cnotif-apex-2',
      clientId,
      userId: portalUser.id,
      portalUserId: portalUser.id,
      type: 'invoice_issued',
      title: 'Invoice INV-2026-002 Issued',
      message: 'Milestone 2 staging environment invoice for $3,400 has been issued. Net 15 terms apply.',
      linkUrl: '/portal/invoices',
      link: '/portal/invoices',
      isRead: true,
      createdAt: '2026-11-05T15:30:00.000Z',
    },
  ];
  for (const notif of notifications) {
    await repository.saveClientNotification(notif);
  }

  // 4. Client Approvals
  const approval: ClientApprovalRecord = {
    id: 'appr-apex-prototype',
    clientId,
    entityType: 'deliverable',
    entityId: 'deliv-apex-1',
    actorName: 'Marcus Vance',
    actorEmail: 'm.vance@apexmechanicaltx.com',
    approvedByUserId: portalUser.id,
    decision: 'approved',
    comments: 'Full 7-page mockup approved during video conference call. Meets all commercial branding requirements.',
    timestamp: '2026-11-01T17:30:00.000Z',
  };
  await repository.saveClientApproval(approval);
}

export async function seedAutomationDemoData(): Promise<void> {
  // 1. Seed Initial Workflows from Templates
  const highAlertTpl = AUTOMATION_TEMPLATES.find(t => t.templateId === 'tpl-high-score-lead-alert')!;
  const propToProjTpl = AUTOMATION_TEMPLATES.find(t => t.templateId === 'tpl-proposal-to-project-creation')!;
  const verifiedDraftTpl = AUTOMATION_TEMPLATES.find(t => t.templateId === 'tpl-verified-contact-draft')!;
  const invoiceAlertTpl = AUTOMATION_TEMPLATES.find(t => t.templateId === 'tpl-overdue-invoice-alert')!;

  const workflows: AutomationWorkflow[] = [
    {
      id: 'wf-demo-high-score-alert',
      name: highAlertTpl.name,
      description: highAlertTpl.description,
      category: highAlertTpl.category,
      trigger: highAlertTpl.trigger,
      nodes: highAlertTpl.nodes,
      isActive: true,
      version: 1,
      executionCount: 8,
      successCount: 7,
      failureCount: 1,
      averageDurationMs: 420,
      lastExecutedAt: '2026-11-06T11:30:00.000Z',
      createdAt: '2026-10-25T10:00:00.000Z',
      updatedAt: '2026-11-06T11:30:00.000Z',
    },
    {
      id: 'wf-demo-prop-to-proj',
      name: propToProjTpl.name,
      description: propToProjTpl.description,
      category: propToProjTpl.category,
      trigger: propToProjTpl.trigger,
      nodes: propToProjTpl.nodes,
      isActive: true,
      version: 1,
      executionCount: 3,
      successCount: 3,
      failureCount: 0,
      averageDurationMs: 650,
      lastExecutedAt: '2026-10-25T11:00:00.000Z',
      createdAt: '2026-10-25T10:00:00.000Z',
      updatedAt: '2026-10-25T11:00:00.000Z',
    },
    {
      id: 'wf-demo-outreach-draft',
      name: verifiedDraftTpl.name,
      description: verifiedDraftTpl.description,
      category: verifiedDraftTpl.category,
      trigger: verifiedDraftTpl.trigger,
      nodes: verifiedDraftTpl.nodes,
      isActive: true,
      version: 1,
      executionCount: 12,
      successCount: 11,
      failureCount: 0,
      averageDurationMs: 510,
      lastExecutedAt: '2026-11-06T14:15:00.000Z',
      createdAt: '2026-10-25T10:00:00.000Z',
      updatedAt: '2026-11-06T14:15:00.000Z',
    },
    {
      id: 'wf-demo-invoice-alert',
      name: invoiceAlertTpl.name,
      description: invoiceAlertTpl.description,
      category: invoiceAlertTpl.category,
      trigger: invoiceAlertTpl.trigger,
      nodes: invoiceAlertTpl.nodes,
      isActive: true,
      version: 1,
      executionCount: 4,
      successCount: 4,
      failureCount: 0,
      averageDurationMs: 380,
      lastExecutedAt: '2026-11-05T09:00:00.000Z',
      createdAt: '2026-10-25T10:00:00.000Z',
      updatedAt: '2026-11-05T09:00:00.000Z',
    },
  ];

  for (const wf of workflows) {
    await repository.saveAutomationWorkflow(wf);
  }

  // 2. Integration Connections
  const integrations: IntegrationConnection[] = [
    {
      id: 'int-gmail',
      providerId: 'gmail',
      name: 'Google Gmail Drafts & Outreach',
      status: 'disconnected',
      isConfigured: false,
      capabilities: ['Generate Drafts', 'Thread Sync', 'Authenticated Send', 'Opt-out Suppression'],
      requiredPermissions: ['https://www.googleapis.com/auth/gmail.compose'],
      config: { draftOnlyMode: true },
      error: 'Google OAuth 2.0 Client credentials not detected in .env.local. Running in safe local draft export mode.',
      updatedAt: '2026-11-06T10:00:00.000Z',
    },
    {
      id: 'int-n8n',
      providerId: 'n8n',
      name: 'n8n Workflow Automation Engine',
      status: 'disconnected',
      isConfigured: false,
      capabilities: ['Webhook Triggers', 'Two-Way CRM Sync', 'Data Transformation', 'External Webhook Chains'],
      requiredPermissions: ['Network Webhook Access', 'API Key / Basic Auth'],
      config: { baseUrl: '', authType: 'apiKey' },
      updatedAt: '2026-11-06T10:00:00.000Z',
    },
    {
      id: 'int-webhooks',
      providerId: 'webhooks',
      name: 'Watech Webhook Dispatch Hub',
      status: 'connected',
      isConfigured: true,
      capabilities: ['HMAC SHA-256 Signatures', 'Exponential Backoff', 'Replay Protection', 'Dead-Letter Queue'],
      requiredPermissions: ['Standard HTTP/HTTPS Delivery'],
      config: { defaultTimeoutMs: 5000, maxRetries: 3 },
      lastTestedAt: '2026-11-06T12:00:00.000Z',
      updatedAt: '2026-11-06T12:00:00.000Z',
    },
    {
      id: 'int-csv',
      providerId: 'csv',
      name: 'Watech CSV Data Exchange Engine',
      status: 'connected',
      isConfigured: true,
      capabilities: ['Bulk Import', 'Snapshot Export', 'Schema Mapping', 'Local Ledger Backup'],
      requiredPermissions: ['Browser File System Access'],
      config: { delimiter: ',', exportEncoding: 'utf-8' },
      lastTestedAt: '2026-11-06T10:00:00.000Z',
      updatedAt: '2026-11-06T10:00:00.000Z',
    },
    {
      id: 'int-openai',
      providerId: 'openai',
      name: 'AI Research Analyst (OpenAI/Anthropic)',
      status: 'degraded',
      isConfigured: false,
      capabilities: ['Outreach Copywriting', 'Competitive Snapshot', 'Dossier Synthesis'],
      requiredPermissions: ['API Key Authorization'],
      config: { model: 'gpt-4o-mini' },
      error: 'API key not configured. Operating with built-in deterministic heuristic engine.',
      updatedAt: '2026-11-06T10:00:00.000Z',
    },
    {
      id: 'int-sheets',
      providerId: 'google_sheets',
      name: 'Google Sheets Live Sync',
      status: 'disconnected',
      isConfigured: false,
      capabilities: ['Live Lead Sync', 'Audit Export Sheet', 'Sales Funnel Mirroring'],
      requiredPermissions: ['Google Drive & Sheets OAuth'],
      config: { autoSyncIntervalMinutes: 60 },
      updatedAt: '2026-11-06T10:00:00.000Z',
    },
  ];

  for (const intg of integrations) {
    await repository.saveIntegrationConnection(intg);
  }

  // 3. Webhook Endpoint
  const demoEndpoint: WebhookEndpoint = {
    id: 'ep-demo-crm',
    name: 'Production CRM Synchronization Webhook',
    url: 'https://webhook.site/demo-crm-sync',
    description: 'Dispatches real-time events to external sales CRM whenever a lead qualifies or proposal is signed.',
    secret: 'sec_wh_watech_8f93a10294b0c72e',
    subscribedEvents: ['lead.qualified', 'proposal.accepted', 'invoice.overdue'],
    isActive: true,
    timeoutMs: 5000,
    maxRetries: 3,
    createdAt: '2026-10-25T10:00:00.000Z',
    updatedAt: '2026-11-06T10:00:00.000Z',
  };
  await repository.saveWebhookEndpoint(demoEndpoint);

  // 4. Executions & Pending Approval
  const executions: AutomationExecution[] = [
    {
      id: 'exec-demo-1',
      workflowId: 'wf-demo-high-score-alert',
      workflowName: highAlertTpl.name,
      triggerType: 'record_event',
      status: 'success',
      idempotencyKey: 'idemp-demo-apex-score',
      startedAt: '2026-11-06T11:29:58.000Z',
      completedAt: '2026-11-06T11:30:00.000Z',
      totalDurationMs: 420,
      steps: [
        {
          stepId: 'node-trig-2',
          nodeType: 'trigger',
          title: 'Lead Score Updated >= 80',
          status: 'success',
          startedAt: '2026-11-06T11:29:58.000Z',
          completedAt: '2026-11-06T11:29:58.200Z',
          durationMs: 20,
          output: { lead: 'Apex Mechanical Solutions Inc', score: 88, band: 'A' },
        },
        {
          stepId: 'node-cond-2',
          nodeType: 'condition',
          title: 'Score >= 80 & Not Contacted',
          status: 'success',
          startedAt: '2026-11-06T11:29:58.200Z',
          completedAt: '2026-11-06T11:29:58.250Z',
          durationMs: 50,
          output: { result: true, evaluatedConditionsCount: 1 },
        },
        {
          stepId: 'node-act-assign',
          nodeType: 'action',
          title: 'Assign Senior Account Exec',
          status: 'success',
          startedAt: '2026-11-06T11:29:58.250Z',
          completedAt: '2026-11-06T11:29:58.350Z',
          durationMs: 100,
          output: { assignedOwner: 'Marcus Sterling (Senior AE)' },
        },
        {
          stepId: 'node-act-notify',
          nodeType: 'action',
          title: 'Dispatch High-Priority Notification',
          status: 'success',
          startedAt: '2026-11-06T11:29:58.350Z',
          completedAt: '2026-11-06T11:29:58.420Z',
          durationMs: 70,
          output: { notificationDispatched: true },
        },
      ],
    },
    {
      id: 'exec-demo-2',
      workflowId: 'wf-demo-outreach-draft',
      workflowName: verifiedDraftTpl.name,
      triggerType: 'record_event',
      status: 'waiting_for_approval',
      currentStepId: 'node-appr-draft',
      idempotencyKey: 'idemp-demo-elena-draft',
      startedAt: '2026-11-06T14:14:50.000Z',
      steps: [
        {
          stepId: 'node-trig-3',
          nodeType: 'trigger',
          title: 'Decision-Maker Email Verified',
          status: 'success',
          startedAt: '2026-11-06T14:14:50.000Z',
          completedAt: '2026-11-06T14:14:50.100Z',
          durationMs: 100,
          output: { email: 'elena@trinityairsys.com', contact: 'Elena Rostova, PE' },
        },
        {
          stepId: 'node-act-draft',
          nodeType: 'action',
          title: 'Synthesize Outreach Draft',
          status: 'success',
          startedAt: '2026-11-06T14:14:50.100Z',
          completedAt: '2026-11-06T14:14:50.400Z',
          durationMs: 300,
          output: {
            subject: 'Partnership & HVAC Energy Optimization for Trinity Building Systems',
            body: 'Hi Elena, We benchmarked central plant cooling systems in Tarrant County and identified opportunities to eliminate mobile quote friction...',
          },
        },
        {
          stepId: 'node-appr-draft',
          nodeType: 'approval',
          title: 'Outreach Review & Approval Gate',
          status: 'waiting_for_approval',
          startedAt: '2026-11-06T14:14:50.400Z',
          input: {
            recipient: 'elena@trinityairsys.com',
            company: 'Trinity Building Systems',
            style: 'consultative',
          },
        },
      ],
    },
    {
      id: 'exec-demo-3',
      workflowId: 'wf-demo-high-score-alert',
      workflowName: highAlertTpl.name,
      triggerType: 'record_event',
      status: 'failed',
      idempotencyKey: 'idemp-demo-failed-delivery',
      startedAt: '2026-11-05T08:15:00.000Z',
      completedAt: '2026-11-05T08:15:06.000Z',
      totalDurationMs: 6010,
      errorSummary: 'Outbound webhook destination timed out after 6000ms (HTTP 504 Gateway Timeout). Queued for manual retry.',
      steps: [
        {
          stepId: 'node-trig-2',
          nodeType: 'trigger',
          title: 'Lead Score Updated >= 80',
          status: 'success',
          startedAt: '2026-11-05T08:15:00.000Z',
          completedAt: '2026-11-05T08:15:00.100Z',
          durationMs: 100,
        },
        {
          stepId: 'node-cond-2',
          nodeType: 'condition',
          title: 'Score >= 80 & Not Contacted',
          status: 'success',
          startedAt: '2026-11-05T08:15:00.100Z',
          completedAt: '2026-11-05T08:15:00.150Z',
          durationMs: 50,
          output: { result: true },
        },
        {
          stepId: 'node-act-assign',
          nodeType: 'action',
          title: 'Assign Senior Account Exec',
          status: 'failed',
          startedAt: '2026-11-05T08:15:00.150Z',
          completedAt: '2026-11-05T08:15:06.000Z',
          durationMs: 5850,
          error: 'HTTP 504 Gateway Timeout connecting to external CRM webhook endpoint.',
        },
      ],
    },
  ];

  for (const ex of executions) {
    await repository.saveAutomationExecution(ex);
  }

  // 5. Pending Approval Record
  const approval: AutomationApproval = {
    id: 'appr-demo-outreach-1',
    executionId: 'exec-demo-2',
    workflowId: 'wf-demo-outreach-draft',
    workflowName: verifiedDraftTpl.name,
    stepId: 'node-appr-draft',
    actionType: 'generate_outreach_draft',
    actionTitle: 'Outreach Review & Approval Gate',
    requestedPayload: {
      recipient: 'elena@trinityairsys.com',
      contactName: 'Elena Rostova, PE',
      companyName: 'Trinity Building Systems',
      subject: 'Partnership & HVAC Energy Optimization for Trinity Building Systems',
      recommendedAngle: 'Mobile Quote Friction & Energy Retrofits',
      bodySnippet: 'Hi Elena, We benchmarked commercial chiller plants in Tarrant County and identified opportunities to streamline mobile dispatch requests...',
    },
    requiredRole: 'sales_rep',
    instructions: 'Review generated copy, tone, and evidence claims before dispatch. Mandatory human sign-off.',
    status: 'pending',
    requestedAt: '2026-11-06T14:14:50.000Z',
  };
  await repository.saveAutomationApproval(approval);

  // 6. Webhook Delivery Log
  const demoDelivery: WebhookDelivery = {
    id: 'del-demo-1',
    endpointId: 'ep-demo-crm',
    endpointName: 'Production CRM Synchronization Webhook',
    eventId: 'evt-demo-proposal-signed',
    eventType: 'proposal.accepted',
    url: 'https://webhook.site/demo-crm-sync',
    httpStatus: 200,
    requestHeaders: {
      'Content-Type': 'application/json',
      'X-Watech-Signature': 'sha256=8f93a10294b0c72e41a9...',
      'X-Watech-Event': 'proposal.accepted',
    },
    requestPayload: {
      proposalId: 'prop-demo-apex',
      client: 'Apex Mechanical Solutions Inc',
      totalValue: 6800,
      timestamp: '2026-10-25T11:00:00.000Z',
    },
    responseBody: '{"status":"received","crmRecordId":"lead_apex_9921"}',
    durationMs: 142,
    status: 'success',
    attemptNumber: 1,
    maxAttempts: 3,
    timestamp: '2026-10-25T11:00:01.000Z',
  };
  await repository.saveWebhookDelivery(demoDelivery);
}

export async function seedCeoCommandCenterDemoData(): Promise<void> {
  const now = new Date().toISOString();

  // 1. Core Executive Targets (Configurable by CEO)
  const targets: CeoTarget[] = [
    {
      id: 'target-rev-mo',
      metricKey: 'monthly_revenue',
      label: 'Monthly Contracted Revenue',
      period: 'monthly',
      targetValue: 25000,
      currentValue: 6800,
      unit: 'currency',
      remainingGap: 18200,
      requiredWeeklyPace: 4550,
      riskOfMissing: 'moderate',
      historicalPerformance: [14200, 18500, 21000],
      updatedAt: now,
    },
    {
      id: 'target-cash-mo',
      metricKey: 'monthly_cash',
      label: 'Monthly Cash Collected',
      period: 'monthly',
      targetValue: 20000,
      currentValue: 3400,
      unit: 'currency',
      remainingGap: 16600,
      requiredWeeklyPace: 4150,
      riskOfMissing: 'moderate',
      historicalPerformance: [12000, 15000, 17500],
      updatedAt: now,
    },
    {
      id: 'target-clients-mo',
      metricKey: 'new_clients',
      label: 'New Retainer & Project Clients',
      period: 'monthly',
      targetValue: 3,
      currentValue: 1,
      unit: 'count',
      remainingGap: 2,
      requiredWeeklyPace: 0.5,
      riskOfMissing: 'low',
      historicalPerformance: [1, 2, 2],
      updatedAt: now,
    },
    {
      id: 'target-leads-mo',
      metricKey: 'qualified_leads',
      label: 'Qualified Commercial Leads',
      period: 'monthly',
      targetValue: 12,
      currentValue: 3,
      unit: 'count',
      remainingGap: 9,
      requiredWeeklyPace: 2.25,
      riskOfMissing: 'moderate',
      historicalPerformance: [8, 10, 11],
      updatedAt: now,
    },
    {
      id: 'target-props-mo',
      metricKey: 'proposals',
      label: 'Proposals Dispatched',
      period: 'monthly',
      targetValue: 5,
      currentValue: 2,
      unit: 'count',
      remainingGap: 3,
      requiredWeeklyPace: 0.75,
      riskOfMissing: 'low',
      historicalPerformance: [3, 4, 3],
      updatedAt: now,
    },
    {
      id: 'target-conv-mo',
      metricKey: 'conversion_rate',
      label: 'Sales Conversion Rate',
      period: 'monthly',
      targetValue: 25,
      currentValue: 33,
      unit: 'percent',
      remainingGap: 0,
      requiredWeeklyPace: 0,
      riskOfMissing: 'low',
      historicalPerformance: [20, 22, 28],
      updatedAt: now,
    },
    {
      id: 'target-deliv-mo',
      metricKey: 'project_delivery',
      label: 'On-Time Project Delivery',
      period: 'monthly',
      targetValue: 95,
      currentValue: 85,
      unit: 'percent',
      remainingGap: 10,
      requiredWeeklyPace: 2.5,
      riskOfMissing: 'low',
      historicalPerformance: [88, 92, 90],
      updatedAt: now,
    },
    {
      id: 'target-margin-mo',
      metricKey: 'net_margin',
      label: 'Net Operating Margin',
      period: 'monthly',
      targetValue: 40,
      currentValue: 42,
      unit: 'percent',
      remainingGap: 0,
      requiredWeeklyPace: 0,
      riskOfMissing: 'low',
      historicalPerformance: [38, 41, 40],
      updatedAt: now,
    },
  ];
  await repository.saveCeoTargets(targets);

  // 2. Initial High-Impact Next Best Actions
  const actions: CeoNextBestAction[] = [
    {
      id: 'action-ar-apex-002',
      title: 'Collect Outstanding Milestone Invoice INV-2026-002 ($3,400)',
      category: 'finance',
      urgency: 'high',
      potentialBusinessImpact: 'high',
      financialImportance: 3400,
      probabilityOfSuccess: 92,
      requiredEffort: 'low',
      dataConfidence: 99,
      compositeScore: 94,
      whatShouldBeDone: 'Send milestone completion statement & payment link to Marcus Vance for staging approval balance.',
      whyShouldBeDone: 'Invoice #INV-2026-002 has been issued under Net 15 terms. Timely payment collection reduces days sales outstanding (DSO) and boosts cash flow.',
      evidence: [
        'Invoice #INV-2026-002 issued 2026-11-05 for $3,400.00',
        'Staging milestone sign-off completed by client',
        'Direct ACH settlement active on primary client profile',
      ],
      expectedOutcome: 'Recovery of $3,400.00 in cash without incurring billing disputes.',
      practicalNextStep: 'Click "Send Payment Statement" to dispatch branded reminder email with ACH instructions.',
      actionType: 'send_invoice_reminder',
      entityId: 'inv-apex-002',
      entityType: 'invoice',
      isApproved: false,
      isCompleted: false,
      createdAt: now,
    },
    {
      id: 'action-prop-lonestar',
      title: 'Finalize & Send Modernization Proposal to Lone Star Industrial Refrigeration',
      category: 'sales',
      urgency: 'high',
      potentialBusinessImpact: 'high',
      financialImportance: 2500,
      probabilityOfSuccess: 75,
      requiredEffort: 'medium',
      dataConfidence: 88,
      compositeScore: 88,
      whatShouldBeDone: 'Conduct final scope verification and dispatch proposal PROP-2026-0089 to David K. Miller.',
      whyShouldBeDone: 'Lone Star has severe mobile viewport bounce friction (audit score 48/100). The proposal has lingered in draft state for over 7 days.',
      evidence: [
        'Proposal #PROP-2026-0089 created on 2026-10-28 for $2,500.00',
        'Website audit identified slow 5.1s FCP and missing mobile responsive tags',
        'Decision maker phone: (817) 555-0182',
      ],
      expectedOutcome: 'High likelihood of securing a $2,500 turnkey project + potential maintenance retainer.',
      practicalNextStep: 'Review line items in Proposal Generator and authorize send.',
      actionType: 'review_and_send_proposal',
      entityId: 'prop-demo-lonestar',
      entityType: 'proposal',
      isApproved: false,
      isCompleted: false,
      createdAt: now,
    },
    {
      id: 'action-rev-scope-apex',
      title: 'Resolve Out-of-Scope Revision on Apex Mechanical Chiller Calculator',
      category: 'delivery',
      urgency: 'medium',
      potentialBusinessImpact: 'medium',
      financialImportance: 650,
      probabilityOfSuccess: 88,
      requiredEffort: 'low',
      dataConfidence: 95,
      compositeScore: 82,
      whatShouldBeDone: 'Issue change order quotation ($650) for commercial chiller financing payment calculator.',
      whyShouldBeDone: 'Client requested interactive financing calculator on quotes page. Revision was flagged out-of-scope; unaddressed scope expansion causes delivery friction.',
      evidence: [
        'Deliverable Revision #1 logged on 2026-11-05',
        'Flagged as out-of-scope by PM Sarah Jenkins',
        'Estimated subcontractor fee: $450; recommended billing: $650 (31% margin)',
      ],
      expectedOutcome: 'Clear scope boundaries, +$650 expansion revenue, and on-time final delivery.',
      practicalNextStep: 'Click "Generate Change Order" in Client Projects module.',
      actionType: 'create_change_order',
      entityId: 'proj-delivery-apex-01',
      entityType: 'project',
      isApproved: false,
      isCompleted: false,
      createdAt: now,
    },
    {
      id: 'action-outreach-trinity',
      title: 'Authorize Consultative Outreach to Elena Rostova (Trinity Mechanical & Automation)',
      category: 'sales',
      urgency: 'high',
      potentialBusinessImpact: 'high',
      financialImportance: 4200,
      probabilityOfSuccess: 80,
      requiredEffort: 'low',
      dataConfidence: 98,
      compositeScore: 85,
      whatShouldBeDone: 'Approve AI-synthesized consultative email sequence referencing Tridium Niagara 4 engineering certification.',
      whyShouldBeDone: 'Elena Rostova (licensed Professional Engineer) is a prime decision maker for high-margin building automation retrofits.',
      evidence: [
        'Decision maker email elena@trinityairsys.com verified via Texas PELS registry',
        'Automation workflow wf-demo-outreach-draft generated draft awaiting approval',
        '98% confidence score from state licensing board corroboration',
      ],
      expectedOutcome: 'Schedule 30-minute discovery consultation on automated commercial building controls.',
      practicalNextStep: 'Review draft copy in Automation Hub and click "Approve Dispatch".',
      actionType: 'approve_automation_draft',
      entityId: 'biz-trinity-systems',
      entityType: 'business',
      isApproved: false,
      isCompleted: false,
      createdAt: now,
    },
  ];
  await repository.saveCeoActions(actions);

  // 3. Automated Daily Briefing (Simulating latest day)
  const todayStr = new Date().toISOString().split('T')[0];
  const dailyBriefing: CeoDailyBriefing = {
    id: `briefing-${todayStr}`,
    date: todayStr,
    generatedAt: now,
    isAutomated: true,
    yesterday: {
      newLeads: 1,
      leadsQualified: 1,
      outreachActivity: 2,
      repliesReceived: 1,
      meetingsOrOpportunities: 1,
      proposalsCreatedOrAccepted: 1,
      paymentsReceived: 0,
      projectProgressNotes: [
        'Apex Mechanical: Front-end staging build deployed to Cloudflare Pages (Sprint 2 at 62%).',
        'Deliverable revision REV-01 evaluated and flagged out-of-scope for chiller financing calculator.',
      ],
    },
    today: {
      pendingTasks: [
        { id: 't1', title: 'Verify staging DNS CNAME for apexmechanicaltx.com', priority: 'high', due: 'Today, 3:00 PM' },
        { id: 't2', title: 'Scope review for Lone Star Refrigeration proposal', priority: 'medium', due: 'Today, 5:00 PM' },
      ],
      followUpsDue: [
        { id: 'f1', lead: 'Lone Star Climate Systems', reason: 'Draft proposal waiting for dispatch > 7 days' },
      ],
      proposalsRequiringAction: [
        { id: 'prop-demo-lonestar', title: 'Lone Star Industrial Digital Platform', client: 'Lone Star Climate Systems', action: 'Finalize and dispatch draft' },
      ],
      clientApprovalsPending: [
        { id: 'deliv-apex-2', client: 'Apex Mechanical Solutions Inc', title: 'Milestone 2 Staging Environment Review' },
      ],
      overdueInvoices: [
        { id: 'inv-apex-002', invoiceNumber: 'INV-2026-002', client: 'Apex Mechanical Solutions Inc', amount: 3400, daysOverdue: 0 },
      ],
      delayedProjects: [],
      highPriorityOpportunities: [
        { id: 'opp-trinity-automation', title: 'Niagara 4 Commercial Automation Funnel', client: 'Trinity Mechanical & Automation', value: 4200 },
      ],
    },
    risks: [
      {
        id: 'risk-ar-aging',
        title: 'Outstanding Milestone Receivables ($3,400)',
        severity: 'medium',
        evidence: 'Invoice INV-2026-002 for $3,400 issued with Net 15 terms. Must monitor to prevent past-due aging.',
        mitigation: 'Automated payment reminder scheduled 3 days prior to due date.',
      },
      {
        id: 'risk-scope-creep',
        title: 'Scope Creep on Apex Mechanical Staging Deliverable',
        severity: 'medium',
        evidence: 'Client requested custom financial calculator not part of original signed SOW.',
        mitigation: 'Formal change order issued ($650) to protect team capacity and delivery margin.',
      },
    ],
    opportunities: [
      {
        id: 'opp-mrr-upsell',
        title: 'Active Retainer Expansion with Apex Mechanical ($650/mo MRR)',
        impact: 'high',
        potentialRevenue: 7800,
        action: 'Activate ongoing SEO defense retainer upon production go-live.',
      },
      {
        id: 'opp-lonestar-close',
        title: 'Close Turnkey Web Modernization with Lone Star ($2,500)',
        impact: 'high',
        potentialRevenue: 2500,
        action: 'Dispatch verified proposal with mobile UX benchmarks.',
      },
    ],
  };
  await repository.saveCeoDailyBriefing(dailyBriefing);

  // 4. CEO Weekly Review (Last 7 Days)
  const weeklyReview: CeoWeeklyReview = {
    id: 'review-week-2026-w44',
    weekStartDate: '2026-10-30',
    weekEndDate: '2026-11-06',
    performanceSummary: 'Strong execution across core DFW commercial accounts. Mobilization deposit collected for Apex Mechanical, staging platform deployed on schedule, and pipeline expanded into commercial automation.',
    revenueAndCash: {
      targetRevenue: 6250,
      actualRevenue: 6800,
      collectedCash: 3400,
      outstandingBalance: 3400,
    },
    salesPerformance: {
      leadsDiscovered: 3,
      qualifiedLeads: 3,
      proposalsSent: 1,
      proposalsAccepted: 1,
      conversionRate: 100,
    },
    clientAcquisition: {
      newClients: 1,
      activeClients: 1,
      churnedClients: 0,
    },
    projectDelivery: {
      completedMilestones: 1,
      delayedMilestones: 0,
      onTimeDeliveryRate: 100,
    },
    operationalBottlenecks: [
      'Subcontractor turnaround on complex HVAC sizing calculator widgets requires formal SOW buffer.',
      'DNS delegation verification depends on client registrar responsiveness.',
    ],
    majorWins: [
      'Secured $6,800 contract with Apex Mechanical Solutions with $3,400 immediate ACH deposit verified.',
      'Automated workflow pipeline reached 87.5% success rate with zero unhandled exceptions.',
      'Identified and verified PE-licensed decision maker at Trinity Mechanical with 98% corroborated confidence.',
    ],
    majorFailures: [
      'Lone Star Industrial Refrigeration proposal sat in draft mode for 9 days without follow-up.',
    ],
    lessonsLearned: [
      'Always flag out-of-scope feature requests within 24 hours of client submission to preserve profit margins.',
      'Decision-maker licensing data (PELS) delivers 3x higher outreach engagement than generic contact forms.',
    ],
    nextWeekPriorities: [
      'Collect $3,400 balance on Invoice INV-2026-002 upon final DNS cutover.',
      'Dispatch Lone Star proposal and close $2,500 platform modernization deal.',
      'Launch consultative outreach to Trinity Mechanical & Automation.',
      'Onboard active $650/mo recurring SEO retainer for Apex Mechanical.',
    ],
    createdAt: now,
  };
  await repository.saveCeoWeeklyReview(weeklyReview);
}

// ==========================================
// PROMPT 25: MULTI-TENANT & WHITE-LABEL SAAS SEED DATA
// ==========================================

export const DEFAULT_TENANT_PLANS: TenantPlan[] = [
  {
    id: 'plan-starter',
    name: 'Starter Tier',
    slug: 'starter',
    priceMonthly: 299,
    priceAnnual: 2990,
    currency: 'USD',
    userLimit: 2,
    leadLimit: 250,
    researchLimit: 3,
    aiQueryLimit: 100,
    automationLimit: 50,
    storageLimitMb: 500,
    enabledModules: [
      'overview',
      'market-research',
      'business-discovery',
      'website-audit',
      'lead-scoring',
      'contact-discovery',
      'crm-pipeline',
    ],
  },
  {
    id: 'plan-growth',
    name: 'Growth Engine',
    slug: 'growth',
    priceMonthly: 699,
    priceAnnual: 6990,
    currency: 'USD',
    userLimit: 5,
    leadLimit: 1500,
    researchLimit: 10,
    aiQueryLimit: 500,
    automationLimit: 250,
    storageLimitMb: 2500,
    enabledModules: [
      'overview',
      'market-research',
      'market-mapping',
      'business-discovery',
      'website-audit',
      'local-seo',
      'contact-discovery',
      'email-verification',
      'content-discovery',
      'opportunity-analysis',
      'lead-scoring',
      'outreach-strategy',
      'gmail-integration',
      'crm-pipeline',
      'ai-assistant',
      'competitor-monitor',
      'service-recommendations',
      'proposals',
      'client-projects',
      'automation-hub',
    ],
  },
  {
    id: 'plan-professional',
    name: 'Professional Agency',
    slug: 'professional',
    priceMonthly: 1299,
    priceAnnual: 12990,
    currency: 'USD',
    userLimit: 20,
    leadLimit: 10000,
    researchLimit: 50,
    aiQueryLimit: 2500,
    automationLimit: 1500,
    storageLimitMb: 10000,
    enabledModules: [
      'overview',
      'command-center',
      'market-research',
      'market-mapping',
      'business-discovery',
      'website-audit',
      'local-seo',
      'contact-discovery',
      'email-verification',
      'content-discovery',
      'opportunity-analysis',
      'lead-scoring',
      'outreach-strategy',
      'gmail-integration',
      'crm-pipeline',
      'ai-assistant',
      'competitor-monitor',
      'multi-market',
      'buyer-signals',
      'service-recommendations',
      'proposals',
      'client-projects',
      'agency-performance',
      'client-portal',
      'automation-hub',
    ],
  },
  {
    id: 'plan-enterprise',
    name: 'Enterprise Scale',
    slug: 'enterprise',
    priceMonthly: 2999,
    priceAnnual: 29990,
    currency: 'USD',
    userLimit: 100,
    leadLimit: 100000,
    researchLimit: 9999,
    aiQueryLimit: 20000,
    automationLimit: 20000,
    storageLimitMb: 100000,
    enabledModules: [
      'overview',
      'command-center',
      'market-research',
      'market-mapping',
      'business-discovery',
      'website-audit',
      'local-seo',
      'contact-discovery',
      'email-verification',
      'content-discovery',
      'opportunity-analysis',
      'lead-scoring',
      'outreach-strategy',
      'gmail-integration',
      'crm-pipeline',
      'ai-assistant',
      'competitor-monitor',
      'multi-market',
      'buyer-signals',
      'service-recommendations',
      'proposals',
      'client-projects',
      'agency-performance',
      'client-portal',
      'automation-hub',
    ],
  },
];

export async function seedMultiTenantDemoData(): Promise<void> {
  const existingPlans = await repository.getTenantPlans();
  if (existingPlans.length === 0) {
    for (const plan of DEFAULT_TENANT_PLANS) {
      await repository.saveTenantPlan(plan);
    }
  }

  const existingTenants = await repository.getTenants();
  if (existingTenants.length > 0) return;

  const now = new Date().toISOString();
  const currentMonth = now.slice(0, 7);

  // 1. Primary Tenant: Watech Intelligence HQ (Super-Admin Platform Tenant)
  const primaryTenant: Tenant = {
    id: 'tenant-watech-primary',
    slug: 'watech',
    name: 'Watech Intelligence Headquarters',
    planId: 'plan-enterprise',
    status: 'active',
    customDomain: 'app.watechbi.com',
    contactEmail: 'admin@watechbi.com',
    isPlatformSuperAdminTenant: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: now,
  };
  await repository.saveTenant(primaryTenant);

  const primaryBranding: TenantBranding = {
    id: 'brand-watech-primary',
    tenantId: primaryTenant.id,
    companyName: 'Watech-BI',
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    accentColor: '#10b981',
    fontStack: 'Inter, system-ui, sans-serif',
    footerText: 'Powered by Watech Autonomous Agency Architecture',
    supportEmail: 'support@watechbi.com',
    portalBranding: {
      portalTitle: 'Watech Executive Client Hub',
      welcomeMessage: 'Welcome to your real-time campaign & delivery workspace.',
      supportPhone: '(214) 555-0100',
    },
    updatedAt: now,
  };
  await repository.saveTenantBranding(primaryBranding);

  const primarySubscription: TenantSubscription = {
    id: 'sub-watech-primary',
    tenantId: primaryTenant.id,
    planId: 'plan-enterprise',
    status: 'active',
    billingInterval: 'annual',
    currentPeriodStart: '2026-01-01T00:00:00.000Z',
    currentPeriodEnd: '2027-01-01T00:00:00.000Z',
    cancelAtPeriodEnd: false,
    billingEmail: 'billing@watechbi.com',
    paymentMethodLast4: '4242',
  };
  await repository.saveTenantSubscription(primarySubscription);

  const primarySuperUser: TenantUser = {
    id: 'tuser-super-admin',
    tenantId: primaryTenant.id,
    email: 'admin@watechbi.com',
    fullName: 'Chief Technology Officer',
    role: 'owner',
    status: 'active',
    isPlatformSuperAdmin: true,
    lastLoginAt: now,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
  await repository.saveTenantUser(primarySuperUser);

  const primaryModuleConfig: TenantModuleConfig = {
    id: 'mcfg-watech-primary',
    tenantId: primaryTenant.id,
    enabledModules: {
      'overview': true,
      'command-center': true,
      'market-research': true,
      'market-mapping': true,
      'business-discovery': true,
      'website-audit': true,
      'local-seo': true,
      'contact-discovery': true,
      'email-verification': true,
      'content-discovery': true,
      'opportunity-analysis': true,
      'lead-scoring': true,
      'outreach-strategy': true,
      'gmail-integration': true,
      'crm-pipeline': true,
      'ai-assistant': true,
      'competitor-monitor': true,
      'multi-market': true,
      'buyer-signals': true,
      'service-recommendations': true,
      'proposals': true,
      'client-projects': true,
      'agency-performance': true,
      'client-portal': true,
      'automation-hub': true,
    },
    updatedAt: now,
  };
  await repository.saveTenantModuleConfig(primaryModuleConfig);

  const primaryUsage: TenantUsage = {
    id: `usage-watech-${currentMonth}`,
    tenantId: primaryTenant.id,
    period: currentMonth,
    activeUsersCount: 3,
    leadsCount: 64,
    researchOpsCount: 18,
    aiQueriesCount: 142,
    automationExecsCount: 88,
    storageBytesUsed: 42000000,
    apiRequestsCount: 1250,
    lastTrackedAt: now,
  };
  await repository.saveTenantUsage(primaryUsage);

  // 2. Demo White-Label Agency Tenant: Alpha Growth Partners
  const alphaTenant: Tenant = {
    id: 'tenant-alpha-agency',
    slug: 'alpha-growth',
    name: 'Alpha Growth Digital Partners',
    planId: 'plan-professional',
    status: 'active',
    customDomain: 'portal.alphagrowth.agency',
    contactEmail: 'director@alphagrowth.agency',
    isPlatformSuperAdminTenant: false,
    createdAt: '2026-06-15T09:00:00.000Z',
    updatedAt: now,
  };
  await repository.saveTenant(alphaTenant);

  const alphaBranding: TenantBranding = {
    id: 'brand-alpha-agency',
    tenantId: alphaTenant.id,
    companyName: 'Alpha Growth OS',
    primaryColor: '#7c3aed', // Purple brand theme
    secondaryColor: '#5b21b6',
    accentColor: '#ec4899',
    fontStack: 'Poppins, system-ui, sans-serif',
    footerText: 'Alpha Growth OS — Engineered for B2B Market Leaders',
    supportEmail: 'ops@alphagrowth.agency',
    portalBranding: {
      portalTitle: 'Alpha Client Success Workspace',
      welcomeMessage: 'Accelerating high-ticket mechanical contracts for commercial firms.',
      supportPhone: '(512) 555-0199',
    },
    customCss: `:root { --custom-glow: 0 0 15px rgba(124, 58, 237, 0.4); }`,
    updatedAt: now,
  };
  await repository.saveTenantBranding(alphaBranding);

  const alphaSubscription: TenantSubscription = {
    id: 'sub-alpha-agency',
    tenantId: alphaTenant.id,
    planId: 'plan-professional',
    status: 'active',
    billingInterval: 'monthly',
    currentPeriodStart: '2026-11-01T00:00:00.000Z',
    currentPeriodEnd: '2026-12-01T00:00:00.000Z',
    cancelAtPeriodEnd: false,
    billingEmail: 'accounts@alphagrowth.agency',
    paymentMethodLast4: '8812',
  };
  await repository.saveTenantSubscription(alphaSubscription);

  const alphaUser: TenantUser = {
    id: 'tuser-alpha-director',
    tenantId: alphaTenant.id,
    email: 'director@alphagrowth.agency',
    fullName: 'Jordan Scott',
    role: 'owner',
    status: 'active',
    isPlatformSuperAdmin: false,
    lastLoginAt: now,
    createdAt: '2026-06-15T09:00:00.000Z',
  };
  await repository.saveTenantUser(alphaUser);

  const alphaModuleConfig: TenantModuleConfig = {
    id: 'mcfg-alpha-agency',
    tenantId: alphaTenant.id,
    enabledModules: {
      'overview': true,
      'command-center': true,
      'market-research': true,
      'market-mapping': true,
      'business-discovery': true,
      'website-audit': true,
      'local-seo': true,
      'contact-discovery': true,
      'email-verification': true,
      'content-discovery': true,
      'opportunity-analysis': true,
      'lead-scoring': true,
      'outreach-strategy': true,
      'gmail-integration': true,
      'crm-pipeline': true,
      'ai-assistant': true,
      'competitor-monitor': true,
      'multi-market': true,
      'buyer-signals': true,
      'service-recommendations': true,
      'proposals': true,
      'client-projects': true,
      'agency-performance': true,
      'client-portal': true,
      'automation-hub': true,
    },
    updatedAt: now,
  };
  await repository.saveTenantModuleConfig(alphaModuleConfig);

  const alphaUsage: TenantUsage = {
    id: `usage-alpha-${currentMonth}`,
    tenantId: alphaTenant.id,
    period: currentMonth,
    activeUsersCount: 2,
    leadsCount: 184,
    researchOpsCount: 9,
    aiQueriesCount: 310,
    automationExecsCount: 42,
    storageBytesUsed: 12500000,
    apiRequestsCount: 420,
    lastTrackedAt: now,
  };
  await repository.saveTenantUsage(alphaUsage);

  // 3. Demo Custom Domain for Alpha
  const alphaDomain: TenantDomain = {
    id: 'dom-alpha-1',
    tenantId: alphaTenant.id,
    domain: 'portal.alphagrowth.agency',
    subdomain: 'portal',
    verificationStatus: 'verified',
    sslStatus: 'active',
    dnsVerificationRecord: {
      type: 'CNAME',
      name: 'portal',
      value: 'cname.watechbi.com',
    },
    createdAt: '2026-06-16T10:00:00.000Z',
  };
  await repository.saveTenantDomain(alphaDomain);
}









