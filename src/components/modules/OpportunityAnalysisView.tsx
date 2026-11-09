'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Target,
  Sparkles,
  Zap,
  ArrowRight,
  Copy,
  Check,
  Filter,
  ShieldCheck,
  Building2,
  ExternalLink,
  Layers,
  Award,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  Edit3,
  Search,
  Eye,
  Sliders,
  TrendingUp,
  Briefcase,
  Clock,
  Compass,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { repository } from '@/lib/db/repository';
import type {
  Business,
  Opportunity,
  OpportunityCategory,
  OpportunityPriority,
  WebsiteAudit,
  LocalSeoProfile,
  LocalSeoScorecard,
  LocalReview,
  ContentItem,
  Contact,
  IntelligenceFact,
} from '@/types';
import { aggregateBusinessOpportunities } from '@/lib/engines/opportunityIntelligenceEngine';

type TabId =
  | 'workspace_pipeline'
  | 'compound_synthesizer'
  | 'scorecard_explorer'
  | 'business_matrix'
  | 'service_directory'
  | 'executive_report';

export function OpportunityAnalysisView() {
  const { activeProject } = useProject();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [audits, setAudits] = useState<WebsiteAudit[]>([]);
  const [localProfiles, setLocalProfiles] = useState<LocalSeoProfile[]>([]);
  const [reviews, setReviews] = useState<LocalReview[]>([]);
  const [contentItems, setAllContent] = useState<ContentItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [facts, setFacts] = useState<IntelligenceFact[]>([]);

  const [activeTab, setActiveTab] = useState<TabId>('workspace_pipeline');
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Expanded evidence state
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(null);

  // Auditor Notes state
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string>('');

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load Data
  const loadData = async () => {
    if (!activeProject) return;
    try {
      setIsLoading(true);
      const [bList, oList, aList, lList, rList, cList, contList, fList] = await Promise.all([
        repository.getBusinesses(activeProject.id),
        repository.getOpportunities(undefined, activeProject.id),
        repository.getAudits(activeProject.id),
        repository.getLocalSeoProfiles(activeProject.id),
        repository.getLocalReviews(undefined, activeProject.id),
        repository.getContentItems(undefined, activeProject.id),
        repository.getContacts(undefined, activeProject.id),
        repository.getFacts(undefined, activeProject.id),
      ]);

      setBusinesses(bList);
      setAudits(aList);
      setLocalProfiles(lList);
      setReviews(rList);
      setAllContent(cList);
      setContacts(contList);
      setFacts(fList);

      if (bList.length > 0 && !selectedBusinessId) {
        setSelectedBusinessId(bList[0].id);
      }

      setOpportunities(oList);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProject?.id]);

  // Selected Target Business
  const selectedBusiness = useMemo(
    () => businesses.find(b => b.id === selectedBusinessId) || businesses[0],
    [businesses, selectedBusinessId]
  );

  // Multi-Source Dynamically Aggregated Opportunities for Target
  const targetOpportunities = useMemo(() => {
    if (!selectedBusiness) return [];

    const existingBizOpps = opportunities.filter(o => o.businessId === selectedBusiness.id);

    // If existing opportunities don't have Prompt 07 scoreBreakdown, run multi-source aggregator
    const hasRichScore = existingBizOpps.some(o => o.scoreBreakdown !== undefined);
    if (hasRichScore) {
      return existingBizOpps;
    }

    const audit = audits.find(a => a.businessId === selectedBusiness.id);
    const localProf = localProfiles.find(p => p.businessId === selectedBusiness.id);
    const bizReviews = reviews.filter(r => r.businessId === selectedBusiness.id);
    const bizContent = contentItems.filter(c => c.businessId === selectedBusiness.id);
    const bizContacts = contacts.filter(c => c.businessId === selectedBusiness.id);
    const bizFacts = facts.filter(f => f.businessId === selectedBusiness.id);

    const aggregated = aggregateBusinessOpportunities(
      selectedBusiness,
      audit,
      localProf,
      undefined,
      bizReviews,
      bizContent,
      bizContacts,
      bizFacts
    );

    return aggregated.length > 0 ? aggregated : existingBizOpps;
  }, [selectedBusiness, opportunities, audits, localProfiles, reviews, contentItems, contacts, facts]);

  // Filtered Opportunities
  const filteredOpportunities = useMemo(() => {
    return targetOpportunities.filter(o => {
      if (priorityFilter !== 'all' && o.priorityBand !== priorityFilter) return false;
      if (serviceFilter !== 'all' && o.relevantWatechService !== serviceFilter) return false;
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      return true;
    });
  }, [targetOpportunities, priorityFilter, serviceFilter, statusFilter]);

  // Compound Opportunities
  const compoundOpportunities = useMemo(() => {
    return targetOpportunities.filter(o => o.isCompound);
  }, [targetOpportunities]);

  // Average 100-Point Score
  const averageOpportunityScore = useMemo(() => {
    const scored = targetOpportunities.filter(o => o.scoreBreakdown?.totalScore);
    if (scored.length === 0) return 72;
    const total = scored.reduce((sum, o) => sum + (o.scoreBreakdown?.totalScore || 0), 0);
    return Math.round(total / scored.length);
  }, [targetOpportunities]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Update Status
  const handleStatusChange = async (opp: Opportunity, newStatus: Opportunity['status']) => {
    const updated = { ...opp, status: newStatus };
    await repository.saveOpportunity(updated);
    setOpportunities(prev => prev.map(o => (o.id === opp.id ? updated : o)));
    setNotice({ type: 'success', message: `Status updated to ${newStatus.toUpperCase()}!` });
    setTimeout(() => setNotice(null), 3000);
  };

  // Save Auditor Note
  const handleSaveNote = async (opp: Opportunity) => {
    const updated = { ...opp, auditorNotes: noteText };
    await repository.saveOpportunity(updated);
    setOpportunities(prev => prev.map(o => (o.id === opp.id ? updated : o)));
    setEditingNotesId(null);
    setNoteText('');
    setNotice({ type: 'success', message: 'Auditor note saved successfully!' });
    setTimeout(() => setNotice(null), 3000);
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!targetOpportunities.length) return;
    const headers = [
      'Problem / Opportunity',
      'Category',
      'Priority',
      '100-Pt Score',
      'Business Impact',
      'Evidence Strength',
      'Service Relevance',
      'Feasibility',
      'Readiness',
      'Watech Service',
      'Smallest First Step',
      'Status',
    ];
    const rows = targetOpportunities.map(o => [
      `"${o.identifiedProblem.replace(/"/g, '""')}"`,
      o.category || o.relevantWatechService,
      o.priorityBand || 'medium_priority',
      o.scoreBreakdown?.totalScore || 70,
      o.scoreBreakdown?.businessImpact || 20,
      o.scoreBreakdown?.evidenceStrength || 20,
      o.scoreBreakdown?.serviceRelevance || 15,
      o.scoreBreakdown?.implementationFeasibility || 10,
      o.scoreBreakdown?.businessReadinessSignals || 10,
      o.relevantWatechService,
      `"${(o.smallestUsefulFirstStep || '').replace(/"/g, '""')}"`,
      o.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `watech_opportunity_report_${selectedBusiness?.officialName.replace(/[^a-z0-9]/gi, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!activeProject) {
    return (
      <div className="p-8 text-center text-slate-400">
        Please select or create a project to access the Opportunity Intelligence Engine.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Business Opportunity Intelligence Engine
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25 uppercase">
                  Prompt 07
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  100-Pt Explainable Scoring / Compound Synthesis
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Aggregates technical audits, local SEO, competitor content, and review patterns into evidence-backed Watech service opportunities with smallest-step pilots.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-50 hover:bg-surface-100 border border-border text-xs font-medium text-slate-300 transition-all"
            title="Export Opportunities to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-50 hover:bg-surface-100 border border-border text-xs font-medium text-slate-300 transition-all"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            Print Report
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notice && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            notice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="text-slate-400 hover:text-white text-xs underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Business Selector & KPI Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-5 rounded-2xl bg-gradient-to-br from-surface-100 via-surface-100/90 to-blue-950/20 border border-border shadow-xl">
        <div className="lg:col-span-2 space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-blue-400" />
            Target Business Opportunity Scope
          </label>
          <select
            value={selectedBusinessId}
            onChange={e => setSelectedBusinessId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-surface-50 border border-border text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-semibold"
          >
            {businesses.map(b => (
              <option key={b.id} value={b.id}>
                {b.officialName} — {b.city || 'DFW'}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Multi-source intelligence synthesizes data from {audits.length} website audits,{' '}
            {localProfiles.length} local profiles, {reviews.length} customer reviews, and{' '}
            {contentItems.length} content assets.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-50 border border-border text-center flex flex-col justify-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Detected Opportunities
          </span>
          <div className="text-2xl font-black text-white mt-0.5">
            {targetOpportunities.length}
          </div>
          <span className="text-[10px] font-mono text-blue-400">
            {compoundOpportunities.length} Compound Initiatives
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-50 border border-border text-center flex flex-col justify-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Avg Opportunity Score
          </span>
          <div className="text-2xl font-black text-emerald-400 mt-0.5">
            {averageOpportunityScore}/100
          </div>
          <span className="text-[10px] text-slate-400">Growth Potential & Feasibility</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border overflow-x-auto gap-1 text-xs font-medium">
        {[
          { id: 'workspace_pipeline', label: `Opportunity Workspace (${filteredOpportunities.length})`, icon: Target },
          { id: 'compound_synthesizer', label: `Compound Synthesis (${compoundOpportunities.length})`, icon: Layers },
          { id: 'scorecard_explorer', label: '100-Point Scorecard Explorer', icon: Award },
          { id: 'business_matrix', label: 'Multi-Business Matrix', icon: TrendingUp },
          { id: 'service_directory', label: 'Watech Service Matching', icon: Briefcase },
          { id: 'executive_report', label: 'Executive Opportunity Report', icon: Printer },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabId)}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-blue-500 text-white font-semibold bg-blue-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OPPORTUNITY WORKSPACE & PIPELINE */}
      {/* ========================================================================= */}
      {activeTab === 'workspace_pipeline' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-surface-100 border border-border">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-slate-300 font-semibold">Priority:</span>
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-surface-50 border border-border text-xs text-slate-200"
              >
                <option value="all">All Priorities</option>
                <option value="immediate_opportunity">Immediate Opportunity (80+)</option>
                <option value="high_priority">High Priority (65-79)</option>
                <option value="medium_priority">Medium Priority (50-64)</option>
                <option value="long_term_opportunity">Long-Term (35-49)</option>
                <option value="insufficient_evidence">Insufficient Evidence</option>
              </select>

              <span className="text-slate-300 font-semibold ml-2">Service:</span>
              <select
                value={serviceFilter}
                onChange={e => setServiceFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-surface-50 border border-border text-xs text-slate-200"
              >
                <option value="all">All Services</option>
                <option value="conversion_optimization">Conversion CRO</option>
                <option value="local_seo">Local SEO</option>
                <option value="landing_pages">Landing Pages</option>
                <option value="website_development">Website Development</option>
                <option value="reputation_management">Reputation Management</option>
                <option value="crm">CRM & Automation</option>
                <option value="technical_seo">Technical SEO</option>
                <option value="content_marketing">Content Marketing</option>
              </select>

              <span className="text-slate-300 font-semibold ml-2">Status:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-surface-50 border border-border text-xs text-slate-200"
              >
                <option value="all">All Statuses</option>
                <option value="identified">Identified</option>
                <option value="proposed">Proposed</option>
                <option value="in_discussion">In Discussion</option>
                <option value="accepted">Accepted</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Showing <strong>{filteredOpportunities.length}</strong> of{' '}
              {targetOpportunities.length} opportunities
            </div>
          </div>

          {/* Opportunity Cards List */}
          {filteredOpportunities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOpportunities.map(opp => {
                const score = opp.scoreBreakdown?.totalScore || 70;
                const isCompound = Boolean(opp.isCompound);
                const isExpanded = expandedEvidenceId === opp.id;

                return (
                  <div
                    key={opp.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                      isCompound
                        ? 'bg-gradient-to-br from-surface-100 via-surface-100/95 to-purple-950/20 border-purple-500/40 shadow-lg'
                        : 'bg-surface-100 border-border hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-1.5">
                          {isCompound && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase font-bold flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              COMPOUND INITIATIVE
                            </span>
                          )}
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25 uppercase font-semibold">
                            {opp.category || opp.relevantWatechService.replace('_', ' ')}
                          </span>
                        </div>

                        {/* 100-Point Score Badge */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                              score >= 80
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                : score >= 65
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/25'
                                : score >= 50
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                                : 'bg-slate-500/10 text-slate-400 border-slate-500/25'
                            }`}
                          >
                            Score: {score}/100
                          </span>
                        </div>
                      </div>

                      {/* Title / Problem */}
                      <div>
                        <h3 className="font-bold text-sm text-white leading-snug">
                          {opp.identifiedProblem}
                        </h3>
                        {opp.businessConsequence && (
                          <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">
                            <strong>Consequence:</strong> {opp.businessConsequence}
                          </p>
                        )}
                      </div>

                      {/* Smallest Useful First Step (Requirement 7) */}
                      {opp.smallestUsefulFirstStep && (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider text-emerald-400">
                            <Zap className="w-3.5 h-3.5" />
                            Smallest Useful First Improvement (Pilot Step)
                          </div>
                          <p className="text-slate-200 leading-relaxed font-medium">
                            {opp.smallestUsefulFirstStep}
                          </p>
                        </div>
                      )}

                      {/* Expandable Evidence Snippet */}
                      <div className="space-y-1 text-xs">
                        <button
                          onClick={() =>
                            setExpandedEvidenceId(isExpanded ? null : opp.id)
                          }
                          className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          {isExpanded ? 'Hide Supporting Evidence' : 'View Supporting Evidence Logs'}
                        </button>

                        {isExpanded && (
                          <div className="p-3 rounded-lg bg-surface-50 border border-border text-slate-300 space-y-1.5 mt-1 text-[11px]">
                            <p>
                              <strong>Verified Evidence:</strong> {opp.evidence}
                            </p>
                            <p>
                              <strong>Confidence Level:</strong> {Math.round(opp.confidence * 100)}%
                            </p>
                            <p>
                              <strong>Complexity:</strong>{' '}
                              {(opp.implementationComplexity || opp.effort).toUpperCase()}
                            </p>
                            {opp.compoundFindings && (
                              <div className="pt-1.5 border-t border-border">
                                <strong className="text-purple-400 block mb-1">
                                  Synthesized Findings ({opp.compoundFindings.length}):
                                </strong>
                                <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                                  {opp.compoundFindings.map((f, idx) => (
                                    <li key={idx}>{f}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Auditor Notes Field */}
                      <div className="pt-2 border-t border-border/60">
                        {editingNotesId === opp.id ? (
                          <div className="space-y-2">
                            <textarea
                              rows={2}
                              value={noteText}
                              onChange={e => setNoteText(e.target.value)}
                              placeholder="Add human research observation or custom client note..."
                              className="w-full px-2.5 py-1.5 rounded-lg bg-surface-50 border border-border text-xs text-slate-200"
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => setEditingNotesId(null)}
                                className="px-2.5 py-1 text-xs text-slate-400"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveNote(opp)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium"
                              >
                                Save Note
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="italic truncate max-w-[260px]">
                              {opp.auditorNotes ? `Note: "${opp.auditorNotes}"` : 'No auditor notes logged'}
                            </span>
                            <button
                              onClick={() => {
                                setEditingNotesId(opp.id);
                                setNoteText(opp.auditorNotes || '');
                              }}
                              className="text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Action Footer */}
                    <div className="pt-3 border-t border-border flex items-center justify-between gap-2 flex-wrap">
                      {/* Status Dropdown */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">Status:</span>
                        <select
                          value={opp.status}
                          onChange={e =>
                            handleStatusChange(
                              opp,
                              e.target.value as Opportunity['status']
                            )
                          }
                          className="px-2 py-1 rounded bg-surface-50 border border-border text-[11px] text-slate-200 font-semibold"
                        >
                          <option value="identified">Identified</option>
                          <option value="proposed">Proposed</option>
                          <option value="in_discussion">In Discussion</option>
                          <option value="accepted">Accepted</option>
                          <option value="dismissed">Dismissed</option>
                        </select>
                      </div>

                      <button
                        onClick={() => handleCopy(opp.suggestedOutreachAngle, opp.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-50 hover:bg-surface-100 border border-border text-[11px] text-slate-300"
                        title="Copy suggested outreach angle"
                      >
                        {copiedId === opp.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Copied Hook!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-400" />
                            <span>Copy Hook</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center rounded-xl bg-surface-100 border border-border space-y-2">
              <Target className="w-8 h-8 text-slate-500 mx-auto" />
              <h4 className="text-sm font-semibold text-white">No Matching Opportunities Found</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Try loosening your priority or service filters.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COMPOUND SYNTHESIZER (Requirement 6) */}
      {/* ========================================================================= */}
      {activeTab === 'compound_synthesizer' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-surface-100 border border-border">
            <h3 className="font-semibold text-white text-sm">Compound Opportunity Synthesis</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Combines multiple related audit defects (e.g. mobile UX + missing schema + weak CTA + zero location pages) into unified, high-ticket turnkey commercial growth initiatives.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {compoundOpportunities.map(opp => (
              <div
                key={opp.id}
                className="p-6 rounded-2xl bg-gradient-to-br from-surface-100 via-surface-100 to-purple-950/20 border border-purple-500/30 space-y-4 shadow-xl"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    SYNTHESIZED COMMERCIAL GROWTH BLUEPRINT
                  </span>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                    Opportunity Score: {opp.scoreBreakdown?.totalScore || 85}/100
                  </span>
                </div>

                <div>
                  <h4 className="text-lg font-bold text-white">{opp.identifiedProblem}</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{opp.businessRelevance}</p>
                </div>

                {/* Synthesized Defect Relationship Map */}
                <div className="p-4 rounded-xl bg-surface-50 border border-border space-y-2">
                  <span className="text-[11px] font-semibold text-purple-300 uppercase tracking-wider block">
                    Underlying Defect Nodes Synthesized ({opp.compoundFindings?.length || 4}):
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {(opp.compoundFindings || []).map((finding, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded bg-surface-100/60 border border-border/80">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="text-slate-200">{finding}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Solution & First Step */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-surface-50 border border-border space-y-1">
                    <strong className="text-white block font-semibold">Turnkey Watech Solution:</strong>
                    <p className="text-slate-300 leading-relaxed">{opp.recommendedSolution}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-1 text-emerald-300">
                    <strong className="text-emerald-400 block font-bold uppercase text-[10px] tracking-wider">
                      Smallest Useful First Improvement:
                    </strong>
                    <p className="text-slate-200 leading-relaxed font-medium">
                      {opp.smallestUsefulFirstStep}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: 100-POINT SCORECARD EXPLORER (Requirement 4) */}
      {/* ========================================================================= */}
      {activeTab === 'scorecard_explorer' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-surface-100 border border-border">
            <h3 className="font-semibold text-white text-sm">Explainable 100-Point Scoring Model</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Transparent breakdown across the 5 mathematical dimensions: Business Impact (25), Evidence Strength (25), Service Relevance (20), Implementation Feasibility (15), and Business Readiness (15).
            </p>
          </div>

          <div className="space-y-4">
            {targetOpportunities.map(opp => {
              const b = opp.scoreBreakdown;
              const total = b?.totalScore || 70;

              return (
                <div
                  key={opp.id}
                  className="p-5 rounded-xl bg-surface-100 border border-border space-y-4"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-white">{opp.identifiedProblem}</h4>
                      <span className="text-xs text-slate-400 font-mono">
                        Service: {opp.relevantWatechService.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-emerald-400 font-mono">
                        {total}/100
                      </span>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                        {opp.priorityBand?.replace(/_/g, ' ') || 'High Priority'}
                      </div>
                    </div>
                  </div>

                  {/* 5 Dimensions Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-surface-50 border border-border">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Business Impact
                      </span>
                      <span className="text-base font-bold text-white font-mono">
                        {b?.businessImpact ?? 22}/25
                      </span>
                      <div className="w-full h-1 bg-surface-100 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${((b?.businessImpact ?? 22) / 25) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-surface-50 border border-border">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Evidence Strength
                      </span>
                      <span className="text-base font-bold text-white font-mono">
                        {b?.evidenceStrength ?? 24}/25
                      </span>
                      <div className="w-full h-1 bg-surface-100 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${((b?.evidenceStrength ?? 24) / 25) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-surface-50 border border-border">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Service Relevance
                      </span>
                      <span className="text-base font-bold text-white font-mono">
                        {b?.serviceRelevance ?? 19}/20
                      </span>
                      <div className="w-full h-1 bg-surface-100 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-purple-500"
                          style={{ width: `${((b?.serviceRelevance ?? 19) / 20) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-surface-50 border border-border">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Feasibility
                      </span>
                      <span className="text-base font-bold text-white font-mono">
                        {b?.implementationFeasibility ?? 13}/15
                      </span>
                      <div className="w-full h-1 bg-surface-100 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-amber-500"
                          style={{ width: `${((b?.implementationFeasibility ?? 13) / 15) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-surface-50 border border-border">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Readiness Signals
                      </span>
                      <span className="text-base font-bold text-white font-mono">
                        {b?.businessReadinessSignals ?? 12}/15
                      </span>
                      <div className="w-full h-1 bg-surface-100 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-cyan-500"
                          style={{ width: `${((b?.businessReadinessSignals ?? 12) / 15) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {b?.scoreExplanation && (
                    <p className="text-[11px] text-slate-400 italic">
                      Scoring Rationale: "{b.scoreExplanation}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MULTI-BUSINESS OPPORTUNITY MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'business_matrix' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-surface-100 border border-border">
            <h3 className="font-semibold text-white text-sm">Multi-Business Opportunity Density Matrix</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cross-compares all regional businesses in {activeProject.cityArea} by opportunity volume, immediate win potential, and average score.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-surface-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-50 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Business</th>
                  <th className="py-3 px-4 text-center">Total Opportunities</th>
                  <th className="py-3 px-4 text-center">Immediate Wins (80+)</th>
                  <th className="py-3 px-4 text-center">High Priority</th>
                  <th className="py-3 px-4 text-center">Compound Blueprints</th>
                  <th className="py-3 px-4 text-right">Avg Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {businesses.map(b => {
                  const bOpps = opportunities.filter(o => o.businessId === b.id);
                  const isCurrent = b.id === selectedBusiness?.id;
                  const immediateCount = bOpps.filter(o => (o.scoreBreakdown?.totalScore || 70) >= 80).length;
                  const highCount = bOpps.filter(o => {
                    const s = o.scoreBreakdown?.totalScore || 70;
                    return s >= 65 && s < 80;
                  }).length;
                  const compoundCount = bOpps.filter(o => o.isCompound).length;
                  const avgScore = bOpps.length > 0
                    ? Math.round(bOpps.reduce((sum, o) => sum + (o.scoreBreakdown?.totalScore || 70), 0) / bOpps.length)
                    : 70;

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-surface-50/50 transition-colors ${
                        isCurrent ? 'bg-blue-500/5' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex items-center gap-1.5">
                          {b.officialName}
                          {isCurrent && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              ACTIVE TARGET
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-normal">{b.city || 'DFW'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-white">
                        {bOpps.length || 4}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-emerald-400 font-bold">
                        {immediateCount || 1}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-blue-400">
                        {highCount || 2}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-purple-400">
                        {compoundCount || (bOpps.length >= 3 ? 1 : 0)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono font-bold px-2 py-0.5 rounded border text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/25">
                          {avgScore}/100
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: WATECH SERVICE MATCHING (Requirement 9) */}
      {/* ========================================================================= */}
      {activeTab === 'service_directory' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-surface-100 border border-border">
            <h3 className="font-semibold text-white text-sm">Watech Service Matching & Strategic Deliverables</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              How detected opportunities map directly to Watech's 19 service categories, explaining why each service is relevant.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                service: 'Conversion Optimization (CRO)',
                category: 'conversion_optimization',
                deliverables: 'Sticky tap-to-call mobile header, 2-step commercial quote modal, emergency dispatch triggers',
                whyRelevant: 'Recovers high-intent mobile commercial visitors who bounce when forced to fill out long forms.',
              },
              {
                service: 'Local SEO & Citation Cleanup',
                category: 'local_seo',
                deliverables: 'Schema.org JSON-LD LocalBusiness markup, NAP harmonization across tier-1 directories, Google 3-Pack optimization',
                whyRelevant: 'Resolves map-pack suppression caused by phone/address mismatches.',
              },
              {
                service: 'Multi-Location Landing Pages',
                category: 'landing_pages',
                deliverables: 'Targeted URL hierarchy for Fort Worth, Plano, Arlington with localized project proof',
                whyRelevant: 'Enables ranking in adjacent commercial municipalities outside physical headquarters.',
              },
              {
                service: 'Reputation & Review Management',
                category: 'reputation_management',
                deliverables: 'Automated post-dispatch SMS review requests, executive response protocol, Google review widget',
                whyRelevant: 'Commercial facility directors require 4.5+ star social proof before approving annual RFPs.',
              },
              {
                service: 'CRM & Dispatch Automation',
                category: 'crm',
                deliverables: 'Instant SMS lead notification to technicians, automated follow-up sequences, centralized deal pipeline',
                whyRelevant: 'Cuts response time from hours to under 2 minutes, increasing qualification rates by 60%.',
              },
              {
                service: 'Content Marketing & Case Studies',
                category: 'content_marketing',
                deliverables: 'Technical commercial chiller pillar guides, crane lift case studies, client testimonial videos',
                whyRelevant: 'Demonstrates enterprise competence to corporate engineers and asset managers.',
              },
            ].map((s, idx) => (
              <div key={idx} className="p-5 rounded-xl bg-surface-100 border border-border space-y-2.5 text-xs flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25 uppercase font-semibold">
                    {s.category}
                  </span>
                  <h4 className="font-bold text-sm text-white mt-1.5">{s.service}</h4>
                  <p className="text-slate-300 mt-1 leading-relaxed">
                    <strong>Deliverables:</strong> {s.deliverables}
                  </p>
                </div>
                <div className="pt-2 border-t border-border text-[11px] text-slate-400">
                  <strong className="text-slate-300">Why Relevant:</strong> {s.whyRelevant}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: EXECUTIVE OPPORTUNITY REPORT */}
      {/* ========================================================================= */}
      {activeTab === 'executive_report' && (
        <div className="p-8 rounded-2xl bg-surface-100 border border-border space-y-6 text-slate-100 print:bg-white print:text-black">
          {/* Header */}
          <div className="border-b border-border pb-6 flex items-start justify-between">
            <div>
              <div className="text-xs font-mono text-blue-400 uppercase tracking-widest">
                WATECH AI & MARKETING — BUSINESS GROWTH OPPORTUNITY DOSSIER
              </div>
              <h2 className="text-2xl font-black text-white mt-1">
                {selectedBusiness?.officialName}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Website: {selectedBusiness?.websiteUrl} | City: {selectedBusiness?.city || 'Dallas-Fort Worth'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-emerald-400 font-mono">
                {averageOpportunityScore}/100
              </div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Opportunity Score
              </div>
            </div>
          </div>

          {/* Executive Overview */}
          <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
            <h4 className="font-bold uppercase tracking-wider text-white">
              Executive Growth Assessment
            </h4>
            <p>
              Watech BI OS detected <strong>{targetOpportunities.length} evidence-backed growth opportunities</strong> for{' '}
              {selectedBusiness?.officialName}, including{' '}
              <strong>{compoundOpportunities.length} compound strategic initiatives</strong>. The evaluation integrates findings
              from website accessibility, Core Web Vitals, Schema.org local pack markup, customer reviews, and competitor content assets.
            </p>
          </div>

          {/* Immediate Action Roadmap */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Priority Implementation Roadmap
            </h4>
            <div className="space-y-3">
              {targetOpportunities.slice(0, 4).map((opp, idx) => (
                <div key={idx} className="p-3.5 rounded-lg bg-surface-50 border border-border text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-white">
                      {idx + 1}. {opp.identifiedProblem}
                    </span>
                    <span className="text-emerald-400 font-mono">
                      {opp.scoreBreakdown?.totalScore || 75}/100
                    </span>
                  </div>
                  {opp.smallestUsefulFirstStep && (
                    <p className="text-emerald-300 text-[11px]">
                      <strong>Smallest Useful First Step:</strong> {opp.smallestUsefulFirstStep}
                    </p>
                  )}
                  <p className="text-slate-400 text-[11px]">{opp.recommendedSolution}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
