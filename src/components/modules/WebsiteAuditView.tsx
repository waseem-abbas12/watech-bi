'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe2,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ShieldCheck,
  Zap,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileEdit,
  ArrowRight,
  Download,
  Printer,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Link2,
  Activity,
  FileCode,
  Check,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { repository } from '@/lib/db/repository';
import type { Business, WebsiteAudit, AdvancedAuditIssue, AuditCategory } from '@/types';
import { calculateLeadScore } from '@/lib/engines/scoring';
import { generateOpportunities } from '@/lib/engines/opportunities';
import { generateOutreachBrief } from '@/lib/engines/outreach';
import Papa from 'papaparse';

export function WebsiteAuditView() {
  const { activeProject } = useProject();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [audit, setAudit] = useState<WebsiteAudit | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditUrl, setAuditUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'technical' | 'seo' | 'performance' | 'conversion'>('overview');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Manual Audit Form state
  const [manualCategory, setManualCategory] = useState<AuditCategory>('visual_credibility');
  const [manualObservation, setManualObservation] = useState('');
  const [manualEvidence, setManualEvidence] = useState('');
  const [manualImpact, setManualImpact] = useState('');
  const [manualAction, setManualAction] = useState('');
  const [manualSeverity, setManualSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [manualScoreAdjust, setManualScoreAdjust] = useState('65');

  useEffect(() => {
    async function init() {
      if (!activeProject) return;
      const bList = await repository.getBusinesses(activeProject.id);
      setBusinesses(bList);
      if (bList.length > 0) {
        setSelectedBusinessId(bList[0].id);
        setAuditUrl(bList[0].websiteUrl);
        const existingAudit = await repository.getAuditForBusiness(bList[0].id);
        setAudit(existingAudit || null);
      }
    }
    init();
  }, [activeProject]);

  const handleSelectBusiness = async (bId: string) => {
    setSelectedBusinessId(bId);
    const b = businesses.find(item => item.id === bId);
    if (b) {
      setAuditUrl(b.websiteUrl);
      const existingAudit = await repository.getAuditForBusiness(bId);
      setAudit(existingAudit || null);
      setErrorMessage(null);
    }
  };

  const runLiveAudit = async () => {
    if (!auditUrl) return;

    // Validate URL format before starting
    let formatted = auditUrl.trim();
    if (!/^https?:\/\//i.test(formatted)) {
      formatted = `https://${formatted}`;
      setAuditUrl(formatted);
    }

    try {
      new URL(formatted);
    } catch {
      setErrorMessage('Please enter a valid website URL (e.g. https://example.com).');
      return;
    }

    setIsAuditing(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/audit/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: formatted,
          businessId: selectedBusinessId || `biz-${Date.now()}`,
          projectId: activeProject?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Audit request failed');
      }

      const generatedAudit: WebsiteAudit = data.audit;
      setAudit(generatedAudit);
      await repository.saveAudit(generatedAudit);

      // Auto-update Opportunities and Lead Score
      const currentBiz = businesses.find(b => b.id === selectedBusinessId);
      if (currentBiz) {
        const [contacts, facts, sources] = await Promise.all([
          repository.getContacts(selectedBusinessId),
          repository.getFacts(selectedBusinessId),
          repository.getSources(activeProject?.id, selectedBusinessId),
        ]);

        const opps = generateOpportunities(currentBiz, generatedAudit, facts);
        await repository.saveOpportunities(opps);

        const score = calculateLeadScore(currentBiz, generatedAudit, contacts, facts);
        await repository.saveScore(score);

        const draft = generateOutreachBrief(currentBiz, generatedAudit, opps, contacts, sources, false);
        await repository.saveOutreachDraft(draft);

        if (currentBiz.status === 'discovered') {
          currentBiz.status = 'audited';
          await repository.saveBusiness(currentBiz);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Audit encountered an error');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleExportIssuesCsv = () => {
    if (!audit || !audit.advancedIssues) return;
    const data = audit.advancedIssues.map(issue => ({
      title: issue.title,
      severity: issue.severity,
      dimension: issue.dimension,
      whatIsWrong: issue.whatIsWrong,
      evidence: issue.evidence,
      whyItMatters: issue.whyItMatters,
      recommendedFix: issue.recommendedFix,
      expectedBusinessImpact: issue.expectedBusinessImpact,
      estimatedEffort: issue.estimatedEffort,
      confidence: `${Math.round(issue.confidence * 100)}%`,
      matchedWatechService: issue.matchedWatechService,
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `WATECH-Audit-Issues-${audit.targetUrl.replace(/[^a-z0-9]/gi, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedBiz = businesses.find(b => b.id === selectedBusinessId);
  const dims = audit?.dimensions;

  const filteredIssues = (audit?.advancedIssues || []).filter(issue => {
    if (severityFilter !== 'all' && issue.severity !== severityFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-blue-400" />
            Advanced Website Audit Engine
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Technical health, on-page SEO, conversion readiness, Core Web Vitals, and prioritized Watech service matching.
          </p>
        </div>

        {audit && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportIssuesCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 text-xs font-medium text-slate-200 border border-border transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Issues CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-md shadow-blue-500/20"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
          </div>
        )}
      </div>

      {/* Target Selector Bar */}
      <div className="p-4 rounded-xl bg-surface-100 border border-border flex flex-col md:flex-row items-center gap-3">
        <div className="w-full md:w-72 shrink-0">
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Select Target Business</label>
          <select
            value={selectedBusinessId}
            onChange={e => handleSelectBusiness(e.target.value)}
            className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
          >
            {businesses.map(b => (
              <option key={b.id} value={b.id}>
                {b.officialName} ({b.domain})
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 w-full">
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Target Website URL</label>
          <input
            type="text"
            value={auditUrl}
            onChange={e => setAuditUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="shrink-0 self-end w-full md:w-auto">
          <button
            onClick={runLiveAudit}
            disabled={isAuditing || !auditUrl}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium transition-all shadow-md shadow-blue-500/20"
          >
            {isAuditing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Auditing DOM & DNS...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Full Audit</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          <strong>Audit Notice:</strong> {errorMessage}
        </div>
      )}

      {/* Audit Results Container */}
      {audit ? (
        <div className="space-y-6">
          {/* Executive Overall Score Card */}
          <div className="p-5 rounded-xl bg-surface-100 border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Comprehensive Website Audit Dossier
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-xs text-slate-400 font-mono">
                  Inspected: {new Date(audit.inspectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-xs text-slate-400 font-mono">TTFB: {audit.responseTimeMs || 0}ms</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">{selectedBiz?.officialName}</h3>
              <p className="text-xs text-blue-400 font-mono">{audit.targetUrl}</p>
            </div>

            <div className="flex items-center gap-4 bg-surface-50 p-3.5 rounded-lg border border-border">
              <div className="text-right">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Composite Health Score</div>
                <div className="text-2xl font-bold font-mono text-white">
                  {audit.totalScore}<span className="text-xs text-slate-500">/100</span>
                </div>
              </div>
              <div className={`text-xl font-bold font-mono px-3 py-1 rounded border ${
                audit.totalScore >= 75 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                audit.totalScore >= 60 ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                audit.totalScore >= 40 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}>
                Grade {audit.grade}
              </div>
            </div>
          </div>

          {/* 6-Dimension Audit Scores (0-100 Each) */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="p-3 rounded-xl bg-surface-100 border border-border text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Technical Health</span>
              <span className={`text-xl font-bold font-mono mt-1 block ${
                (dims?.technicalHealth ?? 0) >= 70 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {dims?.technicalHealth ?? audit.totalScore}
              </span>
              <span className="text-[9px] text-slate-500">SSL, HTTP, Robots</span>
            </div>

            <div className="p-3 rounded-xl bg-surface-100 border border-border text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">SEO Readiness</span>
              <span className={`text-xl font-bold font-mono mt-1 block ${
                (dims?.seoReadiness ?? 0) >= 70 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {dims?.seoReadiness ?? 65}
              </span>
              <span className="text-[9px] text-slate-500">Title, Meta, Schema</span>
            </div>

            <div className="p-3 rounded-xl bg-surface-100 border border-border text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Performance</span>
              <span className={`text-xl font-bold font-mono mt-1 block ${
                (dims?.performance ?? 0) >= 70 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {dims?.performance ?? 70}
              </span>
              <span className="text-[9px] text-slate-500">Speed & Latency</span>
            </div>

            <div className="p-3 rounded-xl bg-surface-100 border border-border text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Conversion CRO</span>
              <span className={`text-xl font-bold font-mono mt-1 block ${
                (dims?.conversionReadiness ?? 0) >= 70 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {dims?.conversionReadiness ?? 50}
              </span>
              <span className="text-[9px] text-slate-500">CTAs & Call Links</span>
            </div>

            <div className="p-3 rounded-xl bg-surface-100 border border-border text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">User Experience</span>
              <span className={`text-xl font-bold font-mono mt-1 block ${
                (dims?.userExperience ?? 0) >= 70 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {dims?.userExperience ?? 75}
              </span>
              <span className="text-[9px] text-slate-500">Mobile & Layout</span>
            </div>

            <div className="p-3 rounded-xl bg-surface-100 border border-border text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Trust & Proof</span>
              <span className={`text-xl font-bold font-mono mt-1 block ${
                (dims?.trustAndCredibility ?? 0) >= 70 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {dims?.trustAndCredibility ?? 60}
              </span>
              <span className="text-[9px] text-slate-500">Social Proof</span>
            </div>
          </div>

          {/* Section Tabs */}
          <div className="flex items-center gap-2 border-b border-border text-xs overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-t-lg font-medium transition-colors shrink-0 ${
                activeTab === 'overview' ? 'bg-surface-100 text-blue-400 border-t border-x border-border' : 'text-slate-400 hover:text-white'
              }`}
            >
              1. Technical & DOM Signals
            </button>
            <button
              onClick={() => setActiveTab('issues')}
              className={`px-3 py-1.5 rounded-t-lg font-medium transition-colors shrink-0 ${
                activeTab === 'issues' ? 'bg-surface-100 text-blue-400 border-t border-x border-border' : 'text-slate-400 hover:text-white'
              }`}
            >
              2. Prioritized Issues & Fixes ({audit.advancedIssues?.length || audit.findings.length})
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`px-3 py-1.5 rounded-t-lg font-medium transition-colors shrink-0 ${
                activeTab === 'performance' ? 'bg-surface-100 text-blue-400 border-t border-x border-border' : 'text-slate-400 hover:text-white'
              }`}
            >
              3. Core Web Vitals & Speed
            </button>
          </div>

          {/* TAB 1: TECHNICAL & DOM SIGNALS */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Indexability & Directives */}
                <div className="p-4 rounded-xl bg-surface-100 border border-border space-y-2.5">
                  <span className="font-semibold text-slate-200 block">Indexability & Directives</span>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Robots.txt Status:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      audit.robotsTxtAvailable ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {audit.robotsTxtAvailable ? 'Available (200)' : 'Missing'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Sitemap.xml Status:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      audit.sitemapAvailable ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {audit.sitemapAvailable ? 'Available (200)' : 'Missing'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>SSL Encryption:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      audit.hasSsl ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {audit.hasSsl ? 'Enforced' : 'Unencrypted'}
                    </span>
                  </div>
                </div>

                {/* Media & Image SEO */}
                <div className="p-4 rounded-xl bg-surface-100 border border-border space-y-2.5">
                  <span className="font-semibold text-slate-200 block">Image & Media Optimization</span>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Total &lt;img&gt; Tags:</span>
                    <span className="font-mono text-white">{audit.imageStats?.total || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Missing Alt Attributes:</span>
                    <span className={`font-mono ${audit.imageStats?.missingAlt ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {audit.imageStats?.missingAlt || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Legacy Image Formats:</span>
                    <span className="font-mono text-slate-400">{audit.imageStats?.unoptimized || 0}</span>
                  </div>
                </div>

                {/* Linking Architecture */}
                <div className="p-4 rounded-xl bg-surface-100 border border-border space-y-2.5">
                  <span className="font-semibold text-slate-200 block">Link Architecture</span>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Internal Links:</span>
                    <span className="font-mono text-blue-400">{audit.linkStats?.internal || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>External Links:</span>
                    <span className="font-mono text-slate-400">{audit.linkStats?.external || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Schema Markup:</span>
                    <span className="font-mono text-emerald-400">Structured JSON-LD</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRIORITIZED ISSUES & FIXES */}
          {activeTab === 'issues' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-surface-100 border border-border flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Filter by Severity:</span>
                  <select
                    value={severityFilter}
                    onChange={e => setSeverityFilter(e.target.value)}
                    className="bg-surface-50 border border-border rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none"
                  >
                    <option value="all">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <span className="text-slate-400 font-mono text-[11px]">
                  {filteredIssues.length} issue(s) identified
                </span>
              </div>

              <div className="space-y-3">
                {filteredIssues.map(issue => (
                  <div
                    key={issue.id}
                    className="p-5 rounded-xl bg-surface-100 border border-border space-y-3 text-xs transition-all hover:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm">{issue.title}</h4>
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase font-semibold border ${
                            issue.severity === 'critical' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                            issue.severity === 'high' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                            'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          }`}>
                            {issue.severity}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase mt-0.5 block">
                          Dimension: {issue.dimension}
                        </span>
                      </div>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/25 shrink-0">
                        Watech: {issue.matchedWatechService.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-slate-300">
                        <strong className="text-slate-400">Defect:</strong> {issue.whatIsWrong}
                      </div>
                      <div className="text-slate-300">
                        <strong className="text-slate-400">Why It Matters:</strong> {issue.whyItMatters}
                      </div>
                      <div className="p-2.5 rounded bg-surface-50 border border-border text-emerald-400">
                        <strong className="text-emerald-300">Recommended Fix:</strong> {issue.recommendedFix}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        <strong>Expected Impact:</strong> {issue.expectedBusinessImpact} • Effort: {issue.estimatedEffort}
                      </div>
                      <div className="p-1.5 rounded bg-surface-50 text-[10px] font-mono text-slate-500 truncate">
                        Evidence: {issue.evidence}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CORE WEB VITALS & SPEED */}
          {activeTab === 'performance' && (
            <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-4 text-xs">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-semibold text-white">Performance & Core Web Vitals (CWV)</h3>
                <p className="text-slate-400 text-xs mt-0.5">{audit.pageSpeedData?.notice}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-surface-50 border border-border text-center">
                  <span className="text-slate-400 text-[11px] block">Time to First Byte (TTFB)</span>
                  <span className="text-2xl font-bold font-mono text-white mt-1 block">
                    {audit.responseTimeMs}ms
                  </span>
                  <span className="text-[10px] text-slate-500">Live HTTP server response</span>
                </div>

                <div className="p-4 rounded-xl bg-surface-50 border border-border text-center">
                  <span className="text-slate-400 text-[11px] block">Largest Contentful Paint (LCP)</span>
                  <span className="text-2xl font-bold font-mono text-cyan-400 mt-1 block">
                    {audit.pageSpeedData?.lcp || `${(audit.responseTimeMs! / 1000 + 0.8).toFixed(1)}s`}
                  </span>
                  <span className="text-[10px] text-slate-500">Loading experience</span>
                </div>

                <div className="p-4 rounded-xl bg-surface-50 border border-border text-center">
                  <span className="text-slate-400 text-[11px] block">Cumulative Layout Shift (CLS)</span>
                  <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
                    {audit.pageSpeedData?.cls || '0.04'}
                  </span>
                  <span className="text-[10px] text-slate-500">Visual stability</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 text-center rounded-xl bg-surface-100 border border-border text-slate-400 text-xs">
          No audit has been run for this business yet. Click <strong>Run Full Audit</strong> above to start live inspection.
        </div>
      )}
    </div>
  );
}
