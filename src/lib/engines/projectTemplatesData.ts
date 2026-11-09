import { OnboardingStep, ProjectMilestone, ProjectTask, TeamMember } from '../../types';

export interface BaseOnboardingStepTemplate {
  stepNumber: number;
  title: string;
  description: string;
  category: 'contract_payment' | 'assets_branding' | 'technical_access' | 'scope_alignment' | 'kickoff';
}

export const ONBOARDING_TEMPLATES: Record<
  'website' | 'marketing' | 'automation' | 'general',
  { label: string; description: string; steps: BaseOnboardingStepTemplate[] }
> = {
  website: {
    label: 'Website & Digital Experience Onboarding',
    description: 'Structured 12-step onboarding workflow for web design, development, and conversion re-architecture.',
    steps: [
      {
        stepNumber: 1,
        title: 'Contract Signing & Retainer Deposit Confirmation',
        description: 'Verify master service agreement countersigned and initial invoice deposit received.',
        category: 'contract_payment'
      },
      {
        stepNumber: 2,
        title: 'Primary Stakeholder & Point-of-Contact Introduction',
        description: 'Establish primary and secondary decision-maker channels, weekly cadence, and emergency contacts.',
        category: 'scope_alignment'
      },
      {
        stepNumber: 3,
        title: 'DNS, Domain Registrar & Hosting Access Audit',
        description: 'Collect registrar credentials (GoDaddy, Namecheap, Cloudflare) and current server cPanel/SSH access.',
        category: 'technical_access'
      },
      {
        stepNumber: 4,
        title: 'CMS & Code Repository Provisioning',
        description: 'Secure admin rights to WordPress/Shopify/Webflow or establish Git repository and deployment webhooks.',
        category: 'technical_access'
      },
      {
        stepNumber: 5,
        title: 'Google Analytics, Tag Manager & Search Console Access',
        description: 'Request user access to existing GA4 and Google Search Console properties to preserve SEO data.',
        category: 'technical_access'
      },
      {
        stepNumber: 6,
        title: 'Brand Identity, Vector Logos & Media Asset Intake',
        description: 'Collect SVG/vector logo package, typography guidelines, brand color codes, and high-res imagery.',
        category: 'assets_branding'
      },
      {
        stepNumber: 7,
        title: 'Product/Service Inventory & Core Offering Review',
        description: 'Review current service packages, pricing structure, and distinct value propositions to feature.',
        category: 'scope_alignment'
      },
      {
        stepNumber: 8,
        title: 'Competitor Analysis & Visual Benchmark Alignment',
        description: 'Align on 3 inspiration references and confirm features or aesthetics the client explicitly dislikes.',
        category: 'scope_alignment'
      },
      {
        stepNumber: 9,
        title: 'Lead Capture & CRM Routing Alignment',
        description: 'Define where inquiry forms, quote requests, and phone calls should route upon submission.',
        category: 'technical_access'
      },
      {
        stepNumber: 10,
        title: 'Staging Environment Setup & URL Safeguard',
        description: 'Spin up isolated staging server with noindex/nofollow headers to safeguard live domain.',
        category: 'technical_access'
      },
      {
        stepNumber: 11,
        title: 'Delivery Schedule, Milestones & Revision Limit Review',
        description: 'Review milestone dates, 2-round revision policy, and change order guidelines with client.',
        category: 'scope_alignment'
      },
      {
        stepNumber: 12,
        title: 'Formal Kickoff Meeting & Sprint 1 Greenlight',
        description: 'Conduct 45-minute kickoff call with client, introduce delivery lead, and start discovery phase.',
        category: 'kickoff'
      }
    ]
  },
  marketing: {
    label: 'Marketing & Local SEO Growth Onboarding',
    description: '12-step onboarding sequence for local SEO dominance, GBP management, and lead generation campaigns.',
    steps: [
      {
        stepNumber: 1,
        title: 'Proposal Sign-off & Retainer Payment Verification',
        description: 'Confirm commercial contract execution and first-month retainer clearance.',
        category: 'contract_payment'
      },
      {
        stepNumber: 2,
        title: 'Target Service Areas & High-Value Services Intake',
        description: 'Confirm exact zip codes, cities, and services with highest profit margins for focused targeting.',
        category: 'scope_alignment'
      },
      {
        stepNumber: 3,
        title: 'Google Business Profile Manager Delegation',
        description: 'Request manager-level access to client Google Business Profile without transferring ownership.',
        category: 'technical_access'
      },
      {
        stepNumber: 4,
        title: 'Social & Local Directory Credentials Collection',
        description: 'Gather access to Facebook Page, Yelp, Bing Places, and industry-specific directory listings.',
        category: 'technical_access'
      },
      {
        stepNumber: 5,
        title: 'Google Ads & Ad Accounts Access Setup',
        description: 'Link client Google Ads / Meta Business Manager account to agency MCC with payment verified.',
        category: 'technical_access'
      },
      {
        stepNumber: 6,
        title: 'Call Tracking & Lead Attribution Phone Number Setup',
        description: 'Provision dynamic number insertion (DNI) or dedicated forwarding numbers for tracking.',
        category: 'technical_access'
      },
      {
        stepNumber: 7,
        title: 'Existing Review & Customer Feedback Baseline Audit',
        description: 'Audit historical review sentiment, unreplied reviews, and average rating across major portals.',
        category: 'scope_alignment'
      },
      {
        stepNumber: 8,
        title: 'Brand Tone, Voice & Offer Assets Intake',
        description: 'Collect seasonal specials, financing promotions, discount thresholds, and brand style rules.',
        category: 'assets_branding'
      },
      {
        stepNumber: 9,
        title: 'Competitor Keyword & Local Map-Pack Baseline Review',
        description: 'Review top 5 local competitors and record baseline positions across target search queries.',
        category: 'scope_alignment'
      },
      {
        stepNumber: 10,
        title: 'Review Request SMS/Email Workflow Configuration',
        description: 'Map out automated post-service customer review invitation cadence and SMS template approval.',
        category: 'scope_alignment'
      },
      {
        stepNumber: 11,
        title: 'KPI Targets & Monthly Reporting Cadence Alignment',
        description: 'Agree on primary success metrics (Qualified Inquiries, CPL, Map Pack Rank) and bi-weekly report day.',
        category: 'scope_alignment'
      },
      {
        stepNumber: 12,
        title: 'Strategy Launch Briefing & Campaign Execution Sign-off',
        description: 'Review strategy document with client and activate initial citation & campaign sprints.',
        category: 'kickoff'
      }
    ]
  },
  automation: {
    label: 'Workflow Automation & CRM Systems Onboarding',
    description: '12-step onboarding framework for webhook pipelines, CRM implementation, and lead nurturing automations.',
    steps: [
      {
        stepNumber: 1,
        title: 'Master Service Agreement & Software Licensing Confirmation',
        description: 'Confirm executed statement of work and determine software subscription billing owners.',
        category: 'contract_payment'
      },
      {
        stepNumber: 2,
        title: 'Current Operational Bottleneck & Workflow Mapping',
        description: 'Interview client operations manager to document current manual steps from lead intake to invoice.',
        category: 'scope_alignment'
      },
      {
        stepNumber: 3,
        title: 'CRM / Database Admin Credentials Provisioning',
        description: 'Obtain admin level API keys and user invitations to HubSpot/Zapier/Make/Salesforce/GoHighLevel.',
        category: 'technical_access'
      },
      {
        stepNumber: 4,
        title: 'Email Sender & SMTP Domain Authentication Audit',
        description: 'Audit DKIM, SPF, DMARC records to ensure automated client communications reach primary inbox.',
        category: 'technical_access'
      },
      {
        stepNumber: 5,
        title: 'SMS Gateway & 10DLC Brand Registration Initiation',
        description: 'Submit business EIN and brand profile for A2P 10DLC carrier compliance if SMS alerts are included.',
        category: 'technical_access'
      },
      {
        stepNumber: 6,
        title: 'Web Forms & Inbound Lead Webhook Access',
        description: 'Collect webhook endpoints or API access for website forms and incoming lead sources.',
        category: 'technical_access'
      },
      {
        stepNumber: 7,
        title: 'Lead Stage Pipeline & Qualification Criteria Definition',
        description: 'Standardize pipeline deal stages, win/loss reasons, and required fields for stage advancement.',
        category: 'scope_alignment'
      },
      {
        stepNumber: 8,
        title: 'Automated Email & SMS Follow-up Copy Approval',
        description: 'Review and approve pre-built nurture sequence copy, delay timers, and conditional triggers.',
        category: 'assets_branding'
      },
      {
        stepNumber: 9,
        title: 'Internal Notification Channels & Dispatch Rules Intake',
        description: 'Map internal alert destinations (Slack channels, SMS dispatch, assigned sales reps).',
        category: 'scope_alignment'
      },
      {
        stepNumber: 10,
        title: 'Sandbox Integration Build & Mock Lead Testing',
        description: 'Deploy integration in test mode and simulate 5 end-to-end lead submission scenarios.',
        category: 'technical_access'
      },
      {
        stepNumber: 11,
        title: 'Staff Training Schedule & Standard Operating Procedure Draft',
        description: 'Schedule 30-minute training session for client team and deliver one-page user cheat sheet.',
        category: 'scope_alignment'
      },
      {
        stepNumber: 12,
        title: 'Live Production Switch & Real-Time Monitoring Kickoff',
        description: 'Flip webhooks to live production mode and initiate 7-day error monitoring window.',
        category: 'kickoff'
      }
    ]
  },
  general: {
    label: 'Standard Client Project Onboarding',
    description: 'Comprehensive 12-step baseline onboarding for full-service agency engagements.',
    steps: [
      {
        stepNumber: 1,
        title: 'Agreement Execution & Retainer Receipt',
        description: 'Verify signed contract and clearance of initial invoice.',
        category: 'contract_payment'
      },
      {
        stepNumber: 2,
        title: 'Account Manager & Escalation Path Assignment',
        description: 'Introduce client account manager and provide direct contact channels.',
        category: 'scope_alignment'
      },
      {
        stepNumber: 3,
        title: 'Initial Discovery & Business Objectives Questionnaire',
        description: 'Deliver structured intake form covering growth targets and priority markets.',
        category: 'scope_alignment'
      },
      {
        stepNumber: 4,
        title: 'Digital Asset & Platform Access Intake',
        description: 'Obtain required permissions across domains, social channels, and business tools.',
        category: 'technical_access'
      },
      {
        stepNumber: 5,
        title: 'Brand Kit, Media & Collateral Upload',
        description: 'Receive logo files, brand identity documents, and marketing assets.',
        category: 'assets_branding'
      },
      {
        stepNumber: 6,
        title: 'Deliverables & Acceptance Criteria Sign-off',
        description: 'Confirm specific milestones, deliverables, and review turnaround times.',
        category: 'scope_alignment'
      },
      {
        stepNumber: 7,
        title: 'Project Timeline & Milestone Calibration',
        description: 'Finalize calendar dates for milestone submissions and client feedback windows.',
        category: 'scope_alignment'
      },
      {
        stepNumber: 8,
        title: 'Technical Pre-Flight Checklist & Audit',
        description: 'Verify all third-party systems, tracking scripts, and dependencies are functional.',
        category: 'technical_access'
      },
      {
        stepNumber: 9,
        title: 'Communication Cadence & Reporting Agreement',
        description: 'Confirm weekly progress memo schedule and sprint review meeting times.',
        category: 'scope_alignment'
      },
      {
        stepNumber: 10,
        title: 'Revision & Change Management Guidelines Review',
        description: 'Clarify included revision rounds vs out-of-scope change requests.',
        category: 'scope_alignment'
      },
      {
        stepNumber: 11,
        title: 'Team Resource Allocation & Workspace Setup',
        description: 'Assign internal specialists and initialize project tracking board.',
        category: 'kickoff'
      },
      {
        stepNumber: 12,
        title: 'Formal Client Kickoff Call & Execution Greenlight',
        description: 'Host alignment call, answer opening questions, and commence active project sprint.',
        category: 'kickoff'
      }
    ]
  }
};

export interface ProjectTemplateMilestone {
  name: string;
  description: string;
  weightPercent: number;
  durationDays: number;
  tasks: {
    title: string;
    description: string;
    role: 'project_manager' | 'developer' | 'designer' | 'seo_specialist' | 'marketing_specialist' | 'automation_specialist' | 'account_manager';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    estimatedHours: number;
    checklist: string[];
  }[];
}

export interface ProjectTemplate {
  id: string;
  name: string;
  category: 'website' | 'marketing' | 'automation' | 'general';
  description: string;
  targetDurationWeeks: number;
  servicesIncluded: string[];
  milestones: ProjectTemplateMilestone[];
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'tmpl-website-redesign',
    name: 'Website Redesign & High-Converting Digital Presence',
    category: 'website',
    description: 'Complete end-to-end bespoke website build with responsive UX, speed optimization, and lead generation architecture.',
    targetDurationWeeks: 6,
    servicesIncluded: ['UI/UX Wireframing', 'Modern Responsive Development', 'SEO On-Page Baseline', 'Speed & Performance Tuning'],
    milestones: [
      {
        name: 'Phase 1: Discovery, Sitemap & Information Architecture',
        description: 'Audit current website, define target customer journeys, and structure comprehensive site architecture.',
        weightPercent: 20,
        durationDays: 7,
        tasks: [
          {
            title: 'Technical & UX Audit of Existing Domain',
            description: 'Record baseline load speeds, mobile responsiveness issues, broken links, and UX dead-ends.',
            role: 'project_manager',
            priority: 'high',
            estimatedHours: 6,
            checklist: ['Run PageSpeed insights', 'Document URL structure', 'Catalog existing page assets']
          },
          {
            title: 'Information Architecture & Sitemap Creation',
            description: 'Design logical hierarchy of pages with focus on primary conversion actions.',
            role: 'designer',
            priority: 'high',
            estimatedHours: 8,
            checklist: ['Draft sitemap tree', 'Review with client', 'Lock URL taxonomy']
          }
        ]
      },
      {
        name: 'Phase 2: UI/UX Wireframing & Interactive Prototype',
        description: 'Produce high-fidelity Figma mockups for homepage, core service pages, and conversion funnels.',
        weightPercent: 25,
        durationDays: 10,
        tasks: [
          {
            title: 'Homepage & Core Landing Wireframes',
            description: 'Design mobile-first layout prioritizing trust badges, social proof, and rapid call-to-actions.',
            role: 'designer',
            priority: 'high',
            estimatedHours: 16,
            checklist: ['Mobile view mockup', 'Desktop view mockup', 'Design conversion callouts']
          },
          {
            title: 'Client Design Review & Revision Round 1',
            description: 'Present Figma prototype to client and document specific aesthetic or copy revisions.',
            role: 'account_manager',
            priority: 'medium',
            estimatedHours: 4,
            checklist: ['Conduct presentation call', 'Log feedback notes', 'Deliver revised mockups']
          }
        ]
      },
      {
        name: 'Phase 3: Frontend & Backend Development Sprint',
        description: 'Translate approved designs into responsive, clean code with CMS integration.',
        weightPercent: 35,
        durationDays: 14,
        tasks: [
          {
            title: 'Responsive Component Implementation',
            description: 'Build modular, accessible UI components with clean Tailwind/CSS and semantic HTML.',
            role: 'developer',
            priority: 'high',
            estimatedHours: 28,
            checklist: ['Setup component scaffolding', 'Ensure mobile breakpoint parity', 'Hook up form validators']
          },
          {
            title: 'Lead Capture Form & CRM Integration',
            description: 'Connect contact forms to client email notification and CRM webhook endpoints.',
            role: 'developer',
            priority: 'high',
            estimatedHours: 10,
            checklist: ['Test form spam protection (Turnstile/reCAPTCHA)', 'Verify email dispatch', 'Test mobile submission']
          }
        ]
      },
      {
        name: 'Phase 4: QA, Core Web Vitals & Production Launch',
        description: 'Comprehensive cross-browser testing, 90+ Core Web Vitals audit, and domain switchover.',
        weightPercent: 20,
        durationDays: 7,
        tasks: [
          {
            title: 'Core Web Vitals & Speed Optimization',
            description: 'Compress webp images, defer non-critical JS, and ensure mobile scores exceed 85+.',
            role: 'developer',
            priority: 'high',
            estimatedHours: 8,
            checklist: ['Optimize images', 'Check LCP and CLS scores', 'Verify caching headers']
          },
          {
            title: 'Production DNS Cutover & SSL Verification',
            description: 'Update DNS A/CNAME records, provision SSL certificate, and verify zero downtime.',
            role: 'developer',
            priority: 'urgent',
            estimatedHours: 4,
            checklist: ['Point DNS records', 'Verify HTTPS certificate', 'Test 301 redirects from old URLs']
          }
        ]
      }
    ]
  },
  {
    id: 'tmpl-local-seo',
    name: 'Local SEO & Google Business Profile Domination',
    category: 'marketing',
    description: 'Systematic local search optimization to achieve Top 3 Google 3-Pack rankings and review velocity.',
    targetDurationWeeks: 8,
    servicesIncluded: ['GBP Optimization', 'Local Citation Building', 'Schema Markup Deployment', 'Review Generation Funnel'],
    milestones: [
      {
        name: 'Phase 1: Local Audit & NAP Consistency Cleanse',
        description: 'Identify conflicting Name, Address, Phone records across internet directories.',
        weightPercent: 25,
        durationDays: 10,
        tasks: [
          {
            title: 'Directory Citation Audit & Inconsistency Flagging',
            description: 'Scan top 40 citation aggregates and note discrepancies in business name, address, or phone.',
            role: 'seo_specialist',
            priority: 'high',
            estimatedHours: 12,
            checklist: ['Audit Yelp and YellowPages', 'Check Apple Maps and Bing', 'Generate NAP audit report']
          }
        ]
      },
      {
        name: 'Phase 2: Google Business Profile Optimization & Geo-Targeting',
        description: 'Complete every section of GBP with high-relevance keywords, geotagged photos, and service menus.',
        weightPercent: 30,
        durationDays: 12,
        tasks: [
          {
            title: 'GBP Category & Description Enhancement',
            description: 'Align primary and secondary business categories and write keyword-optimized business story.',
            role: 'seo_specialist',
            priority: 'high',
            estimatedHours: 8,
            checklist: ['Set primary category', 'Add 5 secondary categories', 'Upload 10 geotagged service photos']
          }
        ]
      },
      {
        name: 'Phase 3: Local Schema Markup & Geo-Landing Pages',
        description: 'Deploy LocalBusiness JSON-LD schema and produce dedicated service-area landing pages.',
        weightPercent: 30,
        durationDays: 14,
        tasks: [
          {
            title: 'LocalBusiness Schema JSON-LD Deployment',
            description: 'Inject structured data containing geo coordinates, opening hours, and accepted payment types.',
            role: 'developer',
            priority: 'medium',
            estimatedHours: 6,
            checklist: ['Validate with Schema Markup Validator', 'Embed Google Map iframe', 'Publish to production']
          }
        ]
      },
      {
        name: 'Phase 4: Review System Deployment & Local Rank Verification',
        description: 'Deploy automated review request funnel and verify ranking progression across target zip codes.',
        weightPercent: 15,
        durationDays: 10,
        tasks: [
          {
            title: 'Automated Review Request SMS/Email Setup',
            description: 'Configure automated invite with short link directing satisfied customers to Google review form.',
            role: 'marketing_specialist',
            priority: 'high',
            estimatedHours: 6,
            checklist: ['Generate direct review link', 'Draft friendly follow-up copy', 'Send test invite']
          }
        ]
      }
    ]
  },
  {
    id: 'tmpl-automation-crm',
    name: 'Workflow Automation & Sales Pipeline Integration',
    category: 'automation',
    description: 'Eliminate manual admin overhead with automated lead capture, instant notifications, and CRM synchronization.',
    targetDurationWeeks: 4,
    servicesIncluded: ['CRM Pipeline Setup', 'Webhook Integrations', 'Instant SMS/Email Lead Dispatch', 'Automated Customer Nurture'],
    milestones: [
      {
        name: 'Phase 1: Operational Process Audit & Architecture Mapping',
        description: 'Map out the existing manual touchpoints and design automated data flows.',
        weightPercent: 25,
        durationDays: 5,
        tasks: [
          {
            title: 'Workflow Diagram & Trigger-Action Specification',
            description: 'Diagram exact steps when a lead submits a quote form until deal close.',
            role: 'automation_specialist',
            priority: 'high',
            estimatedHours: 8,
            checklist: ['Map inbound channels', 'Define stage triggers', 'Review with client stakeholders']
          }
        ]
      },
      {
        name: 'Phase 2: CRM Stages & Custom Property Scaffolding',
        description: 'Configure CRM deal stages, loss reasons, and custom fields tailored to client industry.',
        weightPercent: 25,
        durationDays: 7,
        tasks: [
          {
            title: 'CRM Pipeline Build & User Permissions',
            description: 'Build 6-stage sales pipeline with required deal properties and team access roles.',
            role: 'automation_specialist',
            priority: 'medium',
            estimatedHours: 10,
            checklist: ['Create deal stages', 'Configure custom properties', 'Invite team members']
          }
        ]
      },
      {
        name: 'Phase 3: Integration Pipelines & Instant Notification Dispatch',
        description: 'Build Make/Zapier/Webhook automations to alert sales reps within 60 seconds of inquiry.',
        weightPercent: 30,
        durationDays: 8,
        tasks: [
          {
            title: 'Instant Lead Notification & Routing Engine',
            description: 'Send immediate SMS and Slack notifications to on-duty sales rep when new lead arrives.',
            role: 'automation_specialist',
            priority: 'urgent',
            estimatedHours: 12,
            checklist: ['Configure SMS gateway', 'Setup Slack/Email alerts', 'Test after-hours routing']
          }
        ]
      },
      {
        name: 'Phase 4: End-to-End Stress Testing & Team Enablement',
        description: 'Run 10 simulated lead journeys and conduct live walkthrough training for client team.',
        weightPercent: 20,
        durationDays: 5,
        tasks: [
          {
            title: 'Simulation Testing & Error Handling Fail-safes',
            description: 'Test edge cases (invalid email, duplicate phone) and verify error alerting.',
            role: 'automation_specialist',
            priority: 'high',
            estimatedHours: 6,
            checklist: ['Test 10 mock submissions', 'Verify dead-letter alert queue', 'Document user SOP']
          }
        ]
      }
    ]
  }
];

export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'team-pm-01',
    name: 'Sarah Jenkins',
    email: 'sarah.j@watech-bi.com',
    role: 'project_manager',
    skills: ['Client Communication', 'Sprint Planning', 'Scope Control', 'QA & Delivery'],
    activeProjectIds: [],
    maxWeeklyHours: 40,
    currentAssignedHours: 24,
    isActive: true
  },
  {
    id: 'team-dev-01',
    name: 'Alex Rivera',
    email: 'alex.r@watech-bi.com',
    role: 'developer',
    skills: ['Next.js', 'React', 'Tailwind CSS', 'API Integrations', 'Core Web Vitals'],
    activeProjectIds: [],
    maxWeeklyHours: 40,
    currentAssignedHours: 32,
    isActive: true
  },
  {
    id: 'team-des-01',
    name: 'Elena Rostova',
    email: 'elena.r@watech-bi.com',
    role: 'designer',
    skills: ['UI/UX Design', 'Figma Prototyping', 'Brand Identity', 'Conversion Optimization'],
    activeProjectIds: [],
    maxWeeklyHours: 35,
    currentAssignedHours: 18,
    isActive: true
  },
  {
    id: 'team-seo-01',
    name: 'David Zhao',
    email: 'david.z@watech-bi.com',
    role: 'seo_specialist',
    skills: ['Local SEO', 'Google Business Profile', 'Technical Schema', 'Rank Tracking'],
    activeProjectIds: [],
    maxWeeklyHours: 40,
    currentAssignedHours: 26,
    isActive: true
  },
  {
    id: 'team-auto-01',
    name: 'Marcus Vance',
    email: 'marcus.v@watech-bi.com',
    role: 'automation_specialist',
    skills: ['Make.com', 'Zapier', 'Webhook Pipelines', 'CRM Architecture', 'Twilio API'],
    activeProjectIds: [],
    maxWeeklyHours: 40,
    currentAssignedHours: 20,
    isActive: true
  },
  {
    id: 'team-acct-01',
    name: 'Rachel Sterling',
    email: 'rachel.s@watech-bi.com',
    role: 'account_manager',
    skills: ['Client Success', 'Retention Strategy', 'Contract Renewals', 'Account Expansion'],
    activeProjectIds: [],
    maxWeeklyHours: 35,
    currentAssignedHours: 15,
    isActive: true
  }
];
