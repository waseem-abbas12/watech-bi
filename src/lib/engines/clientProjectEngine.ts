import {
  Business,
  BusinessProposal,
  BusinessServiceRecommendation,
  ClientAsset,
  ClientCommercialInfo,
  ClientContactInfo,
  ClientHealthSnapshot,
  ClientOnboarding,
  ClientProfile,
  ClientProject,
  Deliverable,
  DeliverableRevision,
  HandoverReport,
  OnboardingStep,
  ProjectMilestone,
  ProjectTask,
  ProposalQuotation,
  TeamMember,
  WatechServiceItem
} from '../../types';
import { ONBOARDING_TEMPLATES, PROJECT_TEMPLATES, ProjectTemplate } from './projectTemplatesData';

/**
 * Creates or prepares a new ClientProfile and its initial ClientOnboarding from a won deal or accepted proposal.
 */
export function createClientFromWonDeal(
  business: Business,
  proposal?: BusinessProposal,
  quotation?: ProposalQuotation,
  recommendation?: BusinessServiceRecommendation
): { client: ClientProfile; onboarding: ClientOnboarding } {
  const clientId = 'client-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const now = new Date().toISOString();

  // Determine agreed services
  const agreedServices: string[] = [];
  if (proposal?.scopeOfWork?.deliverables) {
    agreedServices.push(...proposal.scopeOfWork.deliverables);
  } else if (quotation?.lineItems) {
    quotation.lineItems.forEach(li => agreedServices.push(li.serviceName));
  } else if (recommendation?.recommendedSolution?.serviceMatches) {
    recommendation.recommendedSolution.serviceMatches.forEach(sm => agreedServices.push(sm.serviceName));
  } else {
    agreedServices.push('Core Growth Solution');
  }

  // Contract value & currency
  const contractValue = quotation?.totalAmount || 3500;
  const currency = quotation?.currency || 'USD';

  // Primary contact extraction
  const contactName = business.ownerManagerName || 'Primary Contact';
  const contactTitle = business.ownerManagerRole || 'Owner / Director';
  const contactEmail = business.email || 'contact@' + (business.websiteUrl ? business.websiteUrl.replace(/^https?:\/\//, '').split('/')[0] : 'client.com');
  const contactPhone = business.phone || '';

  const primaryContact: ClientContactInfo = {
    name: contactName,
    title: contactTitle,
    email: contactEmail,
    phone: contactPhone,
    preferredChannel: 'email'
  };

  const commercial: ClientCommercialInfo = {
    acceptedProposalId: proposal?.id,
    quotationId: quotation?.id,
    purchasedPackageName: proposal?.recommendedSolution?.packageTitle || 'Bespoke Solution Package',
    agreedServices: Array.from(new Set(agreedServices)),
    contractValue: contractValue,
    currency: currency,
    paymentModel: 'one_time',
    startDate: now.slice(0, 10)
  };

  const client: ClientProfile = {
    id: clientId,
    businessId: business.id,
    projectId: business.projectId,
    companyName: business.officialName || business.brandName || 'Client Company',
    industry: business.businessModel || 'General Business',
    website: business.websiteUrl || '',
    country: business.country || 'USA',
    state: business.state || '',
    city: business.city || '',
    address: business.fullAddress || '',
    phone: contactPhone,
    email: contactEmail,
    companySize: business.teamSizeEstimate || 'Small (1-20)',
    primaryContact,
    commercial,
    account: {
      internalNotes: 'Client converted successfully from sales pipeline. Initial onboarding initialized.'
    },
    status: 'onboarding',
    healthScore: 90,
    healthGrade: 'good',
    healthFactors: ['Freshly converted client', 'Awaiting onboarding kickoff'],
    createdAt: now,
    updatedAt: now
  };

  // Determine onboarding category template
  let templateCategory: 'website' | 'marketing' | 'automation' | 'general' = 'general';
  const servicesLower = agreedServices.join(' ').toLowerCase();
  if (servicesLower.includes('web') || servicesLower.includes('redesign') || servicesLower.includes('landing')) {
    templateCategory = 'website';
  } else if (servicesLower.includes('seo') || servicesLower.includes('gbp') || servicesLower.includes('marketing')) {
    templateCategory = 'marketing';
  } else if (servicesLower.includes('automation') || servicesLower.includes('crm') || servicesLower.includes('webhook')) {
    templateCategory = 'automation';
  }

  const baseSteps = ONBOARDING_TEMPLATES[templateCategory].steps;
  const onboardingSteps: OnboardingStep[] = baseSteps.map((s, idx) => ({
    id: 'step-' + clientId + '-' + (idx + 1),
    stepNumber: s.stepNumber,
    title: s.title,
    description: s.description,
    category: s.category,
    status: idx === 0 ? 'in_progress' : 'not_started'
  }));

  const onboarding: ClientOnboarding = {
    id: 'onboard-' + clientId,
    clientId: client.id,
    projectId: business.projectId,
    templateCategory,
    steps: onboardingSteps,
    overallProgress: 0,
    isCompleted: false,
    updatedAt: now
  };

  return { client, onboarding };
}

/**
 * Creates a delivery project, milestones, and initial tasks from a selected ProjectTemplate.
 */
export function createProjectFromTemplate(
  clientId: string,
  researchProjectId: string,
  template: ProjectTemplate,
  customName?: string,
  customBudget?: number,
  currency: 'USD' | 'PKR' | 'AED' | 'GBP' | 'EUR' = 'USD',
  teamMembers: TeamMember[] = []
): { project: ClientProject; milestones: ProjectMilestone[]; tasks: ProjectTask[] } {
  const projectId = 'proj-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const now = new Date();
  const startDateStr = now.toISOString().slice(0, 10);
  
  const targetDate = new Date(now.getTime() + template.targetDurationWeeks * 7 * 24 * 60 * 60 * 1000);
  const targetDateStr = targetDate.toISOString().slice(0, 10);

  const project: ClientProject = {
    id: projectId,
    clientId,
    researchProjectId,
    name: customName || template.name,
    description: template.description,
    services: [...template.servicesIncluded],
    deliverables: template.milestones.map(m => m.name),
    startDate: startDateStr,
    targetCompletionDate: targetDateStr,
    status: 'planning',
    priority: 'medium',
    budget: customBudget || 4500,
    currency,
    progressPercent: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  const milestones: ProjectMilestone[] = [];
  const tasks: ProjectTask[] = [];

  let accumulatedDays = 0;

  template.milestones.forEach((m, mIdx) => {
    accumulatedDays += m.durationDays;
    const milestoneTargetDate = new Date(now.getTime() + accumulatedDays * 24 * 60 * 60 * 1000);
    const milestoneId = 'ms-' + projectId + '-' + (mIdx + 1);

    milestones.push({
      id: milestoneId,
      projectId,
      clientId,
      name: m.name,
      description: m.description,
      targetDate: milestoneTargetDate.toISOString().slice(0, 10),
      weightPercent: m.weightPercent,
      isCompleted: false,
      deliverableIds: [],
      approvalRequired: true
    });

    // Create tasks for this milestone
    m.tasks.forEach((t, tIdx) => {
      const taskId = 'task-' + projectId + '-' + (mIdx + 1) + '-' + (tIdx + 1);
      
      // Auto-assign matching team member if available
      const matchingMember = teamMembers.find(tm => tm.role === t.role && tm.isActive);

      tasks.push({
        id: taskId,
        projectId,
        clientId,
        milestoneId,
        title: t.title,
        description: t.description,
        assignedToTeamMemberId: matchingMember ? matchingMember.id : undefined,
        priority: t.priority,
        status: mIdx === 0 && tIdx === 0 ? 'todo' : 'backlog',
        startDate: startDateStr,
        dueDate: milestoneTargetDate.toISOString().slice(0, 10),
        estimatedHours: t.estimatedHours,
        actualHours: 0,
        dependsOnTaskIds: [],
        isBlocked: false,
        checklist: t.checklist.map((item, cIdx) => ({
          id: 'chk-' + taskId + '-' + (cIdx + 1),
          label: item,
          isDone: false
        })),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      });
    });
  });

  return { project, milestones, tasks };
}

/**
 * Calculates weighted project progress from milestones and individual tasks.
 */
export function calculateProjectProgress(
  milestones: ProjectMilestone[],
  tasks: ProjectTask[]
): number {
  if (milestones.length === 0 && tasks.length === 0) return 0;

  if (milestones.length > 0) {
    let weightedSum = 0;
    let totalWeight = 0;

    milestones.forEach(m => {
      totalWeight += m.weightPercent;
      if (m.isCompleted) {
        weightedSum += m.weightPercent;
      } else {
        // Calculate partial progress based on milestone tasks
        const mTasks = tasks.filter(t => t.milestoneId === m.id);
        if (mTasks.length > 0) {
          const completedMTasks = mTasks.filter(t => t.status === 'completed').length;
          const ratio = completedMTasks / mTasks.length;
          weightedSum += m.weightPercent * ratio;
        }
      }
    });

    if (totalWeight > 0) {
      return Math.round((weightedSum / totalWeight) * 100);
    }
  }

  // Fallback to task completion ratio
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  return Math.round((completedTasks / tasks.length) * 100);
}

/**
 * DFS cycle detection for task dependencies.
 * Prevents adding circular dependencies where Task A depends on Task B and Task B depends on Task A.
 */
export function validateTaskDependencies(
  tasks: ProjectTask[],
  taskId: string,
  newDependsOnId: string
): { valid: boolean; error?: string } {
  if (taskId === newDependsOnId) {
    return { valid: false, error: 'A task cannot depend on itself.' };
  }

  // Build adjacency list for dependencies: edge from U to V means U depends on V
  const adj = new Map<string, string[]>();
  tasks.forEach(t => {
    adj.set(t.id, [...t.dependsOnTaskIds]);
  });

  // Temporarily add new dependency
  const existingDeps = adj.get(taskId) || [];
  if (existingDeps.includes(newDependsOnId)) {
    return { valid: true }; // already exists
  }
  adj.set(taskId, [...existingDeps, newDependsOnId]);

  // Check if there is a cycle reachable from taskId using DFS
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function hasCycle(current: string): boolean {
    visited.add(current);
    recStack.add(current);

    const neighbors = adj.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }

    recStack.delete(current);
    return false;
  }

  for (const t of tasks) {
    if (!visited.has(t.id)) {
      if (hasCycle(t.id)) {
        return {
          valid: false,
          error: `Circular dependency detected: adding this dependency creates a deadlock loop.`
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Calculates explainable Client Health score (0-100) and grade.
 */
export function calculateClientHealth(
  client: ClientProfile,
  projects: ClientProject[],
  tasks: ProjectTask[],
  revisions: DeliverableRevision[],
  onboarding?: ClientOnboarding
): ClientHealthSnapshot {
  let score = 100;
  const reasons: string[] = [];

  // 1. Onboarding Health
  if (onboarding) {
    if (onboarding.isCompleted) {
      reasons.push('Onboarding workflow fully completed (+10)');
    } else {
      const blockedSteps = onboarding.steps.filter(s => s.status === 'blocked').length;
      if (blockedSteps > 0) {
        score -= blockedSteps * 8;
        reasons.push(`${blockedSteps} onboarding step(s) currently blocked (-${blockedSteps * 8})`);
      }
    }
  }

  // 2. Project Status & Delivery
  const activeProjects = projects.filter(p => p.status !== 'completed' && p.status !== 'cancelled');
  if (activeProjects.some(p => p.status === 'blocked')) {
    score -= 20;
    reasons.push('Active project is in Blocked status (-20)');
  }
  if (activeProjects.some(p => p.status === 'revision_required')) {
    score -= 10;
    reasons.push('Project requires client revision updates (-10)');
  }

  // 3. Overdue & Blocked Tasks
  const todayStr = new Date().toISOString().slice(0, 10);
  const overdueTasks = tasks.filter(
    t => t.status !== 'completed' && t.dueDate && t.dueDate < todayStr
  );
  if (overdueTasks.length > 0) {
    const penalty = Math.min(25, overdueTasks.length * 5);
    score -= penalty;
    reasons.push(`${overdueTasks.length} task(s) past due date (-${penalty})`);
  }

  const blockedTasks = tasks.filter(t => t.isBlocked && t.status !== 'completed');
  if (blockedTasks.length > 0) {
    const penalty = Math.min(20, blockedTasks.length * 6);
    score -= penalty;
    reasons.push(`${blockedTasks.length} task(s) marked as blocked (-${penalty})`);
  }

  // 4. Revisions & Out-of-Scope Friction
  const openRevisions = revisions.filter(r => r.status !== 'resolved');
  if (openRevisions.length > 2) {
    score -= 12;
    reasons.push(`High revision volume (${openRevisions.length} open revisions) (-12)`);
  }
  const outOfScopeRevisions = revisions.filter(r => r.isOutOfScope && r.status !== 'resolved');
  if (outOfScopeRevisions.length > 0) {
    score -= 10;
    reasons.push(`${outOfScopeRevisions.length} out-of-scope revision request(s) require commercial alignment (-10)`);
  }

  // Clamp score 0 - 100
  score = Math.max(0, Math.min(100, Math.round(score)));

  let grade: 'good' | 'at_risk' | 'critical' = 'good';
  if (score < 50) {
    grade = 'critical';
  } else if (score < 75) {
    grade = 'at_risk';
  }

  if (reasons.length === 0) {
    reasons.push('All deliverables and communications progressing on schedule');
  }

  return {
    clientId: client.id,
    healthScore: score,
    grade,
    reasons,
    calculatedAt: new Date().toISOString()
  };
}

/**
 * Generates structured Client Handover Report ready for client sign-off.
 */
export function generateHandoverReport(
  project: ClientProject,
  client: ClientProfile,
  deliverables: Deliverable[],
  tasks: ProjectTask[],
  generatedBy: string = 'Watech Project Management Office'
): HandoverReport {
  const completedDeliverablesList = deliverables
    .filter(d => d.status === 'approved' || project.progressPercent === 100)
    .map(d => d.title + (d.handoverUrl ? ` (${d.handoverUrl})` : ''));

  if (completedDeliverablesList.length === 0) {
    project.deliverables.forEach(d => completedDeliverablesList.push(d));
  }

  const handoverNotes = `Project "${project.name}" has completed scheduled delivery milestones for ${client.companyName}. All primary deliverables have been verified, configured, and deployed according to agreed specifications.`;

  const accessDetails = `1. All administrative logins and API tokens deployed during the engagement have been transferred to client primary contact (${client.primaryContact.name} <${client.primaryContact.email}>).\n2. Sensitive local staging passwords must be updated by the client within 7 days of this notice.\n3. Analytics and tracking containers verified operational.`;

  const ongoingSupport = `Complimentary 30-day warranty coverage included for defect resolution and bug fixes from handover date. Routine maintenance, feature expansions, and continuous SEO optimization are managed under the Monthly Retainer agreement.`;

  return {
    projectId: project.id,
    clientId: client.id,
    completedDeliverables: completedDeliverablesList,
    handoverNotes,
    accessHandoverDetails: accessDetails,
    ongoingSupportTerms: ongoingSupport,
    generatedAt: new Date().toISOString(),
    generatedBy
  };
}

/**
 * Detects retention, cross-sell, and upsell opportunities for an active or completed client.
 */
export function detectRetentionAndUpsellOpportunities(
  client: ClientProfile,
  project?: ClientProject,
  availableServices: WatechServiceItem[] = []
): { title: string; category: string; rationale: string; estimatedValue: string }[] {
  const opportunities: { title: string; category: string; rationale: string; estimatedValue: string }[] = [];
  const purchased = (client.commercial.agreedServices || []).join(' ').toLowerCase();

  const isWebProject = purchased.includes('web') || purchased.includes('design') || (project?.name.toLowerCase().includes('web') ?? false);
  const isMarketing = purchased.includes('seo') || purchased.includes('local') || purchased.includes('marketing');
  const isAutomation = purchased.includes('auto') || purchased.includes('crm') || purchased.includes('webhook');

  if (isWebProject && !isMarketing) {
    opportunities.push({
      title: 'Local SEO & Google 3-Pack Growth Engine',
      category: 'search_visibility',
      rationale: 'Now that high-converting web architecture is live, target local organic search traffic to maximize qualified inquiries.',
      estimatedValue: '$850 - $1,500 / mo'
    });
    opportunities.push({
      title: 'Automated Review Generation & Reputation Funnel',
      category: 'marketing_customer_acquisition',
      rationale: 'Drive continuous 5-star customer reviews on Google Maps to strengthen conversion rates and local trust.',
      estimatedValue: '$450 / mo'
    });
  }

  if (isWebProject || isMarketing) {
    if (!isAutomation) {
      opportunities.push({
        title: 'Instant Lead Dispatch & CRM Automation Pipeline',
        category: 'software_business_automation',
        rationale: 'Prevent lost leads by instantly routing inbound web quote requests to sales reps via SMS with automated nurturing.',
        estimatedValue: '$1,200 setup + $350 / mo'
      });
    }
  }

  if (isMarketing || isAutomation) {
    opportunities.push({
      title: 'Quarterly Conversion Rate Optimization (CRO) & Maintenance',
      category: 'website_digital_experience',
      rationale: 'Continuous monthly Core Web Vitals maintenance, security patching, and A/B landing page split testing.',
      estimatedValue: '$650 / mo'
    });
  }

  return opportunities;
}
