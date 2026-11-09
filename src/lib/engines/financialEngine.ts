/**
 * Watech-BI Financial & Performance Engine (Prompt 21)
 *
 * Implements strict financial accounting calculations, A/R aging buckets,
 * project/client/service profitability, sales funnel metrics, transparent CAC,
 * multi-layer revenue forecasting, scenario simulations, and safe payment lifecycle operations.
 */

import {
  AgencyInvoice,
  InvoiceStatus,
  InvoiceLineItem,
  PaymentRecord,
  PaymentMethod,
  PaymentVerificationStatus,
  AgencyExpense,
  AgencyExpenseCategory,
  RecurringContract,
  FinancialAuditLog,
  AccountsReceivableAging,
  ProjectProfitability,
  ClientProfitability,
  ServiceProfitability,
  AgencyFinancialMetrics,
  ForecastScenario,
  ForecastScenarioParams,
  MonthlyForecastPoint,
  FinancialInsight,
  ClientRecord,
  ClientProject,
  ProjectTask,
  TeamMember,
  ProjectExpense,
  Proposal,
  Business,
  WatechServiceItem,
  ServiceCatalogCategory,
} from '@/types';

// ==========================================
// 1. FINANCIAL METRICS & EXECUTIVE KPIS
// ==========================================

export interface CalculateMetricsParams {
  invoices: AgencyInvoice[];
  payments: PaymentRecord[];
  expenses: AgencyExpense[];
  clients: ClientRecord[];
  proposals: Proposal[];
  contracts: RecurringContract[];
  period?: 'month' | 'quarter' | 'year' | 'all';
}

export function calculateFinancialMetrics({
  invoices,
  payments,
  expenses,
  clients,
  proposals,
  contracts,
  period = 'all',
}: CalculateMetricsParams): AgencyFinancialMetrics {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Period filter predicate
  const isInPeriod = (dateStr?: string): boolean => {
    if (!dateStr || period === 'all') return true;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return true;

    if (period === 'month') {
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }
    if (period === 'quarter') {
      const qStartMonth = Math.floor(currentMonth / 3) * 3;
      return d.getFullYear() === currentYear && d.getMonth() >= qStartMonth && d.getMonth() < qStartMonth + 3;
    }
    if (period === 'year') {
      return d.getFullYear() === currentYear;
    }
    return true;
  };

  // 1. Contracted Revenue: Accepted proposals + active contracts (annualized or monthly value)
  const acceptedProposals = proposals.filter(
    (p) => p.status === 'accepted' && isInPeriod(p.createdAt)
  );
  const contractedFromProposals = acceptedProposals.reduce(
    (sum, p) => sum + (p.quotation?.totalAmount || 0),
    0
  );

  const activeContracts = contracts.filter((c) => c.status === 'active');
  const mrr = activeContracts.reduce((sum, c) => sum + (c.monthlyValue || 0), 0);
  const arr = mrr * 12;

  // If period is month, contract includes MRR. If year or all, includes ARR.
  const recurringPortion = period === 'month' ? mrr : period === 'quarter' ? mrr * 3 : arr;
  const totalContractedRevenue = contractedFromProposals + recurringPortion;

  // 2. Invoiced Revenue: Formal invoices issued (excluding draft & cancelled)
  const issuedInvoices = invoices.filter(
    (i) => i.status !== 'draft' && i.status !== 'cancelled' && isInPeriod(i.issueDate)
  );
  const totalInvoicedRevenue = issuedInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);

  // 3. Collected Revenue: Verified payments received
  const verifiedPayments = payments.filter(
    (p) => p.verificationStatus === 'verified' && isInPeriod(p.paymentDate)
  );
  const totalCollectedRevenue = verifiedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // 4. Receivables: Outstanding balances on issued invoices
  const todayStr = now.toISOString().slice(0, 10);
  let totalOutstandingReceivables = 0;
  let totalOverdueReceivables = 0;

  for (const inv of issuedInvoices) {
    if (inv.balance > 0) {
      totalOutstandingReceivables += inv.balance;
      if (inv.dueDate < todayStr) {
        totalOverdueReceivables += inv.balance;
      }
    }
  }

  // 5. Agency Expenses
  const paidExpenses = expenses.filter(
    (e) => e.paymentStatus === 'paid' && isInPeriod(e.date)
  );
  const totalAgencyExpenses = paidExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const directProjectCosts = paidExpenses
    .filter((e) => e.projectId || e.clientId)
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const generalOverheadExpenses = Math.max(0, totalAgencyExpenses - directProjectCosts);

  // 6. Gross Profit & Margin
  const grossAgencyProfit = totalCollectedRevenue - totalAgencyExpenses;
  const grossAgencyMarginPercent =
    totalCollectedRevenue > 0 ? (grossAgencyProfit / totalCollectedRevenue) * 100 : 0;

  // 7. New Clients in Period
  const newClientsInPeriod = clients.filter((c) => isInPeriod(c.createdAt)).length;
  const activeClientsCount = clients.filter((c) => c.status === 'active').length;

  // 8. Client Acquisition Cost (CAC)
  const salesAndMarketingCategories: AgencyExpenseCategory[] = [
    'advertising',
    'creative_production',
    'domains',
  ];
  const cacExpenses = paidExpenses.filter(
    (e) => salesAndMarketingCategories.includes(e.category) || e.description.toLowerCase().includes('marketing') || e.description.toLowerCase().includes('ads')
  );
  const cacIncludedExpenseTotal = cacExpenses.reduce((sum, e) => sum + e.amount, 0);

  let clientAcquisitionCost = 0;
  let cacDataCompleteness: 'complete' | 'partial' | 'insufficient' = 'insufficient';

  if (newClientsInPeriod > 0) {
    if (cacIncludedExpenseTotal > 0) {
      clientAcquisitionCost = cacIncludedExpenseTotal / newClientsInPeriod;
      cacDataCompleteness = cacExpenses.length >= 2 ? 'complete' : 'partial';
    } else {
      cacDataCompleteness = 'insufficient';
    }
  } else if (cacIncludedExpenseTotal > 0) {
    clientAcquisitionCost = cacIncludedExpenseTotal;
    cacDataCompleteness = 'partial';
  }

  // 9. Pipeline Proposal Value & Win Rate
  const pipelineProposals = proposals.filter(
    (p) => p.status === 'sent' || p.status === 'approved'
  );
  const pipelineProposalsValue = pipelineProposals.reduce(
    (sum, p) => sum + (p.quotation?.totalAmount || 0),
    0
  );

  const completedProposals = proposals.filter(
    (p) => p.status === 'accepted' || p.status === 'rejected'
  );
  const acceptedCount = proposals.filter((p) => p.status === 'accepted').length;
  const proposalAcceptanceRate =
    completedProposals.length > 0 ? (acceptedCount / completedProposals.length) * 100 : 0;

  return {
    totalContractedRevenue,
    totalInvoicedRevenue,
    totalCollectedRevenue,
    totalOutstandingReceivables,
    totalOverdueReceivables,
    mrr,
    arr,
    totalAgencyExpenses,
    directProjectCosts,
    generalOverheadExpenses,
    grossAgencyProfit,
    grossAgencyMarginPercent,
    newClientsInPeriod,
    clientAcquisitionCost,
    cacDataCompleteness,
    cacIncludedExpenseTotal,
    activeClientsCount,
    pipelineProposalsValue,
    proposalAcceptanceRate,
  };
}

// ==========================================
// 2. ACCOUNTS RECEIVABLE AGING
// ==========================================

export function calculateAccountsReceivableAging(
  invoices: AgencyInvoice[],
  asOfDate: Date = new Date()
): AccountsReceivableAging {
  const aging: AccountsReceivableAging = {
    totalOutstanding: 0,
    currentNotDue: 0,
    overdue1to30: 0,
    overdue31to60: 0,
    overdue61to90: 0,
    overdueOver90: 0,
    invoiceCount: 0,
  };

  const msPerDay = 1000 * 60 * 60 * 24;
  const asOfTime = asOfDate.getTime();

  for (const inv of invoices) {
    if (inv.status === 'draft' || inv.status === 'cancelled') continue;
    if (inv.balance <= 0) continue;

    aging.invoiceCount += 1;
    aging.totalOutstanding += inv.balance;

    const dueTime = new Date(inv.dueDate).getTime();
    if (isNaN(dueTime)) {
      aging.currentNotDue += inv.balance;
      continue;
    }

    const diffDays = Math.floor((asOfTime - dueTime) / msPerDay);

    if (diffDays <= 0) {
      aging.currentNotDue += inv.balance;
    } else if (diffDays <= 30) {
      aging.overdue1to30 += inv.balance;
    } else if (diffDays <= 60) {
      aging.overdue31to60 += inv.balance;
    } else if (diffDays <= 90) {
      aging.overdue61to90 += inv.balance;
    } else {
      aging.overdueOver90 += inv.balance;
    }
  }

  return aging;
}

// ==========================================
// 3. PROJECT PROFITABILITY
// ==========================================

export function calculateProjectProfitability(
  projects: ClientProject[],
  clients: ClientRecord[],
  invoices: AgencyInvoice[],
  payments: PaymentRecord[],
  projectExpenses: ProjectExpense[],
  tasks: ProjectTask[],
  _teamMembers?: TeamMember[],
  hourlyBlendedRate = 45
): ProjectProfitability[] {
  const clientMap = new Map(clients.map((c) => [c.id, c.companyName]));

  return projects.map((proj) => {
    const clientName = clientMap.get(proj.clientId) || 'Unknown Client';

    // Invoices for this project
    const projInvoices = invoices.filter(
      (inv) => inv.projectId === proj.id && inv.status !== 'draft' && inv.status !== 'cancelled'
    );
    const invoicedTotal = projInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);

    // Payments for this project
    const projPayments = payments.filter(
      (p) => (p.projectId === proj.id || projInvoices.some((i) => i.id === p.invoiceId)) && p.verificationStatus === 'verified'
    );
    const collectedCash = projPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Direct Project Expenses
    const directExpenses = projectExpenses
      .filter((pe) => pe.projectId === proj.id)
      .reduce((sum, pe) => sum + (pe.amount || 0), 0);

    // Tasks & Labor Cost
    const projTasks = tasks.filter((t) => t.projectId === proj.id);
    let estimatedHours = 0;
    let actualHours = 0;

    for (const t of projTasks) {
      estimatedHours += t.estimatedHours || 0;
      actualHours += t.actualHours || (t.status === 'completed' ? t.estimatedHours || 0 : 0);
    }

    const laborCost = (actualHours > 0 ? actualHours : estimatedHours) * hourlyBlendedRate;
    const totalDirectCosts = directExpenses + laborCost;

    // Use collected cash if available, else invoicedTotal for revenue basis
    const revenueBasis = collectedCash > 0 ? collectedCash : invoicedTotal > 0 ? invoicedTotal : proj.budget;
    const grossProfit = revenueBasis - totalDirectCosts;
    const grossMarginPercent = revenueBasis > 0 ? (grossProfit / revenueBasis) * 100 : 0;
    const budgetVariance = proj.budget - totalDirectCosts;

    return {
      projectId: proj.id,
      projectName: proj.name,
      clientName,
      contractBudget: proj.budget,
      invoicedTotal,
      collectedCash,
      directExpenses,
      laborCost,
      totalDirectCosts,
      grossProfit,
      grossMarginPercent,
      budgetVariance,
      estimatedHours,
      actualHours,
      status: proj.status,
    };
  });
}

// ==========================================
// 4. CLIENT PROFITABILITY
// ==========================================

export function calculateClientProfitability(
  clients: ClientRecord[],
  projects: ClientProject[],
  invoices: AgencyInvoice[],
  payments: PaymentRecord[],
  agencyExpenses: AgencyExpense[],
  projectExpenses: ProjectExpense[],
  contracts: RecurringContract[],
  tasks: ProjectTask[],
  hourlyBlendedRate = 45
): ClientProfitability[] {
  return clients.map((client) => {
    const clientProjects = projects.filter((p) => p.clientId === client.id);
    const clientInvoices = invoices.filter(
      (i) => i.clientId === client.id && i.status !== 'draft' && i.status !== 'cancelled'
    );
    const clientPayments = payments.filter(
      (p) => p.clientId === client.id && p.verificationStatus === 'verified'
    );
    const clientContracts = contracts.filter((c) => c.clientId === client.id && c.status === 'active');
    const clientAgencyExpenses = agencyExpenses.filter((e) => e.clientId === client.id);
    const clientProjectExpenses = projectExpenses.filter((pe) => pe.clientId === client.id);
    const clientTasks = tasks.filter((t) => t.clientId === client.id);

    // Lifetime Contracted
    const projectBudgets = clientProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const activeRecurringMonthly = clientContracts.reduce((sum, c) => sum + (c.monthlyValue || 0), 0);
    const lifetimeContracted = projectBudgets + activeRecurringMonthly * 12;

    // Collected & Outstanding
    const collectedRevenue = clientPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const outstandingBalance = clientInvoices.reduce((sum, i) => sum + (i.balance || 0), 0);

    // Direct Costs (expenses + labor)
    const directExpensesSum =
      clientAgencyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0) +
      clientProjectExpenses.reduce((sum, pe) => sum + (pe.amount || 0), 0);

    const taskHours = clientTasks.reduce(
      (sum, t) => sum + (t.actualHours || (t.status === 'completed' ? t.estimatedHours || 0 : 0)),
      0
    );
    const laborCost = taskHours * hourlyBlendedRate;
    const directCosts = directExpensesSum + laborCost;

    const netMargin = collectedRevenue - directCosts;
    const marginPercent = collectedRevenue > 0 ? (netMargin / collectedRevenue) * 100 : 0;

    // Data Completeness & Warnings
    const dataWarnings: string[] = [];
    let completeness = 0;

    if (clientInvoices.length > 0) completeness += 30;
    if (clientPayments.length > 0) completeness += 30;
    if (directExpensesSum > 0 || taskHours > 0) {
      completeness += 40;
    } else {
      dataWarnings.push('No direct costs or task hours recorded; margin may be overstated.');
    }

    if (clientInvoices.length > 0 && clientPayments.length === 0) {
      dataWarnings.push('Invoices have been issued but no verified payments are logged yet.');
    }

    // Profitability Band
    let profitabilityBand: ClientProfitability['profitabilityBand'] = 'insufficient_data';
    if (completeness < 35 && collectedRevenue === 0) {
      profitabilityBand = 'insufficient_data';
    } else if (marginPercent >= 50) {
      profitabilityBand = 'high_margin';
    } else if (marginPercent >= 15) {
      profitabilityBand = 'profitable';
    } else if (marginPercent >= 0) {
      profitabilityBand = 'break_even';
    } else {
      profitabilityBand = 'unprofitable';
    }

    return {
      clientId: client.id,
      clientName: client.companyName,
      lifetimeContracted,
      collectedRevenue,
      outstandingBalance,
      directCosts,
      netMargin,
      marginPercent,
      activeRecurringMonthly,
      profitabilityBand,
      dataCompletenessScore: Math.min(100, completeness),
      dataWarnings,
    };
  });
}

// ==========================================
// 5. SERVICE PROFITABILITY
// ==========================================

const CATEGORY_LABELS: Record<ServiceCatalogCategory, string> = {
  website_digital_experience: 'Websites & Digital Experience',
  marketing_customer_acquisition: 'Marketing & Customer Acquisition',
  search_visibility: 'Search Visibility & Local SEO',
  creative_content: 'Creative Content & Branding',
  software_business_automation: 'Software & Business Automation',
  business_growth_consulting: 'Strategic Growth Consulting',
};

export function calculateServiceProfitability(
  invoices: AgencyInvoice[],
  services: WatechServiceItem[],
  tasks: ProjectTask[],
  contracts: RecurringContract[],
  hourlyBlendedRate = 45
): ServiceProfitability[] {
  const categories: ServiceCatalogCategory[] = [
    'website_digital_experience',
    'marketing_customer_acquisition',
    'search_visibility',
    'creative_content',
    'software_business_automation',
    'business_growth_consulting',
  ];

  return categories.map((cat) => {
    const catServices = services.filter((s) => s.category === cat);
    const catServiceIds = new Set(catServices.map((s) => s.id));

    // Revenue from line items
    let totalRevenue = 0;
    for (const inv of invoices) {
      if (inv.status === 'draft' || inv.status === 'cancelled') continue;
      for (const item of inv.lineItems) {
        if (item.category === cat || (item.serviceId && catServiceIds.has(item.serviceId))) {
          totalRevenue += item.subtotal;
        }
      }
    }

    // Recurring contribution
    const catContracts = contracts.filter(
      (c) => c.status === 'active' && ((c.serviceId && catServiceIds.has(c.serviceId)) || c.serviceName.toLowerCase().includes(cat.slice(0, 4)))
    );
    const recurringContribution = catContracts.reduce((sum, c) => sum + (c.monthlyValue || 0), 0);

    // Direct hours & fulfillment cost
    let estimatedHours = 0;
    let actualHours = 0;

    for (const t of tasks) {
      const match = catServices.some(
        (s) => t.title.toLowerCase().includes(s.name.toLowerCase()) || (s.deliverables && s.deliverables.some((d) => t.title.toLowerCase().includes(d.toLowerCase())))
      );
      if (match) {
        estimatedHours += t.estimatedHours || 0;
        actualHours += t.actualHours || (t.status === 'completed' ? t.estimatedHours || 0 : 0);
      }
    }

    // Fallback benchmark if no specific task mapping exists
    const effectiveHours = actualHours > 0 ? actualHours : estimatedHours > 0 ? estimatedHours : totalRevenue > 0 ? Math.round(totalRevenue / 120) : 0;
    const directFulfillmentCost = effectiveHours * hourlyBlendedRate;
    const grossMargin = totalRevenue - directFulfillmentCost;
    const grossMarginPercent = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

    return {
      category: cat,
      categoryLabel: CATEGORY_LABELS[cat] || cat,
      serviceCount: catServices.length,
      totalRevenue,
      directFulfillmentCost,
      grossMargin,
      grossMarginPercent,
      estimatedHours: estimatedHours || effectiveHours,
      actualHours: actualHours || effectiveHours,
      recurringContribution,
    };
  });
}

// ==========================================
// 6. SALES FUNNEL TELEMETRY
// ==========================================

export interface FunnelStageMetric {
  stage: string;
  label: string;
  count: number;
  conversionFromPrevious: number;
}

export function calculateSalesFunnelMetrics(businesses: Business[]): FunnelStageMetric[] {
  const STAGES: { stage: string; label: string }[] = [
    { stage: 'discovered', label: 'Discovered' },
    { stage: 'researched', label: 'Researched' },
    { stage: 'qualified', label: 'Qualified' },
    { stage: 'contacted', label: 'Contacted' },
    { stage: 'meeting_scheduled', label: 'Meeting Set' },
    { stage: 'proposal_sent', label: 'Proposal Sent' },
    { stage: 'negotiation', label: 'In Negotiation' },
    { stage: 'won_deal', label: 'Deal Won' },
  ];

  const stageCounts: Record<string, number> = {};
  for (const s of STAGES) stageCounts[s.stage] = 0;

  for (const b of businesses) {
    if (stageCounts[b.status] !== undefined) {
      stageCounts[b.status] += 1;
    }
  }

  // Calculate cumulative or stage-by-stage counts
  const results: FunnelStageMetric[] = [];
  let prevCount = 0;

  for (let i = 0; i < STAGES.length; i++) {
    const s = STAGES[i];
    const count = stageCounts[s.stage];
    let conversion = 100;
    if (i > 0 && prevCount > 0) {
      conversion = (count / prevCount) * 100;
    } else if (i > 0 && prevCount === 0) {
      conversion = 0;
    }
    prevCount = count;

    results.push({
      stage: s.stage,
      label: s.label,
      count,
      conversionFromPrevious: Math.round(conversion),
    });
  }

  return results;
}

// ==========================================
// 7. MULTI-LAYER REVENUE FORECASTING
// ==========================================

export function generateRevenueForecast(
  contracts: RecurringContract[],
  projects: ClientProject[],
  _invoices: AgencyInvoice[],
  proposals: Proposal[],
  forecastMonths = 6
): MonthlyForecastPoint[] {
  const points: MonthlyForecastPoint[] = [];
  const now = new Date();

  const activeMRR = contracts
    .filter((c) => c.status === 'active')
    .reduce((sum, c) => sum + (c.monthlyValue || 0), 0);

  // Probability-weighted pipeline
  const pipelineWeightMap: Record<string, number> = {
    sent: 0.35,
    approved: 0.7,
  };

  const weightedPipelineTotal = proposals
    .filter((p) => p.status in pipelineWeightMap)
    .reduce((sum, p) => sum + (p.quotation?.totalAmount || 0) * (pipelineWeightMap[p.status] || 0.3), 0);

  // Spread pipeline across next 3 months
  const monthlyPipelineWeight = weightedPipelineTotal / Math.min(3, forecastMonths);

  for (let i = 0; i < forecastMonths; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthLabel = targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    // Confirmed contracted: project deliverables / milestones due in this month
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();

    const confirmedContracted = projects
      .filter((p) => {
        if (!p.targetCompletionDate) return false;
        const d = new Date(p.targetCompletionDate);
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      })
      .reduce((sum, p) => sum + (p.budget || 0), 0);

    // Expected Recurring: apply subtle decay for retention realism (1.5% churn per month)
    const decayFactor = Math.pow(0.985, i);
    const expectedRecurring = Math.round(activeMRR * decayFactor);

    // Pipeline allocation diminishes further into future
    const probabilityWeightedPipeline = i < 3 ? Math.round(monthlyPipelineWeight * (1 - i * 0.15)) : 0;

    const projectedTotalRevenue = confirmedContracted + expectedRecurring + probabilityWeightedPipeline;
    const projectedExpenses = Math.round(projectedTotalRevenue * 0.42); // standard 42% cost benchmark
    const projectedNetMargin = projectedTotalRevenue - projectedExpenses;

    points.push({
      monthLabel,
      confirmedContracted,
      expectedRecurring,
      probabilityWeightedPipeline,
      projectedTotalRevenue,
      projectedExpenses,
      projectedNetMargin,
    });
  }

  return points;
}

// ==========================================
// 8. SCENARIO SIMULATION
// ==========================================

export function calculateScenarioProjection(
  scenarioType: 'conservative' | 'base' | 'optimistic',
  params: ForecastScenarioParams,
  currentMrr: number,
  forecastMonths = 6
): ForecastScenario {
  const points: MonthlyForecastPoint[] = [];
  const now = new Date();

  let rollingMrr = currentMrr;
  let totalProjectedRevenue = 0;
  let totalProjectedProfit = 0;

  for (let i = 0; i < forecastMonths; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthLabel = targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    // New business acquired in this month
    const effectiveNewClients = params.expectedNewClientsPerMonth * (params.pipelineConversionRatePercent / 100);
    const newProjectRevenue = effectiveNewClients * params.averageContractValue * 0.7; // 70% setup
    const newRecurringRevenue = effectiveNewClients * (params.averageContractValue * 0.15); // 15% monthly retainer

    // Churn on existing MRR
    rollingMrr = rollingMrr * (1 - params.monthlyChurnPercent / 100) + newRecurringRevenue;

    const projectedTotalRevenue = Math.round(newProjectRevenue + rollingMrr);
    const projectedExpenses = Math.round(params.monthlyOperatingExpense + newProjectRevenue * 0.25);
    const projectedNetMargin = projectedTotalRevenue - projectedExpenses;

    totalProjectedRevenue += projectedTotalRevenue;
    totalProjectedProfit += projectedNetMargin;

    points.push({
      monthLabel,
      confirmedContracted: Math.round(newProjectRevenue),
      expectedRecurring: Math.round(rollingMrr),
      probabilityWeightedPipeline: 0,
      projectedTotalRevenue,
      projectedExpenses,
      projectedNetMargin,
    });
  }

  return {
    scenarioType,
    params,
    monthlyPoints: points,
    totalProjectedRevenue,
    totalProjectedProfit,
  };
}

// ==========================================
// 9. AUTOMATED BUSINESS INSIGHTS
// ==========================================

export function generateBusinessInsights(
  metrics: AgencyFinancialMetrics,
  aging: AccountsReceivableAging,
  clientProfits: ClientProfitability[],
  serviceProfits: ServiceProfitability[]
): FinancialInsight[] {
  const insights: FinancialInsight[] = [];

  // 1. Receivables Alert
  if (aging.overdueOver90 > 0 || aging.overdue61to90 > 0) {
    const seriousOverdue = aging.overdue61to90 + aging.overdueOver90;
    insights.push({
      id: 'insight-aging-risk',
      type: 'risk',
      title: 'High-Risk Aging Accounts Receivable',
      observation: `$${seriousOverdue.toLocaleString()} in invoices is overdue past 60 days.`,
      evidence: `${aging.invoiceCount} unpaid invoice(s) outstanding. Over 90 days: $${aging.overdueOver90.toLocaleString()}`,
      confidenceScore: 95,
      suggestedAction: 'Send formal demand notices or transition overdue accounts to prepaid-only terms.',
    });
  }

  // 2. Client Concentration Risk
  if (clientProfits.length > 0 && metrics.totalCollectedRevenue > 0) {
    const topClient = [...clientProfits].sort((a, b) => b.collectedRevenue - a.collectedRevenue)[0];
    if (topClient && topClient.collectedRevenue / metrics.totalCollectedRevenue > 0.45) {
      const pct = Math.round((topClient.collectedRevenue / metrics.totalCollectedRevenue) * 100);
      insights.push({
        id: 'insight-client-concentration',
        type: 'concentration',
        title: 'Client Concentration Risk',
        observation: `${topClient.clientName} represents ${pct}% of all collected agency revenue.`,
        evidence: `Collected $${topClient.collectedRevenue.toLocaleString()} from this single account out of $${metrics.totalCollectedRevenue.toLocaleString()} total.`,
        confidenceScore: 90,
        suggestedAction: 'Accelerate outbound prospecting to diversify income and reduce dependency on one key account.',
      });
    }
  }

  // 3. High Margin Service Opportunity
  const topMarginService = [...serviceProfits]
    .filter((s) => s.totalRevenue > 0)
    .sort((a, b) => b.grossMarginPercent - a.grossMarginPercent)[0];

  if (topMarginService && topMarginService.grossMarginPercent > 55) {
    insights.push({
      id: 'insight-service-opportunity',
      type: 'opportunity',
      title: `High-Margin Core Offering: ${topMarginService.categoryLabel}`,
      observation: `${topMarginService.categoryLabel} generates an exceptional ${Math.round(topMarginService.grossMarginPercent)}% gross margin.`,
      evidence: `Revenue: $${topMarginService.totalRevenue.toLocaleString()} vs fulfillment direct cost: $${topMarginService.directFulfillmentCost.toLocaleString()}.`,
      confidenceScore: 88,
      suggestedAction: `Feature ${topMarginService.categoryLabel} prominently as the primary recommended tier in new sales proposals.`,
    });
  }

  // 4. MRR / ARR Stability
  if (metrics.mrr > 0) {
    insights.push({
      id: 'insight-recurring-growth',
      type: 'growth',
      title: 'Recurring Revenue Foundation Established',
      observation: `Active retainers contribute $${metrics.mrr.toLocaleString()}/mo ($${metrics.arr.toLocaleString()}/yr) in predictable revenue.`,
      evidence: `Retainers cover an estimated ${metrics.generalOverheadExpenses > 0 ? Math.round((metrics.mrr / metrics.generalOverheadExpenses) * 100) : 100}% of monthly general overhead.`,
      confidenceScore: 92,
      suggestedAction: 'Package every one-time website or SEO project with a mandatory 6-month maintenance retainer.',
    });
  }

  // 5. Unprofitable Client Warning
  const unprofitableClients = clientProfits.filter((cp) => cp.profitabilityBand === 'unprofitable');
  if (unprofitableClients.length > 0) {
    insights.push({
      id: 'insight-unprofitable-clients',
      type: 'efficiency',
      title: 'Margin Compression on Underpriced Accounts',
      observation: `${unprofitableClients.length} client account(s) currently operate with negative net margin.`,
      evidence: `Clients: ${unprofitableClients.map((c) => c.clientName).join(', ')}`,
      confidenceScore: 85,
      suggestedAction: 'Audit project scope creep, renegotiate billing milestones, or issue out-of-scope change orders.',
    });
  }

  return insights;
}

// ==========================================
// 10. SAFE PAYMENT OPERATIONS & AUDITING
// ==========================================

export interface RecordPaymentResult {
  updatedInvoice: AgencyInvoice;
  paymentRecord: PaymentRecord;
  auditLog: FinancialAuditLog;
}

export function recordInvoicePayment(
  invoice: AgencyInvoice,
  amount: number,
  paymentMethod: PaymentMethod,
  transactionReference: string,
  verifiedBy = 'Watech Admin',
  notes?: string
): RecordPaymentResult {
  if (amount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }
  if (amount > invoice.balance + 0.01) {
    throw new Error(`Payment amount ($${amount}) exceeds invoice remaining balance ($${invoice.balance}).`);
  }

  const nowIso = new Date().toISOString();
  const paymentId = `pay-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const paymentNumber = `PAY-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const paymentRecord: PaymentRecord = {
    id: paymentId,
    paymentNumber,
    invoiceId: invoice.id,
    clientId: invoice.clientId,
    projectId: invoice.projectId,
    amount,
    currency: invoice.currency,
    paymentDate: nowIso.slice(0, 10),
    paymentMethod,
    transactionReference,
    verificationStatus: 'verified',
    verifiedBy,
    notes,
    createdAt: nowIso,
  };

  const newAmountPaid = invoice.amountPaid + amount;
  const newBalance = Math.max(0, invoice.totalAmount - newAmountPaid);
  const newStatus: InvoiceStatus = newBalance <= 0 ? 'paid' : 'partially_paid';

  const updatedInvoice: AgencyInvoice = {
    ...invoice,
    amountPaid: newAmountPaid,
    balance: newBalance,
    status: newStatus,
    updatedAt: nowIso,
  };

  const auditLog: FinancialAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    entityType: 'payment',
    entityId: paymentRecord.id,
    action: 'payment_recorded',
    actor: verifiedBy,
    previousState: `Invoice ${invoice.invoiceNumber} balance $${invoice.balance}`,
    newState: `Recorded $${amount} via ${paymentMethod} (Ref: ${transactionReference}). New balance: $${newBalance}`,
    rationale: `Manual payment receipt recorded by ${verifiedBy}`,
    timestamp: nowIso,
  };

  return { updatedInvoice, paymentRecord, auditLog };
}

export interface ReversePaymentResult {
  updatedInvoice: AgencyInvoice;
  reversedPayment: PaymentRecord;
  auditLog: FinancialAuditLog;
}

export function reverseInvoicePayment(
  invoice: AgencyInvoice,
  payment: PaymentRecord,
  reversalReason: string,
  reversedBy = 'Watech Admin'
): ReversePaymentResult {
  if (payment.verificationStatus === 'reversed') {
    throw new Error('This payment has already been reversed.');
  }

  const nowIso = new Date().toISOString();
  const reversedPayment: PaymentRecord = {
    ...payment,
    verificationStatus: 'reversed',
    reversalReason,
  };

  const newAmountPaid = Math.max(0, invoice.amountPaid - payment.amount);
  const newBalance = invoice.totalAmount - newAmountPaid;

  const todayStr = nowIso.slice(0, 10);
  let newStatus: InvoiceStatus = 'issued';
  if (newAmountPaid > 0) {
    newStatus = 'partially_paid';
  } else if (invoice.dueDate < todayStr) {
    newStatus = 'overdue';
  }

  const updatedInvoice: AgencyInvoice = {
    ...invoice,
    amountPaid: newAmountPaid,
    balance: newBalance,
    status: newStatus,
    updatedAt: nowIso,
  };

  const auditLog: FinancialAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    entityType: 'payment',
    entityId: payment.id,
    action: 'payment_reversed',
    actor: reversedBy,
    previousState: `Payment ${payment.paymentNumber} of $${payment.amount} was verified`,
    newState: `Reversed payment $${payment.amount}. Restored invoice ${invoice.invoiceNumber} balance to $${newBalance}`,
    rationale: reversalReason,
    timestamp: nowIso,
  };

  return { updatedInvoice, reversedPayment, auditLog };
}
