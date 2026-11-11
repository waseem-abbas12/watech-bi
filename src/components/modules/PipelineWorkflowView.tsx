'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Building2,
  Globe2,
  Mail,
  Phone,
  ShieldCheck,
  Download,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Sliders,
  Users,
  Target,
  ArrowRight,
  Info,
  Calendar,
  Layers,
  Database,
  Search,
  Filter,
  CheckSquare,
  Square,
  AlertCircle,
} from 'lucide-react';
import Papa from 'papaparse';
import { useProject } from '@/context/ProjectContext';
import { repository } from '@/lib/db/repository';
import { clientPipelineOrchestrator, type BatchProgressUpdate } from '@/lib/services/pipelineOrchestrator';
import type {
  PipelineExecutionResult,
  StageResult,
  PipelineMode,
} from '@/lib/server/pipeline/pipelineRunner';
import type { Business, WebsiteAudit, Contact, LeadScore, Opportunity, ResearchProject } from '@/types';
import { CANTON_PIPELINE_RESULT } from '@/lib/db/cantonHvacRealSeed';
import {
  DiscoverySearchInterface,
  type DiscoveryExecutionPayload,
} from '@/components/discovery/DiscoverySearchInterface';

const STAGE_LABELS: Record<string, { name: string; desc: string }> = {
  BUSINESS_DISCOVERY: { name: '1. Places Discovery', desc: 'Querying external places API' },
  BUSINESS_DEDUPLICATION: { name: '2. Identity Deduplication', desc: 'Filtering existing domains & Place IDs' },
  WEBSITE_AUDIT: { name: '3. Technical Website Audit', desc: 'Inspecting HTTP, DOM, SSL & performance' },
  CONTACT_EXTRACTION: { name: '4. Contact Discovery', desc: 'Scraping emails, phones & social profiles' },
  DECISION_MAKER_ANALYSIS: { name: '5. Decision-Maker Tiering', desc: 'Classifying owner/executive authority' },
  EMAIL_VERIFICATION: { name: '6. DNS MX Verification', desc: 'Resolving mail exchange DNS records' },
  OPPORTUNITY_ANALYSIS: { name: '7. Opportunity Gap Analysis', desc: 'Detecting commercial service gaps' },
  LEAD_SCORING: { name: '8. 100-Point Scoring', desc: 'Evaluating evidence-backed buying readiness' },
  CRM_PERSISTENCE: { name: '9. CRM Pipeline Ingestion', desc: 'Persisting qualified prospects into CRM' },
  FOLLOW_UP_SCHEDULING: { name: '10. Follow-Up Cadence', desc: 'Initializing automated outreach schedule' },
};

const INDUSTRY_PRESETS = ['HVAC', 'Commercial Roofing', 'Plumbing', 'Electrical Contracting', 'Commercial Solar'];

export function PipelineWorkflowView() {
  const { projects, activeProject, setActiveProject, setActiveModule, refreshProjects } = useProject();

  // Mode Selection: 'existing_businesses' (Mode B) vs 'discovery' (Mode A)
  const [pipelineMode, setPipelineMode] = useState<PipelineMode>('existing_businesses');

  // Mode A Inputs (Live Discovery)
  const [industry, setIndustry] = useState(activeProject?.industryNiche || '');
  const [location, setLocation] = useState(
    activeProject?.cityArea
      ? [activeProject.cityArea, activeProject.stateRegion, activeProject.country].filter(Boolean).join(', ')
      : ''
  );
  const [discoveryCount, setDiscoveryCount] = useState<number>(25);

  // Mode B Inputs (Existing Businesses from Dexie)
  const [selectedProjectId, setSelectedProjectId] = useState<string>(activeProject?.id || '');
  const [existingBusinessesList, setExistingBusinessesList] = useState<Business[]>([]);
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<Set<string>>(new Set());
  const [excludeDemoRecords, setExcludeDemoRecords] = useState<boolean>(true);
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState<boolean>(false);

  // Common Configuration
  const [minimumScore, setMinimumScore] = useState<number>(50);

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(-1);
  const [pipelineResult, setPipelineResult] = useState<PipelineExecutionResult | null>(null);
  const [persistedCounts, setPersistedCounts] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unconfiguredDetails, setUnconfiguredDetails] = useState<{ error?: string; help?: string } | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgressUpdate | null>(null);

  // Selected business for dossier modal
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  // Results Table Search, Filter & Pagination
  const [resultsSearchQuery, setResultsSearchQuery] = useState('');
  const [resultsFilterStatus, setResultsFilterStatus] = useState<'all' | 'qualified' | 'unqualified'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Synchronize active project
  useEffect(() => {
    if (activeProject && !selectedProjectId) {
      setSelectedProjectId(activeProject.id);
    }
  }, [activeProject]);

  // Load results if requested in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'results' || params.get('results') === 'true') {
        setPipelineResult(CANTON_PIPELINE_RESULT as any);
      }
    }
  }, []);

  // Load businesses for Mode B from Dexie repository
  useEffect(() => {
    async function loadBusinesses() {
      if (!selectedProjectId) return;
      setIsLoadingBusinesses(true);
      try {
        const list = await repository.getBusinesses(selectedProjectId);
        setExistingBusinessesList(list);

        // Pre-select up to 10 real businesses by default if available
        const filtered = excludeDemoRecords ? list.filter((b) => !b.isDemo && b.id !== 'biz-1') : list;
        const initialIds = new Set(filtered.slice(0, 10).map((b) => b.id));
        setSelectedBusinessIds(initialIds);
      } catch (err) {
        console.error('Error loading businesses:', err);
      } finally {
        setIsLoadingBusinesses(false);
      }
    }
    loadBusinesses();
  }, [selectedProjectId, excludeDemoRecords]);

  // Filtered businesses for Mode B selection table
  const displayedBusinesses = excludeDemoRecords
    ? existingBusinessesList.filter((b) => !b.isDemo && b.id !== 'biz-1' && b.projectId !== 'proj-demo-1')
    : existingBusinessesList;

  // Toggle individual business selection (up to 100 leads)
  const toggleBusinessSelection = (id: string) => {
    const updated = new Set(selectedBusinessIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      if (updated.size >= 100) {
        alert('You can select up to 100 businesses per pipeline run.');
        return;
      }
      updated.add(id);
    }
    setSelectedBusinessIds(updated);
  };

  // Select all up to 100
  const handleSelectAll = () => {
    const idsToSelect = new Set(displayedBusinesses.slice(0, 100).map((b) => b.id));
    setSelectedBusinessIds(idsToSelect);
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedBusinessIds(new Set());
  };

  // Run Pipeline Execution
  const handleRunPipeline = async () => {
    setIsRunning(true);
    setErrorMessage(null);
    setUnconfiguredDetails(null);
    setPipelineResult(null);
    setPersistedCounts(null);
    setBatchProgress(null);
    setCurrentStageIndex(0);

    try {
      if (pipelineMode === 'existing_businesses') {
        const selectedBusinesses = displayedBusinesses.filter((b) => selectedBusinessIds.has(b.id));

        if (selectedBusinesses.length === 0) {
          setErrorMessage('Please select at least 1 business to process in Mode B.');
          setIsRunning(false);
          return;
        }

        const currentProj = projects.find((p) => p.id === selectedProjectId) || activeProject;

        const response = await clientPipelineOrchestrator.runAndPersist({
          mode: 'existing_businesses',
          existingBusinesses: selectedBusinesses,
          minimumScore,
          projectId: selectedProjectId,
          projectName: currentProj?.name || 'Processed Existing Businesses',
          excludeDemo: excludeDemoRecords,
          onBatchProgress: (prog) => {
            setBatchProgress(prog);
          },
        });

        setPipelineResult(response.result);
        setPersistedCounts(response.persistedCounts);

        if (!response.result.success) {
          setErrorMessage(response.result.error || 'Pipeline execution encountered errors.');
        } else {
          await refreshProjects();
        }
      } else {
        // Mode A: External Discovery
        const response = await clientPipelineOrchestrator.runAndPersist({
          mode: 'discovery',
          industry,
          location,
          count: discoveryCount,
          minimumScore,
          projectId: activeProject?.id,
          projectName: activeProject?.name || `${industry} Pipeline — ${location}`,
          excludeDemo: true,
          onBatchProgress: (prog) => {
            setBatchProgress(prog);
          },
        });

        setPipelineResult(response.result);
        setPersistedCounts(response.persistedCounts);

        if (!response.result.success) {
          if (response.result.errorCode === 'PROVIDER_NOT_CONFIGURED') {
            setUnconfiguredDetails({
              error: response.result.error,
              help: response.result.help,
            });
          } else {
            setErrorMessage(response.result.error || 'Pipeline execution failed.');
          }
        } else {
          await refreshProjects();
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network request failed');
    } finally {
      setIsRunning(false);
      setCurrentStageIndex(-1);
    }
  };

  // Dedicated Discovery Execution handler triggered from DiscoverySearchInterface
  const handleExecuteDiscovery = async (payload: DiscoveryExecutionPayload) => {
    setLocation(payload.location);
    setIndustry(payload.industry);
    setDiscoveryCount(payload.count);
    setMinimumScore(payload.minimumScore);

    setIsRunning(true);
    setErrorMessage(null);
    setUnconfiguredDetails(null);
    setPipelineResult(null);
    setPersistedCounts(null);
    setBatchProgress(null);
    setCurrentStageIndex(0);

    try {
      const response = await clientPipelineOrchestrator.runAndPersist({
        mode: 'discovery',
        industry: payload.industry,
        location: payload.location,
        country: payload.rawConfig.country,
        state: payload.rawConfig.state,
        city: payload.rawConfig.city,
        count: payload.count,
        minimumScore: payload.minimumScore,
        projectId: activeProject?.id,
        projectName:
          activeProject?.name ||
          `${payload.rawConfig.niche || payload.rawConfig.industry} — ${payload.rawConfig.city || payload.location}`,
        excludeDemo: true,
        onBatchProgress: (prog) => {
          setBatchProgress(prog);
        },
      });

      setPipelineResult(response.result);
      setPersistedCounts(response.persistedCounts);

      if (!response.result.success) {
        if (response.result.errorCode === 'PROVIDER_NOT_CONFIGURED') {
          setUnconfiguredDetails({
            error: response.result.error,
            help: response.result.help,
          });
        } else {
          setErrorMessage(response.result.error || 'Pipeline execution failed.');
        }
      } else {
        await refreshProjects();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network request failed');
    } finally {
      setIsRunning(false);
      setCurrentStageIndex(-1);
    }
  };

  // Filtered and paginated pipeline results
  const filteredResultBusinesses = useMemo(() => {
    if (!pipelineResult?.data?.businesses) return [];
    return pipelineResult.data.businesses.filter((biz) => {
      const q = resultsSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        biz.officialName.toLowerCase().includes(q) ||
        (biz.domain && biz.domain.toLowerCase().includes(q)) ||
        (biz.city && biz.city.toLowerCase().includes(q)) ||
        (biz.phone && biz.phone.includes(q)) ||
        (biz.industry && biz.industry.toLowerCase().includes(q));

      const matchesStatus =
        resultsFilterStatus === 'all' ||
        (resultsFilterStatus === 'qualified' && biz.status === 'qualified') ||
        (resultsFilterStatus === 'unqualified' && biz.status !== 'qualified');

      return matchesSearch && matchesStatus;
    });
  }, [pipelineResult, resultsSearchQuery, resultsFilterStatus]);

  const totalResultPages = Math.ceil(filteredResultBusinesses.length / pageSize) || 1;
  const paginatedResultBusinesses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredResultBusinesses.slice(start, start + pageSize);
  }, [filteredResultBusinesses, currentPage, pageSize]);

  // CSV Export with Complete Digital Footprint Fields
  const handleExportCsv = () => {
    if (!pipelineResult?.data?.businesses || pipelineResult.data.businesses.length === 0) return;

    const rows = pipelineResult.data.businesses.map((biz) => {
      const audit = pipelineResult.data.audits.find((a) => a.businessId === biz.id);
      const score = pipelineResult.data.leadScores.find((s) => s.businessId === biz.id);
      const contacts = pipelineResult.data.contacts.filter((c) => c.businessId === biz.id);
      const sched = pipelineResult.data.followUpSchedules.find((s) => s.businessId === biz.id);

      return {
        'Business Name': biz.officialName,
        'Country': biz.country || 'USA',
        'State / Region': biz.state || '',
        'City': biz.city || '',
        'Address': biz.fullAddress || '',
        'Industry': biz.industry || '',
        'Subcategory': biz.subcategory || '',
        'Business Description': biz.description || '',
        'Services Offered': biz.services?.join('; ') || '',
        'Official Website': biz.websiteUrl || '',
        'Domain': biz.domain || '',
        'LinkedIn': biz.socialProfiles?.linkedin || biz.linkedinCompanyUrl || '',
        'Facebook': biz.socialProfiles?.facebook || '',
        'Instagram': biz.socialProfiles?.instagram || '',
        'YouTube': biz.socialProfiles?.youtube || '',
        'X / Twitter': biz.socialProfiles?.twitter || '',
        'TikTok': biz.socialProfiles?.tiktok || '',
        'Pinterest': biz.socialProfiles?.pinterest || '',
        'About Page': biz.aboutPageUrl || '',
        'Contact Page': biz.contactPageUrl || '',
        'Services Page': biz.servicesPageUrl || '',
        'Team Page': biz.teamPageUrl || '',
        'Contact Form URL': biz.contactFormUrl || '',
        'Business Hours': biz.businessHours?.rawText || '',
        'Primary Phone': biz.phone || '',
        'All Public Phones': biz.phoneNumbers?.join('; ') || biz.phone || '',
        'All Public Emails': biz.emails?.join('; ') || biz.email || '',
        'Google Place ID': biz.googlePlaceId || '',
        'Rating / Reviews': `${biz.reviewRating || 'N/A'} (${biz.reviewCount || 0})`,
        'Website Health Score': audit ? `${audit.totalScore}/100` : 'Not Audited',
        'Contacts Discovered': contacts.map((c) => `${c.fullName} (${c.roleOrTitle})`).join('; '),
        'Discovered Emails': contacts.map((c) => c.email).filter(Boolean).join('; '),
        'Lead Score': score ? `${score.totalScore}/100` : 'Unscored',
        'Lead Grade': score?.band || '',
        'Qualification Status': biz.status,
        'Source Evidence': biz.sourceUrls?.join('; ') || biz.sourceName || 'official_website',
        'Next Follow-Up Date': sched?.nextFollowUpDate || '',
      };
    });

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `watech-leads-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900/30 via-slate-900 to-indigo-950/40 border border-blue-500/20 backdrop-blur">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Unified Autonomous Pipeline
              </span>
              <span className="text-xs text-slate-400">Prompts 01–15 Connected</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Zap className="w-6 h-6 text-blue-400" />
              Lead Intelligence & Processing Pipeline
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Process businesses through technical audits, DOM contact scraping, DNS MX validation, deterministic
              scoring, and CRM follow-up sequences.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {pipelineResult?.success && (
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition-all"
              >
                <Download className="w-4 h-4 text-slate-400" />
                Export CSV
              </button>
            )}
            <button
              onClick={() => setActiveModule('lead_crm')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-sm font-medium transition-all"
            >
              <Users className="w-4 h-4 text-indigo-400" />
              Open CRM Pipeline
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1">
            Execution Mode:
          </span>
          <button
            type="button"
            onClick={() => setPipelineMode('existing_businesses')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              pipelineMode === 'existing_businesses'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 border border-blue-400'
                : 'bg-slate-900/60 text-slate-400 border border-border hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Mode B: Process Existing Businesses (No API Required)</span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
              Ready Now
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPipelineMode('discovery')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              pipelineMode === 'discovery'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 border border-blue-400'
                : 'bg-slate-900/60 text-slate-400 border border-border hover:text-slate-200'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>Mode A: Discover New Businesses (Google Places API)</span>
            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px]">
              Requires API Key
            </span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODE B: PROCESS EXISTING BUSINESSES (NO API REQUIRED)    */}
      {/* ======================================================== */}
      {pipelineMode === 'existing_businesses' && (
        <div className="p-6 rounded-2xl bg-surface-100 border border-border shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" />
                Select Existing Businesses to Process
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Pulls actual business records from your local project database. Bypasses external search and executes Stages 3–10 directly.
              </p>
            </div>

            {/* Project Picker */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-slate-400">Project:</label>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  const p = projects.find((proj) => proj.id === e.target.value);
                  if (p) setActiveProject(p);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-border text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.isDemo ? '(Demo)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter and Selection Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={excludeDemoRecords}
                  onChange={(e) => setExcludeDemoRecords(e.target.checked)}
                  className="rounded border-border accent-blue-600 w-4 h-4"
                />
                <span>Exclude Seeded Demo Records (e.g., PrimeAir)</span>
              </label>

              <span className="text-slate-500">•</span>

              <span className="text-slate-400">
                Available:{' '}
                <strong className="text-slate-200">{displayedBusinesses.length}</strong> | Selected:{' '}
                <strong className="text-blue-400">{selectedBusinessIds.size} / 10 max</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={displayedBusinesses.length === 0}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-border disabled:opacity-50"
              >
                Select Up to 10
              </button>
              <button
                type="button"
                onClick={handleClearSelection}
                disabled={selectedBusinessIds.size === 0}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs border border-border disabled:opacity-50"
              >
                Clear Selection
              </button>
            </div>
          </div>

          {/* Selectable Businesses Table */}
          {isLoadingBusinesses ? (
            <div className="py-8 text-center text-xs text-slate-400">
              <div className="w-5 h-5 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
              Loading businesses from project database...
            </div>
          ) : displayedBusinesses.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-900/60 border border-dashed border-border text-center space-y-3">
              <AlertCircle className="w-6 h-6 text-amber-400 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-slate-200">No Real Businesses Found in Selected Project</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  This project currently contains no real business records (demo fixtures are filtered out). You can import real businesses via CSV or add them manually in the Business Discovery module.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModule('discovery')}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all"
                >
                  Go to Business Discovery (Add / Import CSV)
                </button>
                {excludeDemoRecords && (
                  <button
                    type="button"
                    onClick={() => setExcludeDemoRecords(false)}
                    className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs border border-border hover:bg-slate-700"
                  >
                    Include Demo Records for Verification
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-72 border border-border rounded-xl">
              <table className="w-full text-left text-xs divide-y divide-border/60">
                <thead className="bg-slate-900/80 sticky top-0 text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3 w-10">Select</th>
                    <th className="py-2.5 px-3 font-medium">Business Name & Provenance</th>
                    <th className="py-2.5 px-3 font-medium">Location</th>
                    <th className="py-2.5 px-3 font-medium">Website</th>
                    <th className="py-2.5 px-3 font-medium">Pipeline Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {displayedBusinesses.map((biz) => {
                    const isSelected = selectedBusinessIds.has(biz.id);
                    return (
                      <tr
                        key={biz.id}
                        onClick={() => toggleBusinessSelection(biz.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-900/20' : 'hover:bg-slate-900/40'
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleBusinessSelection(biz.id)}
                            className="rounded border-border accent-blue-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-200">{biz.officialName}</span>
                          {biz.isDemo ? (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Demo Seed
                            </span>
                          ) : (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Real Record
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {biz.city ? `${biz.city}, ${biz.state || ''}` : biz.serviceArea || 'Local Market'}
                        </td>
                        <td className="py-2.5 px-3">
                          {biz.websiteUrl ? (
                            <span className="font-mono text-blue-400 truncate max-w-xs block">
                              {biz.domain || biz.websiteUrl}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">No website</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-slate-800 text-slate-300">
                            {biz.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Qualification Threshold & Action */}
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-slate-400">Min. Qualification Score:</span>
                  <span className="text-xs font-mono font-semibold text-emerald-400">{minimumScore}/100</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="5"
                  value={minimumScore}
                  onChange={(e) => setMinimumScore(parseInt(e.target.value, 10))}
                  className="w-44 accent-emerald-500 h-1.5 bg-slate-900 rounded cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={handleRunPipeline}
              disabled={isRunning || selectedBusinessIds.size === 0}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all"
            >
              {isRunning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing Selected Businesses...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Process Selected Businesses ({selectedBusinessIds.size})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE A: DISCOVER NEW BUSINESSES (PRECISION SEARCH)       */}
      {/* ======================================================== */}
      {pipelineMode === 'discovery' && (
        <DiscoverySearchInterface
          initialValues={{
            country: activeProject?.country || '',
            state: activeProject?.stateRegion || '',
            city: activeProject?.cityArea || '',
            industry: activeProject?.industryNiche || '',
            niche: '',
            targetCount: discoveryCount,
            minimumScore: minimumScore,
          }}
          onExecute={handleExecuteDiscovery}
          isRunning={isRunning}
        />
      )}

      {/* Provider Unconfigured Notice (if triggered in Mode A) */}
      {unconfiguredDetails && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-amber-200">
                External Discovery Provider Not Configured (GOOGLE_MAPS_API_KEY)
              </h3>
              <p className="text-xs text-amber-300/90 leading-relaxed">
                {unconfiguredDetails.error}
              </p>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-amber-500/20 font-mono text-xs text-slate-300">
                <code>GOOGLE_MAPS_API_KEY="your-google-cloud-api-key"</code>
              </div>
              <p className="text-xs text-amber-400/80">
                <strong>Alternative:</strong> Use <strong>Mode B (Process Existing Businesses)</strong> above to test the entire intelligence pipeline with real existing businesses without needing an API key.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* General Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Progressive Batch Progress Card */}
      {batchProgress && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-surface-100 to-indigo-950/40 border border-blue-500/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping" />
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                Batch {batchProgress.currentBatch} of {batchProgress.totalBatches}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-300 font-medium">{batchProgress.message}</span>
            </div>
            <div className="text-xs font-mono text-slate-300">
              Completed: <strong className="text-emerald-400">{batchProgress.completed}</strong> / Remaining:{' '}
              <strong className="text-amber-400">{Math.max(0, batchProgress.total - batchProgress.completed)}</strong> (Total: {batchProgress.total})
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-border">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${batchProgress.total > 0 ? Math.min(100, Math.round((batchProgress.completed / batchProgress.total) * 100)) : 5}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Stage Progress Stepper */}
      {pipelineResult && Array.isArray(pipelineResult.stages) && pipelineResult.stages.length > 0 && (
        <div className="p-6 rounded-2xl bg-surface-100 border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Pipeline Execution Report ({pipelineResult.totalDurationMs || 0}ms)
            </h3>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase ${
                pipelineResult.status === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {pipelineResult.status || 'REPORT'}
            </span>
          </div>

          {/* 10-Stage Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {pipelineResult.stages.map((st) => {
              const meta = STAGE_LABELS[st.stage] || { name: st.stage, desc: '' };
              const isSuccess = st.status === 'completed';
              const isSkipped = st.status === 'skipped';
              const isFailed = st.status === 'failed';

              return (
                <div
                  key={st.stage}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isSuccess
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : isFailed
                      ? 'bg-rose-500/5 border-rose-500/20'
                      : isSkipped
                      ? 'bg-slate-900/60 border-slate-700/60'
                      : 'bg-slate-900/40 border-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-200">{meta.name}</span>
                    {isSuccess ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : isFailed ? (
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    ) : isSkipped ? (
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                        SKIPPED
                      </span>
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2 truncate">
                    {isSkipped && st.details?.reason === 'EXISTING_BUSINESS_SELECTED'
                      ? 'Existing businesses selected'
                      : meta.desc}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-border/50">
                    <span>
                      {isSkipped
                        ? 'Bypassed'
                        : `${st.recordsSucceeded} succeeded${st.recordsFailed > 0 ? `, ${st.recordsFailed} failed` : ''}`}
                    </span>
                    <span>{st.durationMs}ms</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Persistence Metric Cards */}
          {persistedCounts && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-border">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-border text-center">
                <span className="text-xs text-slate-400">Businesses Saved</span>
                <p className="text-lg font-bold text-slate-100">{persistedCounts.businesses}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-border text-center">
                <span className="text-xs text-slate-400">Audits Saved</span>
                <p className="text-lg font-bold text-blue-400">{persistedCounts.audits}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-border text-center">
                <span className="text-xs text-slate-400">Contacts Saved</span>
                <p className="text-lg font-bold text-indigo-400">{persistedCounts.contacts}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-border text-center">
                <span className="text-xs text-slate-400">Emails Verified</span>
                <p className="text-lg font-bold text-cyan-400">{persistedCounts.emails}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-border text-center">
                <span className="text-xs text-slate-400">Scores Calculated</span>
                <p className="text-lg font-bold text-purple-400">{persistedCounts.scores}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-border text-center">
                <span className="text-xs text-slate-400">CRM Leads Queued</span>
                <p className="text-lg font-bold text-emerald-400">{persistedCounts.schedules}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Discovered Leads Result Table */}
      {pipelineResult?.data?.businesses && pipelineResult.data.businesses.length > 0 && (
        <div className="p-6 rounded-2xl bg-surface-100 border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Processed Pipeline Results ({pipelineResult.data.businesses.length})
              </h3>
              <p className="text-xs text-slate-400">
                Click any business to view their detailed technical audit dossier, opportunity gaps, and score rubric.
              </p>
            </div>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-border text-xs font-medium transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Download CSV
            </button>
          </div>

          {/* Table Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by business name, domain, city..."
                  value={resultsSearchQuery}
                  onChange={(e) => {
                    setResultsSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-border text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-border text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setResultsFilterStatus('all');
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    resultsFilterStatus === 'all'
                      ? 'bg-slate-800 text-slate-100 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({pipelineResult.data.businesses.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResultsFilterStatus('qualified');
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    resultsFilterStatus === 'qualified'
                      ? 'bg-emerald-600/30 text-emerald-300 shadow-sm border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Qualified
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResultsFilterStatus('unqualified');
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    resultsFilterStatus === 'unqualified'
                      ? 'bg-amber-600/30 text-amber-300 shadow-sm border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Hold / Review
                </button>
              </div>

              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-lg bg-slate-900 border border-border text-xs text-slate-300 focus:outline-none"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-slate-900/40 text-slate-400">
                  <th className="py-3 px-4 font-medium">Business / ID</th>
                  <th className="py-3 px-4 font-medium">Digital Presence &amp; Footprint</th>
                  <th className="py-3 px-4 font-medium">Website Health</th>
                  <th className="py-3 px-4 font-medium">Contacts &amp; MX</th>
                  <th className="py-3 px-4 font-medium">Lead Score</th>
                  <th className="py-3 px-4 font-medium">Qualification Status</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedResultBusinesses.map((biz) => {
                  const audit = pipelineResult.data.audits.find((a) => a.businessId === biz.id);
                  const score = pipelineResult.data.leadScores.find((s) => s.businessId === biz.id);
                  const contacts = pipelineResult.data.contacts.filter((c) => c.businessId === biz.id);
                  const isQualified = biz.status === 'qualified';

                  return (
                    <tr key={biz.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100">{biz.officialName}</div>
                        <span className="text-[10px] font-mono text-slate-500">ID: {biz.id}</span>
                        {biz.fullAddress && (
                          <p className="text-[11px] text-slate-400 truncate max-w-xs">{biz.fullAddress}</p>
                        )}
                        {biz.description && (
                          <p className="text-[10px] text-slate-500 truncate max-w-xs italic mt-0.5">{biz.description}</p>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {biz.websiteUrl ? (
                          <a
                            href={biz.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline flex items-center gap-1 font-mono"
                          >
                            {biz.domain}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-500 italic">No website</span>
                        )}
                        {biz.reviewRating !== undefined && (
                          <div className="text-[11px] text-amber-400 mt-0.5">
                            ★ {biz.reviewRating} ({biz.reviewCount || 0} reviews)
                          </div>
                        )}

                        {/* Social Profile Badges */}
                        {biz.socialProfiles && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {biz.socialProfiles.linkedin && (
                              <a
                                href={biz.socialProfiles.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/30 font-medium"
                              >
                                LinkedIn
                              </a>
                            )}
                            {biz.socialProfiles.facebook && (
                              <a
                                href={biz.socialProfiles.facebook}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 font-medium"
                              >
                                FB
                              </a>
                            )}
                            {biz.socialProfiles.instagram && (
                              <a
                                href={biz.socialProfiles.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] px-1.5 py-0.5 rounded bg-pink-600/20 text-pink-300 hover:bg-pink-600/30 border border-pink-500/30 font-medium"
                              >
                                IG
                              </a>
                            )}
                            {biz.socialProfiles.youtube && (
                              <a
                                href={biz.socialProfiles.youtube}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] px-1.5 py-0.5 rounded bg-red-600/20 text-red-300 hover:bg-red-600/30 border border-red-500/30 font-medium"
                              >
                                YT
                              </a>
                            )}
                            {biz.socialProfiles.twitter && (
                              <a
                                href={biz.socialProfiles.twitter}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 hover:bg-slate-600 border border-slate-600 font-medium"
                              >
                                X
                              </a>
                            )}
                            {biz.socialProfiles.tiktok && (
                              <a
                                href={biz.socialProfiles.tiktok}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/30 border border-cyan-500/30 font-medium"
                              >
                                TikTok
                              </a>
                            )}
                            {biz.socialProfiles.pinterest && (
                              <a
                                href={biz.socialProfiles.pinterest}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] px-1.5 py-0.5 rounded bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30 font-medium"
                              >
                                Pin
                              </a>
                            )}
                          </div>
                        )}

                        {/* Discovered Subpage Pills */}
                        {(biz.aboutPageUrl || biz.contactPageUrl || biz.servicesPageUrl || biz.teamPageUrl) && (
                          <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-400 flex-wrap">
                            {biz.aboutPageUrl && (
                              <a
                                href={biz.aboutPageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 border border-border hover:text-blue-400"
                              >
                                About
                              </a>
                            )}
                            {biz.contactPageUrl && (
                              <a
                                href={biz.contactPageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 border border-border hover:text-blue-400"
                              >
                                Contact
                              </a>
                            )}
                            {biz.servicesPageUrl && (
                              <a
                                href={biz.servicesPageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 border border-border hover:text-blue-400"
                              >
                                Services
                              </a>
                            )}
                            {biz.teamPageUrl && (
                              <a
                                href={biz.teamPageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 border border-border hover:text-blue-400"
                              >
                                Team
                              </a>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {audit ? (
                          <div>
                            <span
                              className={`font-semibold font-mono ${
                                audit.totalScore >= 70
                                  ? 'text-emerald-400'
                                  : audit.totalScore >= 50
                                  ? 'text-amber-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {audit.totalScore}/100
                            </span>
                            <span className="text-slate-500 text-[11px] ml-1.5">
                              ({audit.findings.length} findings)
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Skipped</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {contacts.length > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-100">
                                {contacts.find(c => c.isDecisionMaker)?.fullName || contacts[0].fullName}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-400 font-medium">
                                {contacts.find(c => c.isDecisionMaker)?.roleOrTitle || contacts[0].roleOrTitle}
                              </span>
                            </div>
                            {(contacts.find(c => c.email)?.email) && (
                              <div className="text-[11px] text-slate-300 flex items-center gap-1">
                                <Mail className="w-3 h-3 text-cyan-400 shrink-0" />
                                <span className="font-mono">{contacts.find(c => c.email)?.email}</span>
                              </div>
                            )}
                            {biz.phone && (
                              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{biz.phone}</span>
                              </div>
                            )}
                            {biz.contactFormUrl && (
                              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                <span className="text-slate-500">Form:</span>
                                <a
                                  href={biz.contactFormUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-cyan-400 hover:underline truncate max-w-[120px]"
                                >
                                  Inbound Form
                                </a>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">None detected</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {score ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-slate-100">{score.totalScore}/100</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                                score.band === 'A'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : score.band === 'B'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              Grade {score.band}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">Unscored</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {isQualified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            CRM Outreach Ready
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">{biz.status}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedBusiness(biz)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-border text-[11px] transition-all"
                        >
                          View Dossier
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Controls */}
          <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              Showing <span className="font-semibold text-slate-200">{Math.min(filteredResultBusinesses.length, (currentPage - 1) * pageSize + 1)}</span> to{' '}
              <span className="font-semibold text-slate-200">{Math.min(filteredResultBusinesses.length, currentPage * pageSize)}</span> of{' '}
              <span className="font-semibold text-slate-200">{filteredResultBusinesses.length}</span> leads
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1 rounded-lg bg-slate-900 border border-border text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
              >
                Previous
              </button>
              <span className="px-2 font-mono text-slate-300">
                Page {currentPage} of {totalResultPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalResultPages, p + 1))}
                disabled={currentPage >= totalResultPages}
                className="px-3 py-1 rounded-lg bg-slate-900 border border-border text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dossier Modal */}
      {selectedBusiness && pipelineResult?.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-surface-100 border border-border rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative text-left space-y-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-100">{selectedBusiness.officialName}</h3>
                <p className="text-xs text-slate-400">
                  {selectedBusiness.fullAddress || selectedBusiness.websiteUrl}
                </p>
              </div>
              <button
                onClick={() => setSelectedBusiness(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Audit findings */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">Technical Audit Findings</h4>
              {(() => {
                const audit = pipelineResult.data.audits.find((a) => a.businessId === selectedBusiness.id);
                if (!audit) return <p className="text-xs text-slate-500">No website audit performed.</p>;

                return (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {audit.findings.length > 0 ? (
                      audit.findings.map((f) => (
                        <div key={f.id} className="p-2.5 rounded-lg bg-slate-900 border border-border text-xs">
                          <span className="font-semibold text-rose-400">{f.observation}</span>
                          <p className="text-slate-400 text-[11px] mt-0.5">{f.customerImpact}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-emerald-400">Baseline technical standards passed.</p>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Opportunities */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">Service Opportunities</h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {pipelineResult.data.opportunities
                  .filter((o) => o.businessId === selectedBusiness.id)
                  .map((opp) => (
                    <div
                      key={opp.id}
                      className="p-2 rounded-lg bg-slate-900 border border-border text-xs flex justify-between"
                    >
                      <span className="text-slate-200">{opp.identifiedProblem}</span>
                      <span className="text-blue-400 font-semibold uppercase text-[10px]">{opp.category}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => setSelectedBusiness(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
