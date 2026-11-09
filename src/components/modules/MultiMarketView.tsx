'use client';

import React, { useState, useEffect } from 'react';
import {
  Compass,
  Globe2,
  MapPin,
  TrendingUp,
  BarChart3,
  Sliders,
  SlidersHorizontal,
  Download,
  Printer,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Plus,
  RefreshCw,
  Clock,
  ArrowUpDown,
  Search,
  Filter,
  Eye,
  Building2,
  UserCheck,
  Target,
  FileSpreadsheet,
  Trash2,
  Zap,
  Info,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { repository } from '@/lib/db/repository';
import {
  aggregateMarketMetrics,
  calculateMarketAttractiveness,
  generateMarketRecommendations,
  compareBusinessesCrossMarket,
} from '@/lib/engines/multiMarketEngine';
import type {
  ResearchProject,
  Business,
  WebsiteAudit,
  LeadScore,
  LocalSeoProfile,
  Contact,
  MarketAggregatedMetrics,
  MarketScoreWeights,
  DEFAULT_MARKET_SCORE_WEIGHTS,
  MarketRecommendation,
  MarketComparison,
  MarketComparisonSnapshot,
  CrossMarketBusinessComparison,
} from '@/types';
import Papa from 'papaparse';

export function MultiMarketView() {
  const { projects, activeProject, setActiveProject, refreshProjects } = useProject();

  // Selected markets for comparison
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [marketMetrics, setMarketMetrics] = useState<MarketAggregatedMetrics[]>([]);
  const [recommendations, setRecommendations] = useState<MarketRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Score Weights State
  const [weights, setWeights] = useState<MarketScoreWeights>({
    opportunityDensity: 15,
    digitalPresenceGaps: 15,
    localSeoOpportunity: 15,
    websiteImprovementOpportunity: 15,
    competitiveIntensity: 10,
    decisionMakerAccessibility: 10,
    researchCoverage: 10,
    leadQualificationPotential: 10,
  });
  const [showWeightModal, setShowWeightModal] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState<keyof MarketAggregatedMetrics>('marketAttractivenessScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Cross-Market Business Comparison Modal
  const [showBizModal, setShowBizModal] = useState(false);
  const [allBusinesses, setAllBusinesses] = useState<(Business & { marketName: string })[]>([]);
  const [selectedBizAId, setSelectedBizAId] = useState<string>('');
  const [selectedBizBId, setSelectedBizBId] = useState<string>('');
  const [bizComparison, setBizComparison] = useState<CrossMarketBusinessComparison | null>(null);

  // Historical Snapshots
  const [snapshots, setSnapshots] = useState<MarketComparisonSnapshot[]>([]);
  const [activeTab, setActiveTab] = useState<'matrix' | 'business_compare' | 'history'>('matrix');

  // Load projects and initial multi-market selections
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const pList = await repository.getProjects();
        if (pList.length > 0) {
          // Default select all projects for cross-comparison
          const initialIds = pList.map(p => p.id);
          setSelectedProjectIds(initialIds);
          await loadMetricsForProjects(pList);
        }
        const hist = await repository.getMarketComparisonSnapshots();
        setSnapshots(hist);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [projects]);

  const loadMetricsForProjects = async (pList: ResearchProject[], currentWeights = weights) => {
    const computedMetrics: MarketAggregatedMetrics[] = [];
    const businessesWithMarket: (Business & { marketName: string })[] = [];

    for (const proj of pList) {
      const m = await aggregateMarketMetrics(proj);
      const { totalScore, dimensionScores } = calculateMarketAttractiveness(m, currentWeights);
      m.marketAttractivenessScore = totalScore;
      m.dimensionScores = dimensionScores;
      computedMetrics.push(m);

      const bList = await repository.getBusinesses(proj.id);
      bList.forEach(b => {
        businessesWithMarket.push({ ...b, marketName: proj.cityArea || proj.name });
      });
    }

    setMarketMetrics(computedMetrics);
    setRecommendations(generateMarketRecommendations(computedMetrics));
    setAllBusinesses(businessesWithMarket);

    if (businessesWithMarket.length >= 2 && !selectedBizAId && !selectedBizBId) {
      setSelectedBizAId(businessesWithMarket[0].id);
      setSelectedBizBId(businessesWithMarket[1].id);
    }
  };

  const toggleProjectSelection = (pId: string) => {
    const updated = selectedProjectIds.includes(pId)
      ? selectedProjectIds.filter(id => id !== pId)
      : [...selectedProjectIds, pId];

    if (updated.length === 0) return; // Keep at least one
    setSelectedProjectIds(updated);
  };

  const handleWeightChange = (key: keyof MarketScoreWeights, val: number) => {
    const updatedWeights = { ...weights, [key]: val };
    setWeights(updatedWeights);

    // Recalculate attractiveness scores immediately
    const updatedMetrics = marketMetrics.map(m => {
      const { totalScore, dimensionScores } = calculateMarketAttractiveness(m, updatedWeights);
      return {
        ...m,
        marketAttractivenessScore: totalScore,
        dimensionScores,
      };
    });

    setMarketMetrics(updatedMetrics);
    setRecommendations(generateMarketRecommendations(updatedMetrics));
  };

  const handleResetWeights = () => {
    const defaults: MarketScoreWeights = {
      opportunityDensity: 15,
      digitalPresenceGaps: 15,
      localSeoOpportunity: 15,
      websiteImprovementOpportunity: 15,
      competitiveIntensity: 10,
      decisionMakerAccessibility: 10,
      researchCoverage: 10,
      leadQualificationPotential: 10,
    };
    setWeights(defaults);
    const updatedMetrics = marketMetrics.map(m => {
      const { totalScore, dimensionScores } = calculateMarketAttractiveness(m, defaults);
      return { ...m, marketAttractivenessScore: totalScore, dimensionScores };
    });
    setMarketMetrics(updatedMetrics);
    setRecommendations(generateMarketRecommendations(updatedMetrics));
  };

  const handleSort = (field: keyof MarketAggregatedMetrics) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Run business comparison
  const runBusinessComparison = async () => {
    if (!selectedBizAId || !selectedBizBId || selectedBizAId === selectedBizBId) return;

    const bA = allBusinesses.find(b => b.id === selectedBizAId);
    const bB = allBusinesses.find(b => b.id === selectedBizBId);
    if (!bA || !bB) return;

    const [auditA, auditB, scoreA, scoreB, localA, localB, contactsA, contactsB] = await Promise.all([
      repository.getAuditForBusiness(bA.id),
      repository.getAuditForBusiness(bB.id),
      repository.getScoreForBusiness(bA.id),
      repository.getScoreForBusiness(bB.id),
      repository.getLocalSeoProfileForBusiness(bA.id),
      repository.getLocalSeoProfileForBusiness(bB.id),
      repository.getContacts(bA.id),
      repository.getContacts(bB.id),
    ]);

    const comp = compareBusinessesCrossMarket(
      bA,
      bB,
      bA.marketName,
      bB.marketName,
      auditA,
      auditB,
      scoreA,
      scoreB,
      localA,
      localB,
      contactsA,
      contactsB
    );
    setBizComparison(comp);
  };

  useEffect(() => {
    if (selectedBizAId && selectedBizBId && selectedBizAId !== selectedBizBId) {
      runBusinessComparison();
    }
  }, [selectedBizAId, selectedBizBId]);

  // Save Historical Snapshot
  const handleSaveSnapshot = async () => {
    const metricsMap: Record<string, MarketAggregatedMetrics> = {};
    activeMetrics.forEach(m => {
      metricsMap[m.projectId] = m;
    });

    const newSnapshot: MarketComparisonSnapshot = {
      id: `snap-market-${Date.now()}`,
      comparisonId: 'main-market-comparison',
      name: `Snapshot: ${new Date().toLocaleDateString()} (${activeMetrics.length} Markets)`,
      capturedAt: new Date().toISOString(),
      marketMetrics: metricsMap,
      summaryNotes: `Attractiveness leader: ${activeMetrics[0]?.marketName || 'N/A'} (${activeMetrics[0]?.marketAttractivenessScore}/100)`,
    };

    await repository.saveMarketComparisonSnapshot(newSnapshot);
    setSnapshots(prev => [newSnapshot, ...prev]);
  };

  // Export CSV
  const handleExportCsv = () => {
    if (activeMetrics.length === 0) return;
    const rows = activeMetrics.map(m => ({
      'Market Name': m.marketName,
      'City / Area': m.cityArea,
      'State / Region': m.stateRegion,
      'Country': m.country,
      'Industry Niche': m.industry,
      'Attractiveness Score (100-pt)': m.marketAttractivenessScore,
      'Discovered Operators': m.totalDiscovered,
      'With Website': m.withWebsiteCount,
      'Without Website': m.withoutWebsiteCount,
      'Website Audits Completed': m.auditedCount,
      'Audit Coverage %': `${m.auditCoveragePercent}%`,
      'Avg Audit Score': m.avgAuditScore,
      'Local GBP Profiles': m.localSeoCount,
      'Avg GBP Rating': m.avgGbpRating,
      'Avg Review Count': m.avgReviewCount,
      'Contacts Discovered': m.contactsDiscoveredCount,
      'Decision Makers Found': m.decisionMakersCount,
      'Contact Coverage %': `${m.contactCoveragePercent}%`,
      'Qualified Leads (Tier A/B)': m.qualifiedBusinessesCount,
      'Identified Opportunities': m.totalOpportunitiesCount,
      'Avg Lead Score': m.avgLeadScore,
      'Research Coverage Score': `${m.researchCoverageScore}/100`,
      'Recommended Action': m.recommendedNextAction,
      'Data Gaps': m.dataGaps.join('; '),
    }));

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cross-market-intelligence-benchmark-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON
  const handleExportJson = () => {
    const dossier = {
      title: 'Watech-BI Cross-Market Intelligence Benchmark Report',
      generatedAt: new Date().toISOString(),
      scoreWeights: weights,
      marketsComparedCount: activeMetrics.length,
      markets: activeMetrics,
      strategicRecommendations: recommendations,
    };

    const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cross-market-dossier-${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered active metrics
  const activeMetrics = marketMetrics
    .filter(m => selectedProjectIds.includes(m.projectId))
    .sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'desc' ? valB - valA : valA - valB;
      }
      return 0;
    });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-100 p-5 rounded-xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Compass className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Multi-Market Intelligence Engine & Cross-Geographic Benchmark
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-950/80 text-blue-300 border border-blue-700/50">
                  Prompt 16
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Cross-market opportunity benchmarking, explainable 100-pt attractiveness scoring, side-by-side business contrasting, and historical drift surveillance.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowWeightModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-50 hover:bg-surface-200 text-slate-200 border border-border rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
            Tune Attractiveness Weights
          </button>
          <button
            onClick={handleSaveSnapshot}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-50 hover:bg-surface-200 text-slate-200 border border-border rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Save Snapshot
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-50 hover:bg-surface-200 text-slate-200 border border-border rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            CSV Export
          </button>
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            JSON Dossier
          </button>
        </div>
      </div>

      {/* Market Selector Bar */}
      <div className="bg-surface-100 border border-border p-4 rounded-xl space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Globe2 className="w-4 h-4 text-blue-400" />
            Active Research Markets ({selectedProjectIds.length} of {projects.length} Selected):
          </span>
          <span className="text-slate-400">
            Click to toggle markets in comparative matrix
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {projects.map(p => {
            const isSelected = selectedProjectIds.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggleProjectSelection(p.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                    : 'bg-surface-50 border-border text-slate-400 hover:bg-surface-200 hover:text-slate-200'
                }`}
              >
                <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                <span>{p.cityArea || p.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">({p.stateRegion})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'matrix'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-surface-100'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Cross-Market Matrix & Attractiveness ({activeMetrics.length})
        </button>
        <button
          onClick={() => setActiveTab('business_compare')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'business_compare'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-surface-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Side-by-Side Business Contrasting
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-surface-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Historical Tracking & Snapshots ({snapshots.length})
        </button>
      </div>

      {/* TAB 1: COMPARISON MATRIX & ATTRACTIVENESS */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          {/* Strategic Market Recommendations Cards */}
          {recommendations.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {recommendations.map((rec, rIdx) => (
                <div
                  key={rIdx}
                  className="bg-surface-100 border border-border p-4 rounded-xl space-y-2 relative overflow-hidden"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`p-1.5 rounded-lg border ${
                        rec.type === 'next_research'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : rec.type === 'strongest_digital_gap'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : rec.type === 'highest_qualified'
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}
                    >
                      <Zap className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {rec.marketName}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white">{rec.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{rec.evidence}</p>
                  <div className="pt-2 border-t border-border/60">
                    <span className="text-[10px] text-amber-300/90 block">
                      <strong>Action:</strong> {rec.suggestedAction}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Limitations: {rec.dataLimitations}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Master Comparison Table */}
          <div className="bg-surface-100 border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  Cross-Market Opportunity Matrix (Real Grounded Metrics)
                </h3>
                <span className="text-xs text-slate-400">
                  Sorted by {String(sortBy)} ({sortOrder.toUpperCase()}) • Weights active
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-50/70 border-b border-border text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Market & Territory</th>
                    <th
                      onClick={() => handleSort('marketAttractivenessScore')}
                      className="p-3.5 cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center gap-1 text-blue-400">
                        <span>Attractiveness</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('totalDiscovered')}
                      className="p-3.5 cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>Discovered</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('auditCoveragePercent')}
                      className="p-3.5 cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>Audit Cov.</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('avgAuditScore')}
                      className="p-3.5 cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>Avg Audit</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="p-3.5">Local SEO / Reviews</th>
                    <th
                      onClick={() => handleSort('contactCoveragePercent')}
                      className="p-3.5 cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>DMs / Contacts</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('qualifiedBusinessesCount')}
                      className="p-3.5 cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>Tier A/B Leads</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('totalOpportunitiesCount')}
                      className="p-3.5 cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>Opps Count</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('researchCoverageScore')}
                      className="p-3.5 cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>Coverage Score</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="p-3.5">Recommended Next Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {activeMetrics.map(m => (
                    <tr key={m.projectId} className="hover:bg-surface-50/50 transition-colors">
                      <td className="p-3.5">
                        <div className="font-semibold text-white text-sm">{m.cityArea || m.marketName}</div>
                        <div className="text-[11px] text-slate-400">
                          {m.stateRegion}, {m.country} • <span className="text-slate-500 font-mono">{m.industry}</span>
                        </div>
                        {m.dataGaps.length > 0 && (
                          <div className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>{m.dataGaps[0]}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-bold text-blue-400 font-mono">
                            {m.marketAttractivenessScore}
                          </span>
                          <span className="text-[10px] text-slate-500">/100</span>
                        </div>
                        <div className="w-20 bg-surface-200 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full"
                            style={{ width: `${m.marketAttractivenessScore}%` }}
                          />
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-white font-mono">{m.totalDiscovered}</span>
                        <span className="text-[10px] text-slate-400 block">
                          {m.withWebsiteCount} web / {m.withoutWebsiteCount} none
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-200">{m.auditCoveragePercent}%</span>
                        <span className="text-[10px] text-slate-500 block">({m.auditedCount} audited)</span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`font-bold font-mono ${
                            m.avgAuditScore > 75
                              ? 'text-emerald-400'
                              : m.avgAuditScore > 50
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {m.auditedCount > 0 ? `${m.avgAuditScore}/100` : 'N/A'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {m.localSeoCount > 0 ? (
                          <div>
                            <span className="text-slate-200 font-semibold">{m.avgGbpRating} ★</span>
                            <span className="text-[10px] text-slate-400 block">
                              avg {m.avgReviewCount} reviews ({m.gbpClaimedPercent}% claimed)
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">No GBP Data</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-white">{m.decisionMakersCount} DMs</span>
                        <span className="text-[10px] text-slate-400 block">
                          {m.contactCoveragePercent}% coverage
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 text-xs font-bold rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                          {m.qualifiedBusinessesCount} Leads
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-200 font-semibold">
                        {m.totalOpportunitiesCount}
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-300">{m.researchCoverageScore}/100</span>
                      </td>
                      <td className="p-3.5 text-xs text-slate-300 max-w-xs">
                        {m.recommendedNextAction}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SIDE-BY-SIDE BUSINESS CONTRASTING */}
      {activeTab === 'business_compare' && (
        <div className="bg-surface-100 border border-border rounded-xl p-5 space-y-6">
          <div className="border-b border-border pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              Cross-Market Entity Diagnostic Benchmark
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any two businesses from different geographic markets to compare their digital health, GBP presence, and lead scores side-by-side.
            </p>
          </div>

          {/* Business Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 bg-surface-50 border border-border rounded-lg space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Business A (Candidate Target)
              </label>
              <select
                value={selectedBizAId}
                onChange={e => setSelectedBizAId(e.target.value)}
                className="w-full bg-surface-100 border border-border text-white text-sm rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {allBusinesses.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.officialName} — {b.marketName}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3.5 bg-surface-50 border border-border rounded-lg space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Business B (Benchmark Entity)
              </label>
              <select
                value={selectedBizBId}
                onChange={e => setSelectedBizBId(e.target.value)}
                className="w-full bg-surface-100 border border-border text-white text-sm rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {allBusinesses.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.officialName} — {b.marketName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Comparison Cards & Dimensions */}
          {bizComparison && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-950/40 border border-indigo-700/50 rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                    Comparative Verdict & Strategic Evaluation
                  </h4>
                  <p className="text-sm text-slate-200 mt-1 leading-relaxed">
                    {bizComparison.verdict}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bizComparison.comparisonPoints.map((pt, pIdx) => (
                  <div key={pIdx} className="p-4 bg-surface-50 border border-border rounded-xl space-y-2">
                    <span className="text-xs font-bold text-slate-300 block">{pt.dimension}</span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div
                        className={`p-2.5 rounded-lg border ${
                          pt.advantage === 'business_a'
                            ? 'bg-blue-950/30 border-blue-500 text-white font-semibold'
                            : 'bg-surface-100 border-border text-slate-300'
                        }`}
                      >
                        <span className="text-[10px] text-slate-400 block truncate">
                          {bizComparison.businessA.officialName}
                        </span>
                        <span className="mt-1 block font-mono">{pt.valueA}</span>
                      </div>
                      <div
                        className={`p-2.5 rounded-lg border ${
                          pt.advantage === 'business_b'
                            ? 'bg-blue-950/30 border-blue-500 text-white font-semibold'
                            : 'bg-surface-100 border-border text-slate-300'
                        }`}
                      >
                        <span className="text-[10px] text-slate-400 block truncate">
                          {bizComparison.businessB.officialName}
                        </span>
                        <span className="mt-1 block font-mono">{pt.valueB}</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 block italic pt-1">
                      {pt.rationale}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HISTORICAL SNAPSHOTS */}
      {activeTab === 'history' && (
        <div className="bg-surface-100 border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Historical Market Comparison Snapshots
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Surveillance log capturing benchmark drift, business count expansion, and score shifts over time.
              </p>
            </div>
            <button
              onClick={handleSaveSnapshot}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Capture Current State
            </button>
          </div>

          <div className="space-y-3">
            {snapshots.length > 0 ? (
              snapshots.map(snap => (
                <div
                  key={snap.id}
                  className="p-4 bg-surface-50 border border-border rounded-xl flex items-center justify-between gap-4"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-white">{snap.name}</h4>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      Captured: {new Date(snap.capturedAt).toLocaleString()} • {Object.keys(snap.marketMetrics).length} markets recorded
                    </span>
                    <span className="text-xs text-amber-300/90 block mt-1">
                      {snap.summaryNotes}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        await repository.deleteMarketComparisonSnapshot(snap.id);
                        setSnapshots(prev => prev.filter(s => s.id !== snap.id));
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                      title="Delete Snapshot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 italic">
                No historical snapshots saved yet. Click &ldquo;Save Snapshot&rdquo; to begin tracking cross-market evolution.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attractiveness Weight Tuning Modal */}
      {showWeightModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-100 border border-border rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-blue-400" />
                  Market Attractiveness Scoring Weights
                </h3>
                <span className="text-xs text-slate-400">
                  Total Weight: {Object.values(weights).reduce((a, b) => a + b, 0)}% (Normalized to 100)
                </span>
              </div>
              <button
                onClick={() => setShowWeightModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {(Object.keys(weights) as (keyof MarketScoreWeights)[]).map(key => (
                <div key={key} className="space-y-1.5 p-2.5 bg-surface-50 border border-border rounded-lg">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="font-semibold capitalize">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <span className="font-mono font-bold text-blue-400">{weights[key]}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={weights[key]}
                    onChange={e => handleWeightChange(key, parseInt(e.target.value, 10))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <button
                onClick={handleResetWeights}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-surface-50 rounded transition-colors"
              >
                Reset to Defaults
              </button>
              <button
                onClick={() => setShowWeightModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
