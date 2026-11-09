'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileCheck2,
  FileText,
  DollarSign,
  TrendingUp,
  Printer,
  Download,
  Copy,
  Check,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Building2,
  History,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  Eye,
  RefreshCw,
  Sliders,
  Layers,
  Calendar,
  Lock,
  Unlock,
  Award,
  Globe2,
  Share2,
  Briefcase,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { repository } from '@/lib/db/repository';
import type {
  Business,
  WebsiteAudit,
  LocalSeoProfile,
  WatechServiceItem,
  BusinessServiceRecommendation,
  BusinessProposal,
  ProposalQuotation,
  QuotationLineItem,
  ProposalStatus,
  ProposalTemplateType,
  ProposalCurrency,
  ProposalVersion,
  BrandingConfiguration,
  ProposalMetricsSummary,
  ServiceCatalogCategory,
} from '@/types';
import {
  formatCurrency,
  calculateQuotationTotals,
  generateProposalFromBusiness,
  generatePricingIntelligence,
  calculateProposalMetrics,
  PricingIntelligenceReport,
} from '@/lib/engines/proposalEngine';
import {
  DEFAULT_BRANDING_CONFIG,
  PROPOSAL_TEMPLATES,
  STANDARD_TERMS_AND_CONDITIONS,
} from '@/lib/engines/proposalTemplatesData';

type ActiveTab = 'workspace' | 'quotation' | 'preview' | 'pipeline';

export function ProposalQuotationView() {
  const { activeProject, setActiveModule } = useProject();

  const [activeTab, setActiveTab] = useState<ActiveTab>('workspace');
  const [loading, setLoading] = useState<boolean>(true);

  // Core Data
  const [proposals, setProposals] = useState<BusinessProposal[]>([]);
  const [quotations, setQuotations] = useState<ProposalQuotation[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [services, setServices] = useState<WatechServiceItem[]>([]);
  const [branding, setBranding] = useState<BrandingConfiguration>(DEFAULT_BRANDING_CONFIG);

  // Active Proposal State
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [versions, setVersions] = useState<ProposalVersion[]>([]);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState<boolean>(false);
  const [isNewProposalModalOpen, setIsNewProposalModalOpen] = useState<boolean>(false);
  const [isLineItemModalOpen, setIsLineItemModalOpen] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

  // Form State for New Proposal
  const [newPropBusinessId, setNewPropBusinessId] = useState<string>('');
  const [newPropTemplate, setNewPropTemplate] = useState<ProposalTemplateType>('premium_business');
  const [newPropCurrency, setNewPropCurrency] = useState<ProposalCurrency>('USD');

  // Form State for Line Item Edit
  const [editingLineItem, setEditingLineItem] = useState<QuotationLineItem | null>(null);
  const [isEditingExistingItem, setIsEditingExistingItem] = useState<boolean>(false);

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      const projectId = activeProject?.id;
      const [allProposals, allQuotations, allBusinesses, allServices, brandConfig] =
        await Promise.all([
          repository.getProposals(projectId),
          repository.getQuotations(projectId),
          repository.getBusinesses(projectId),
          repository.getServices(),
          repository.getBrandingConfig(),
        ]);

      setProposals(allProposals);
      setQuotations(allQuotations);
      setBusinesses(allBusinesses);
      setServices(allServices);

      if (brandConfig) {
        setBranding(brandConfig);
      } else {
        await repository.saveBrandingConfig(DEFAULT_BRANDING_CONFIG);
        setBranding(DEFAULT_BRANDING_CONFIG);
      }

      if (allProposals.length > 0 && !selectedProposalId) {
        setSelectedProposalId(allProposals[0].id);
      }
    } catch (err) {
      console.error('Failed to load proposal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProject]);

  // Active Selected Proposal & Quotation
  const activeProposal = useMemo(() => {
    return proposals.find((p) => p.id === selectedProposalId) || proposals[0] || null;
  }, [proposals, selectedProposalId]);

  const activeQuotation = useMemo(() => {
    if (!activeProposal) return null;
    return (
      activeProposal.quotation ||
      quotations.find((q) => q.proposalId === activeProposal.id || q.id === activeProposal.quotationId) ||
      null
    );
  }, [activeProposal, quotations]);

  // Load Versions when activeProposal changes
  useEffect(() => {
    if (activeProposal) {
      repository.getProposalVersions(activeProposal.id).then((v) => setVersions(v));
    }
  }, [activeProposal?.id]);

  // Performance Metrics Summary
  const metrics: ProposalMetricsSummary = useMemo(() => {
    return calculateProposalMetrics(proposals, quotations);
  }, [proposals, quotations]);

  // Pricing Intelligence for Active Quotation
  const pricingIntelligence: PricingIntelligenceReport = useMemo(() => {
    if (!activeQuotation) {
      return {
        recommendedMin: null,
        recommendedSuggested: null,
        recommendedMax: null,
        currency: 'USD',
        complexityGrade: 'low',
        lineItemCount: 0,
        hasRecurring: false,
        notes: [],
        rationale: 'No quotation loaded',
      };
    }
    return generatePricingIntelligence(activeQuotation.lineItems, services, quotations);
  }, [activeQuotation, services, quotations]);

  // Save Proposal Updates
  const handleUpdateProposal = async (updated: BusinessProposal) => {
    setProposals((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    await repository.saveProposal(updated);
    if (updated.quotation) {
      await repository.saveQuotation(updated.quotation);
    }
  };

  // Human Approval Action
  const handleApproveProposal = async () => {
    if (!activeProposal) return;
    const now = new Date().toISOString();
    const updated: BusinessProposal = {
      ...activeProposal,
      humanApproved: true,
      humanApprovedAt: now,
      humanApprovedBy: branding.signatureName || 'Lead Commercial Architect',
      status: 'approved',
      updatedAt: now,
    };
    await handleUpdateProposal(updated);
  };

  // Revert / Change Status
  const handleChangeStatus = async (newStatus: ProposalStatus) => {
    if (!activeProposal) return;
    const now = new Date().toISOString();
    const updated: BusinessProposal = {
      ...activeProposal,
      status: newStatus,
      updatedAt: now,
      humanApproved: newStatus === 'approved' || newStatus === 'sent' || newStatus === 'accepted',
    };
    await handleUpdateProposal(updated);
  };

  // Create Snapshot Version
  const handleCreateVersionSnapshot = async (note: string = 'Manual Checkpoint') => {
    if (!activeProposal) return;
    const nextVer = (activeProposal.currentVersion || 1) + 1;
    const version: ProposalVersion = {
      id: `ver_${activeProposal.id}_${Date.now()}`,
      proposalId: activeProposal.id,
      versionNumber: nextVer,
      changedSections: [note],
      changedPrices: [],
      snapshotData: JSON.stringify(activeProposal),
      createdAt: new Date().toISOString(),
      createdBy: branding.signatureName,
    };
    await repository.saveProposalVersion(version);
    setVersions((prev) => [version, ...prev]);

    const updated = {
      ...activeProposal,
      currentVersion: nextVer,
      updatedAt: new Date().toISOString(),
    };
    await handleUpdateProposal(updated);
  };

  // Restore Snapshot Version
  const handleRestoreVersion = async (ver: ProposalVersion) => {
    try {
      const restored = JSON.parse(ver.snapshotData) as BusinessProposal;
      restored.updatedAt = new Date().toISOString();
      await handleUpdateProposal(restored);
      setIsVersionModalOpen(false);
    } catch (e) {
      console.error('Failed to restore snapshot:', e);
    }
  };

  // Create New Proposal Handler
  const handleCreateNewProposal = async () => {
    if (!newPropBusinessId) return;
    const business = businesses.find((b) => b.id === newPropBusinessId);
    if (!business) return;

    // Fetch audits, SEO, and recommendations for this business
    const [audit, localSeo, recommendations] = await Promise.all([
      repository.getAuditForBusiness(business.id),
      repository.getLocalSeoProfileForBusiness(business.id),
      repository.getRecommendationForBusiness(business.id),
    ]);

    const { proposal, quotation } = generateProposalFromBusiness({
      business,
      audit,
      localSeo,
      recommendation: recommendations,
      availableServices: services,
      templateType: newPropTemplate,
      currency: newPropCurrency,
    });

    await repository.saveQuotation(quotation);
    await repository.saveProposal(proposal);

    setProposals((prev) => [proposal, ...prev]);
    setQuotations((prev) => [quotation, ...prev]);
    setSelectedProposalId(proposal.id);
    setIsNewProposalModalOpen(false);
    setActiveTab('workspace');
  };

  // Quotation Line Items Manipulation
  const handleUpdateLineItems = async (items: QuotationLineItem[]) => {
    if (!activeProposal || !activeQuotation) return;
    const totals = calculateQuotationTotals(items, activeQuotation.currency);
    const updatedQuotation: ProposalQuotation = {
      ...activeQuotation,
      lineItems: totals.computedItems,
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      totalTax: totals.totalTax,
      totalAmount: totals.totalAmount,
      hasUnconfiguredPricing: totals.hasUnconfiguredPricing,
    };
    const updatedProposal: BusinessProposal = {
      ...activeProposal,
      quotation: updatedQuotation,
      updatedAt: new Date().toISOString(),
    };
    await handleUpdateProposal(updatedProposal);
  };

  const handleCurrencyChange = async (newCurrency: ProposalCurrency) => {
    if (!activeProposal || !activeQuotation) return;
    const updatedQuotation: ProposalQuotation = {
      ...activeQuotation,
      currency: newCurrency,
    };
    const updatedProposal: BusinessProposal = {
      ...activeProposal,
      quotation: updatedQuotation,
      updatedAt: new Date().toISOString(),
    };
    await handleUpdateProposal(updatedProposal);
  };

  const handleSaveLineItem = async () => {
    if (!editingLineItem || !activeQuotation) return;
    let newItems: QuotationLineItem[];
    if (isEditingExistingItem) {
      newItems = activeQuotation.lineItems.map((item) =>
        item.id === editingLineItem.id ? editingLineItem : item
      );
    } else {
      newItems = [...activeQuotation.lineItems, editingLineItem];
    }
    await handleUpdateLineItems(newItems);
    setIsLineItemModalOpen(false);
    setEditingLineItem(null);
  };

  const handleDeleteLineItem = async (itemId: string) => {
    if (!activeQuotation) return;
    const newItems = activeQuotation.lineItems.filter((item) => item.id !== itemId);
    await handleUpdateLineItems(newItems);
  };

  // Export Helpers
  const handlePrint = () => {
    window.print();
  };

  const handleExportHTML = () => {
    if (!activeProposal || !activeQuotation) return;
    const element = document.getElementById('printable-client-document');
    if (!element) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${activeProposal.proposalNumber} — ${activeProposal.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; background: #ffffff; padding: 40px; margin: 0; line-height: 1.6; }
    h1 { color: #0f172a; font-size: 26px; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-top: 0; }
    h2 { color: #1e3a8a; font-size: 20px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 24px; }
    h3 { color: #1e293b; font-size: 16px; margin-top: 18px; }
    p, li { font-size: 14px; color: #334155; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    th { background: #f1f5f9; text-align: left; padding: 10px; border: 1px solid #cbd5e1; font-weight: 600; color: #0f172a; }
    td { padding: 10px; border: 1px solid #cbd5e1; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: #e0e7ff; color: #3730a3; }
    .signature-box { margin-top: 40px; border-top: 1px dashed #94a3b8; padding-top: 20px; }
    @media print {
      body { padding: 0; }
      .page-break { page-break-after: always; break-after: page; }
    }
  </style>
</head>
<body>
  ${element.innerHTML}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeProposal.proposalNumber}_${activeProposal.cover.clientName.replace(/\s+/g, '_')}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (!activeProposal) return;
    const blob = new Blob([JSON.stringify(activeProposal, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeProposal.proposalNumber}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportMarkdown = () => {
    if (!activeProposal || !activeQuotation) return;
    const md = `# ${activeProposal.title}
**Proposal Number:** ${activeProposal.proposalNumber}
**Client:** ${activeProposal.cover.clientName}
**Date:** ${activeProposal.cover.date}
**Validity:** ${activeProposal.cover.validityPeriod}

---

## Executive Summary
${activeProposal.executiveSummary}

---

## Business Assessment
${activeProposal.businessAssessment.auditExcerpt}
${activeProposal.businessAssessment.seoExcerpt}

### Opportunities
${activeProposal.businessAssessment.opportunitiesIdentified.map((o) => `- ${o}`).join('\n')}

---

## Proposed Solution: ${activeProposal.recommendedSolution.packageTitle}
${activeProposal.recommendedSolution.servicesList.map((s) => `- ${s}`).join('\n')}

---

## Commercial Quotation (${activeQuotation.currency})
| Deliverable | Billing | Qty | Unit Price | Total |
|---|---|---|---|---|
${activeQuotation.lineItems
  .map(
    (i) =>
      `| ${i.serviceName} | ${i.billingType} | ${i.quantity} | ${formatCurrency(
        i.unitPrice,
        activeQuotation.currency
      )} | ${formatCurrency(i.subtotal, activeQuotation.currency)} |`
  )
  .join('\n')}

**Total Investment:** ${formatCurrency(activeQuotation.totalAmount, activeQuotation.currency)}

---

## Terms & Conditions
${activeProposal.termsAndConditions}
`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeProposal.proposalNumber}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopySummary = () => {
    if (!activeProposal || !activeQuotation) return;
    const summary = `${activeProposal.title}
Proposal ID: ${activeProposal.proposalNumber}
Total Value: ${formatCurrency(activeQuotation.totalAmount, activeQuotation.currency)}
Status: ${activeProposal.status.toUpperCase()}
Deliverables: ${activeQuotation.lineItems.map((i) => i.serviceName).join(', ')}`;
    navigator.clipboard.writeText(summary);
    setCopiedStatus('summary_copied');
    setTimeout(() => setCopiedStatus(null), 2500);
  };

  // Filtered Proposals for Sidebar / Switcher
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      const matchSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.proposalNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.cover.clientName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [proposals, searchQuery, statusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium">Loading Proposals & Quotation Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner / Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/30 text-blue-400">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Proposal, Quotation & Pricing Engine
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold uppercase">
                  Prompt 19
                </span>
                {activeProposal && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase border font-semibold ${
                      activeProposal.status === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : activeProposal.status === 'sent'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        : activeProposal.status === 'accepted'
                        ? 'bg-green-500/20 text-green-300 border-green-500/30'
                        : activeProposal.status === 'declined'
                        ? 'bg-red-500/20 text-red-400 border-red-500/30'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {activeProposal.status.replace('_', ' ')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                AI-assisted client proposals, multi-currency quotations, rate intelligence & printable documents.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsNewProposalModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Proposal
          </button>

          {activeProposal && (
            <>
              <button
                onClick={() => setIsVersionModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-50 hover:bg-surface-100 border border-border text-slate-200 text-xs font-medium transition-all"
              >
                <History className="w-3.5 h-3.5 text-blue-400" />
                v{activeProposal.currentVersion} ({versions.length} saves)
              </button>

              <button
                onClick={() => {
                  setActiveTab('preview');
                  setTimeout(() => handlePrint(), 300);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-50 hover:bg-surface-100 border border-border text-slate-200 text-xs font-medium transition-all"
              >
                <Printer className="w-3.5 h-3.5 text-slate-400" />
                Print / PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* 4 Primary Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('workspace')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'workspace'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Proposal Workspace & Editor
          </button>
          <button
            onClick={() => setActiveTab('quotation')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'quotation'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Quotation & Pricing Engine
            {activeQuotation && activeQuotation.hasUnconfiguredPricing && (
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'preview'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Client-Ready Document & Export
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'pipeline'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Pipeline & Performance KPIs
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-100 text-slate-300">
              {proposals.length}
            </span>
          </button>
        </div>

        {/* Currency Switcher */}
        {activeQuotation && (
          <div className="flex items-center gap-2 py-1">
            <span className="text-[11px] text-slate-400 font-medium">Currency:</span>
            <select
              value={activeQuotation.currency}
              onChange={(e) => handleCurrencyChange(e.target.value as ProposalCurrency)}
              className="bg-surface-50 border border-border text-xs text-slate-200 rounded px-2.5 py-1 focus:outline-none focus:border-blue-500 font-mono"
            >
              <option value="USD">USD ($)</option>
              <option value="PKR">PKR (Rs.)</option>
              <option value="AED">AED (AED)</option>
              <option value="GBP">GBP (£)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
        )}
      </div>

      {/* Human Approval Gate Alert Banner */}
      {activeProposal && !activeProposal.humanApproved && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wide">
                Human Approval Gate Active (Draft Mode)
              </h4>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Client-ready documents cannot be dispatched or presented without authorized sign-off. Review
                deliverables, verify rates, and approve when complete.
              </p>
            </div>
          </div>
          <button
            onClick={handleApproveProposal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all shrink-0"
          >
            <CheckCircle2 className="w-4 h-4" />
            Approve Proposal
          </button>
        </div>
      )}

      {/* TAB 1: WORKSPACE & LIVE SECTION EDITOR */}
      {activeTab === 'workspace' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Proposals List / Switcher */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-surface-50 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Proposals ({filteredProposals.length})
                </span>
                <button
                  onClick={() => setIsNewProposalModalOpen(true)}
                  className="p-1 rounded hover:bg-surface-100 text-blue-400"
                  title="Create Proposal"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Search & Filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search client, ID, title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-100 border border-border text-xs rounded-lg pl-8 pr-3 py-1.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Proposals List */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {filteredProposals.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    No proposals match your criteria.
                  </div>
                ) : (
                  filteredProposals.map((prop) => {
                    const isSelected = prop.id === activeProposal?.id;
                    const q = quotations.find((quote) => quote.proposalId === prop.id || quote.id === prop.quotationId);
                    return (
                      <button
                        key={prop.id}
                        onClick={() => setSelectedProposalId(prop.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-blue-600/10 border-blue-500/40 text-white shadow-sm'
                            : 'bg-surface-100/50 border-border text-slate-300 hover:bg-surface-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-mono text-slate-400 font-bold">
                            {prop.proposalNumber}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-semibold ${
                              prop.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : prop.status === 'sent'
                                ? 'bg-blue-500/20 text-blue-400'
                                : prop.status === 'accepted'
                                ? 'bg-green-500/20 text-green-300'
                                : prop.status === 'declined'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {prop.status}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-100 truncate mt-1">
                          {prop.cover.clientName}
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/50 text-[10px] text-slate-400 font-mono">
                          <span>{prop.cover.date}</span>
                          <span className="font-semibold text-slate-200">
                            {formatCurrency(q?.totalAmount, q?.currency || 'USD')}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right 3 Columns: Proposal Detail & Section Editor */}
          <div className="lg:col-span-3 space-y-6">
            {!activeProposal ? (
              <div className="p-12 text-center rounded-xl bg-surface-50 border border-border">
                <FileCheck2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-200">No Proposal Selected</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Select an existing proposal from the list on the left or create a new proposal from any
                  researched business.
                </p>
                <button
                  onClick={() => setIsNewProposalModalOpen(true)}
                  className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-all"
                >
                  Create Proposal
                </button>
              </div>
            ) : (
              <>
                {/* Header Card */}
                <div className="p-5 rounded-xl bg-surface-50 border border-border space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-white tracking-tight">
                          {activeProposal.title}
                        </h2>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Client: <strong className="text-slate-200">{activeProposal.cover.clientName}</strong> •
                        Issued: {activeProposal.cover.date} • Template: {activeProposal.templateType}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={activeProposal.status}
                        onChange={(e) => handleChangeStatus(e.target.value as ProposalStatus)}
                        className="bg-surface-100 border border-border text-xs text-slate-200 rounded-lg px-3 py-1.5 font-medium focus:outline-none focus:border-blue-500"
                      >
                        <option value="draft">Draft</option>
                        <option value="internal_review">Internal Review</option>
                        <option value="approved">Approved</option>
                        <option value="sent">Sent to Client</option>
                        <option value="accepted">Accepted / Won</option>
                        <option value="declined">Declined</option>
                        <option value="expired">Expired</option>
                      </select>

                      <button
                        onClick={() => handleCreateVersionSnapshot('Manual checkpoint snapshot')}
                        className="px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 border border-border text-slate-200 text-xs font-medium transition-all"
                      >
                        Save Version
                      </button>

                      {activeProposal.status === 'accepted' && (
                        <button
                          onClick={async () => {
                            const existing = await repository.getClients();
                            const alreadyClient = existing.find(c => c.businessId === activeProposal.businessId);
                            if (!alreadyClient) {
                              const biz = businesses.find(b => b.id === activeProposal.businessId);
                              if (biz) {
                                const { createClientFromWonDeal } = await import('@/lib/engines/clientProjectEngine');
                                const { client, onboarding } = createClientFromWonDeal(
                                  biz,
                                  activeProposal,
                                  activeQuotation || undefined
                                );
                                await repository.saveClient(client);
                                await repository.saveClientOnboarding(onboarding);
                              }
                            }
                            setActiveModule('client_projects');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition-all"
                        >
                          <Briefcase className="w-3.5 h-3.5" />
                          Launch Onboarding (P20)
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 1: Executive Summary */}
                <div className="p-5 rounded-xl bg-surface-50 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      Section 1: Executive Summary & Objective
                    </h3>
                  </div>
                  <textarea
                    rows={6}
                    value={activeProposal.executiveSummary}
                    onChange={(e) =>
                      handleUpdateProposal({
                        ...activeProposal,
                        executiveSummary: e.target.value,
                      })
                    }
                    className="w-full bg-surface-100 border border-border rounded-lg p-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Section 2: Business Assessment & Grounded Findings */}
                <div className="p-5 rounded-xl bg-surface-50 border border-border space-y-4">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Section 2: Business Assessment (Grounded Evidence)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Website & Technical Audit Findings
                      </label>
                      <textarea
                        rows={4}
                        value={activeProposal.businessAssessment.auditExcerpt}
                        onChange={(e) =>
                          handleUpdateProposal({
                            ...activeProposal,
                            businessAssessment: {
                              ...activeProposal.businessAssessment,
                              auditExcerpt: e.target.value,
                            },
                          })
                        }
                        className="w-full bg-surface-100 border border-border rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Local SEO & Reputation Audit Excerpt
                      </label>
                      <textarea
                        rows={4}
                        value={activeProposal.businessAssessment.seoExcerpt}
                        onChange={(e) =>
                          handleUpdateProposal({
                            ...activeProposal,
                            businessAssessment: {
                              ...activeProposal.businessAssessment,
                              seoExcerpt: e.target.value,
                            },
                          })
                        }
                        className="w-full bg-surface-100 border border-border rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Identified Growth Opportunities
                    </label>
                    <div className="space-y-2">
                      {activeProposal.businessAssessment.opportunitiesIdentified.map((opp, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={opp}
                            onChange={(e) => {
                              const updatedOpp = [
                                ...activeProposal.businessAssessment.opportunitiesIdentified,
                              ];
                              updatedOpp[idx] = e.target.value;
                              handleUpdateProposal({
                                ...activeProposal,
                                businessAssessment: {
                                  ...activeProposal.businessAssessment,
                                  opportunitiesIdentified: updatedOpp,
                                },
                              });
                            }}
                            className="flex-1 bg-surface-100 border border-border rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={() => {
                              const updatedOpp = activeProposal.businessAssessment.opportunitiesIdentified.filter(
                                (_, i) => i !== idx
                              );
                              handleUpdateProposal({
                                ...activeProposal,
                                businessAssessment: {
                                  ...activeProposal.businessAssessment,
                                  opportunitiesIdentified: updatedOpp,
                                },
                              });
                            }}
                            className="p-1.5 rounded hover:bg-surface-200 text-slate-400 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          handleUpdateProposal({
                            ...activeProposal,
                            businessAssessment: {
                              ...activeProposal.businessAssessment,
                              opportunitiesIdentified: [
                                ...activeProposal.businessAssessment.opportunitiesIdentified,
                                'New actionable commercial opportunity',
                              ],
                            },
                          });
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 mt-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Opportunity Point
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 3: Recommended Solution & Scope of Work */}
                <div className="p-5 rounded-xl bg-surface-50 border border-border space-y-4">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    Section 3: Recommended Solution & Scope of Work
                  </h3>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Package Title
                    </label>
                    <input
                      type="text"
                      value={activeProposal.recommendedSolution.packageTitle}
                      onChange={(e) =>
                        handleUpdateProposal({
                          ...activeProposal,
                          recommendedSolution: {
                            ...activeProposal.recommendedSolution,
                            packageTitle: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-surface-100 border border-border rounded-lg px-3 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Deliverables List
                    </label>
                    <div className="space-y-2">
                      {activeProposal.scopeOfWork.deliverables.map((del, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={del}
                            onChange={(e) => {
                              const updatedDels = [...activeProposal.scopeOfWork.deliverables];
                              updatedDels[idx] = e.target.value;
                              handleUpdateProposal({
                                ...activeProposal,
                                scopeOfWork: {
                                  ...activeProposal.scopeOfWork,
                                  deliverables: updatedDels,
                                },
                              });
                            }}
                            className="flex-1 bg-surface-100 border border-border rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={() => {
                              const updatedDels = activeProposal.scopeOfWork.deliverables.filter(
                                (_, i) => i !== idx
                              );
                              handleUpdateProposal({
                                ...activeProposal,
                                scopeOfWork: {
                                  ...activeProposal.scopeOfWork,
                                  deliverables: updatedDels,
                                },
                              });
                            }}
                            className="p-1.5 rounded hover:bg-surface-200 text-slate-400 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          handleUpdateProposal({
                            ...activeProposal,
                            scopeOfWork: {
                              ...activeProposal.scopeOfWork,
                              deliverables: [
                                ...activeProposal.scopeOfWork.deliverables,
                                'New milestone deliverable',
                              ],
                            },
                          });
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 mt-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Deliverable
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 4: Implementation Roadmap Phases */}
                <div className="p-5 rounded-xl bg-surface-50 border border-border space-y-4">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    Section 4: Implementation Roadmap ({activeProposal.timeline.duration})
                  </h3>

                  <div className="space-y-3">
                    {activeProposal.implementationPhases.map((phase, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-surface-100 border border-border grid grid-cols-1 md:grid-cols-4 gap-3 items-center"
                      >
                        <div>
                          <span className="text-[10px] text-blue-400 font-bold uppercase font-mono">
                            Phase {phase.phase}
                          </span>
                          <input
                            type="text"
                            value={phase.name}
                            onChange={(e) => {
                              const updated = [...activeProposal.implementationPhases];
                              updated[idx].name = e.target.value;
                              handleUpdateProposal({
                                ...activeProposal,
                                implementationPhases: updated,
                              });
                            }}
                            className="w-full bg-surface-50 border border-border rounded px-2 py-1 text-xs text-slate-200 mt-1"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-mono">
                            Duration
                          </span>
                          <input
                            type="text"
                            value={phase.duration}
                            onChange={(e) => {
                              const updated = [...activeProposal.implementationPhases];
                              updated[idx].duration = e.target.value;
                              handleUpdateProposal({
                                ...activeProposal,
                                implementationPhases: updated,
                              });
                            }}
                            className="w-full bg-surface-50 border border-border rounded px-2 py-1 text-xs text-slate-200 mt-1"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <span className="text-[10px] text-slate-400 uppercase font-mono">
                            Milestones
                          </span>
                          <input
                            type="text"
                            value={phase.milestones}
                            onChange={(e) => {
                              const updated = [...activeProposal.implementationPhases];
                              updated[idx].milestones = e.target.value;
                              handleUpdateProposal({
                                ...activeProposal,
                                implementationPhases: updated,
                              });
                            }}
                            className="w-full bg-surface-50 border border-border rounded px-2 py-1 text-xs text-slate-200 mt-1"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 5: Standard Terms & Conditions */}
                <div className="p-5 rounded-xl bg-surface-50 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      Section 5: Commercial Terms & Conditions
                    </h3>
                  </div>
                  <textarea
                    rows={8}
                    value={activeProposal.termsAndConditions}
                    onChange={(e) =>
                      handleUpdateProposal({
                        ...activeProposal,
                        termsAndConditions: e.target.value,
                      })
                    }
                    className="w-full bg-surface-100 border border-border rounded-lg p-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: QUOTATION & PRICING ENGINE */}
      {activeTab === 'quotation' && (
        <div className="space-y-6">
          {!activeQuotation ? (
            <div className="p-12 text-center rounded-xl bg-surface-50 border border-border">
              <DollarSign className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-200">No Active Quotation</h3>
              <p className="text-xs text-slate-400 mt-1">Select a proposal first to manage its quotation.</p>
            </div>
          ) : (
            <>
              {/* Unconfigured Pricing Alert Banner */}
              {activeQuotation.hasUnconfiguredPricing && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="text-xs text-amber-300">
                    <strong>Pricing Guardrail Active:</strong> One or more line items have unconfigured pricing.
                    Total quotation amounts will show as <em>&quot;Pricing not configured&quot;</em> until manual unit
                    rates are assigned.
                  </div>
                </div>
              )}

              {/* Quotation Header & Currency Controls */}
              <div className="p-5 rounded-xl bg-surface-50 border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-400">
                      {activeQuotation.quotationNumber}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-xs text-slate-300">
                      For: <strong>{activeProposal?.cover.clientName}</strong>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Issue Date: {activeQuotation.issueDate} • Valid Until: {activeQuotation.expiryDate}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setEditingLineItem({
                        id: `item_${Date.now()}`,
                        serviceName: 'Custom Solution Deliverable',
                        description: 'Custom tailored engineering deliverable',
                        category: 'website_digital_experience',
                        billingType: 'one_time',
                        quantity: 1,
                        unitPrice: null,
                        discountPercent: 0,
                        taxPercent: 0,
                        subtotal: null,
                      });
                      setIsEditingExistingItem(false);
                      setIsLineItemModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Line Item
                  </button>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="rounded-xl bg-surface-50 border border-border overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Itemized Deliverables & Service Schedule ({activeQuotation.lineItems.length})
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    Currency: <strong className="text-white">{activeQuotation.currency}</strong>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border bg-surface-100/60 text-slate-400 uppercase font-mono text-[10px]">
                        <th className="p-3">Deliverable / Service</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Billing</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Unit Price</th>
                        <th className="p-3 text-right">Disc %</th>
                        <th className="p-3 text-right">Tax %</th>
                        <th className="p-3 text-right">Line Total</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {activeQuotation.lineItems.map((item) => (
                        <tr key={item.id} className="hover:bg-surface-100/40 transition-colors">
                          <td className="p-3">
                            <div className="font-semibold text-slate-100">{item.serviceName}</div>
                            <div className="text-[11px] text-slate-400 truncate max-w-sm mt-0.5">
                              {item.description}
                            </div>
                          </td>
                          <td className="p-3 font-mono text-[10px]">
                            <span className="px-2 py-0.5 rounded bg-surface-100 text-blue-400 border border-blue-500/20">
                              {item.category.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-300">
                            {item.billingType === 'monthly' ? (
                              <span className="text-indigo-400 font-semibold">Monthly Retainer</span>
                            ) : (
                              <span>One-Time</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono text-slate-200">{item.quantity}</td>
                          <td className="p-3 text-right font-mono">
                            {item.unitPrice !== null ? (
                              <span className="text-slate-200">
                                {formatCurrency(item.unitPrice, activeQuotation.currency)}
                              </span>
                            ) : (
                              <span className="text-amber-400 italic">Not configured</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-400">
                            {item.discountPercent > 0 ? `${item.discountPercent}%` : '—'}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-400">
                            {item.taxPercent > 0 ? `${item.taxPercent}%` : '—'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold">
                            {item.subtotal !== null ? (
                              <span className="text-emerald-400">
                                {formatCurrency(item.subtotal, activeQuotation.currency)}
                              </span>
                            ) : (
                              <span className="text-amber-400 italic">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingLineItem(item);
                                  setIsEditingExistingItem(true);
                                  setIsLineItemModalOpen(true);
                                }}
                                className="p-1 rounded hover:bg-surface-200 text-slate-400 hover:text-blue-400"
                                title="Edit Item"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteLineItem(item.id)}
                                className="p-1 rounded hover:bg-surface-200 text-slate-400 hover:text-red-400"
                                title="Delete Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quotation Totals & Pricing Intelligence Assistant */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Financial Summary */}
                <div className="p-5 rounded-xl bg-surface-50 border border-border space-y-4">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                    Commercial Summary & Payment Structure
                  </h4>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Subtotal Gross:</span>
                      <span className="font-mono text-slate-200">
                        {formatCurrency(activeQuotation.subtotal, activeQuotation.currency)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span>Total Applied Discounts:</span>
                      <span className="font-mono text-emerald-400">
                        {activeQuotation.totalDiscount > 0
                          ? `-${formatCurrency(activeQuotation.totalDiscount, activeQuotation.currency)}`
                          : '—'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span>Total Estimated Taxes:</span>
                      <span className="font-mono text-slate-300">
                        {activeQuotation.totalTax > 0
                          ? formatCurrency(activeQuotation.totalTax, activeQuotation.currency)
                          : '—'}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between text-sm font-bold">
                      <span className="text-white">Total Project Investment:</span>
                      <span
                        className={`font-mono text-lg ${
                          activeQuotation.totalAmount !== null ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {formatCurrency(activeQuotation.totalAmount, activeQuotation.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border space-y-2">
                    <label className="text-[11px] font-semibold text-slate-400 block">
                      Agreed Payment Terms Schedule
                    </label>
                    <textarea
                      rows={2}
                      value={activeQuotation.paymentTerms}
                      onChange={(e) => {
                        const updatedQ = {
                          ...activeQuotation,
                          paymentTerms: e.target.value,
                        };
                        handleUpdateProposal({
                          ...activeProposal,
                          quotation: updatedQ,
                        });
                      }}
                      className="w-full bg-surface-100 border border-border rounded-lg p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Right: Pricing Intelligence Assistant */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-surface-50 to-blue-950/20 border border-blue-500/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      Pricing Intelligence Assistant
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase font-semibold">
                      Complexity: {pricingIntelligence.complexityGrade}
                    </span>
                  </div>

                  {pricingIntelligence.recommendedSuggested !== null ? (
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-2.5 rounded-lg bg-surface-100/60 border border-border">
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">
                          Floor Rate (Min)
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-200 mt-1 block">
                          {formatCurrency(
                            pricingIntelligence.recommendedMin,
                            activeQuotation.currency
                          )}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-blue-600/10 border border-blue-500/30">
                        <span className="text-[10px] text-blue-400 uppercase font-mono block font-bold">
                          Recommended
                        </span>
                        <span className="text-xs font-mono font-bold text-blue-300 mt-1 block">
                          {formatCurrency(
                            pricingIntelligence.recommendedSuggested,
                            activeQuotation.currency
                          )}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-surface-100/60 border border-border">
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">
                          Premium (Max)
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-200 mt-1 block">
                          {formatCurrency(
                            pricingIntelligence.recommendedMax,
                            activeQuotation.currency
                          )}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                      Pricing range calculation deferred: Configure line item unit prices to compute
                      complexity corridor.
                    </div>
                  )}

                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {pricingIntelligence.rationale}
                  </p>

                  <div className="space-y-1">
                    {pricingIntelligence.notes.map((note, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <ChevronRight className="w-3 h-3 text-blue-400 shrink-0" />
                        <span>{note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: CLIENT-READY PRINT PREVIEW & EXPORT */}
      {activeTab === 'preview' && (
        <div className="space-y-6">
          {!activeProposal || !activeQuotation ? (
            <div className="p-12 text-center rounded-xl bg-surface-50 border border-border">
              <Eye className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-200">No Proposal Ready to Preview</h3>
              <p className="text-xs text-slate-400 mt-1">Select a proposal first.</p>
            </div>
          ) : (
            <>
              {/* Export Toolbar */}
              <div className="p-4 rounded-xl bg-surface-50 border border-border flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-200">Document Actions:</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-100 text-slate-400 border border-border">
                    Vector A4 Printable Layout
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print / Save PDF
                  </button>

                  <button
                    onClick={handleExportHTML}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 border border-border text-slate-200 text-xs font-medium transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    Export HTML
                  </button>

                  <button
                    onClick={handleExportMarkdown}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 border border-border text-slate-200 text-xs font-medium transition-all"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Export MD
                  </button>

                  <button
                    onClick={handleExportJSON}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 border border-border text-slate-200 text-xs font-medium transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    Export JSON
                  </button>

                  <button
                    onClick={handleCopySummary}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 border border-border text-slate-200 text-xs font-medium transition-all"
                  >
                    {copiedStatus === 'summary_copied' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    {copiedStatus === 'summary_copied' ? 'Copied!' : 'Copy Summary'}
                  </button>
                </div>
              </div>

              {/* Printable Document Container */}
              <div className="bg-slate-900/60 p-4 sm:p-8 rounded-xl border border-border flex justify-center overflow-x-auto">
                <div
                  id="printable-client-document"
                  className="bg-white text-slate-900 w-full max-w-[820px] p-8 sm:p-14 shadow-2xl rounded-sm font-sans text-xs leading-relaxed"
                  style={{ minHeight: '1100px' }}
                >
                  {/* Document Header & Agency Branding */}
                  <div className="flex items-start justify-between border-b-2 border-blue-600 pb-6 mb-8">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-slate-950 uppercase">
                        {branding.companyName}
                      </h2>
                      <p className="text-[11px] text-slate-600 mt-0.5">{branding.footerText}</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {branding.address} • {branding.phone} • {branding.contactEmail}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-mono text-[11px] font-bold border border-blue-200">
                        {activeProposal.proposalNumber}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1 font-mono">
                        Issue Date: {activeProposal.cover.date}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Validity: {activeProposal.cover.validityPeriod}
                      </p>
                    </div>
                  </div>

                  {/* Recipient & Subject Box */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-8 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        PREPARED EXCLUSIVELY FOR
                      </span>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">
                        {activeProposal.cover.clientName}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Attn: {activeProposal.cover.clientContact || 'Executive Leadership'}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        COMMERCIAL FOCUS
                      </span>
                      <div className="text-xs font-semibold text-slate-800 mt-0.5">
                        {activeProposal.recommendedSolution.packageTitle}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Template: {activeProposal.templateType.replace('_', ' ').toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Section 1: Executive Summary */}
                  <div className="mb-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-blue-900 border-b border-slate-200 pb-1 mb-3">
                      1. Executive Strategic Summary
                    </h3>
                    <div className="text-slate-700 whitespace-pre-line text-[11px] leading-relaxed">
                      {activeProposal.executiveSummary}
                    </div>
                  </div>

                  {/* Section 2: Grounded Technical Assessment */}
                  <div className="mb-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-blue-900 border-b border-slate-200 pb-1 mb-3">
                      2. Verified Business Assessment Findings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div className="p-3 rounded bg-slate-50 border border-slate-200">
                        <span className="text-[10px] font-bold uppercase text-slate-600">
                          Digital & Performance Audit
                        </span>
                        <p className="text-[11px] text-slate-700 mt-1">
                          {activeProposal.businessAssessment.auditExcerpt}
                        </p>
                      </div>
                      <div className="p-3 rounded bg-slate-50 border border-slate-200">
                        <span className="text-[10px] font-bold uppercase text-slate-600">
                          Local Search & Authority Check
                        </span>
                        <p className="text-[11px] text-slate-700 mt-1">
                          {activeProposal.businessAssessment.seoExcerpt}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-600">
                        Identified Opportunities:
                      </span>
                      {activeProposal.businessAssessment.opportunitiesIdentified.map((opp, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                          <span>{opp}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Page Break for Printable formatting */}
                  <div className="page-break my-6" style={{ breakAfter: 'page' }} />

                  {/* Section 3: Detailed Scope of Work */}
                  <div className="mb-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-blue-900 border-b border-slate-200 pb-1 mb-3">
                      3. Scope of Work & Deliverables
                    </h3>
                    <div className="space-y-2 mb-4">
                      {activeProposal.scopeOfWork.deliverables.map((del, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span>{del}</span>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 rounded bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-600">
                        Acceptance Criteria:
                      </span>
                      <ul className="list-disc list-inside text-[11px] text-slate-700 mt-1 space-y-0.5">
                        {activeProposal.scopeOfWork.acceptanceCriteria.map((crit, idx) => (
                          <li key={idx}>{crit}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Section 4: Implementation Roadmap Phases */}
                  <div className="mb-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-blue-900 border-b border-slate-200 pb-1 mb-3">
                      4. Phased Implementation Roadmap ({activeProposal.timeline.duration})
                    </h3>
                    <table className="w-full text-left border-collapse text-[11px] mb-2">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-bold border border-slate-300">
                          <th className="p-2 border border-slate-300">Phase</th>
                          <th className="p-2 border border-slate-300">Milestone Deliverable</th>
                          <th className="p-2 border border-slate-300">Estimated Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeProposal.implementationPhases.map((phase) => (
                          <tr key={phase.phase} className="border border-slate-300">
                            <td className="p-2 font-bold font-mono text-blue-900">
                              Phase {phase.phase}: {phase.name}
                            </td>
                            <td className="p-2 text-slate-700">{phase.milestones}</td>
                            <td className="p-2 font-mono text-slate-600">{phase.duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Section 5: Commercial Quotation & Schedule */}
                  <div className="mb-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-blue-900 border-b border-slate-200 pb-1 mb-3">
                      5. Investment Quotation & Payment Schedule
                    </h3>
                    <table className="w-full text-left border-collapse text-[11px] mb-4">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-bold border border-slate-300">
                          <th className="p-2 border border-slate-300">Deliverable / Service</th>
                          <th className="p-2 border border-slate-300">Model</th>
                          <th className="p-2 text-center border border-slate-300">Qty</th>
                          <th className="p-2 text-right border border-slate-300">Unit Rate</th>
                          <th className="p-2 text-right border border-slate-300">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeQuotation.lineItems.map((item) => (
                          <tr key={item.id} className="border border-slate-300">
                            <td className="p-2">
                              <span className="font-semibold text-slate-900">{item.serviceName}</span>
                              <div className="text-[10px] text-slate-500">{item.description}</div>
                            </td>
                            <td className="p-2 font-mono text-[10px] text-slate-600">
                              {item.billingType === 'monthly' ? 'Monthly' : 'One-Time'}
                            </td>
                            <td className="p-2 text-center font-mono">{item.quantity}</td>
                            <td className="p-2 text-right font-mono">
                              {formatCurrency(item.unitPrice, activeQuotation.currency)}
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-slate-950">
                              {formatCurrency(item.subtotal, activeQuotation.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-400 bg-slate-50 font-bold">
                          <td colSpan={4} className="p-2.5 text-right uppercase text-slate-700">
                            Total Investment:
                          </td>
                          <td className="p-2.5 text-right font-mono text-sm text-blue-950">
                            {formatCurrency(activeQuotation.totalAmount, activeQuotation.currency)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    <div className="p-3 rounded bg-blue-50/50 border border-blue-200 text-[10px] text-slate-700">
                      <strong>Payment Terms:</strong> {activeQuotation.paymentTerms}
                    </div>
                  </div>

                  {/* Section 6: Terms & Conditions */}
                  <div className="mb-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-blue-900 border-b border-slate-200 pb-1 mb-3">
                      6. Commercial Terms & Conditions
                    </h3>
                    <div className="text-slate-600 whitespace-pre-line text-[10px] leading-relaxed max-h-48 overflow-y-auto pr-1">
                      {activeProposal.termsAndConditions}
                    </div>
                  </div>

                  {/* Sign-off / Acceptance Block */}
                  <div className="border-t-2 border-slate-300 pt-6 mt-8">
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500">
                          AUTHORIZED AGENCY ARCHITECT
                        </span>
                        <div className="mt-4 border-b border-slate-400 pb-1">
                          <span className="text-xs font-semibold text-slate-800">
                            {branding.signatureName}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{branding.signatureTitle}</p>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500">
                          ACCEPTED & AUTHORIZED BY CLIENT
                        </span>
                        <div className="mt-4 border-b border-slate-400 pb-1">
                          <span className="text-xs text-slate-400 italic">Signature / Digital Acceptance</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Authorized Signatory for {activeProposal.cover.clientName}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 4: PROPOSAL PIPELINE & PERFORMANCE KPIS */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl bg-surface-50 border border-border">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">
                Total Proposals
              </span>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {metrics.totalProposals}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                {metrics.draftCount} drafts in review
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface-50 border border-border">
              <span className="text-[10px] font-mono text-blue-400 uppercase font-semibold block">
                Quoted Pipeline Value
              </span>
              <div className="text-xl font-bold font-mono text-blue-400 mt-1">
                {formatCurrency(metrics.totalQuotedValue, 'USD')}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Across all active quotes
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface-50 border border-border">
              <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold block">
                Accepted Revenue
              </span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {formatCurrency(metrics.acceptedValue, 'USD')}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                {metrics.acceptedCount} closed won deals
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface-50 border border-border">
              <span className="text-[10px] font-mono text-indigo-400 uppercase font-semibold block">
                Win Rate %
              </span>
              <div className="text-xl font-bold font-mono text-indigo-400 mt-1">
                {metrics.acceptanceRatePercent}%
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Accepted vs decided
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface-50 border border-border">
              <span className="text-[10px] font-mono text-purple-400 uppercase font-semibold block">
                Avg Proposal Size
              </span>
              <div className="text-xl font-bold font-mono text-purple-400 mt-1">
                {formatCurrency(metrics.averageProposalValue, 'USD')}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Mean quotation value
              </span>
            </div>
          </div>

          {/* Kanban Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {(
              [
                { id: 'draft', label: 'Drafts', color: 'border-slate-500/30' },
                { id: 'internal_review', label: 'Internal Review', color: 'border-amber-500/30' },
                { id: 'approved', label: 'Approved', color: 'border-emerald-500/30' },
                { id: 'sent', label: 'Sent to Client', color: 'border-blue-500/30' },
                { id: 'accepted', label: 'Accepted / Won', color: 'border-green-500/30' },
                { id: 'declined', label: 'Declined', color: 'border-red-500/30' },
              ] as const
            ).map((col) => {
              const colProposals = proposals.filter((p) => p.status === col.id);
              return (
                <div key={col.id} className="space-y-3">
                  <div className={`p-2.5 rounded-lg bg-surface-50 border ${col.color} flex items-center justify-between`}>
                    <span className="text-xs font-bold text-slate-200">{col.label}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-100 text-slate-300">
                      {colProposals.length}
                    </span>
                  </div>

                  <div className="space-y-2 min-h-[300px]">
                    {colProposals.map((prop) => {
                      const q = quotations.find((quote) => quote.proposalId === prop.id || quote.id === prop.quotationId);
                      return (
                        <div
                          key={prop.id}
                          className="p-3 rounded-lg bg-surface-50 border border-border hover:border-slate-700 transition-all space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono text-slate-400 font-bold">
                              {prop.proposalNumber}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-200">
                              {formatCurrency(q?.totalAmount, q?.currency || 'USD')}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-white truncate">
                            {prop.cover.clientName}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {prop.recommendedSolution.packageTitle}
                          </div>
                          <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                            <button
                              onClick={() => {
                                setSelectedProposalId(prop.id);
                                setActiveTab('workspace');
                              }}
                              className="text-[10px] text-blue-400 hover:text-blue-300 font-medium"
                            >
                              Edit Scope →
                            </button>
                            <button
                              onClick={() => {
                                setSelectedProposalId(prop.id);
                                setActiveTab('preview');
                              }}
                              className="text-[10px] text-slate-400 hover:text-white"
                            >
                              Preview
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: New Proposal Creation */}
      {isNewProposalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-border rounded-xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Create New Commercial Proposal
                </h3>
              </div>
              <button
                onClick={() => setIsNewProposalModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Select Researched Business *
                </label>
                <select
                  value={newPropBusinessId}
                  onChange={(e) => setNewPropBusinessId(e.target.value)}
                  className="w-full bg-surface-100 border border-border text-xs text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Choose Business --</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.officialName} ({b.city || 'Regional'}, {b.businessModel || 'Commercial'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Proposal Template Structure *
                </label>
                <select
                  value={newPropTemplate}
                  onChange={(e) => setNewPropTemplate(e.target.value as ProposalTemplateType)}
                  className="w-full bg-surface-100 border border-border text-xs text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-500"
                >
                  <option value="premium_business">
                    Executive 360 Growth System (Comprehensive Overhaul)
                  </option>
                  <option value="website_digital">
                    High-Performance Web Platform & UX Redesign
                  </option>
                  <option value="marketing_leadgen">
                    Local Search Dominance & Inbound Lead Engine
                  </option>
                  <option value="automation_software">
                    Workflow Automation & CRM Pipeline Integration
                  </option>
                  <option value="compact_quotation">
                    Compact Quotation & Statement of Work
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Contract Currency *
                </label>
                <select
                  value={newPropCurrency}
                  onChange={(e) => setNewPropCurrency(e.target.value as ProposalCurrency)}
                  className="w-full bg-surface-100 border border-border text-xs text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 font-mono"
                >
                  <option value="USD">USD ($) — United States Dollar</option>
                  <option value="PKR">PKR (Rs.) — Pakistani Rupee</option>
                  <option value="AED">AED (AED) — UAE Dirham</option>
                  <option value="GBP">GBP (£) — British Pound</option>
                  <option value="EUR">EUR (€) — Euro</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                onClick={() => setIsNewProposalModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-surface-100 hover:bg-surface-200 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                disabled={!newPropBusinessId}
                onClick={handleCreateNewProposal}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all"
              >
                Synthesize Proposal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Version History */}
      {isVersionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-border rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Proposal Version History
                </h3>
              </div>
              <button
                onClick={() => setIsVersionModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {versions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No historical version snapshots created yet.
                </div>
              ) : (
                versions.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-lg bg-surface-50 border border-border flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-blue-400">
                          v{v.versionNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(v.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        {v.changedSections.join(', ')}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRestoreVersion(v)}
                      className="px-3 py-1 rounded bg-surface-100 hover:bg-surface-200 border border-border text-slate-200 text-xs font-medium"
                    >
                      Rollback
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-border">
              <button
                onClick={() => setIsVersionModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-surface-100 hover:bg-surface-200 text-slate-300 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Line Item Add / Edit */}
      {isLineItemModalOpen && editingLineItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-border rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {isEditingExistingItem ? 'Edit Line Item' : 'Add Quotation Line Item'}
                </h3>
              </div>
              <button
                onClick={() => setIsLineItemModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Deliverable / Service Name *
                </label>
                <input
                  type="text"
                  value={editingLineItem.serviceName}
                  onChange={(e) =>
                    setEditingLineItem({ ...editingLineItem, serviceName: e.target.value })
                  }
                  className="w-full bg-surface-100 border border-border text-xs text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Scope Description
                </label>
                <textarea
                  rows={2}
                  value={editingLineItem.description}
                  onChange={(e) =>
                    setEditingLineItem({ ...editingLineItem, description: e.target.value })
                  }
                  className="w-full bg-surface-100 border border-border text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Category
                  </label>
                  <select
                    value={editingLineItem.category}
                    onChange={(e) =>
                      setEditingLineItem({
                        ...editingLineItem,
                        category: e.target.value as ServiceCatalogCategory,
                      })
                    }
                    className="w-full bg-surface-100 border border-border text-xs text-slate-200 rounded-lg p-2"
                  >
                    <option value="website_digital_experience">Website & Digital Experience</option>
                    <option value="marketing_customer_acquisition">Marketing & Customer Acquisition</option>
                    <option value="search_visibility">Search Visibility & Local SEO</option>
                    <option value="creative_content">Creative & Content</option>
                    <option value="software_business_automation">Software & Business Automation</option>
                    <option value="business_growth_consulting">Business Growth Consulting</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Billing Structure
                  </label>
                  <select
                    value={editingLineItem.billingType}
                    onChange={(e) =>
                      setEditingLineItem({
                        ...editingLineItem,
                        billingType: e.target.value as any,
                      })
                    }
                    className="w-full bg-surface-100 border border-border text-xs text-slate-200 rounded-lg p-2"
                  >
                    <option value="one_time">One-Time Project</option>
                    <option value="monthly">Monthly Retainer</option>
                    <option value="hourly">Hourly Rate</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={editingLineItem.quantity}
                    onChange={(e) =>
                      setEditingLineItem({
                        ...editingLineItem,
                        quantity: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="w-full bg-surface-100 border border-border text-xs text-slate-200 rounded-lg p-2 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Unit Price ({activeQuotation?.currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Rate"
                    value={editingLineItem.unitPrice !== null ? editingLineItem.unitPrice : ''}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setEditingLineItem({
                        ...editingLineItem,
                        unitPrice: val === '' ? null : parseFloat(val),
                      });
                    }}
                    className="w-full bg-surface-100 border border-border text-xs text-slate-200 rounded-lg p-2 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Discount %
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editingLineItem.discountPercent}
                    onChange={(e) =>
                      setEditingLineItem({
                        ...editingLineItem,
                        discountPercent: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)),
                      })
                    }
                    className="w-full bg-surface-100 border border-border text-xs text-slate-200 rounded-lg p-2 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                onClick={() => setIsLineItemModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-surface-100 hover:bg-surface-200 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLineItem}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all"
              >
                Save Line Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
