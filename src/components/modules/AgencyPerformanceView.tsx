'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Plus,
  RefreshCw,
  Download,
  Printer,
  Copy,
  ChevronRight,
  Shield,
  Layers,
  PieChart,
  BarChart3,
  Calendar,
  Building,
  Briefcase,
  Users,
  Percent,
  Check,
  X,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { repository } from '@/lib/db/repository';
import {
  AgencyInvoice,
  InvoiceStatus,
  InvoiceLineItem,
  PaymentRecord,
  PaymentMethod,
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
import {
  calculateFinancialMetrics,
  calculateAccountsReceivableAging,
  calculateProjectProfitability,
  calculateClientProfitability,
  calculateServiceProfitability,
  calculateSalesFunnelMetrics,
  generateRevenueForecast,
  calculateScenarioProjection,
  generateBusinessInsights,
  recordInvoicePayment,
  reverseInvoicePayment,
} from '@/lib/engines/financialEngine';

type PerformanceSubTab =
  | 'overview'
  | 'invoices_ar'
  | 'expenses'
  | 'profitability'
  | 'sales_cac'
  | 'recurring_forecast'
  | 'reports';

const EXPENSE_CATEGORIES: { id: AgencyExpenseCategory; label: string }[] = [
  { id: 'software_subscriptions', label: 'Software & SaaS Subscriptions' },
  { id: 'hosting', label: 'Cloud Hosting & Infrastructure' },
  { id: 'domains', label: 'Domains & DNS' },
  { id: 'advertising', label: 'Advertising & Paid Acquisition' },
  { id: 'contractor_payments', label: 'Contractor & Specialist Fees' },
  { id: 'team_salaries', label: 'Team Salaries & Labor' },
  { id: 'creative_production', label: 'Creative & Media Production' },
  { id: 'third_party_services', label: 'Third-Party Services' },
  { id: 'payment_processing_fees', label: 'Payment Processing Fees' },
  { id: 'operational_expenses', label: 'General Operations & Office' },
  { id: 'other', label: 'Other Operating Costs' },
];

export function AgencyPerformanceView() {
  const { activeProject } = useProject();

  // Sub-Tab Navigation
  const [activeTab, setActiveTab] = useState<PerformanceSubTab>('overview');
  const [timeframe, setTimeframe] = useState<'month' | 'quarter' | 'year' | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Raw Database Data
  const [invoices, setInvoices] = useState<AgencyInvoice[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [agencyExpenses, setAgencyExpenses] = useState<AgencyExpense[]>([]);
  const [recurringContracts, setRecurringContracts] = useState<RecurringContract[]>([]);
  const [auditLogs, setAuditLogs] = useState<FinancialAuditLog[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [projectExpenses, setProjectExpenses] = useState<ProjectExpense[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [services, setServices] = useState<WatechServiceItem[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);

  // Modals & Drawers
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<AgencyInvoice | null>(null);
  const [isLogExpenseOpen, setIsLogExpenseOpen] = useState(false);
  const [isAddContractOpen, setIsAddContractOpen] = useState(false);
  const [invoiceFilterStatus, setInvoiceFilterStatus] = useState<string>('all');
  const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState<AgencyInvoice | null>(null);
  const [isReversePaymentModalOpen, setIsReversePaymentModalOpen] = useState(false);
  const [paymentToReverse, setPaymentToReverse] = useState<PaymentRecord | null>(null);
  const [reversalReasonInput, setReversalReasonInput] = useState('');

  // Scenario Simulator State
  const [scenarioType, setScenarioType] = useState<'conservative' | 'base' | 'optimistic'>('base');
  const [scenarioParams, setScenarioParams] = useState<ForecastScenarioParams>({
    expectedNewClientsPerMonth: 2,
    averageContractValue: 6800,
    pipelineConversionRatePercent: 35,
    monthlyChurnPercent: 2,
    monthlyOperatingExpense: 1400,
  });

  // Load all financial records
  const loadFinancialData = async () => {
    try {
      setIsLoading(true);
      const [
        loadedInvoices,
        loadedPayments,
        loadedExpenses,
        loadedContracts,
        loadedLogs,
        loadedClients,
        loadedProjects,
        loadedProjectExpenses,
        loadedTasks,
        loadedProposals,
        loadedServices,
        loadedBusinesses,
      ] = await Promise.all([
        repository.getInvoices(),
        repository.getPayments(),
        repository.getAgencyExpenses(),
        repository.getRecurringContracts(),
        repository.getFinancialAuditLogs(),
        repository.getClients(),
        repository.getClientProjects(),
        repository.getProjectExpenses(),
        repository.getProjectTasks(),
        repository.getProposals(),
        repository.getServices(),
        repository.getBusinesses(),
      ]);

      setInvoices(loadedInvoices);
      setPayments(loadedPayments);
      setAgencyExpenses(loadedExpenses);
      setRecurringContracts(loadedContracts);
      setAuditLogs(loadedLogs);
      setClients(loadedClients);
      setProjects(loadedProjects);
      setProjectExpenses(loadedProjectExpenses);
      setTasks(loadedTasks);
      setProposals(loadedProposals);
      setServices(loadedServices);
      setBusinesses(loadedBusinesses);
    } catch (err) {
      console.error('Error loading financial intelligence:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, [activeProject?.id]);

  // Derived Analytics Engine Outputs
  const metrics: AgencyFinancialMetrics = useMemo(() => {
    return calculateFinancialMetrics({
      invoices,
      payments,
      expenses: agencyExpenses,
      clients,
      proposals,
      contracts: recurringContracts,
      period: timeframe,
    });
  }, [invoices, payments, agencyExpenses, clients, proposals, recurringContracts, timeframe]);

  const aging: AccountsReceivableAging = useMemo(() => {
    return calculateAccountsReceivableAging(invoices);
  }, [invoices]);

  const projectProfits: ProjectProfitability[] = useMemo(() => {
    return calculateProjectProfitability(projects, clients, invoices, payments, projectExpenses, tasks);
  }, [projects, clients, invoices, payments, projectExpenses, tasks]);

  const clientProfits: ClientProfitability[] = useMemo(() => {
    return calculateClientProfitability(
      clients,
      projects,
      invoices,
      payments,
      agencyExpenses,
      projectExpenses,
      recurringContracts,
      tasks
    );
  }, [clients, projects, invoices, payments, agencyExpenses, projectExpenses, recurringContracts, tasks]);

  const serviceProfits: ServiceProfitability[] = useMemo(() => {
    return calculateServiceProfitability(invoices, services, tasks, recurringContracts);
  }, [invoices, services, tasks, recurringContracts]);

  const salesFunnel = useMemo(() => {
    return calculateSalesFunnelMetrics(businesses);
  }, [businesses]);

  const baseForecast: MonthlyForecastPoint[] = useMemo(() => {
    return generateRevenueForecast(recurringContracts, projects, invoices, proposals, 6);
  }, [recurringContracts, projects, invoices, proposals]);

  const scenarioResult: ForecastScenario = useMemo(() => {
    return calculateScenarioProjection(scenarioType, scenarioParams, metrics.mrr, 6);
  }, [scenarioType, scenarioParams, metrics.mrr]);

  const insights: FinancialInsight[] = useMemo(() => {
    return generateBusinessInsights(metrics, aging, clientProfits, serviceProfits);
  }, [metrics, aging, clientProfits, serviceProfits]);

  // Invoice Filter
  const filteredInvoices = useMemo(() => {
    if (invoiceFilterStatus === 'all') return invoices;
    return invoices.filter((i) => i.status === invoiceFilterStatus);
  }, [invoices, invoiceFilterStatus]);

  // Copy helper
  const handleCopyMarkdown = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(label);
    setTimeout(() => setCopySuccess(null), 2500);
  };

  // Payment Execution Handler
  const handleRecordPaymentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInvoiceForPayment) return;

    const form = e.currentTarget;
    const amount = parseFloat((form.elements.namedItem('amount') as HTMLInputElement).value);
    const paymentMethod = (form.elements.namedItem('paymentMethod') as HTMLSelectElement).value as PaymentMethod;
    const transactionRef = (form.elements.namedItem('transactionRef') as HTMLInputElement).value;
    const notes = (form.elements.namedItem('notes') as HTMLInputElement).value;

    try {
      const result = recordInvoicePayment(
        selectedInvoiceForPayment,
        amount,
        paymentMethod,
        transactionRef,
        'Watech Admin',
        notes
      );

      await repository.saveInvoice(result.updatedInvoice);
      await repository.savePayment(result.paymentRecord);
      await repository.logFinancialAudit(result.auditLog);

      await loadFinancialData();
      setIsRecordPaymentOpen(false);
      setSelectedInvoiceForPayment(null);
    } catch (err: any) {
      alert(err.message || 'Error recording payment.');
    }
  };

  // Payment Reversal Handler
  const handleReversePaymentConfirm = async () => {
    if (!paymentToReverse) return;
    const inv = invoices.find((i) => i.id === paymentToReverse.invoiceId);
    if (!inv) {
      alert('Associated invoice not found.');
      return;
    }

    try {
      const result = reverseInvoicePayment(
        inv,
        paymentToReverse,
        reversalReasonInput || 'Operational reconciliation reversal',
        'Watech Admin'
      );

      await repository.saveInvoice(result.updatedInvoice);
      await repository.savePayment(result.reversedPayment);
      await repository.logFinancialAudit(result.auditLog);

      await loadFinancialData();
      setIsReversePaymentModalOpen(false);
      setPaymentToReverse(null);
      setReversalReasonInput('');
      if (selectedInvoiceDetails) {
        setSelectedInvoiceDetails(result.updatedInvoice);
      }
    } catch (err: any) {
      alert(err.message || 'Error reversing payment.');
    }
  };

  // Create Invoice Handler
  const handleCreateInvoiceSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const clientId = (form.elements.namedItem('clientId') as HTMLSelectElement).value;
    const projectId = (form.elements.namedItem('projectId') as HTMLSelectElement).value || undefined;
    const issueDate = (form.elements.namedItem('issueDate') as HTMLInputElement).value;
    const dueDate = (form.elements.namedItem('dueDate') as HTMLInputElement).value;
    const paymentTerms = (form.elements.namedItem('paymentTerms') as HTMLInputElement).value;
    const itemDesc = (form.elements.namedItem('itemDesc') as HTMLInputElement).value;
    const itemCat = (form.elements.namedItem('itemCat') as HTMLSelectElement).value as ServiceCatalogCategory;
    const itemPrice = parseFloat((form.elements.namedItem('itemPrice') as HTMLInputElement).value);
    const itemQty = parseInt((form.elements.namedItem('itemQty') as HTMLInputElement).value) || 1;

    const subtotal = itemPrice * itemQty;
    const totalAmount = subtotal;

    const newInvoice: AgencyInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      clientId,
      projectId,
      issueDate,
      dueDate,
      currency: 'USD',
      lineItems: [
        {
          id: `li-${Date.now()}`,
          description: itemDesc,
          category: itemCat,
          quantity: itemQty,
          unitPrice: itemPrice,
          taxPercent: 0,
          discountPercent: 0,
          subtotal,
        },
      ],
      subtotal,
      taxTotal: 0,
      discountTotal: 0,
      totalAmount,
      amountPaid: 0,
      balance: totalAmount,
      status: 'issued',
      paymentTerms: paymentTerms || 'Net 15 Days',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await repository.saveInvoice(newInvoice);
    await repository.logFinancialAudit({
      id: `audit-${Date.now()}`,
      entityType: 'invoice',
      entityId: newInvoice.id,
      action: 'created',
      actor: 'Watech Admin',
      newState: `Created invoice ${newInvoice.invoiceNumber} for $${totalAmount}`,
      rationale: 'Manual invoice generation',
      timestamp: new Date().toISOString(),
    });

    await loadFinancialData();
    setIsCreateInvoiceOpen(false);
  };

  // Log Expense Handler
  const handleLogExpenseSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const category = (form.elements.namedItem('category') as HTMLSelectElement).value as AgencyExpenseCategory;
    const vendor = (form.elements.namedItem('vendor') as HTMLInputElement).value;
    const description = (form.elements.namedItem('description') as HTMLInputElement).value;
    const amount = parseFloat((form.elements.namedItem('amount') as HTMLInputElement).value);
    const date = (form.elements.namedItem('date') as HTMLInputElement).value;
    const clientId = (form.elements.namedItem('clientId') as HTMLSelectElement).value || undefined;
    const projectId = (form.elements.namedItem('projectId') as HTMLSelectElement).value || undefined;
    const isRecurring = (form.elements.namedItem('isRecurring') as HTMLInputElement).checked;

    const newExpense: AgencyExpense = {
      id: `exp-${Date.now()}`,
      category,
      vendor,
      description,
      amount,
      currency: 'USD',
      date,
      clientId,
      projectId,
      isRecurring,
      paymentStatus: 'paid',
      createdAt: new Date().toISOString(),
    };

    await repository.saveAgencyExpense(newExpense);
    await loadFinancialData();
    setIsLogExpenseOpen(false);
  };

  // Add Retainer Handler
  const handleAddContractSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const clientId = (form.elements.namedItem('clientId') as HTMLSelectElement).value;
    const serviceName = (form.elements.namedItem('serviceName') as HTMLInputElement).value;
    const packageName = (form.elements.namedItem('packageName') as HTMLInputElement).value;
    const monthlyValue = parseFloat((form.elements.namedItem('monthlyValue') as HTMLInputElement).value);
    const billingCadence = (form.elements.namedItem('billingCadence') as HTMLSelectElement).value as 'monthly' | 'quarterly' | 'annual';
    const startDate = (form.elements.namedItem('startDate') as HTMLInputElement).value;
    const nextRenewalDate = (form.elements.namedItem('nextRenewalDate') as HTMLInputElement).value;

    const newContract: RecurringContract = {
      id: `contract-${Date.now()}`,
      clientId,
      serviceName,
      packageName,
      monthlyValue,
      billingCadence,
      currency: 'USD',
      startDate,
      nextRenewalDate,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await repository.saveRecurringContract(newContract);
    await loadFinancialData();
    setIsAddContractOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <span className="text-xs font-mono text-slate-400">Loading Agency Financial Intelligence...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner: Local-First Financial Disclosure */}
      <div className="bg-surface-50 border border-border rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white tracking-wide">
                Revenue, Profitability & Agency Performance Intelligence
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PROMPT 21 • DEXIE V12
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict financial disaggregation: Contracted deals, Invoiced amounts, and Verified Collected Cash are isolated. Local-first IndexedDB architecture ensures sensitive commercial data remains in your browser.
            </p>
          </div>
        </div>

        {/* Timeframe Selector & Refresh */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <div className="flex items-center bg-surface-100 border border-border rounded-lg p-1 text-xs">
            {(['month', 'quarter', 'year', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-2.5 py-1 rounded capitalize font-medium transition-colors ${
                  timeframe === t ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t === 'all' ? 'All-Time' : t === 'month' ? 'This Month' : t === 'quarter' ? 'Quarter' : 'YTD'}
              </button>
            ))}
          </div>

          <button
            onClick={loadFinancialData}
            title="Refresh Financial Data"
            className="p-2 rounded-lg bg-surface-100 hover:bg-surface-200 border border-border text-slate-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border overflow-x-auto pb-1 text-xs font-medium">
        {[
          { id: 'overview', label: 'Executive Dashboard', icon: BarChart3 },
          { id: 'invoices_ar', label: `Invoices & A/R Aging (${invoices.length})`, icon: CreditCard },
          { id: 'expenses', label: `Agency Expenses (${agencyExpenses.length})`, icon: DollarSign },
          { id: 'profitability', label: 'Profitability Matrix', icon: PieChart },
          { id: 'sales_cac', label: 'Sales Funnel & CAC', icon: Users },
          { id: 'recurring_forecast', label: `Recurring (MRR $${metrics.mrr.toLocaleString()}) & Forecast`, icon: TrendingUp },
          { id: 'reports', label: 'Financial Statements & Export', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as PerformanceSubTab)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
                isActive
                  ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-surface-100/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* SUB-TAB 1: EXECUTIVE KPI & OVERVIEW DASHBOARD */}
      {/* ============================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Executive KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Collected Cash */}
            <div className="bg-surface-50 border border-border rounded-xl p-4 shadow-sm hover:border-emerald-500/30 transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Collected Cash</span>
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                ${metrics.totalCollectedRevenue.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Verified receipts in bank</span>
                <span className="text-emerald-400 font-medium">100% Truth</span>
              </div>
            </div>

            {/* KPI 2: Contracted vs Invoiced */}
            <div className="bg-surface-50 border border-border rounded-xl p-4 shadow-sm hover:border-blue-500/30 transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Contracted Revenue</span>
                <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                  <FileText className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                ${metrics.totalContractedRevenue.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Invoiced: ${metrics.totalInvoicedRevenue.toLocaleString()}</span>
                <span className="text-blue-400 font-mono">
                  {metrics.totalContractedRevenue > 0
                    ? `${Math.round((metrics.totalInvoicedRevenue / metrics.totalContractedRevenue) * 100)}% Billed`
                    : '0%'}
                </span>
              </div>
            </div>

            {/* KPI 3: Receivables & Overdue */}
            <div className="bg-surface-50 border border-border rounded-xl p-4 shadow-sm hover:border-amber-500/30 transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Outstanding A/R</span>
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                ${metrics.totalOutstandingReceivables.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Overdue: ${metrics.totalOverdueReceivables.toLocaleString()}</span>
                <span className={metrics.totalOverdueReceivables > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                  {metrics.totalOverdueReceivables > 0 ? 'Action Needed' : 'Current'}
                </span>
              </div>
            </div>

            {/* KPI 4: MRR & ARR */}
            <div className="bg-surface-50 border border-border rounded-xl p-4 shadow-sm hover:border-purple-500/30 transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Active MRR / ARR</span>
                <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                ${metrics.mrr.toLocaleString()}
                <span className="text-xs font-normal text-slate-400 ml-1">/mo</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Annualized (ARR)</span>
                <span className="text-purple-300 font-semibold">${metrics.arr.toLocaleString()}/yr</span>
              </div>
            </div>
          </div>

          {/* Secondary Financial Metrics: Margins, Expenses, CAC */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Gross Margin */}
            <div className="bg-surface-50 border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Gross Agency Profit</span>
                <span className="text-xs font-bold text-emerald-400">
                  {metrics.grossAgencyMarginPercent.toFixed(1)}% Margin
                </span>
              </div>
              <div className="text-xl font-bold text-white">${metrics.grossAgencyProfit.toLocaleString()}</div>
              <div className="w-full bg-surface-100 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, metrics.grossAgencyMarginPercent))}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 mt-2 flex justify-between">
                <span>Collected: ${metrics.totalCollectedRevenue.toLocaleString()}</span>
                <span>Expenses: ${metrics.totalAgencyExpenses.toLocaleString()}</span>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-surface-50 border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Operating Expenses</span>
                <span className="text-xs font-mono text-slate-300">${metrics.totalAgencyExpenses.toLocaleString()}</span>
              </div>
              <div className="space-y-1.5 mt-3 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    Direct Project Costs
                  </span>
                  <span className="font-mono">${metrics.directProjectCosts.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    General Agency Overhead
                  </span>
                  <span className="font-mono">${metrics.generalOverheadExpenses.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* CAC & Pipeline */}
            <div className="bg-surface-50 border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Client Acquisition Cost</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                  {metrics.cacDataCompleteness}
                </span>
              </div>
              <div className="text-xl font-bold text-white">
                ${Math.round(metrics.clientAcquisitionCost).toLocaleString()}
                <span className="text-xs font-normal text-slate-400 ml-1">/ client</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 flex justify-between">
                <span>New Clients: {metrics.newClientsInPeriod}</span>
                <span>Pipeline Value: ${metrics.pipelineProposalsValue.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Automated Business Insights */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Automated Agency Performance Insights</h3>
              </div>
              <span className="text-xs text-slate-400">{insights.length} active findings</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className="bg-surface-50 border border-border rounded-xl p-4 space-y-2 hover:border-surface-200 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                        insight.type === 'risk'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : insight.type === 'concentration'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : insight.type === 'opportunity'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {insight.type} • {insight.confidenceScore}% Confidence
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white">{insight.title}</h4>
                  <p className="text-xs text-slate-300">{insight.observation}</p>
                  <div className="bg-surface-100 rounded-lg p-2 text-[11px] text-slate-400 font-mono">
                    {insight.evidence}
                  </div>
                  <div className="text-xs text-emerald-400 font-medium pt-1 flex items-start gap-1.5">
                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Action: {insight.suggestedAction}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 2: INVOICES & ACCOUNTS RECEIVABLE (A/R AGING) */}
      {/* ============================================================== */}
      {activeTab === 'invoices_ar' && (
        <div className="space-y-6">
          {/* A/R Aging Schedule Card */}
          <div className="bg-surface-50 border border-border rounded-xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Accounts Receivable Aging Schedule</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dynamic breakdown of outstanding balances across 5 standard aging intervals.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Total Outstanding Balance</span>
                <span className="text-xl font-bold text-white font-mono">
                  ${aging.totalOutstanding.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Aging Buckets Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-surface-100 border border-border rounded-lg p-3">
                <span className="text-[11px] text-slate-400 block font-medium">Current (Not Due)</span>
                <span className="text-base font-bold text-emerald-400 font-mono mt-1 block">
                  ${aging.currentNotDue.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">Within terms</span>
              </div>

              <div className="bg-surface-100 border border-border rounded-lg p-3">
                <span className="text-[11px] text-slate-400 block font-medium">1–30 Days Overdue</span>
                <span className="text-base font-bold text-amber-400 font-mono mt-1 block">
                  ${aging.overdue1to30.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">Grace period follow-up</span>
              </div>

              <div className="bg-surface-100 border border-border rounded-lg p-3">
                <span className="text-[11px] text-slate-400 block font-medium">31–60 Days Overdue</span>
                <span className="text-base font-bold text-orange-400 font-mono mt-1 block">
                  ${aging.overdue31to60.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">Active collection alert</span>
              </div>

              <div className="bg-surface-100 border border-border rounded-lg p-3">
                <span className="text-[11px] text-slate-400 block font-medium">61–90 Days Overdue</span>
                <span className="text-base font-bold text-rose-400 font-mono mt-1 block">
                  ${aging.overdue61to90.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">Escalated collection</span>
              </div>

              <div className="bg-surface-100 border border-border rounded-lg p-3">
                <span className="text-[11px] text-slate-400 block font-medium">90+ Days Overdue</span>
                <span className="text-base font-bold text-rose-500 font-mono mt-1 block">
                  ${aging.overdueOver90.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">Severe default risk</span>
              </div>
            </div>
          </div>

          {/* Invoices Directory */}
          <div className="bg-surface-50 border border-border rounded-xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-white">Invoices Directory ({filteredInvoices.length})</h3>
                {/* Filter */}
                <select
                  value={invoiceFilterStatus}
                  onChange={(e) => setInvoiceFilterStatus(e.target.value)}
                  className="bg-surface-100 border border-border rounded-lg px-2.5 py-1 text-xs text-slate-300"
                >
                  <option value="all">All Statuses</option>
                  <option value="issued">Issued / Unpaid</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="paid">Paid in Full</option>
                  <option value="overdue">Overdue</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              <button
                onClick={() => setIsCreateInvoiceOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Invoice</span>
              </button>
            </div>

            {/* Invoices Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">Invoice #</th>
                    <th className="pb-3 font-semibold">Client</th>
                    <th className="pb-3 font-semibold">Issue Date</th>
                    <th className="pb-3 font-semibold">Due Date</th>
                    <th className="pb-3 font-semibold">Total</th>
                    <th className="pb-3 font-semibold">Paid</th>
                    <th className="pb-3 font-semibold">Balance</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredInvoices.map((inv) => {
                    const client = clients.find((c) => c.id === inv.clientId);
                    return (
                      <tr key={inv.id} className="hover:bg-surface-100/50 transition-colors">
                        <td className="py-3 font-mono font-bold text-white">{inv.invoiceNumber}</td>
                        <td className="py-3 text-slate-300 font-medium">
                          {client ? client.companyName : inv.clientId}
                        </td>
                        <td className="py-3 text-slate-400">{inv.issueDate}</td>
                        <td className="py-3 text-slate-400">{inv.dueDate}</td>
                        <td className="py-3 font-mono text-slate-200">${inv.totalAmount.toLocaleString()}</td>
                        <td className="py-3 font-mono text-emerald-400">${inv.amountPaid.toLocaleString()}</td>
                        <td className="py-3 font-mono font-bold text-white">${inv.balance.toLocaleString()}</td>
                        <td className="py-3">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-semibold ${
                              inv.status === 'paid'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : inv.status === 'partially_paid'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : inv.status === 'overdue'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 text-right space-x-2">
                          {inv.balance > 0 && inv.status !== 'draft' && inv.status !== 'cancelled' && (
                            <button
                              onClick={() => {
                                setSelectedInvoiceForPayment(inv);
                                setIsRecordPaymentOpen(true);
                              }}
                              className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[11px] font-medium border border-emerald-500/30"
                            >
                              Record Payment
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedInvoiceDetails(inv)}
                            className="px-2 py-1 rounded bg-surface-100 hover:bg-surface-200 text-slate-300 text-[11px] border border-border"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                        No invoices found for selected filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 3: AGENCY EXPENSES & COST ALLOCATION */}
      {/* ============================================================== */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="bg-surface-50 border border-border rounded-xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Agency Expense Registry ({agencyExpenses.length})</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Categorized operational costs with direct project cost allocation vs general overhead tracking.
                </p>
              </div>

              <button
                onClick={() => setIsLogExpenseOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Expense</span>
              </button>
            </div>

            {/* Expenses Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold">Vendor</th>
                    <th className="pb-3 font-semibold">Category</th>
                    <th className="pb-3 font-semibold">Description</th>
                    <th className="pb-3 font-semibold">Allocation</th>
                    <th className="pb-3 font-semibold">Type</th>
                    <th className="pb-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {agencyExpenses.map((exp) => {
                    const client = clients.find((c) => c.id === exp.clientId);
                    return (
                      <tr key={exp.id} className="hover:bg-surface-100/50 transition-colors">
                        <td className="py-3 text-slate-400 font-mono">{exp.date}</td>
                        <td className="py-3 text-white font-medium">{exp.vendor}</td>
                        <td className="py-3">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-100 border border-border text-slate-300">
                            {exp.category.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 text-slate-300 max-w-xs truncate">{exp.description}</td>
                        <td className="py-3 text-xs">
                          {client ? (
                            <span className="text-blue-400 font-medium flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              {client.companyName}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">General Agency Overhead</span>
                          )}
                        </td>
                        <td className="py-3">
                          {exp.isRecurring ? (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              Monthly Recurring
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">One-time</span>
                          )}
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-white">
                          ${exp.amount.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                  {agencyExpenses.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        No expenses logged yet. Click Log Expense to add operational costs.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 4: PROFITABILITY MATRIX (PROJECTS, CLIENTS & SERVICES) */}
      {/* ============================================================== */}
      {activeTab === 'profitability' && (
        <div className="space-y-6">
          {/* Section 1: Client Profitability Leaderboard */}
          <div className="bg-surface-50 border border-border rounded-xl p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-white">Client Profitability & Lifetime Value</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluates collected revenue against direct allocated fulfillment costs. Includes data completeness safeguards to prevent false negative profit calculations.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">Client</th>
                    <th className="pb-3 font-semibold">Contracted Value</th>
                    <th className="pb-3 font-semibold">Collected Cash</th>
                    <th className="pb-3 font-semibold">Outstanding</th>
                    <th className="pb-3 font-semibold">Direct Costs</th>
                    <th className="pb-3 font-semibold">Net Margin</th>
                    <th className="pb-3 font-semibold">Active MRR</th>
                    <th className="pb-3 font-semibold">Profitability Band</th>
                    <th className="pb-3 font-semibold">Completeness</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clientProfits.map((cp) => (
                    <tr key={cp.clientId} className="hover:bg-surface-100/50 transition-colors">
                      <td className="py-3 font-bold text-white flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {cp.clientName}
                      </td>
                      <td className="py-3 font-mono text-slate-300">${cp.lifetimeContracted.toLocaleString()}</td>
                      <td className="py-3 font-mono font-bold text-emerald-400">
                        ${cp.collectedRevenue.toLocaleString()}
                      </td>
                      <td className="py-3 font-mono text-amber-400">${cp.outstandingBalance.toLocaleString()}</td>
                      <td className="py-3 font-mono text-slate-400">${cp.directCosts.toLocaleString()}</td>
                      <td className="py-3 font-mono font-bold text-white">
                        ${cp.netMargin.toLocaleString()}
                        <span className="text-[10px] font-normal text-slate-400 ml-1">
                          ({cp.marginPercent.toFixed(0)}%)
                        </span>
                      </td>
                      <td className="py-3 font-mono text-purple-300">
                        ${cp.activeRecurringMonthly.toLocaleString()}/mo
                      </td>
                      <td className="py-3">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-semibold ${
                            cp.profitabilityBand === 'high_margin'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : cp.profitabilityBand === 'profitable'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : cp.profitabilityBand === 'break_even'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : cp.profitabilityBand === 'unprofitable'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                          }`}
                        >
                          {cp.profitabilityBand.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5" title={cp.dataWarnings.join('; ')}>
                          <div className="w-12 bg-surface-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-400 h-1.5 rounded-full"
                              style={{ width: `${cp.dataCompletenessScore}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {cp.dataCompletenessScore}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {clientProfits.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                        No active client profitability records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Project Delivery Profitability */}
          <div className="bg-surface-50 border border-border rounded-xl p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-white">Project Delivery Margin Matrix</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Contract budget vs Direct expenses vs Team labor hours costed at blended $45/hr agency delivery rate.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">Project</th>
                    <th className="pb-3 font-semibold">Client</th>
                    <th className="pb-3 font-semibold">Budget</th>
                    <th className="pb-3 font-semibold">Invoiced</th>
                    <th className="pb-3 font-semibold">Collected</th>
                    <th className="pb-3 font-semibold">Direct Costs</th>
                    <th className="pb-3 font-semibold">Hours</th>
                    <th className="pb-3 font-semibold">Gross Profit</th>
                    <th className="pb-3 font-semibold">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {projectProfits.map((pp) => (
                    <tr key={pp.projectId} className="hover:bg-surface-100/50 transition-colors">
                      <td className="py-3 font-bold text-white">{pp.projectName}</td>
                      <td className="py-3 text-slate-300">{pp.clientName}</td>
                      <td className="py-3 font-mono text-slate-300">${pp.contractBudget.toLocaleString()}</td>
                      <td className="py-3 font-mono text-slate-300">${pp.invoicedTotal.toLocaleString()}</td>
                      <td className="py-3 font-mono text-emerald-400 font-bold">${pp.collectedCash.toLocaleString()}</td>
                      <td className="py-3 font-mono text-slate-400">${pp.totalDirectCosts.toLocaleString()}</td>
                      <td className="py-3 font-mono text-slate-400">{pp.actualHours} hrs</td>
                      <td className="py-3 font-mono font-bold text-white">${pp.grossProfit.toLocaleString()}</td>
                      <td className="py-3">
                        <span
                          className={`font-mono font-bold ${
                            pp.grossMarginPercent >= 50
                              ? 'text-emerald-400'
                              : pp.grossMarginPercent >= 20
                              ? 'text-blue-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {pp.grossMarginPercent.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {projectProfits.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                        No projects recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Service Profitability Breakdown */}
          <div className="bg-surface-50 border border-border rounded-xl p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-white">Service Category Profitability Breakdown</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Compares revenue contribution and gross margin across Watech's 6 core service disciplines.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {serviceProfits.map((sp) => (
                <div key={sp.category} className="bg-surface-100 border border-border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-bold text-white">{sp.categoryLabel}</h4>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                      {sp.grossMarginPercent.toFixed(0)}% Margin
                    </span>
                  </div>
                  <div className="text-base font-mono font-bold text-white mt-1">
                    ${sp.totalRevenue.toLocaleString()}
                    <span className="text-xs font-normal text-slate-400 ml-1">rev</span>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-1 font-mono pt-1">
                    <div className="flex justify-between">
                      <span>Fulfillment Cost:</span>
                      <span>${sp.directFulfillmentCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gross Profit:</span>
                      <span className="text-white font-bold">${sp.grossMargin.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Recurring Contribution:</span>
                      <span className="text-purple-300">${sp.recurringContribution.toLocaleString()}/mo</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 5: SALES PERFORMANCE & CAC ANALYTICS */}
      {/* ============================================================== */}
      {activeTab === 'sales_cac' && (
        <div className="space-y-6">
          {/* Sales Funnel Telemetry */}
          <div className="bg-surface-50 border border-border rounded-xl p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-white">CRM Sales Funnel Conversion Telemetry</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Tracks stage-by-stage pipeline volume and conversion drop-off from prospect discovery to won deals.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {salesFunnel.map((stage, idx) => (
                <div key={stage.stage} className="bg-surface-100 border border-border rounded-lg p-3 text-center">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">{stage.label}</span>
                  <span className="text-lg font-bold text-white font-mono mt-1 block">{stage.count}</span>
                  {idx > 0 && (
                    <span className="text-[10px] text-emerald-400 font-mono mt-1 block">
                      {stage.conversionFromPrevious}% conv
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CAC Deep-Dive */}
          <div className="bg-surface-50 border border-border rounded-xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Client Acquisition Cost (CAC) Analysis</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calculation: Total Sales & Marketing Spend divided by Verified New Clients Acquired in period.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Calculated Blended CAC</span>
                <span className="text-2xl font-bold text-white font-mono">
                  ${Math.round(metrics.clientAcquisitionCost).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-surface-100 border border-border rounded-lg p-4">
                <span className="text-xs text-slate-400 block font-medium">Included Marketing & Ads Spend</span>
                <span className="text-lg font-bold text-white font-mono mt-1 block">
                  ${metrics.cacIncludedExpenseTotal.toLocaleString()}
                </span>
                <p className="text-[11px] text-slate-400 mt-2">
                  Includes Google Search Ads, social creative production, and outbound marketing domain infrastructure.
                </p>
              </div>

              <div className="bg-surface-100 border border-border rounded-lg p-4">
                <span className="text-xs text-slate-400 block font-medium">New Clients Acquired</span>
                <span className="text-lg font-bold text-emerald-400 font-mono mt-1 block">
                  {metrics.newClientsInPeriod} Accounts
                </span>
                <p className="text-[11px] text-slate-400 mt-2">
                  Confirmed signed client entities logged in local database within selected period.
                </p>
              </div>

              <div className="bg-surface-100 border border-border rounded-lg p-4">
                <span className="text-xs text-slate-400 block font-medium">Proposal Win Rate</span>
                <span className="text-lg font-bold text-blue-400 font-mono mt-1 block">
                  {metrics.proposalAcceptanceRate.toFixed(1)}%
                </span>
                <p className="text-[11px] text-slate-400 mt-2">
                  Ratio of accepted proposals vs completed negotiations in current intelligence repository.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 6: RECURRING REVENUE (MRR/ARR) & FORECASTING */}
      {/* ============================================================== */}
      {activeTab === 'recurring_forecast' && (
        <div className="space-y-6">
          {/* Active Retainers Header */}
          <div className="bg-surface-50 border border-border rounded-xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Active Recurring Retainers ({recurringContracts.length})</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Monthly Recurring Revenue (MRR) contracts providing baseline cash flow stability.
                </p>
              </div>

              <button
                onClick={() => setIsAddContractOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Retainer Contract</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">Client</th>
                    <th className="pb-3 font-semibold">Service / Retainer</th>
                    <th className="pb-3 font-semibold">Package Tier</th>
                    <th className="pb-3 font-semibold">Cadence</th>
                    <th className="pb-3 font-semibold">Next Renewal</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Monthly Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recurringContracts.map((rc) => {
                    const client = clients.find((c) => c.id === rc.clientId);
                    return (
                      <tr key={rc.id} className="hover:bg-surface-100/50 transition-colors">
                        <td className="py-3 font-bold text-white">{client ? client.companyName : rc.clientId}</td>
                        <td className="py-3 text-slate-300 font-medium">{rc.serviceName}</td>
                        <td className="py-3 text-slate-400">{rc.packageName || 'Custom Agreement'}</td>
                        <td className="py-3 capitalize text-slate-400">{rc.billingCadence}</td>
                        <td className="py-3 text-slate-400 font-mono">{rc.nextRenewalDate}</td>
                        <td className="py-3">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold">
                            {rc.status}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-emerald-400">
                          ${rc.monthlyValue.toLocaleString()}/mo
                        </td>
                      </tr>
                    );
                  })}
                  {recurringContracts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        No active recurring retainer contracts logged.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3-Layer Transparent Revenue Forecast */}
          <div className="bg-surface-50 border border-border rounded-xl p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-white">6-Month Multi-Layer Revenue Forecast</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Layer 1: Confirmed Contracted Milestones • Layer 2: Expected MRR (with 1.5% retention decay) • Layer 3: Probability-Weighted Sales Pipeline.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">Month</th>
                    <th className="pb-3 font-semibold">Confirmed Contracted</th>
                    <th className="pb-3 font-semibold">Expected Recurring (MRR)</th>
                    <th className="pb-3 font-semibold">Weighted Pipeline</th>
                    <th className="pb-3 font-semibold">Projected Revenue</th>
                    <th className="pb-3 font-semibold">Est. Expenses</th>
                    <th className="pb-3 font-semibold text-right">Projected Net Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono">
                  {baseForecast.map((pt) => (
                    <tr key={pt.monthLabel} className="hover:bg-surface-100/50 transition-colors">
                      <td className="py-3 font-bold text-white">{pt.monthLabel}</td>
                      <td className="py-3 text-blue-400">${pt.confirmedContracted.toLocaleString()}</td>
                      <td className="py-3 text-purple-300">${pt.expectedRecurring.toLocaleString()}</td>
                      <td className="py-3 text-amber-400">${pt.probabilityWeightedPipeline.toLocaleString()}</td>
                      <td className="py-3 font-bold text-white">${pt.projectedTotalRevenue.toLocaleString()}</td>
                      <td className="py-3 text-slate-400">${pt.projectedExpenses.toLocaleString()}</td>
                      <td className="py-3 text-right font-bold text-emerald-400">
                        ${pt.projectedNetMargin.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Scenario Simulator */}
          <div className="bg-surface-50 border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Scenario Simulator & Sensitivity Modeling</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Adjust commercial parameters to stress-test agency performance under Conservative, Base, and Optimistic conditions.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-surface-100 border border-border rounded-lg p-1 text-xs">
                {(['conservative', 'base', 'optimistic'] as const).map((sc) => (
                  <button
                    key={sc}
                    onClick={() => {
                      setScenarioType(sc);
                      if (sc === 'conservative') {
                        setScenarioParams({
                          expectedNewClientsPerMonth: 1,
                          averageContractValue: 4500,
                          pipelineConversionRatePercent: 20,
                          monthlyChurnPercent: 5,
                          monthlyOperatingExpense: 1600,
                        });
                      } else if (sc === 'base') {
                        setScenarioParams({
                          expectedNewClientsPerMonth: 2,
                          averageContractValue: 6800,
                          pipelineConversionRatePercent: 35,
                          monthlyChurnPercent: 2,
                          monthlyOperatingExpense: 1400,
                        });
                      } else {
                        setScenarioParams({
                          expectedNewClientsPerMonth: 4,
                          averageContractValue: 8500,
                          pipelineConversionRatePercent: 50,
                          monthlyChurnPercent: 1,
                          monthlyOperatingExpense: 1800,
                        });
                      }
                    }}
                    className={`px-3 py-1 rounded capitalize font-medium transition-colors ${
                      scenarioType === sc ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {sc}
                  </button>
                ))}
              </div>
            </div>

            {/* Slider Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">
                  New Deals/Month: <span className="text-white font-bold">{scenarioParams.expectedNewClientsPerMonth}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="8"
                  value={scenarioParams.expectedNewClientsPerMonth}
                  onChange={(e) =>
                    setScenarioParams({ ...scenarioParams, expectedNewClientsPerMonth: parseInt(e.target.value) })
                  }
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Avg Deal Value: <span className="text-white font-bold">${scenarioParams.averageContractValue.toLocaleString()}</span>
                </label>
                <input
                  type="range"
                  min="2000"
                  max="15000"
                  step="500"
                  value={scenarioParams.averageContractValue}
                  onChange={(e) =>
                    setScenarioParams({ ...scenarioParams, averageContractValue: parseInt(e.target.value) })
                  }
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Monthly Overhead: <span className="text-white font-bold">${scenarioParams.monthlyOperatingExpense.toLocaleString()}</span>
                </label>
                <input
                  type="range"
                  min="500"
                  max="5000"
                  step="100"
                  value={scenarioParams.monthlyOperatingExpense}
                  onChange={(e) =>
                    setScenarioParams({ ...scenarioParams, monthlyOperatingExpense: parseInt(e.target.value) })
                  }
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>

            {/* Scenario Output Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface-100 rounded-lg p-4 border border-border mt-3">
              <div>
                <span className="text-xs text-slate-400 block">6-Month Projected Cumulative Revenue</span>
                <span className="text-2xl font-bold text-white font-mono mt-1 block">
                  ${scenarioResult.totalProjectedRevenue.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">6-Month Projected Net Margin</span>
                <span className="text-2xl font-bold text-emerald-400 font-mono mt-1 block">
                  ${scenarioResult.totalProjectedProfit.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 7: FINANCIAL REPORTS & EXPORT */}
      {/* ============================================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-surface-50 border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Pre-Configured Agency Financial Reports</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate clean, print-ready statements or export raw ledger data in CSV and Markdown formats.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Report 1: Client Profitability Statement */}
              <div className="bg-surface-100 border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-xs">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Client Profitability Statement
                </div>
                <p className="text-[11px] text-slate-400">
                  Comprehensive audit statement displaying lifetime billing, cash collected, direct expenses, and net margin % per account.
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      const md = `# WATECH AGENCY CLIENT PROFITABILITY STATEMENT\nDate: ${new Date().toLocaleDateString()}\n\n| Client | Contracted | Collected | Direct Costs | Net Margin | Margin % |\n|---|---|---|---|---|---|\n${clientProfits.map((c) => `| ${c.clientName} | $${c.lifetimeContracted} | $${c.collectedRevenue} | $${c.directCosts} | $${c.netMargin} | ${c.marginPercent.toFixed(0)}% |`).join('\n')}`;
                      handleCopyMarkdown(md, 'Client Profitability');
                    }}
                    className="flex-1 py-1.5 rounded bg-surface-200 hover:bg-surface-300 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy MD</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="py-1.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Report 2: Monthly Cash Flow & A/R Summary */}
              <div className="bg-surface-100 border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-xs">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  Accounts Receivable Aging Schedule
                </div>
                <p className="text-[11px] text-slate-400">
                  Detailed receivables schedule separating Current vs Overdue buckets (1-30d, 31-60d, 61-90d, 90+d).
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      const md = `# WATECH A/R AGING SCHEDULE\nDate: ${new Date().toLocaleDateString()}\nTotal Outstanding: $${aging.totalOutstanding}\n\n- Current (Not Due): $${aging.currentNotDue}\n- 1-30 Days: $${aging.overdue1to30}\n- 31-60 Days: $${aging.overdue31to60}\n- 61-90 Days: $${aging.overdue61to90}\n- 90+ Days: $${aging.overdueOver90}`;
                      handleCopyMarkdown(md, 'A/R Aging');
                    }}
                    className="flex-1 py-1.5 rounded bg-surface-200 hover:bg-surface-300 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy MD</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="py-1.5 px-3 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Report 3: CSV Export */}
              <div className="bg-surface-100 border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-xs">
                  <Download className="w-4 h-4 text-purple-400" />
                  Raw Invoices & Payments CSV
                </div>
                <p className="text-[11px] text-slate-400">
                  Export complete invoice ledger with receipt references, client linkage, and payment timestamps.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      const csvHeader = 'InvoiceNumber,Client,IssueDate,DueDate,Total,AmountPaid,Balance,Status\n';
                      const csvRows = invoices
                        .map(
                          (i) =>
                            `"${i.invoiceNumber}","${i.clientId}","${i.issueDate}","${i.dueDate}",${i.totalAmount},${i.amountPaid},${i.balance},"${i.status}"`
                        )
                        .join('\n');
                      const blob = new Blob([csvHeader + csvRows], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `watech_invoices_${new Date().toISOString().slice(0, 10)}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="w-full py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV File</span>
                  </button>
                </div>
              </div>
            </div>

            {copySuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Copied {copySuccess} report markdown to clipboard!</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: RECORD PAYMENT */}
      {/* ============================================================== */}
      {isRecordPaymentOpen && selectedInvoiceForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface-50 border border-border rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-white">
                Record Payment: {selectedInvoiceForPayment.invoiceNumber}
              </h3>
              <button
                onClick={() => setIsRecordPaymentOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-surface-100 rounded-lg p-3 text-xs mb-4 space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Invoice Total:</span>
                <span className="font-mono">${selectedInvoiceForPayment.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Previously Paid:</span>
                <span className="font-mono text-emerald-400">
                  ${selectedInvoiceForPayment.amountPaid.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-white font-bold pt-1 border-t border-border">
                <span>Outstanding Balance:</span>
                <span className="font-mono text-amber-400">
                  ${selectedInvoiceForPayment.balance.toLocaleString()}
                </span>
              </div>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Payment Amount ($)</label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  max={selectedInvoiceForPayment.balance}
                  defaultValue={selectedInvoiceForPayment.balance}
                  required
                  className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Payment Method</label>
                <select
                  name="paymentMethod"
                  className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white"
                >
                  <option value="bank_transfer">Bank Transfer (ACH / SEPA)</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="stripe">Stripe</option>
                  <option value="wire">Wire Transfer</option>
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Transaction Reference / Receipt ID</label>
                <input
                  name="transactionRef"
                  type="text"
                  placeholder="e.g. ACH-992144-JPMC or TX-8812"
                  required
                  className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Notes (Optional)</label>
                <input
                  name="notes"
                  type="text"
                  placeholder="Verified in operating account"
                  className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsRecordPaymentOpen(false)}
                  className="px-4 py-2 rounded-lg bg-surface-100 hover:bg-surface-200 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow"
                >
                  Confirm & Verify Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: CREATE INVOICE */}
      {/* ============================================================== */}
      {isCreateInvoiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface-50 border border-border rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-white">Create New Agency Invoice</h3>
              <button
                onClick={() => setIsCreateInvoiceOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Client</label>
                  <select
                    name="clientId"
                    required
                    className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Project (Optional)</label>
                  <select
                    name="projectId"
                    className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">None / Agency Retainer</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Issue Date</label>
                  <input
                    name="issueDate"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                    className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Due Date</label>
                  <input
                    name="dueDate"
                    type="date"
                    defaultValue={new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)}
                    required
                    className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Payment Terms</label>
                <input
                  name="paymentTerms"
                  type="text"
                  defaultValue="Net 15 Days"
                  className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="border-t border-border pt-3 space-y-2">
                <span className="font-semibold text-slate-300 block">Line Item Details</span>
                <div>
                  <label className="text-slate-400 block mb-1">Item Description</label>
                  <input
                    name="itemDesc"
                    type="text"
                    required
                    placeholder="e.g. Website Redesign Milestone 1 or Monthly SEO Retainer"
                    className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Category</label>
                    <select
                      name="itemCat"
                      className="w-full bg-surface-100 border border-border rounded-lg px-2 py-2 text-white"
                    >
                      <option value="website_digital_experience">Web Development</option>
                      <option value="search_visibility">Local SEO</option>
                      <option value="marketing_customer_acquisition">Marketing</option>
                      <option value="creative_content">Creative Content</option>
                      <option value="software_business_automation">Automation</option>
                      <option value="business_growth_consulting">Consulting</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Unit Price ($)</label>
                    <input
                      name="itemPrice"
                      type="number"
                      step="0.01"
                      required
                      placeholder="3400"
                      className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Quantity</label>
                    <input
                      name="itemQty"
                      type="number"
                      defaultValue={1}
                      min={1}
                      required
                      className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateInvoiceOpen(false)}
                  className="px-4 py-2 rounded-lg bg-surface-100 hover:bg-surface-200 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow"
                >
                  Issue Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: LOG EXPENSE */}
      {/* ============================================================== */}
      {isLogExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface-50 border border-border rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-white">Log Agency Operating Expense</h3>
              <button
                onClick={() => setIsLogExpenseOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogExpenseSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Expense Category</label>
                <select
                  name="category"
                  className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Vendor / Payee</label>
                <input
                  name="vendor"
                  type="text"
                  placeholder="e.g. Google Ads, Vercel, Freelance Dev"
                  required
                  className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Description</label>
                <input
                  name="description"
                  type="text"
                  placeholder="e.g. October Search Engine Ad Campaign"
                  required
                  className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Amount ($)</label>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="250.00"
                    required
                    className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Date</label>
                  <input
                    name="date"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                    className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Direct Project / Client Allocation (Optional)</label>
                <select
                  name="clientId"
                  className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white"
                >
                  <option value="">General Overhead (Not allocated to specific client)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input name="isRecurring" type="checkbox" id="isRecurring" className="accent-emerald-500" />
                <label htmlFor="isRecurring" className="text-slate-300">
                  Recurring Monthly Expense (SaaS/Hosting)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsLogExpenseOpen(false)}
                  className="px-4 py-2 rounded-lg bg-surface-100 hover:bg-surface-200 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: ADD RETAINER CONTRACT */}
      {/* ============================================================== */}
      {isAddContractOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface-50 border border-border rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-white">Add Recurring Retainer Agreement</h3>
              <button
                onClick={() => setIsAddContractOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddContractSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Client</label>
                <select
                  name="clientId"
                  required
                  className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Service Name</label>
                <input
                  name="serviceName"
                  type="text"
                  placeholder="e.g. Local SEO Authority & Core Web Vitals Retainer"
                  required
                  className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Package Tier / Name</label>
                <input
                  name="packageName"
                  type="text"
                  placeholder="e.g. Watech 360 Growth Retainer"
                  className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Monthly Value ($)</label>
                  <input
                    name="monthlyValue"
                    type="number"
                    step="0.01"
                    placeholder="650"
                    required
                    className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Billing Cadence</label>
                  <select
                    name="billingCadence"
                    className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Start Date</label>
                  <input
                    name="startDate"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                    className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Next Renewal Date</label>
                  <input
                    name="nextRenewalDate"
                    type="date"
                    defaultValue={new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)}
                    required
                    className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddContractOpen(false)}
                  className="px-4 py-2 rounded-lg bg-surface-100 hover:bg-surface-200 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow"
                >
                  Save Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DRAWER: INVOICE DETAILS & PAYMENT REVERSAL */}
      {/* ============================================================== */}
      {selectedInvoiceDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface-50 border border-border rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Invoice {selectedInvoiceDetails.invoiceNumber}
                </h3>
                <span className="text-xs text-slate-400">
                  Terms: {selectedInvoiceDetails.paymentTerms} • Due: {selectedInvoiceDetails.dueDate}
                </span>
              </div>
              <button
                onClick={() => setSelectedInvoiceDetails(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Line items */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Line Items</span>
              <div className="bg-surface-100 rounded-lg p-3 space-y-2">
                {selectedInvoiceDetails.lineItems.map((li) => (
                  <div key={li.id} className="flex justify-between text-xs">
                    <div>
                      <span className="text-white font-medium block">{li.description}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Qty: {li.quantity} × ${li.unitPrice.toLocaleString()}
                      </span>
                    </div>
                    <span className="font-mono text-white font-bold">${li.subtotal.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Totals */}
            <div className="bg-surface-100 rounded-lg p-3 text-xs space-y-1 font-mono">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal:</span>
                <span>${selectedInvoiceDetails.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Total Amount:</span>
                <span className="text-white font-bold">${selectedInvoiceDetails.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Amount Paid:</span>
                <span>${selectedInvoiceDetails.amountPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-white font-bold pt-1 border-t border-border">
                <span>Balance Remaining:</span>
                <span className="text-amber-400">${selectedInvoiceDetails.balance.toLocaleString()}</span>
              </div>
            </div>

            {/* Payments on this invoice */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                Recorded Payments Audit Trail
              </span>
              <div className="space-y-2">
                {payments
                  .filter((p) => p.invoiceId === selectedInvoiceDetails.id)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="bg-surface-100 border border-border rounded-lg p-3 flex justify-between items-center text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">{p.paymentNumber}</span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase ${
                              p.verificationStatus === 'verified'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {p.verificationStatus}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Method: {p.paymentMethod} • Ref: {p.transactionReference} • Date: {p.paymentDate}
                        </div>
                        {p.reversalReason && (
                          <div className="text-[10px] text-rose-400 mt-1 italic">
                            Reversal Reason: {p.reversalReason}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-white block">
                          ${p.amount.toLocaleString()}
                        </span>
                        {p.verificationStatus === 'verified' && (
                          <button
                            onClick={() => {
                              setPaymentToReverse(p);
                              setIsReversePaymentModalOpen(true);
                            }}
                            className="text-[10px] text-rose-400 hover:text-rose-300 underline mt-1 block"
                          >
                            Reverse
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                {payments.filter((p) => p.invoiceId === selectedInvoiceDetails.id).length === 0 && (
                  <p className="text-xs text-slate-400 italic">No payments recorded on this invoice yet.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedInvoiceDetails(null)}
                className="px-4 py-2 rounded-lg bg-surface-100 hover:bg-surface-200 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: REVERSE PAYMENT CONFIRMATION */}
      {/* ============================================================== */}
      {isReversePaymentModalOpen && paymentToReverse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface-50 border border-border rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase">
              <RotateCcw className="w-4 h-4" />
              Confirm Payment Reversal
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to reverse payment <span className="font-mono text-white">{paymentToReverse.paymentNumber}</span> of <span className="font-mono text-white">${paymentToReverse.amount.toLocaleString()}</span>?
            </p>
            <p className="text-[11px] text-slate-400">
              This will restore the invoice balance, update invoice status, and record an indelible audit entry.
            </p>

            <div>
              <label className="text-slate-400 block text-[11px] mb-1">Reason for Reversal (Required)</label>
              <input
                type="text"
                value={reversalReasonInput}
                onChange={(e) => setReversalReasonInput(e.target.value)}
                placeholder="e.g. Bank chargeback, payment bounced, accidental duplicate entry"
                required
                className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setIsReversePaymentModalOpen(false);
                  setPaymentToReverse(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleReversePaymentConfirm}
                disabled={!reversalReasonInput.trim()}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow"
              >
                Confirm Reversal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
