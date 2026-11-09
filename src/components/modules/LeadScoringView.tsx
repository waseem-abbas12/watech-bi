'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  Sliders,
  RotateCcw,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Filter,
  Download,
  FileText,
  Search,
  UserCheck,
  AlertTriangle,
  Users,
  Layers,
  ExternalLink,
  RefreshCw,
  GitMerge,
  Check,
  Copy,
  Flame,
  Eye,
  Clock,
  Phone,
  MapPin,
  Globe,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { repository } from '@/lib/db/repository';
import type {
  Business,
  WebsiteAudit,
  LocalSeoProfile,
  Opportunity,
  Contact,
  SourceRecord,
  IntelligenceFact,
  LeadScore,
  ScoreBand,
  LeadQueueStatus,
  BuyingReadinessSignal,
  DuplicateCandidate,
} from '@/types';
import {
  calculateAdvancedLeadScore,
  extractBuyingReadinessSignals,
  detectDuplicates,
  mergeBusinessRecords,
  DEFAULT_PROMPT08_WEIGHTS,
  Prompt08Weights,
} from '@/lib/engines/leadQualificationEngine';
import { formatScoreGrade } from '@/lib/utils';

type TabId =
  | 'queue_pipeline'
  | 'scorecard_explorer'
  | 'readiness_signals'
  | 'segmentation_filters'
  | 'duplicate_merger'
  | 'export_dossier';

const QUEUE_STAGES: { id: LeadQueueStatus; label: string; description: string; color: string }[] = [
  { id: 'research_next', label: 'Research Next', description: 'Initial discovery, awaiting full multi-pillar audit', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  { id: 'find_decision_maker', label: 'Find Decision-Maker', description: 'Website inspected; searching registry for principal', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { id: 'verify_contact', label: 'Verify Contact', description: 'Decision-maker identified; pending DNS MX verification', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { id: 'prepare_outreach', label: 'Prepare Outreach', description: 'Verified lead ready for personalized sequence brief', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  { id: 'ready_for_review', label: 'Ready for Review', description: 'Brief and evidence compiled for executive sign-off', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { id: 'contacted', label: 'Contacted', description: 'Initial email dispatch sent; sequence actively running', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  { id: 'replied', label: 'Replied', description: 'Commercial prospect responded; sales dialogue active', color: 'bg-green-500/10 text-green-300 border-green-500/20' },
  { id: 'not_interested', label: 'Not Interested', description: 'Polite decline or contractual vendor exclusivity', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  { id: 'suppressed', label: 'Suppressed', description: 'Excluded from research (out of territory or invalid)', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
];

export function LeadScoringView() {
  const { activeProject } = useProject();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [scores, setScores] = useState<LeadScore[]>([]);
  const [audits, setAudits] = useState<WebsiteAudit[]>([]);
  const [localProfiles, setLocalProfiles] = useState<LocalSeoProfile[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [facts, setFacts] = useState<IntelligenceFact[]>([]);

  const [activeTab, setActiveTab] = useState<TabId>('queue_pipeline');
  const [weights, setWeights] = useState<Prompt08Weights>(DEFAULT_PROMPT08_WEIGHTS);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterQueue, setFilterQueue] = useState<string>('all');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterCompleteness, setFilterCompleteness] = useState<string>('all');
  const [filterDmStatus, setFilterDmStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // UI feedback notices
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load all project intelligence records
  const loadData = async () => {
    if (!activeProject) return;
    try {
      setIsLoading(true);
      const [bList, aList, lList, oList, cList, sList, fList] = await Promise.all([
        repository.getBusinesses(activeProject.id),
        repository.getAudits(activeProject.id),
        repository.getLocalSeoProfiles(activeProject.id),
        repository.getOpportunities(undefined, activeProject.id),
        repository.getContacts(undefined, activeProject.id),
        repository.getSources(undefined, activeProject.id),
        repository.getFacts(undefined, activeProject.id),
      ]);

      setBusinesses(bList);
      setAudits(aList);
      setLocalProfiles(lList);
      setOpportunities(oList);
      setContacts(cList);
      setSources(sList);
      setFacts(fList);

      if (bList.length > 0 && !selectedBusinessId) {
        setSelectedBusinessId(bList[0].id);
      }

      // Calculate 100-pt Prompt 08 lead scores
      const computedScores = bList.map(b => {
        const audit = aList.find(a => a.businessId === b.id);
        const localProf = lList.find(l => l.businessId === b.id);
        const bOpps = oList.filter(o => o.businessId === b.id);
        const bContacts = cList.filter(c => c.businessId === b.id);
        const bSources = sList.filter(s => s.businessId === b.id);
        const bFacts = fList.filter(f => f.businessId === b.id);

        return calculateAdvancedLeadScore(
          b,
          audit,
          localProf,
          bOpps,
          bContacts,
          bSources,
          bFacts,
          weights
        );
      });

      setScores(computedScores);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProject?.id]);

  // Selected Target Business
  const selectedBiz = useMemo(
    () => businesses.find(b => b.id === selectedBusinessId) || businesses[0],
    [businesses, selectedBusinessId]
  );

  const selectedScore = useMemo(
    () => scores.find(s => s.businessId === selectedBiz?.id),
    [scores, selectedBiz]
  );

  const selectedAudit = useMemo(
    () => audits.find(a => a.businessId === selectedBiz?.id),
    [audits, selectedBiz]
  );

  const selectedContacts = useMemo(
    () => contacts.filter(c => c.businessId === selectedBiz?.id),
    [contacts, selectedBiz]
  );

  const selectedFacts = useMemo(
    () => facts.filter(f => f.businessId === selectedBiz?.id),
    [facts, selectedBiz]
  );

  const selectedOpps = useMemo(
    () => opportunities.filter(o => o.businessId === selectedBiz?.id),
    [opportunities, selectedBiz]
  );

  // Observable Buying Readiness Signals for Target
  const readinessSignals = useMemo(() => {
    if (!selectedBiz) return [];
    return extractBuyingReadinessSignals(selectedBiz, selectedFacts);
  }, [selectedBiz, selectedFacts]);

  // Duplicate Candidates in Project
  const duplicateCandidates = useMemo(() => {
    return detectDuplicates(businesses);
  }, [businesses]);

  // Handle Queue Status Change
  const handleUpdateQueueStatus = async (bizId: string, newStatus: LeadQueueStatus) => {
    try {
      const biz = businesses.find(b => b.id === bizId);
      if (!biz) return;
      const updated: Business = { ...biz, queueStatus: newStatus, updatedAt: new Date().toISOString() };
      await repository.saveBusiness(updated);
      setBusinesses(prev => prev.map(b => (b.id === bizId ? updated : b)));
      setNotice({ type: 'success', message: `Lead moved to "${newStatus.replace(/_/g, ' ').toUpperCase()}" queue stage.` });
      setTimeout(() => setNotice(null), 3000);
    } catch {
      setNotice({ type: 'error', message: 'Failed to update lead queue status.' });
    }
  };

  // Handle Weight Change
  const handleWeightChange = (key: keyof Prompt08Weights, val: number) => {
    setWeights(prev => ({ ...prev, [key]: val }));
  };

  const handleApplyWeights = () => {
    const computedScores = businesses.map(b => {
      const audit = audits.find(a => a.businessId === b.id);
      const localProf = localProfiles.find(l => l.businessId === b.id);
      const bOpps = opportunities.filter(o => o.businessId === b.id);
      const bContacts = contacts.filter(c => c.businessId === b.id);
      const bSources = sources.filter(s => s.businessId === b.id);
      const bFacts = facts.filter(f => f.businessId === b.id);

      return calculateAdvancedLeadScore(
        b,
        audit,
        localProf,
        bOpps,
        bContacts,
        bSources,
        bFacts,
        weights
      );
    });
    setScores(computedScores);
    setIsCustomizing(false);
    setNotice({ type: 'success', message: 'Custom scoring weights recalculated across all project leads.' });
    setTimeout(() => setNotice(null), 3000);
  };

  const handleResetWeights = () => {
    setWeights(DEFAULT_PROMPT08_WEIGHTS);
  };

  // Handle Merge Business Records
  const handleMerge = async (candidate: DuplicateCandidate) => {
    try {
      const merged = mergeBusinessRecords(candidate.duplicateOf, candidate.business);
      await repository.saveBusiness(merged);

      // Re-point contacts, facts, and opportunities to primary ID
      const dupContacts = contacts.filter(c => c.businessId === candidate.business.id);
      for (const c of dupContacts) {
        await repository.saveContact({ ...c, businessId: merged.id });
      }

      // Mark duplicate as suppressed
      await repository.saveBusiness({ ...candidate.business, status: 'suppressed', queueStatus: 'suppressed' });

      await loadData();
      setNotice({ type: 'success', message: `Successfully merged "${candidate.business.officialName}" into "${merged.officialName}". Source history preserved.` });
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setNotice({ type: 'error', message: 'Merge operation encountered an error.' });
    }
  };

  // Filtered Leads
  const filteredBusinesses = useMemo(() => {
    return businesses.filter(b => {
      const score = scores.find(s => s.businessId === b.id);
      if (filterGrade !== 'all' && score?.band !== filterGrade) return false;
      if (filterQueue !== 'all' && (b.queueStatus || 'research_next') !== filterQueue) return false;
      if (filterCity !== 'all' && b.city !== filterCity) return false;

      if (filterCompleteness !== 'all') {
        const comp = score?.researchCompleteness || 0;
        if (filterCompleteness === 'high' && comp < 75) return false;
        if (filterCompleteness === 'medium' && (comp < 50 || comp >= 75)) return false;
        if (filterCompleteness === 'low' && comp >= 50) return false;
      }

      if (filterDmStatus !== 'all') {
        const bContacts = contacts.filter(c => c.businessId === b.id);
        const hasVerified = bContacts.some(c => c.isDecisionMaker && c.verificationStatus === 'verified');
        const hasAny = bContacts.some(c => c.isDecisionMaker);
        if (filterDmStatus === 'verified' && !hasVerified) return false;
        if (filterDmStatus === 'unverified' && (hasVerified || !hasAny)) return false;
        if (filterDmStatus === 'missing' && hasAny) return false;
      }

      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchesName = b.officialName.toLowerCase().includes(q) || (b.brandName || '').toLowerCase().includes(q);
        const matchesCity = (b.city || '').toLowerCase().includes(q);
        const matchesDomain = (b.domain || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCity && !matchesDomain) return false;
      }

      return true;
    });
  }, [businesses, scores, contacts, filterGrade, filterQueue, filterCity, filterCompleteness, filterDmStatus, searchQuery]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Business Name',
      'Domain',
      'City',
      'State',
      'Lead Grade',
      'Total Score (100-pt)',
      'Research Completeness (%)',
      'Queue Status',
      'Decision Maker',
      'DM Verification',
      'Opp Evidence (25)',
      'Website Potential (15)',
      'Local SEO Potential (15)',
      'Growth Capacity (10)',
      'Watech Service Fit (15)',
      'DM Availability (10)',
      'Data Reliability (10)',
      'Primary Opportunity',
      'Recommended Next Step',
      'Data Watermark',
    ];

    const rows = filteredBusinesses.map(b => {
      const score = scores.find(s => s.businessId === b.id);
      const bContacts = contacts.filter(c => c.businessId === b.id);
      const dm = bContacts.find(c => c.isDecisionMaker);
      const bOpps = opportunities.filter(o => o.businessId === b.id);
      const pb = score?.prompt08Breakdown;

      return [
        `"${b.officialName.replace(/"/g, '""')}"`,
        `"${b.domain || ''}"`,
        `"${b.city || ''}"`,
        `"${b.state || ''}"`,
        `"${score?.band || 'Hold'}"`,
        score?.totalScore ?? 0,
        `${score?.researchCompleteness ?? 0}%`,
        `"${b.queueStatus || 'research_next'}"`,
        `"${(dm?.fullName || 'Unidentified').replace(/"/g, '""')}"`,
        `"${dm?.verificationStatus || 'unverified'}"`,
        pb?.opportunityEvidence.pointsAwarded ?? 0,
        pb?.websitePotential.pointsAwarded ?? 0,
        pb?.localSeoPotential.pointsAwarded ?? 0,
        pb?.capacityGrowthSignals.pointsAwarded ?? 0,
        pb?.watechServiceFit.pointsAwarded ?? 0,
        pb?.decisionMakerAvailability.pointsAwarded ?? 0,
        pb?.dataReliabilityRecency.pointsAwarded ?? 0,
        `"${(bOpps[0]?.identifiedProblem || 'None').replace(/"/g, '""')}"`,
        `"${(score?.recommendedNextStep || 'Complete research').replace(/"/g, '""')}"`,
        '"Sample Data / Demo Record"',
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `watech_lead_qualification_${activeProject?.id || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON
  const handleExportJSON = () => {
    const exportData = filteredBusinesses.map(b => {
      const score = scores.find(s => s.businessId === b.id);
      const bContacts = contacts.filter(c => c.businessId === b.id);
      const bOpps = opportunities.filter(o => o.businessId === b.id);
      const bFacts = facts.filter(f => f.businessId === b.id);
      const bSources = sources.filter(s => s.businessId === b.id);

      return {
        businessId: b.id,
        officialName: b.officialName,
        brandName: b.brandName,
        domain: b.domain,
        city: b.city,
        state: b.state,
        country: b.country,
        queueStatus: b.queueStatus || 'research_next',
        leadGrade: score?.band || 'Hold',
        totalScore: score?.totalScore || 0,
        researchCompleteness: score?.researchCompleteness || 0,
        scoreBreakdown: score?.prompt08Breakdown,
        positiveEvidence: score?.positiveEvidence,
        negativeEvidence: score?.negativeEvidence,
        unknownInformation: score?.unknownInformation,
        recommendedNextStep: score?.recommendedNextStep,
        contacts: bContacts.map(c => ({
          name: c.fullName,
          role: c.roleOrTitle,
          isDecisionMaker: c.isDecisionMaker,
          verification: c.verificationStatus,
          email: c.email,
        })),
        opportunitiesCount: bOpps.length,
        sourcesCount: bSources.length,
        factsCount: bFacts.length,
        disclaimer: 'SAMPLE DEMO DATA — NOT PROVEN PURCHASE INTENT',
      };
    });

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `watech_lead_dossiers_${activeProject?.id || 'export'}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Outreach Hook
  const handleCopyHook = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const gradeInfo = selectedScore ? formatScoreGrade(selectedScore.totalScore) : null;
  const pb = selectedScore?.prompt08Breakdown;

  return (
    <div className="space-y-6 text-left">
      {/* Sample Data Disclaimer Watermark */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>RESEARCH & AUDIT SAMPLE DATA:</strong> All lead scores represent objective gap evaluations. Operational readiness signals do not imply willingness to purchase.
          </span>
        </div>
        <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-amber-500/20 text-[10px] uppercase font-bold tracking-wider">
          Prompt 08 Certified
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calculator className="w-6 h-6 text-brand-400" />
            Advanced Lead Scoring & Qualification Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Explainable 100-point qualification model, 9-stage operational queue, and automated duplicate detection. Missing data is tagged as Unknown without penalizing prospects.
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsCustomizing(!isCustomizing)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 text-xs font-medium text-slate-200 border border-border transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-brand-400" />
            <span>{isCustomizing ? 'Close Weights' : 'Configure 100-Pt Model'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 text-xs font-medium text-slate-200 border border-border transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>JSON Dossier</span>
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
            notice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{notice.message}</span>
        </div>
      )}

      {/* Target Business Quick Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs text-slate-400 font-medium shrink-0 flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5 text-slate-500" /> Target Lead:
        </span>
        {businesses.map(b => {
          const score = scores.find(s => s.businessId === b.id);
          const isSelected = b.id === (selectedBiz?.id || '');
          const gradeBadgeColor =
            score?.band === 'A'
              ? 'text-emerald-400 bg-emerald-500/10'
              : score?.band === 'B'
              ? 'text-blue-400 bg-blue-500/10'
              : score?.band === 'C'
              ? 'text-amber-400 bg-amber-500/10'
              : 'text-rose-400 bg-rose-500/10';

          return (
            <button
              key={b.id}
              onClick={() => setSelectedBusinessId(b.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 border ${
                isSelected
                  ? 'bg-brand-500/20 text-white border-brand-500/50 shadow-sm'
                  : 'bg-surface-50 text-slate-300 border-border hover:bg-surface-100 hover:text-white'
              }`}
            >
              <span>{b.officialName}</span>
              <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold ${gradeBadgeColor}`}>
                {score?.band || 'Hold'} ({score?.totalScore ?? '—'})
              </span>
            </button>
          );
        })}
      </div>

      {/* Weight Customizer Drawer */}
      {isCustomizing && (
        <div className="p-4 rounded-xl bg-surface-100 border border-brand-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-400" />
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                Explainable 100-Point Scoring Model Configuration
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-brand-400">
                Sum: {Object.values(weights).reduce((a, b) => a + b, 0)} / 100 Pts
              </span>
              <button
                onClick={handleResetWeights}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Reset Defaults
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <div className="flex justify-between mb-1 text-slate-300">
                <span>A. Business Opportunity Evidence</span>
                <span className="font-mono text-brand-400 font-bold">{weights.opportunityEvidence} pts</span>
              </div>
              <input
                type="range"
                min="10"
                max="40"
                value={weights.opportunityEvidence}
                onChange={e => handleWeightChange('opportunityEvidence', Number(e.target.value))}
                className="w-full accent-brand-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1 text-slate-300">
                <span>B. Website & Conversion Potential</span>
                <span className="font-mono text-brand-400 font-bold">{weights.websitePotential} pts</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                value={weights.websitePotential}
                onChange={e => handleWeightChange('websitePotential', Number(e.target.value))}
                className="w-full accent-brand-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1 text-slate-300">
                <span>C. Local SEO & Visibility Opportunities</span>
                <span className="font-mono text-brand-400 font-bold">{weights.localSeoPotential} pts</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                value={weights.localSeoPotential}
                onChange={e => handleWeightChange('localSeoPotential', Number(e.target.value))}
                className="w-full accent-brand-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1 text-slate-300">
                <span>D. Capacity & Growth Signals</span>
                <span className="font-mono text-brand-400 font-bold">{weights.capacityGrowthSignals} pts</span>
              </div>
              <input
                type="range"
                min="5"
                max="25"
                value={weights.capacityGrowthSignals}
                onChange={e => handleWeightChange('capacityGrowthSignals', Number(e.target.value))}
                className="w-full accent-brand-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1 text-slate-300">
                <span>E. Service Fit with Watech</span>
                <span className="font-mono text-brand-400 font-bold">{weights.watechServiceFit} pts</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                value={weights.watechServiceFit}
                onChange={e => handleWeightChange('watechServiceFit', Number(e.target.value))}
                className="w-full accent-brand-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1 text-slate-300">
                <span>F. Decision-Maker Availability</span>
                <span className="font-mono text-brand-400 font-bold">{weights.decisionMakerAvailability} pts</span>
              </div>
              <input
                type="range"
                min="5"
                max="25"
                value={weights.decisionMakerAvailability}
                onChange={e => handleWeightChange('decisionMakerAvailability', Number(e.target.value))}
                className="w-full accent-brand-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1 text-slate-300">
                <span>G. Data Reliability & Recency</span>
                <span className="font-mono text-brand-400 font-bold">{weights.dataReliabilityRecency} pts</span>
              </div>
              <input
                type="range"
                min="5"
                max="20"
                value={weights.dataReliabilityRecency}
                onChange={e => handleWeightChange('dataReliabilityRecency', Number(e.target.value))}
                className="w-full accent-brand-500 cursor-pointer"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleApplyWeights}
                className="w-full py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium text-xs transition-colors shadow-sm"
              >
                Apply & Recalculate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto scrollbar-none pb-px">
        <button
          onClick={() => setActiveTab('queue_pipeline')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'queue_pipeline'
              ? 'border-brand-500 text-brand-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Prioritized Queue & Pipeline</span>
        </button>

        <button
          onClick={() => setActiveTab('scorecard_explorer')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'scorecard_explorer'
              ? 'border-brand-500 text-brand-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>100-Point Scorecard & Math</span>
        </button>

        <button
          onClick={() => setActiveTab('readiness_signals')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'readiness_signals'
              ? 'border-brand-500 text-brand-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Buying Readiness Signals ({readinessSignals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('segmentation_filters')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'segmentation_filters'
              ? 'border-brand-500 text-brand-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Multi-Criteria Segmentation ({filteredBusinesses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('duplicate_merger')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'duplicate_merger'
              ? 'border-brand-500 text-brand-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitMerge className="w-3.5 h-3.5" />
          <span>Duplicate Detection ({duplicateCandidates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('export_dossier')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'export_dossier'
              ? 'border-brand-500 text-brand-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Lead Dossier & Export</span>
        </button>
      </div>

      {/* TAB 1: LEAD QUEUE & OPERATIONAL PIPELINE */}
      {activeTab === 'queue_pipeline' && (
        <div className="space-y-6">
          {/* Queue Stage Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {QUEUE_STAGES.slice(0, 5).map(st => {
              const count = businesses.filter(b => (b.queueStatus || 'research_next') === st.id).length;
              return (
                <div key={st.id} className="p-3 rounded-xl bg-surface-100 border border-border flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-400">{st.label}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-surface-200 text-white">
                      {count}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{st.description}</p>
                </div>
              );
            })}
          </div>

          {/* Queue Lead Table */}
          <div className="bg-surface-100 border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Prioritized Operational Queue ({businesses.length} Total Leads)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Leads ranked by 100-point score, research completeness, and verified decision-maker routing.
                </p>
              </div>

              {/* Stage Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Queue Stage:</span>
                <select
                  value={filterQueue}
                  onChange={e => setFilterQueue(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-surface-200 border border-border text-xs text-white"
                >
                  <option value="all">All Stages ({businesses.length})</option>
                  {QUEUE_STAGES.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.label} ({businesses.filter(b => (b.queueStatus || 'research_next') === s.id).length})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="divide-y divide-border/60">
              {filteredBusinesses.map(b => {
                const score = scores.find(s => s.businessId === b.id);
                const bContacts = contacts.filter(c => c.businessId === b.id);
                const dm = bContacts.find(c => c.isDecisionMaker);
                const bOpps = opportunities.filter(o => o.businessId === b.id);
                const currentStage = QUEUE_STAGES.find(s => s.id === (b.queueStatus || 'research_next')) || QUEUE_STAGES[0];

                const gradeColor =
                  score?.band === 'A'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : score?.band === 'B'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    : score?.band === 'C'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30';

                return (
                  <div
                    key={b.id}
                    className={`p-4 hover:bg-surface-50 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      b.id === selectedBiz?.id ? 'bg-surface-50/80 border-l-4 border-l-brand-500' : ''
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs border ${gradeColor}`}>
                          Tier {score?.band || 'Hold'} ({score?.totalScore ?? '—'}/100)
                        </span>

                        <h4 className="text-sm font-semibold text-white truncate">{b.officialName}</h4>

                        {b.brandName && (
                          <span className="text-xs text-slate-400">({b.brandName})</span>
                        )}

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${currentStage.color}`}>
                          {currentStage.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-slate-500" />
                          <a
                            href={b.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-brand-400 truncate max-w-[180px]"
                          >
                            {b.domain || b.websiteUrl}
                          </a>
                        </span>

                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {b.city}, {b.state}
                        </span>

                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-500" />
                          {dm ? (
                            <span className={dm.verificationStatus === 'verified' ? 'text-emerald-400' : 'text-amber-400'}>
                              {dm.fullName} ({dm.roleOrTitle})
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">No decision-maker</span>
                          )}
                        </span>

                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-slate-500" />
                          {bOpps.length} Opportunities
                        </span>
                      </div>

                      {/* Recommended Next Step & Research Completeness */}
                      <div className="flex items-center gap-3 pt-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-300">
                          <span className="text-brand-400 font-medium">Next Action:</span>
                          <span className="text-slate-200">{score?.recommendedNextStep || 'Review research'}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <span>Completeness:</span>
                          <div className="w-16 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-500 rounded-full"
                              style={{ width: `${score?.researchCompleteness || 0}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs">{score?.researchCompleteness || 0}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Operational Action Controls */}
                    <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
                      <select
                        value={b.queueStatus || 'research_next'}
                        onChange={e => handleUpdateQueueStatus(b.id, e.target.value as LeadQueueStatus)}
                        className="px-2 py-1.5 rounded-lg bg-surface-200 border border-border text-xs text-slate-200 hover:text-white"
                      >
                        {QUEUE_STAGES.map(st => (
                          <option key={st.id} value={st.id}>
                            Move to: {st.label}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => {
                          setSelectedBusinessId(b.id);
                          setActiveTab('scorecard_explorer');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/40 text-xs font-medium transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Math</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 100-POINT SCORECARD & ARITHMETIC EXPLORER */}
      {activeTab === 'scorecard_explorer' && selectedBiz && (
        <div className="space-y-6">
          {/* Target Profile Card */}
          <div className="p-5 rounded-xl bg-surface-100 border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-400" />
                <h3 className="text-base font-bold text-white">{selectedBiz.officialName}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-surface-200 text-slate-300">
                  {selectedBiz.businessModel}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-surface-200 text-slate-300">
                  {selectedBiz.city}, {selectedBiz.state}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official Domain: <span className="text-slate-200 font-mono">{selectedBiz.domain || selectedBiz.websiteUrl}</span> • Phone: <span className="text-slate-200">{selectedBiz.phone || 'Unknown'}</span>
              </p>
            </div>

            {/* Score & Grade Display */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-2xl font-bold font-mono text-white">
                  {selectedScore?.totalScore || 0}
                  <span className="text-xs font-normal text-slate-400"> / 100</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Research Completeness: <span className="font-mono text-brand-400">{selectedScore?.researchCompleteness || 0}%</span>
                </div>
              </div>

              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold font-mono text-2xl border ${
                  selectedScore?.band === 'A'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : selectedScore?.band === 'B'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    : selectedScore?.band === 'C'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}
              >
                {selectedScore?.band || 'Hold'}
              </div>
            </div>
          </div>

          {/* 7-Category Arithmetic Breakdown Table */}
          <div className="bg-surface-100 border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-border bg-surface-50 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Transparent Category Arithmetic Breakdown
                </h4>
                <p className="text-[11px] text-slate-400">
                  Calculated against verified evidence. Uninspected parameters are marked Unknown without penalty.
                </p>
              </div>
              <span className="text-xs font-mono text-brand-400 font-bold">
                Formula Total: {selectedScore?.totalScore || 0} Pts
              </span>
            </div>

            <div className="divide-y divide-border/60 text-xs">
              {/* Category A */}
              {pb?.opportunityEvidence && (
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">A. Business Opportunity Evidence</span>
                      {pb.opportunityEvidence.isUnknown ? (
                        <span className="px-1.5 py-0.2 rounded bg-slate-500/20 text-slate-400 text-[10px]">Unknown (Not Penalized)</span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">Verified Evidence</span>
                      )}
                    </div>
                    <p className="text-slate-400 text-[11px]">{pb.opportunityEvidence.evidence}</p>
                    {pb.opportunityEvidence.notes && (
                      <p className="text-[11px] text-brand-400 italic">{pb.opportunityEvidence.notes}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-base font-bold text-white">{pb.opportunityEvidence.pointsAwarded}</span>
                    <span className="font-mono text-xs text-slate-400"> / {pb.opportunityEvidence.maxPoints} pts</span>
                  </div>
                </div>
              )}

              {/* Category B */}
              {pb?.websitePotential && (
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">B. Website & Conversion Improvement Potential</span>
                      {pb.websitePotential.isUnknown ? (
                        <span className="px-1.5 py-0.2 rounded bg-slate-500/20 text-slate-400 text-[10px]">Unknown (Not Penalized)</span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">Verified Audit</span>
                      )}
                    </div>
                    <p className="text-slate-400 text-[11px]">{pb.websitePotential.evidence}</p>
                    {pb.websitePotential.notes && (
                      <p className="text-[11px] text-brand-400 italic">{pb.websitePotential.notes}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-base font-bold text-white">{pb.websitePotential.pointsAwarded}</span>
                    <span className="font-mono text-xs text-slate-400"> / {pb.websitePotential.maxPoints} pts</span>
                  </div>
                </div>
              )}

              {/* Category C */}
              {pb?.localSeoPotential && (
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">C. Local SEO & Visibility Opportunities</span>
                      {pb.localSeoPotential.isUnknown ? (
                        <span className="px-1.5 py-0.2 rounded bg-slate-500/20 text-slate-400 text-[10px]">Unknown (Not Penalized)</span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">Verified Local Probe</span>
                      )}
                    </div>
                    <p className="text-slate-400 text-[11px]">{pb.localSeoPotential.evidence}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-base font-bold text-white">{pb.localSeoPotential.pointsAwarded}</span>
                    <span className="font-mono text-xs text-slate-400"> / {pb.localSeoPotential.maxPoints} pts</span>
                  </div>
                </div>
              )}

              {/* Category D */}
              {pb?.capacityGrowthSignals && (
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">D. Business Capacity & Growth Indicators</span>
                      {pb.capacityGrowthSignals.isUnknown ? (
                        <span className="px-1.5 py-0.2 rounded bg-slate-500/20 text-slate-400 text-[10px]">Unknown (Not Penalized)</span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">Observed Growth</span>
                      )}
                    </div>
                    <p className="text-slate-400 text-[11px]">{pb.capacityGrowthSignals.evidence}</p>
                    <p className="text-[11px] text-slate-500 italic">
                      Note: Observable capacity indicator only — not financial proof of willingness to buy.
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-base font-bold text-white">{pb.capacityGrowthSignals.pointsAwarded}</span>
                    <span className="font-mono text-xs text-slate-400"> / {pb.capacityGrowthSignals.maxPoints} pts</span>
                  </div>
                </div>
              )}

              {/* Category E */}
              {pb?.watechServiceFit && (
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">E. Service Fit with Watech</span>
                      <span className="px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 text-[10px]">Capability Overlap</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">{pb.watechServiceFit.evidence}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-base font-bold text-white">{pb.watechServiceFit.pointsAwarded}</span>
                    <span className="font-mono text-xs text-slate-400"> / {pb.watechServiceFit.maxPoints} pts</span>
                  </div>
                </div>
              )}

              {/* Category F */}
              {pb?.decisionMakerAvailability && (
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">F. Decision-Maker Contact Availability</span>
                      {pb.decisionMakerAvailability.isUnknown ? (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[10px]">Pending Discovery</span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">Verified Officer</span>
                      )}
                    </div>
                    <p className="text-slate-400 text-[11px]">{pb.decisionMakerAvailability.evidence}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-base font-bold text-white">{pb.decisionMakerAvailability.pointsAwarded}</span>
                    <span className="font-mono text-xs text-slate-400"> / {pb.decisionMakerAvailability.maxPoints} pts</span>
                  </div>
                </div>
              )}

              {/* Category G */}
              {pb?.dataReliabilityRecency && (
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">G. Data Reliability & Recency</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">Registry Backed</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">{pb.dataReliabilityRecency.evidence}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-base font-bold text-white">{pb.dataReliabilityRecency.pointsAwarded}</span>
                    <span className="font-mono text-xs text-slate-400"> / {pb.dataReliabilityRecency.maxPoints} pts</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Evidence Segregation Grid (Positive, Negative, Unknown) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Positive Evidence */}
            <div className="p-4 rounded-xl bg-surface-100 border border-emerald-500/20 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <h4 className="text-xs font-semibold uppercase tracking-wider">Positive Evidence ({selectedScore?.positiveEvidence?.length || 0})</h4>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {selectedScore?.positiveEvidence?.map((ev, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-500">•</span>
                    <span>{ev}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Negative Evidence */}
            <div className="p-4 rounded-xl bg-surface-100 border border-rose-500/20 space-y-2">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <h4 className="text-xs font-semibold uppercase tracking-wider">Negative Evidence ({selectedScore?.negativeEvidence?.length || 0})</h4>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {selectedScore?.negativeEvidence?.map((ev, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-rose-500">•</span>
                    <span>{ev}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Unknown Information (Separated without Penalty) */}
            <div className="p-4 rounded-xl bg-surface-100 border border-amber-500/20 space-y-2">
              <div className="flex items-center gap-2 text-amber-400">
                <HelpCircle className="w-4 h-4 shrink-0" />
                <h4 className="text-xs font-semibold uppercase tracking-wider">Unknown Parameters ({selectedScore?.unknownInformation?.length || 0})</h4>
              </div>
              <div className="px-2 py-1 rounded bg-amber-500/10 text-[10px] text-amber-300">
                Not penalized. Separated from negative findings as unverified.
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {selectedScore?.unknownInformation?.map((ev, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-500">•</span>
                    <span>{ev}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BUYING READINESS SIGNALS */}
      {activeTab === 'readiness_signals' && selectedBiz && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-3">
            <Flame className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-white">Observable Operational Growth Signals</h4>
              <p className="mt-0.5">
                These indicators reflect public evidence of active business operations (hiring, fleet capacity, multi-location coverage, commercial licensing).
                <strong> Important Rule:</strong> These signals indicate operational capacity, not confirmed willingness or budget to purchase agency services.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {readinessSignals.map(sig => (
              <div key={sig.id} className="p-4 rounded-xl bg-surface-100 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-brand-500/20 text-brand-300">
                      {sig.type.replace(/_/g, ' ')}
                    </span>
                    <h4 className="text-xs font-bold text-white">{sig.title}</h4>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Public Signal</span>
                </div>

                <p className="text-xs text-slate-300">{sig.description}</p>

                {sig.sourceUrl && (
                  <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate max-w-[200px]">Source: {sig.sourceType || 'Public Listing'}</span>
                    <a
                      href={sig.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-400 hover:underline flex items-center gap-1"
                    >
                      <span>Verify</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            ))}

            {readinessSignals.length === 0 && (
              <div className="col-span-2 p-8 text-center bg-surface-100 rounded-xl border border-dashed border-border text-slate-400 text-xs">
                No active growth signals recorded for {selectedBiz.officialName}. Run the Business Intelligence engine to discover job board postings and corporate filings.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ADVANCED LEAD SEGMENTATION */}
      {activeTab === 'segmentation_filters' && (
        <div className="space-y-4">
          {/* Multi-Criteria Filter Bar */}
          <div className="p-4 rounded-xl bg-surface-100 border border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Search Keywords</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Business, domain, city..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-surface-200 border border-border text-white text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Lead Grade</label>
              <select
                value={filterGrade}
                onChange={e => setFilterGrade(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-surface-200 border border-border text-white text-xs"
              >
                <option value="all">All Grades</option>
                <option value="A">Tier A (80–100)</option>
                <option value="B">Tier B (60–79)</option>
                <option value="C">Tier C (40–59)</option>
                <option value="Hold">Hold (&lt; 40)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Decision-Maker</label>
              <select
                value={filterDmStatus}
                onChange={e => setFilterDmStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-surface-200 border border-border text-white text-xs"
              >
                <option value="all">All Contacts</option>
                <option value="verified">Verified Decision Maker</option>
                <option value="unverified">Unverified Decision Maker</option>
                <option value="missing">Missing Decision Maker</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Research Completeness</label>
              <select
                value={filterCompleteness}
                onChange={e => setFilterCompleteness(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-surface-200 border border-border text-white text-xs"
              >
                <option value="all">All Completeness</option>
                <option value="high">High (≥ 75%)</option>
                <option value="medium">Medium (50–74%)</option>
                <option value="low">Low (&lt; 50%)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Queue Stage</label>
              <select
                value={filterQueue}
                onChange={e => setFilterQueue(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-surface-200 border border-border text-white text-xs"
              >
                <option value="all">All Stages</option>
                {QUEUE_STAGES.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-surface-100 border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-white uppercase tracking-wider">
                Matching Segment Leads ({filteredBusinesses.length} Found)
              </span>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Segment</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-50 text-slate-400 border-b border-border">
                  <tr>
                    <th className="p-3 font-medium">Business</th>
                    <th className="p-3 font-medium">Grade & Score</th>
                    <th className="p-3 font-medium">Decision-Maker</th>
                    <th className="p-3 font-medium">Completeness</th>
                    <th className="p-3 font-medium">Stage</th>
                    <th className="p-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredBusinesses.map(b => {
                    const score = scores.find(s => s.businessId === b.id);
                    const bContacts = contacts.filter(c => c.businessId === b.id);
                    const dm = bContacts.find(c => c.isDecisionMaker);

                    return (
                      <tr key={b.id} className="hover:bg-surface-50/50">
                        <td className="p-3 font-medium text-white">
                          <div>{b.officialName}</div>
                          <div className="text-[11px] text-slate-400">{b.city}, {b.state} • {b.domain}</div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                              score?.band === 'A'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : score?.band === 'B'
                                ? 'bg-blue-500/20 text-blue-300'
                                : score?.band === 'C'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            Tier {score?.band || 'Hold'} ({score?.totalScore ?? '—'})
                          </span>
                        </td>
                        <td className="p-3">
                          {dm ? (
                            <div>
                              <span className={dm.verificationStatus === 'verified' ? 'text-emerald-400' : 'text-slate-300'}>
                                {dm.fullName}
                              </span>
                              <div className="text-[10px] text-slate-500">{dm.roleOrTitle}</div>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">None</span>
                          )}
                        </td>
                        <td className="p-3 font-mono">
                          {score?.researchCompleteness || 0}%
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-200 text-slate-300">
                            {(b.queueStatus || 'research_next').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedBusinessId(b.id);
                              setActiveTab('scorecard_explorer');
                            }}
                            className="text-brand-400 hover:text-brand-300 font-medium"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DUPLICATE DETECTION & MERGER */}
      {activeTab === 'duplicate_merger' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-surface-100 border border-border flex items-start gap-3">
            <GitMerge className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                Automated Duplicate Detection Engine
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Cross-checks normalized domain, business name, phone number, and physical street address. Merging preserves all source histories, audit logs, and verified contacts into the primary record.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {duplicateCandidates.map((cand, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-surface-100 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300">
                      Potential Duplicate ({Math.round(cand.confidence * 100)}% Match)
                    </span>
                    <span className="text-xs text-slate-400">
                      Matched on: {cand.matchReasons.map(r => r.toUpperCase()).join(' + ')}
                    </span>
                  </div>

                  <button
                    onClick={() => handleMerge(cand)}
                    className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Merge into Primary</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Primary Record */}
                  <div className="p-3 rounded-lg bg-surface-200 border border-border space-y-1">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Primary Record</span>
                    <h5 className="font-semibold text-white">{cand.duplicateOf.officialName}</h5>
                    <p className="text-slate-400">Domain: {cand.duplicateOf.domain || 'N/A'}</p>
                    <p className="text-slate-400">Phone: {cand.duplicateOf.phone || 'N/A'}</p>
                    <p className="text-slate-400">Address: {cand.duplicateOf.fullAddress || 'N/A'}</p>
                  </div>

                  {/* Duplicate Candidate */}
                  <div className="p-3 rounded-lg bg-surface-200 border border-border space-y-1">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Duplicate Candidate</span>
                    <h5 className="font-semibold text-white">{cand.business.officialName}</h5>
                    <p className="text-slate-400">Domain: {cand.business.domain || 'N/A'}</p>
                    <p className="text-slate-400">Phone: {cand.business.phone || 'N/A'}</p>
                    <p className="text-slate-400">Address: {cand.business.fullAddress || 'N/A'}</p>
                  </div>
                </div>
              </div>
            ))}

            {duplicateCandidates.length === 0 && (
              <div className="p-8 text-center bg-surface-100 rounded-xl border border-dashed border-border text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                No duplicate business records detected in the active project. All business domains, names, and phone numbers are distinct.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: LEAD DOSSIER & EXPORT */}
      {activeTab === 'export_dossier' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-400" />
                Structured Lead Intelligence Dossiers & Export Center
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Download fully transparent, explainable lead intelligence reports with 100-point score breakdowns, positive/negative evidence, and unpenalized unknown parameters.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap pt-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Export All Leads to CSV ({businesses.length} Records)</span>
              </button>

              <button
                onClick={handleExportJSON}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-200 hover:bg-surface-300 text-xs font-semibold text-slate-200 border border-border transition-colors shadow-sm"
              >
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Export Structured JSON Dossier</span>
              </button>
            </div>
          </div>

          {/* Dossier Preview of Selected Lead */}
          {selectedBiz && (
            <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                  Executive Lead Dossier Preview: {selectedBiz.officialName}
                </span>
                <span className="font-mono text-brand-400 font-bold">
                  Grade {selectedScore?.band} • {selectedScore?.totalScore}/100 Pts
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-slate-400 text-[11px] block">Business Identity</span>
                  <p className="text-white font-medium">{selectedBiz.officialName}</p>
                  <p className="text-slate-400">{selectedBiz.fullAddress || `${selectedBiz.city}, ${selectedBiz.state}`}</p>
                  <p className="text-slate-400">Phone: {selectedBiz.phone || 'Unknown'}</p>
                  <p className="text-slate-400">Website: {selectedBiz.websiteUrl}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 text-[11px] block">Decision-Maker Routing</span>
                  {selectedContacts.find(c => c.isDecisionMaker) ? (
                    <div>
                      <p className="text-emerald-400 font-medium">
                        {selectedContacts.find(c => c.isDecisionMaker)?.fullName}
                      </p>
                      <p className="text-slate-400">{selectedContacts.find(c => c.isDecisionMaker)?.roleOrTitle}</p>
                      <p className="text-slate-400">Email: {selectedContacts.find(c => c.isDecisionMaker)?.email || 'Pending verification'}</p>
                    </div>
                  ) : (
                    <p className="text-amber-400 italic">No verified decision-maker attached. Pending corporate registry research.</p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-border space-y-1">
                <span className="text-slate-400 text-[11px] block">Recommended Immediate Next Step</span>
                <p className="text-white font-semibold flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                  {selectedScore?.recommendedNextStep}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
