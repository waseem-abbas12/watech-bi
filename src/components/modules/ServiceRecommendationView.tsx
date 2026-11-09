'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  PackageCheck,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Info,
  DollarSign,
  Clock,
  ChevronRight,
  Send,
  Sliders,
  RefreshCw,
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  Target,
  Zap,
  FileCheck2,
  Copy,
  Check,
  Download,
  Building2,
  Calendar,
  Lock,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { repository } from '@/lib/db/repository';
import type {
  Business,
  WebsiteAudit,
  LocalSeoProfile,
  Opportunity,
  ContentItem,
  BuyerSignal,
  SalesReadinessRecord,
  WatechServiceItem,
  WatechServicePackage,
  BusinessServiceRecommendation,
  ServiceMatchResult,
  RecommendedTier,
  ServiceCatalogCategory,
  PricingModel,
  ServiceComplexity,
} from '@/types';
import { DEFAULT_WATECH_SERVICES, DEFAULT_WATECH_PACKAGES } from '@/lib/engines/serviceCatalogData';
import { generateBusinessRecommendation, buildPricingSummary } from '@/lib/engines/serviceMatchingEngine';
import { detectBuyerSignals, calculateSalesReadiness } from '@/lib/engines/salesIntelligenceEngine';

type ActiveTab = 'recommendations' | 'builder' | 'catalog_admin' | 'sales_intelligence';

const CATEGORY_LABELS: Record<ServiceCatalogCategory, { label: string; badge: string }> = {
  website_digital_experience: { label: 'Website & Digital Experience', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  marketing_customer_acquisition: { label: 'Marketing & Customer Acquisition', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  search_visibility: { label: 'Search & Visibility (SEO)', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  creative_content: { label: 'Creative & Content', badge: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  software_business_automation: { label: 'Software & Business Automation', badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  business_growth_consulting: { label: 'Business Growth Consulting', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
};

export function ServiceRecommendationView() {
  const { activeProject } = useProject();

  // Tab State
  const [activeTab, setActiveTab] = useState<ActiveTab>('recommendations');
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Core Data
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [services, setServices] = useState<WatechServiceItem[]>([]);
  const [packages, setPackages] = useState<WatechServicePackage[]>([]);
  const [recommendations, setRecommendations] = useState<Record<string, BusinessServiceRecommendation>>({});
  const [buyerSignals, setBuyerSignals] = useState<Record<string, BuyerSignal[]>>({});
  const [salesRecords, setSalesRecords] = useState<Record<string, SalesReadinessRecord>>({});

  // Active Business Context
  const [activeAudit, setActiveAudit] = useState<WebsiteAudit | undefined>();
  const [activeLocalSeo, setActiveLocalSeo] = useState<LocalSeoProfile | undefined>();
  const [activeOpportunities, setActiveOpportunities] = useState<Opportunity[]>([]);

  // Catalog Admin Modal / Drawer
  const [isEditingService, setIsEditingService] = useState(false);
  const [editingServiceData, setEditingServiceData] = useState<Partial<WatechServiceItem>>({});
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<string>('all');

  // Package Builder Custom Composition
  const [builderName, setBuilderName] = useState('Custom Client Solution Package');
  const [builderTargetType, setBuilderTargetType] = useState('Commercial & Residential HVAC');
  const [builderSelectedServices, setBuilderSelectedServices] = useState<string[]>([]);
  const [builderPricingModel, setBuilderPricingModel] = useState<PricingModel>('pricing_not_configured');
  const [builderSetupPrice, setBuilderSetupPrice] = useState<number | undefined>(undefined);
  const [builderRecurringPrice, setBuilderRecurringPrice] = useState<number | undefined>(undefined);

  // Load Data
  const loadWorkspaceData = async () => {
    setIsLoading(true);
    try {
      const bizList = await repository.getBusinesses(activeProject?.id);
      setBusinesses(bizList);

      // Load or Initialize Catalog
      let catServices = await repository.getServices();
      if (catServices.length === 0) {
        await repository.saveServices(DEFAULT_WATECH_SERVICES);
        catServices = DEFAULT_WATECH_SERVICES;
      }
      setServices(catServices);

      let catPackages = await repository.getPackages();
      if (catPackages.length === 0) {
        await repository.savePackages(DEFAULT_WATECH_PACKAGES);
        catPackages = DEFAULT_WATECH_PACKAGES;
      }
      setPackages(catPackages);

      // Initialize selected business
      const firstId = bizList[0]?.id || '';
      setSelectedBusinessId(prev => prev || firstId);

      // Load existing recommendations & signals
      const recList = await repository.getRecommendations(activeProject?.id);
      const recMap: Record<string, BusinessServiceRecommendation> = {};
      recList.forEach(r => { recMap[r.businessId] = r; });
      setRecommendations(recMap);

      const sigList = await repository.getBuyerSignals(undefined, activeProject?.id);
      const sigMap: Record<string, BuyerSignal[]> = {};
      sigList.forEach(s => {
        if (!sigMap[s.businessId]) sigMap[s.businessId] = [];
        sigMap[s.businessId].push(s);
      });
      setBuyerSignals(sigMap);

      const salesList = await repository.getSalesReadinessRecords(activeProject?.id);
      const salesMap: Record<string, SalesReadinessRecord> = {};
      salesList.forEach(sr => { salesMap[sr.businessId] = sr; });
      setSalesRecords(salesMap);

    } catch (err) {
      console.error('Error loading service recommendation data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaceData();
  }, [activeProject?.id]);

  // Load active business details & evaluate recommendations
  useEffect(() => {
    if (!selectedBusinessId) return;

    const evaluateCurrent = async () => {
      const biz = businesses.find(b => b.id === selectedBusinessId);
      if (!biz) return;

      const [audit, localSeo, opps, content, contacts] = await Promise.all([
        repository.getAuditForBusiness(biz.id),
        repository.getLocalSeoProfileForBusiness(biz.id),
        repository.getOpportunities(biz.id),
        repository.getContentItems(biz.id),
        repository.getContacts(biz.id),
      ]);

      setActiveAudit(audit);
      setActiveLocalSeo(localSeo);
      setActiveOpportunities(opps);

      // Detect Signals if not exists
      let curSignals = buyerSignals[biz.id];
      if (!curSignals || curSignals.length === 0) {
        curSignals = detectBuyerSignals(biz, audit, localSeo, opps, [], contacts);
        await repository.saveBuyerSignals(curSignals);
        setBuyerSignals(prev => ({ ...prev, [biz.id]: curSignals }));
      }

      // Calculate Sales Readiness if not exists
      let curSales = salesRecords[biz.id];
      if (!curSales) {
        curSales = calculateSalesReadiness(biz, curSignals, audit, localSeo, contacts, opps);
        await repository.saveSalesReadinessRecord(curSales);
        setSalesRecords(prev => ({ ...prev, [biz.id]: curSales }));
      }

      // Generate recommendation if not exists
      let curRec = recommendations[biz.id];
      if (!curRec) {
        curRec = generateBusinessRecommendation(biz, audit, localSeo, opps, content, curSignals, services, packages);
        await repository.saveRecommendation(curRec);
        setRecommendations(prev => ({ ...prev, [biz.id]: curRec }));
      }
    };

    evaluateCurrent();
  }, [selectedBusinessId, businesses, services, packages]);

  const activeBusiness = useMemo(() => {
    return businesses.find(b => b.id === selectedBusinessId);
  }, [businesses, selectedBusinessId]);

  const activeRecommendation = useMemo(() => {
    return selectedBusinessId ? recommendations[selectedBusinessId] : undefined;
  }, [recommendations, selectedBusinessId]);

  const activeSalesRecord = useMemo(() => {
    return selectedBusinessId ? salesRecords[selectedBusinessId] : undefined;
  }, [salesRecords, selectedBusinessId]);

  const activeSignalsList = useMemo(() => {
    return selectedBusinessId ? (buyerSignals[selectedBusinessId] || []) : [];
  }, [buyerSignals, selectedBusinessId]);

  // Push Recommendation to CRM
  const handlePushToCrm = async () => {
    if (!activeBusiness || !activeRecommendation) return;

    const updatedRec: BusinessServiceRecommendation = {
      ...activeRecommendation,
      status: 'approved',
      pushedToCrm: true,
      pushedToCrmAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await repository.saveRecommendation(updatedRec);
    setRecommendations(prev => ({ ...prev, [activeBusiness.id]: updatedRec }));

    // Also update Business status to qualified or contact_ready if it's discovered
    if (activeBusiness.status === 'discovered' || activeBusiness.status === 'audited') {
      const updatedBiz: Business = {
        ...activeBusiness,
        status: 'qualified',
        pricingNotes: `Recommended Package: ${activeRecommendation.recommendedSolution.title}. Est: ${activeRecommendation.recommendedSolution.pricingSummary.estimatedTotalText}`,
        updatedAt: new Date().toISOString(),
      };
      await repository.saveBusiness(updatedBiz);
      setBusinesses(prev => prev.map(b => b.id === updatedBiz.id ? updatedBiz : b));
    }
  };

  // Copy Summary to Clipboard
  const handleCopyPitch = () => {
    if (!activeRecommendation || !activeBusiness) return;
    const rec = activeRecommendation.recommendedSolution;
    const text = `WATECH COMMERCIAL RECOMMENDATION FOR ${activeBusiness.officialName.toUpperCase()}
Package: ${rec.title} (${rec.estimatedDuration})
Strategic Angle: ${rec.tagline}

INCLUDED DELIVERABLES:
${rec.deliverables.map(d => `- ${d}`).join('\n')}

EXPECTED OUTCOME:
${rec.whyRecommended}

PRICING & TERMS:
${rec.pricingSummary.estimatedTotalText}

PREREQUISITES & CLIENT ASSETS NEEDED BEFORE QUOTING:
${rec.requiredCustomerAssets.map(a => `- ${a}`).join('\n')}
${rec.feasibilityWarnings.length > 0 ? `\nFEASIBILITY CAVEATS: ${rec.feasibilityWarnings.join('; ')}` : ''}`;

    navigator.clipboard.writeText(text);
    setCopiedId('pitch');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export JSON
  const handleExportJson = () => {
    if (!activeRecommendation || !activeBusiness) return;
    const data = {
      business: activeBusiness,
      salesReadiness: activeSalesRecord,
      buyerSignals: activeSignalsList,
      recommendation: activeRecommendation,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `watech_recommendation_${activeBusiness.domain || activeBusiness.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Save Service Edit in Catalog Admin
  const handleSaveServiceEdit = async () => {
    if (!editingServiceData.id || !editingServiceData.name) return;

    const updatedService: WatechServiceItem = {
      id: editingServiceData.id,
      name: editingServiceData.name,
      category: (editingServiceData.category as ServiceCatalogCategory) || 'website_digital_experience',
      description: editingServiceData.description || '',
      problemsSolved: editingServiceData.problemsSolved || [],
      idealIndustries: editingServiceData.idealIndustries || ['HVAC', 'Contractors'],
      idealBusinessSizes: editingServiceData.idealBusinessSizes || ['All sizes'],
      prerequisites: editingServiceData.prerequisites || [],
      deliverables: editingServiceData.deliverables || [],
      complexity: (editingServiceData.complexity as ServiceComplexity) || 'medium',
      estimatedDuration: editingServiceData.estimatedDuration || '2 - 4 weeks',
      pricingModel: (editingServiceData.pricingModel as PricingModel) || 'pricing_not_configured',
      basePrice: editingServiceData.basePrice,
      minPrice: editingServiceData.minPrice,
      maxPrice: editingServiceData.maxPrice,
      isRecurring: editingServiceData.isRecurring || false,
      optionalAddOns: editingServiceData.optionalAddOns || [],
      dependencies: editingServiceData.dependencies || [],
      isActive: editingServiceData.isActive !== false,
      intendedOutcome: editingServiceData.intendedOutcome || '',
      requiredCustomerAssets: editingServiceData.requiredCustomerAssets || [],
      createdAt: editingServiceData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await repository.saveService(updatedService);
    setServices(prev => {
      const exists = prev.some(s => s.id === updatedService.id);
      return exists ? prev.map(s => s.id === updatedService.id ? updatedService : s) : [...prev, updatedService];
    });
    setIsEditingService(false);
  };

  // Save Custom Package from Builder
  const handleSaveCustomPackage = async () => {
    if (!builderName.trim() || builderSelectedServices.length === 0) return;

    const selectedServiceItems = services.filter(s => builderSelectedServices.includes(s.id));
    const deliverables = Array.from(new Set(selectedServiceItems.flatMap(s => s.deliverables)));

    const newPkg: WatechServicePackage = {
      id: `pkg-${Date.now()}`,
      name: builderName,
      type: builderSelectedServices.length === 1 ? 'individual_service' : (builderSelectedServices.length > 4 ? 'complete_growth_system' : 'combined_solution'),
      targetBusinessType: builderTargetType,
      targetIndustry: 'HVAC & Home Services',
      description: `Custom package comprising ${builderSelectedServices.length} integrated Watech services.`,
      includedServiceIds: builderSelectedServices,
      excludedServiceIds: [],
      deliverables,
      optionalAddOnIds: [],
      implementationPhases: [
        {
          phase: 1,
          name: 'Core Implementation',
          duration: '3 - 6 weeks',
          serviceIds: builderSelectedServices,
          keyMilestone: 'All deliverables deployed and handed over',
        },
      ],
      estimatedDuration: '4 - 6 weeks',
      pricingModel: builderPricingModel,
      setupPrice: builderSetupPrice,
      recurringPrice: builderRecurringPrice,
      supportPeriodDays: 90,
      revisionLimit: 3,
      termsAndConditions: 'Custom negotiated agreement.',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await repository.savePackage(newPkg);
    setPackages(prev => [...prev, newPkg]);
    alert(`Package "${builderName}" successfully saved to Watech package registry!`);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#070b16] text-slate-100 overflow-y-auto">
      {/* Top Header Banner */}
      <div className="border-b border-border bg-[#0b1329] px-6 py-5 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25 font-bold uppercase tracking-wider">
                Prompt 18 + 17
              </span>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-blue-400" />
                Watech Services & Package Recommendation Engine
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Intelligent Service Matching, Solution Architecture, 3-Tier Package Builder & Commercial Revenue Engine. Connects verified business intelligence with real Watech capabilities.
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopyPitch}
              disabled={!activeRecommendation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-50 border border-border text-xs text-slate-300 hover:bg-surface-100 hover:text-white transition-all disabled:opacity-50"
            >
              {copiedId === 'pitch' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
              <span>{copiedId === 'pitch' ? 'Copied Pitch' : 'Copy Pitch'}</span>
            </button>
            <button
              onClick={handleExportJson}
              disabled={!activeRecommendation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-50 border border-border text-xs text-slate-300 hover:bg-surface-100 hover:text-white transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={handlePushToCrm}
              disabled={!activeRecommendation || activeRecommendation.pushedToCrm}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md ${
                activeRecommendation?.pushedToCrm
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 cursor-default'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{activeRecommendation?.pushedToCrm ? 'Pushed to CRM' : 'Push to CRM'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-5 border-t border-border/60 pt-3">
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'recommendations'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Solution Architecture & Recommendations</span>
          </button>
          <button
            onClick={() => setActiveTab('builder')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'builder'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Custom Package Builder</span>
          </button>
          <button
            onClick={() => setActiveTab('catalog_admin')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'catalog_admin'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Service Catalog Administration</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-100 text-slate-300 border border-border">
              {services.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('sales_intelligence')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'sales_intelligence'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-50'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Sales Priority & Buyer Signals</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">
              P17
            </span>
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 p-6 space-y-6">
        {/* ========================================================================= */}
        {/* TAB 1: SOLUTION ARCHITECTURE & RECOMMENDATIONS */}
        {/* ========================================================================= */}
        {activeTab === 'recommendations' && (
          <div className="space-y-6">
            {/* Account Selector Pill Bar */}
            <div className="bg-surface-100 border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Target Account:</span>
                <select
                  value={selectedBusinessId}
                  onChange={e => setSelectedBusinessId(e.target.value)}
                  className="bg-surface-50 border border-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {businesses.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.officialName} ({b.city || 'HVAC'} · Status: {b.status})
                    </option>
                  ))}
                </select>
              </div>

              {activeBusiness && (
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 text-slate-400">
                    <span>Audit Score:</span>
                    <span className="font-mono font-bold text-white">
                      {activeAudit ? `${activeAudit.totalScore}/100 (${activeAudit.grade})` : 'Pending'}
                    </span>
                  </div>
                  <div className="h-3 w-px bg-border" />
                  <div className="flex items-center gap-1 text-slate-400">
                    <span>Reviews:</span>
                    <span className="font-mono font-bold text-white">
                      {activeLocalSeo ? `${activeLocalSeo.reviewCount} (${activeLocalSeo.averageRating.toFixed(1)}★)` : 'N/A'}
                    </span>
                  </div>
                  <div className="h-3 w-px bg-border" />
                  <div className="flex items-center gap-1 text-slate-400">
                    <span>Sales Readiness:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {activeSalesRecord ? `${activeSalesRecord.overallScore}/100` : 'Evaluating...'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 3-Tier Recommendation Cards */}
            {activeRecommendation && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                      Recommended Commercial Solutions (3 Recommendation Tiers)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Evidence-backed service bundles tailored to verified operational bottlenecks.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Rule: "Pricing not configured" protects against synthetic rate assumptions
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Tier 1: Essential Solution */}
                  {activeRecommendation.essentialSolution && (
                    <div className="bg-surface-100 border border-border rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20 font-semibold">
                            Single Intervention
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {activeRecommendation.essentialSolution.estimatedDuration}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white">
                          {activeRecommendation.essentialSolution.title}
                        </h3>
                        <p className="text-xs text-slate-400 italic">
                          "{activeRecommendation.essentialSolution.tagline}"
                        </p>
                        <p className="text-xs text-slate-300">
                          {activeRecommendation.essentialSolution.description}
                        </p>

                        {/* Deliverables */}
                        <div className="pt-2 border-t border-border/50">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                            Core Deliverables:
                          </span>
                          <ul className="text-xs space-y-1 text-slate-300">
                            {activeRecommendation.essentialSolution.deliverables.slice(0, 3).map((d, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                                <span>{d}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border mt-4">
                        <div className="flex items-baseline justify-between mb-2">
                          <span className="text-xs text-slate-400">Commercial Scope:</span>
                          <span className="text-xs font-mono font-semibold text-white">
                            {activeRecommendation.essentialSolution.pricingSummary.estimatedTotalText}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 leading-tight">
                          {activeRecommendation.essentialSolution.whyRecommended}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tier 2: Recommended Solution (HIGHLIGHTED) */}
                  <div className="bg-gradient-to-b from-blue-950/40 via-surface-100 to-surface-100 border-2 border-blue-500/50 rounded-xl p-5 flex flex-col justify-between shadow-xl shadow-blue-500/10 relative">
                    <div className="absolute -top-3 left-6 px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
                      Recommended Best Fit
                    </div>
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold">
                          Combined Solution
                        </span>
                        <span className="text-xs text-slate-300 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-blue-400" />
                          {activeRecommendation.recommendedSolution.estimatedDuration}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white">
                        {activeRecommendation.recommendedSolution.title}
                      </h3>
                      <p className="text-xs text-blue-300 italic">
                        "{activeRecommendation.recommendedSolution.tagline}"
                      </p>
                      <p className="text-xs text-slate-300">
                        {activeRecommendation.recommendedSolution.description}
                      </p>

                      {/* Deliverables */}
                      <div className="pt-2 border-t border-border/50">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Package Deliverables:
                        </span>
                        <ul className="text-xs space-y-1.5 text-slate-200">
                          {activeRecommendation.recommendedSolution.deliverables.slice(0, 4).map((d, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{d}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Journey Coverage */}
                      <div className="pt-2">
                        <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                          Customer Journey Stages Addressed:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {activeRecommendation.recommendedSolution.customerJourneyStagesCovered.map((stg, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                              {stg}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border mt-4">
                      <div className="flex items-baseline justify-between mb-2">
                        <span className="text-xs text-slate-400">Configured Pricing:</span>
                        <span className="text-xs font-mono font-semibold text-blue-300">
                          {activeRecommendation.recommendedSolution.pricingSummary.estimatedTotalText}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 leading-tight">
                        {activeRecommendation.recommendedSolution.whyRecommended}
                      </div>
                    </div>
                  </div>

                  {/* Tier 3: Comprehensive (360 Growth System) */}
                  {activeRecommendation.comprehensiveSolution && (
                    <div className="bg-surface-100 border border-border rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">
                            Full Enterprise Framework
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-purple-400" />
                            {activeRecommendation.comprehensiveSolution.estimatedDuration}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white">
                          {activeRecommendation.comprehensiveSolution.title}
                        </h3>
                        <p className="text-xs text-purple-300 italic">
                          "{activeRecommendation.comprehensiveSolution.tagline}"
                        </p>
                        <p className="text-xs text-slate-300">
                          {activeRecommendation.comprehensiveSolution.description}
                        </p>

                        {/* Deliverables */}
                        <div className="pt-2 border-t border-border/50">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                            Enterprise Capabilities:
                          </span>
                          <ul className="text-xs space-y-1 text-slate-300">
                            {activeRecommendation.comprehensiveSolution.deliverables.slice(0, 4).map((d, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                                <span>{d}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* All 8 Stages */}
                        <div className="pt-2">
                          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                            Full 8-Stage Architecture:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {['Visibility', 'Attraction', 'Engagement', 'Capture', 'Qualification', 'Follow-up', 'Conversion', 'Retention'].map((stg, i) => (
                              <span key={i} className="text-[9px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                {stg}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border mt-4">
                        <div className="flex items-baseline justify-between mb-2">
                          <span className="text-xs text-slate-400">Commercial Scope:</span>
                          <span className="text-xs font-mono font-semibold text-purple-300">
                            {activeRecommendation.comprehensiveSolution.pricingSummary.estimatedTotalText}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 leading-tight">
                          {activeRecommendation.comprehensiveSolution.whyRecommended}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pre-Quote Checklist & Customer Assets Needed */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="bg-surface-100 border border-border rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Required Customer Assets Before Quoting
                    </div>
                    <p className="text-xs text-slate-400">
                      Concrete prerequisites needed from client leadership prior to finalizing engagement terms:
                    </p>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {activeRecommendation.recommendedSolution.requiredCustomerAssets.map((asset, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span>{asset}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-surface-100 border border-border rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      Target Decision-Maker & Strategic Angle
                    </div>
                    {activeSalesRecord ? (
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">Recommended Buyer Role:</span>
                          <span className="font-bold text-white text-sm">
                            {activeSalesRecord.buyerRoleRecommendation.recommendedRole}
                          </span>
                          {activeSalesRecord.buyerRoleRecommendation.matchedContactName && (
                            <span className="text-blue-400 ml-1">
                              ({activeSalesRecord.buyerRoleRecommendation.matchedContactName})
                            </span>
                          )}
                        </div>
                        <p className="text-slate-300 leading-relaxed">
                          {activeSalesRecord.buyerRoleRecommendation.rationale}
                        </p>
                        <div className="bg-surface-50 p-2.5 rounded-lg border border-border text-slate-200">
                          <span className="text-[10px] font-mono text-cyan-400 uppercase block mb-1">
                            Recommended Pitch Opening:
                          </span>
                          "{activeSalesRecord.buyerRoleRecommendation.suggestedConversationStarter}"
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Evaluating buyer signals...</p>
                    )}
                  </div>
                </div>

                {/* Granular Service Match Scorecards (0-100) */}
                <div className="bg-surface-100 border border-border rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Granular Service Relevance Scorecards (0–100)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Transparent algorithmic evaluation matching verified deficits to specific Watech services.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {activeRecommendation.serviceMatches.map(match => {
                      const catConfig = CATEGORY_LABELS[match.category] || { label: match.category, badge: 'bg-slate-500/10 text-slate-400' };
                      return (
                        <div
                          key={match.serviceId}
                          className={`p-3.5 rounded-lg border text-xs space-y-2 transition-all ${
                            match.isUnnecessaryOrNoAction
                              ? 'bg-surface-50/40 border-border/50 opacity-60'
                              : (match.matchScore >= 75 ? 'bg-surface-50 border-blue-500/30' : 'bg-surface-50 border-border')
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${catConfig.badge}`}>
                              {catConfig.label}
                            </span>
                            <span className={`font-mono font-bold text-xs ${
                              match.isUnnecessaryOrNoAction ? 'text-slate-500' : (match.matchScore >= 75 ? 'text-blue-400' : 'text-slate-300')
                            }`}>
                              {match.isUnnecessaryOrNoAction ? 'Unnecessary' : `${match.matchScore}/100`}
                            </span>
                          </div>
                          <div className="font-semibold text-white truncate">{match.serviceName}</div>
                          <p className="text-[11px] text-slate-400 leading-tight">
                            {match.rationale}
                          </p>
                          {match.supportingFindings.length > 0 && (
                            <div className="text-[10px] text-slate-500 truncate">
                              Evidence: {match.supportingFindings[0]}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CUSTOM PACKAGE BUILDER */}
        {/* ========================================================================= */}
        {activeTab === 'builder' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-surface-100 border border-border rounded-xl p-5 space-y-4">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
                    Interactive Solution Architecture Composer
                  </h2>
                  <p className="text-xs text-slate-400">
                    Select compatible services from Watech's centralized catalog to architect a custom solution bundle.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-400 uppercase font-semibold block mb-1">Package Name</label>
                    <input
                      type="text"
                      value={builderName}
                      onChange={e => setBuilderName(e.target.value)}
                      className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 uppercase font-semibold block mb-1">Target Business Type</label>
                    <input
                      type="text"
                      value={builderTargetType}
                      onChange={e => setBuilderTargetType(e.target.value)}
                      className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Service Selection Checkboxes grouped by category */}
                <div className="space-y-4 pt-2 border-t border-border/60">
                  <span className="text-xs font-semibold text-slate-300 block">
                    Select Included Services ({builderSelectedServices.length} selected):
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
                    {services.map(srv => {
                      const isSelected = builderSelectedServices.includes(srv.id);
                      return (
                        <div
                          key={srv.id}
                          onClick={() => {
                            if (isSelected) {
                              setBuilderSelectedServices(prev => prev.filter(id => id !== srv.id));
                            } else {
                              setBuilderSelectedServices(prev => [...prev, srv.id]);
                            }
                          }}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-600/15 border-blue-500 text-white'
                              : 'bg-surface-50 border-border text-slate-300 hover:bg-surface-100 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-mono text-slate-400 uppercase">
                              {srv.category.replace(/_/g, ' ')}
                            </span>
                            <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                              isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-600'
                            }`}>
                              {isSelected && '✓'}
                            </div>
                          </div>
                          <div className="font-semibold text-xs truncate">{srv.name}</div>
                          <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">{srv.intendedOutcome}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Builder Summary Sidebar */}
            <div className="space-y-6">
              <div className="bg-surface-100 border border-border rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Commercial Scope & Pricing
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Pricing Model</label>
                    <select
                      value={builderPricingModel}
                      onChange={e => setBuilderPricingModel(e.target.value as PricingModel)}
                      className="w-full bg-surface-50 border border-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="pricing_not_configured">Pricing Not Configured (Safe)</option>
                      <option value="one_time">One-Time Project</option>
                      <option value="monthly_retainer">Monthly Retainer</option>
                      <option value="setup_plus_monthly">Setup Fee + Monthly Retainer</option>
                      <option value="custom_quote">Custom Quotation</option>
                    </select>
                  </div>

                  {builderPricingModel !== 'pricing_not_configured' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Setup ($)</label>
                        <input
                          type="number"
                          placeholder="e.g. 2500"
                          value={builderSetupPrice ?? ''}
                          onChange={e => setBuilderSetupPrice(e.target.value ? Number(e.target.value) : undefined)}
                          className="w-full bg-surface-50 border border-border rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Monthly ($)</label>
                        <input
                          type="number"
                          placeholder="e.g. 950"
                          value={builderRecurringPrice ?? ''}
                          onChange={e => setBuilderRecurringPrice(e.target.value ? Number(e.target.value) : undefined)}
                          className="w-full bg-surface-50 border border-border rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  )}

                  <div className="p-3 rounded-lg bg-surface-50 border border-border text-xs space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Selected Services:</span>
                    <span className="text-white font-bold text-sm">{builderSelectedServices.length} Services</span>
                    <p className="text-[11px] text-slate-400">
                      Estimated duration: {builderSelectedServices.length > 3 ? '6 - 10 weeks' : '3 - 5 weeks'}
                    </p>
                  </div>

                  <button
                    onClick={handleSaveCustomPackage}
                    disabled={builderSelectedServices.length === 0}
                    className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                  >
                    Save to Package Registry
                  </button>
                </div>
              </div>

              {/* Existing Registered Packages List */}
              <div className="bg-surface-100 border border-border rounded-xl p-5 space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
                  Registered Packages ({packages.length})
                </span>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {packages.map(pkg => (
                    <div key={pkg.id} className="p-2.5 rounded-lg bg-surface-50 border border-border text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{pkg.name}</span>
                        <span className="text-[9px] font-mono text-blue-400 uppercase">{pkg.type.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {pkg.includedServiceIds.length} included services · {pkg.estimatedDuration}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SERVICE CATALOG ADMINISTRATION */}
        {/* ========================================================================= */}
        {activeTab === 'catalog_admin' && (
          <div className="space-y-6">
            <div className="bg-surface-100 border border-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
                  Centralized Watech Service Catalog
                </h2>
                <p className="text-xs text-slate-400">
                  Manage active services, deliverables, prerequisites, and commercial pricing models.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={catalogCategoryFilter}
                  onChange={e => setCatalogCategoryFilter(e.target.value)}
                  className="bg-surface-50 border border-border rounded-lg px-3 py-1.5 text-xs text-white"
                >
                  <option value="all">All Categories</option>
                  <option value="website_digital_experience">Website & Digital Experience</option>
                  <option value="marketing_customer_acquisition">Marketing & Customer Acquisition</option>
                  <option value="search_visibility">Search & Visibility</option>
                  <option value="creative_content">Creative & Content</option>
                  <option value="software_business_automation">Software & Automation</option>
                  <option value="business_growth_consulting">Growth Consulting</option>
                </select>

                <button
                  onClick={() => {
                    setEditingServiceData({
                      id: `srv-custom-${Date.now()}`,
                      name: '',
                      category: 'website_digital_experience',
                      description: '',
                      problemsSolved: [],
                      deliverables: [],
                      prerequisites: [],
                      pricingModel: 'pricing_not_configured',
                      complexity: 'medium',
                      estimatedDuration: '2 - 4 weeks',
                      isActive: true,
                    });
                    setIsEditingService(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Service</span>
                </button>
              </div>
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services
                .filter(s => catalogCategoryFilter === 'all' || s.category === catalogCategoryFilter)
                .map(srv => {
                  const catConfig = CATEGORY_LABELS[srv.category] || { label: srv.category, badge: 'bg-slate-500/10 text-slate-400' };
                  return (
                    <div
                      key={srv.id}
                      className="bg-surface-100 border border-border rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all text-xs space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${catConfig.badge}`}>
                            {catConfig.label}
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            srv.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {srv.isActive ? 'Active' : 'Archived'}
                          </span>
                        </div>

                        <h4 className="font-bold text-white text-sm">{srv.name}</h4>
                        <p className="text-slate-400 line-clamp-2">{srv.description}</p>

                        <div className="pt-2 border-t border-border/40 text-[11px] text-slate-300">
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Intended Outcome:</span>
                          {srv.intendedOutcome}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border flex items-center justify-between">
                        <span className="font-mono text-slate-400 text-[11px]">
                          {srv.pricingModel === 'pricing_not_configured' ? 'Pricing not configured' : `$${srv.basePrice || 0}`}
                        </span>
                        <button
                          onClick={() => {
                            setEditingServiceData(srv);
                            setIsEditingService(true);
                          }}
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs font-semibold"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Edit / Create Service Modal */}
            {isEditingService && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-surface-100 border border-border rounded-xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <h3 className="font-bold text-white text-base">
                      {editingServiceData.id?.startsWith('srv-custom') ? 'Create New Service' : 'Edit Service Configuration'}
                    </h3>
                    <button onClick={() => setIsEditingService(false)} className="text-slate-400 hover:text-white">✕</button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Service Name</label>
                      <input
                        type="text"
                        value={editingServiceData.name || ''}
                        onChange={e => setEditingServiceData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-surface-50 border border-border rounded-lg px-3 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Category</label>
                      <select
                        value={editingServiceData.category || 'website_digital_experience'}
                        onChange={e => setEditingServiceData(prev => ({ ...prev, category: e.target.value as ServiceCatalogCategory }))}
                        className="w-full bg-surface-50 border border-border rounded-lg px-3 py-1.5 text-white"
                      >
                        <option value="website_digital_experience">Website & Digital Experience</option>
                        <option value="marketing_customer_acquisition">Marketing & Customer Acquisition</option>
                        <option value="search_visibility">Search & Visibility</option>
                        <option value="creative_content">Creative & Content</option>
                        <option value="software_business_automation">Software & Automation</option>
                        <option value="business_growth_consulting">Growth Consulting</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={editingServiceData.description || ''}
                        onChange={e => setEditingServiceData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full bg-surface-50 border border-border rounded-lg px-3 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Intended Business Outcome</label>
                      <input
                        type="text"
                        value={editingServiceData.intendedOutcome || ''}
                        onChange={e => setEditingServiceData(prev => ({ ...prev, intendedOutcome: e.target.value }))}
                        className="w-full bg-surface-50 border border-border rounded-lg px-3 py-1.5 text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400 block mb-1">Pricing Model</label>
                        <select
                          value={editingServiceData.pricingModel || 'pricing_not_configured'}
                          onChange={e => setEditingServiceData(prev => ({ ...prev, pricingModel: e.target.value as PricingModel }))}
                          className="w-full bg-surface-50 border border-border rounded-lg px-3 py-1.5 text-white"
                        >
                          <option value="pricing_not_configured">Pricing Not Configured</option>
                          <option value="one_time">One-Time Project</option>
                          <option value="monthly_retainer">Monthly Retainer</option>
                          <option value="setup_plus_monthly">Setup + Monthly</option>
                          <option value="custom_quote">Custom Quote</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Base Price ($)</label>
                        <input
                          type="number"
                          value={editingServiceData.basePrice ?? ''}
                          onChange={e => setEditingServiceData(prev => ({ ...prev, basePrice: e.target.value ? Number(e.target.value) : undefined }))}
                          placeholder="Leave blank for unconfigured"
                          className="w-full bg-surface-50 border border-border rounded-lg px-3 py-1.5 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                    <button
                      onClick={() => setIsEditingService(false)}
                      className="px-4 py-1.5 rounded-lg bg-surface-50 text-slate-300 hover:text-white text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveServiceEdit}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SALES PRIORITY & BUYER SIGNALS (PROMPT 17) */}
        {/* ========================================================================= */}
        {activeTab === 'sales_intelligence' && (
          <div className="space-y-6">
            <div className="bg-surface-100 border border-border rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-400" />
                  Sales Priority Queue & Buyer Signals Engine
                </h2>
                <p className="text-xs text-slate-400">
                  Time-decayed sales readiness scoring (0–100) prioritizing high-intent outreach timing over raw technical debt.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Active Project Accounts: {businesses.length}
              </span>
            </div>

            {/* Sales Priority Queue Table */}
            <div className="bg-surface-100 border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#0b1329] border-b border-border text-slate-400 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Account / Domain</th>
                      <th className="py-3 px-3">Sales Readiness</th>
                      <th className="py-3 px-3">Buying Intent</th>
                      <th className="py-3 px-4">Primary Observable Bottleneck</th>
                      <th className="py-3 px-3">Target Buyer Persona</th>
                      <th className="py-3 px-4">Recommended Next Step</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {businesses.map(biz => {
                      const sr = salesRecords[biz.id];
                      const signals = buyerSignals[biz.id] || [];
                      const isSelected = biz.id === selectedBusinessId;

                      return (
                        <tr
                          key={biz.id}
                          onClick={() => setSelectedBusinessId(biz.id)}
                          className={`hover:bg-surface-50/70 cursor-pointer transition-all ${
                            isSelected ? 'bg-blue-600/10' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{biz.officialName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{biz.domain || 'No domain'}</div>
                          </td>
                          <td className="py-3 px-3">
                            {sr ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-white text-sm">{sr.overallScore}/100</span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                                  sr.overallScore >= 75 ? 'bg-emerald-500/15 text-emerald-400' : (sr.overallScore >= 60 ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-500/15 text-slate-400')
                                }`}>
                                  {sr.readinessCategory.replace(/_/g, ' ')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500">Evaluating...</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {sr ? (
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                                sr.buyingIntent === 'strong_signal'
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : (sr.buyingIntent === 'emerging_signal' ? 'bg-cyan-500/15 text-cyan-300' : 'bg-slate-500/15 text-slate-400')
                              }`}>
                                {sr.buyingIntent.replace(/_/g, ' ')}
                              </span>
                            ) : (
                              <span className="text-slate-500">Pending</span>
                            )}
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-slate-300">
                            {sr ? sr.primaryObservableBottleneck : 'General technical review'}
                          </td>
                          <td className="py-3 px-3 text-slate-200">
                            {sr?.buyerRoleRecommendation ? (
                              <div>
                                <span className="font-medium">{sr.buyerRoleRecommendation.recommendedRole}</span>
                                {sr.buyerRoleRecommendation.matchedContactName && (
                                  <span className="text-blue-400 block text-[10px]">
                                    ({sr.buyerRoleRecommendation.matchedContactName})
                                  </span>
                                )}
                              </div>
                            ) : (
                              'Executive Owner'
                            )}
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-slate-400">
                            {sr ? sr.recommendedNextAction : 'Evaluate audit'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBusinessId(biz.id);
                                setActiveTab('recommendations');
                              }}
                              className="text-blue-400 hover:text-blue-300 font-semibold text-xs flex items-center gap-1 ml-auto"
                            >
                              <span>View Plan</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Active Business Buyer Signals Drawer */}
            {activeBusiness && (
              <div className="bg-surface-100 border border-border rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Observable Buyer Signals: {activeBusiness.officialName} ({activeSignalsList.length} Active Signals)
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    Time Decay: ≤30d (1.0x), 31-90d (0.75x), 91-180d (0.50x), &gt;180d (0.25x)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeSignalsList.map(sig => (
                    <div key={sig.id} className="p-3.5 rounded-lg bg-surface-50 border border-border text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                          {sig.category.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                          Freshness: {(sig.recencyWeight * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="font-semibold text-white">{sig.title}</div>
                      <p className="text-[11px] text-slate-400 leading-tight">{sig.description}</p>
                      <div className="p-2 rounded bg-surface-100/60 border border-border/50 text-[10px] text-slate-300 italic">
                        "{sig.evidenceExcerpt}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
