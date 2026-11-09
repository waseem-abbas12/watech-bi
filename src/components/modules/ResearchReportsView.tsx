'use client';

import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Printer,
  Download,
  Share2,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ExternalLink,
  Target,
  ArrowRight,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { repository } from '@/lib/db/repository';
import type { Business, WebsiteAudit, Opportunity, LeadScore, Contact, SourceRecord, MarketArea } from '@/types';
import { formatScoreGrade, getVerificationBadge } from '@/lib/utils';

export function ResearchReportsView() {
  const { activeProject } = useProject();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [audit, setAudit] = useState<WebsiteAudit | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [score, setScore] = useState<LeadScore | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [marketArea, setMarketArea] = useState<MarketArea | null>(null);

  const loadData = async () => {
    if (!activeProject) return;
    const [bList, areas] = await Promise.all([
      repository.getBusinesses(activeProject.id),
      repository.getMarketAreas(activeProject.id),
    ]);
    setBusinesses(bList);
    setMarketArea(areas[0] || null);

    if (bList.length > 0) {
      const activeId = selectedBusinessId || bList[0].id;
      setSelectedBusinessId(activeId);
      await loadBusinessReport(activeId);
    }
  };

  const loadBusinessReport = async (bId: string) => {
    const [bAudit, bOpps, bScore, bContacts, bSources] = await Promise.all([
      repository.getAuditForBusiness(bId),
      repository.getOpportunities(bId),
      repository.getScoreForBusiness(bId),
      repository.getContacts(bId),
      repository.getSources(activeProject?.id, bId),
    ]);

    setAudit(bAudit || null);
    setOpportunities(bOpps);
    setScore(bScore || null);
    setContacts(bContacts);
    setSources(bSources);
  };

  useEffect(() => {
    loadData();
  }, [activeProject]);

  const handleSelectBusiness = async (bId: string) => {
    setSelectedBusinessId(bId);
    await loadBusinessReport(bId);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportJson = () => {
    const selectedBiz = businesses.find(b => b.id === selectedBusinessId);
    if (!selectedBiz) return;

    const reportData = {
      project: activeProject,
      marketArea,
      business: selectedBiz,
      audit,
      opportunities,
      score,
      contacts,
      sources,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `WATECH-Research-Report-${selectedBiz.domain}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedBiz = businesses.find(b => b.id === selectedBusinessId);
  const gradeInfo = score ? formatScoreGrade(score.totalScore) : null;

  return (
    <div className="space-y-6 text-left">
      {/* Top Controls - Hidden during print */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-blue-400" />
            Executive Research & Audit Report
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Printable dossier with market context, 10-category audit, opportunity matrix, and source citations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 text-xs font-medium text-slate-200 border border-border transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-md shadow-blue-500/20"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Selector - Hidden during print */}
      <div className="no-print p-3.5 rounded-xl bg-surface-100 border border-border flex items-center gap-3">
        <span className="text-xs text-slate-400 shrink-0">Report Target:</span>
        <select
          value={selectedBusinessId}
          onChange={e => handleSelectBusiness(e.target.value)}
          className="bg-surface-50 border border-border rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500 max-w-sm"
        >
          {businesses.map(b => (
            <option key={b.id} value={b.id}>
              {b.officialName} ({b.domain})
            </option>
          ))}
        </select>
      </div>

      {/* PRINTABLE DOSSIER CONTAINER */}
      {selectedBiz ? (
        <div className="print-card rounded-2xl bg-surface-100 border border-border p-6 md:p-8 space-y-8 text-slate-200">
          {/* Report Cover / Header */}
          <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-wider text-blue-400 uppercase">
                  WATECH GROWTH RESEARCH OS
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-xs text-slate-400 font-mono">
                  DATE: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                {selectedBiz.isDemo && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase">
                    DEMO DATASET
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight mt-1.5">
                {selectedBiz.officialName}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Domain: <span className="font-mono text-blue-400">{selectedBiz.domain}</span> • Geography: {selectedBiz.city || 'N/A'}, {selectedBiz.state || activeProject?.stateRegion}
              </p>
            </div>

            {/* Score Band Badge */}
            {score && (
              <div className="bg-surface-50 p-4 rounded-xl border border-border text-right shrink-0">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Prioritization Tier</span>
                <div className={`text-2xl font-bold font-mono mt-0.5 ${gradeInfo?.color}`}>
                  Grade {score.band} ({score.totalScore}/100)
                </div>
                <span className="text-[10px] text-slate-400">100-pt evidence model</span>
              </div>
            )}
          </div>

          {/* Section 1: Executive Summary & Context */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-blue-400 font-bold">
              1. Executive Intelligence Summary
            </h3>
            <div className="p-4 rounded-xl bg-surface-50 border border-border text-xs leading-relaxed space-y-2 text-slate-300">
              <p>
                <strong>{selectedBiz.officialName}</strong> is an established contractor in the {selectedBiz.city || activeProject?.cityArea} area specializing in {selectedBiz.businessModel}. The company operates with an estimated capacity of {selectedBiz.teamSizeEstimate || 'unconfirmed team'} and {selectedBiz.fleetCapacity || 'unconfirmed fleet vehicles'}.
              </p>
              <p>
                Public review signals show an average customer satisfaction of {selectedBiz.reviewRating ? `${selectedBiz.reviewRating}★ (${selectedBiz.reviewCount} verified reviews)` : 'unmeasured rating'}. Verified decision-maker contact route is currently <strong>{selectedBiz.ownerManagerName || 'unassigned'}</strong> ({selectedBiz.ownerManagerRole || 'Owner'}) with provenance marked as <em>{selectedBiz.ownerVerificationStatus}</em>.
              </p>
            </div>
          </div>

          {/* Section 2: Market Context */}
          {marketArea && (
            <div className="space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-blue-400 font-bold">
                2. Regional Market Topology
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-lg bg-surface-50 border border-border">
                  <span className="text-[11px] text-slate-400 block mb-1">Target Geographic Zone</span>
                  <div className="font-semibold text-slate-200">{marketArea.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{marketArea.geographicBoundaries}</div>
                </div>
                <div className="p-3.5 rounded-lg bg-surface-50 border border-border">
                  <span className="text-[11px] text-slate-400 block mb-1">Market Pool & Composition</span>
                  <div className="font-semibold text-slate-200">{marketArea.estimatedBusinessCount || 'N/A'} operators</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{marketArea.independentVsFranchiseRatio}</div>
                </div>
                <div className="p-3.5 rounded-lg bg-surface-50 border border-border">
                  <span className="text-[11px] text-slate-400 block mb-1">Demand & Seasonality</span>
                  <div className="text-[11px] text-slate-300">{marketArea.seasonalityAndDemandNotes}</div>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: 10-Category Website Audit Results */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-blue-400 font-bold">
              3. Structured Website Audit (10-Category Breakdown)
            </h3>
            {audit ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  {audit.categories.map(c => (
                    <div key={c.category} className="p-2.5 rounded bg-surface-50 border border-border text-center">
                      <div className="text-[10px] text-slate-400 truncate">{c.categoryName}</div>
                      <div className={`text-base font-bold font-mono mt-1 ${
                        c.score >= 70 ? 'text-emerald-400' :
                        c.score >= 50 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {c.score}
                      </div>
                    </div>
                  ))}
                </div>

                {audit.findings.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-border rounded-lg overflow-hidden">
                      <thead className="bg-surface-50 text-slate-400 border-b border-border">
                        <tr>
                          <th className="py-2 px-3 font-medium">Issue / Observation</th>
                          <th className="py-2 px-3 font-medium">Severity</th>
                          <th className="py-2 px-3 font-medium">Customer Impact</th>
                          <th className="py-2 px-3 font-medium">Recommended Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {audit.findings.map(f => (
                          <tr key={f.id} className="hover:bg-surface-50/50">
                            <td className="py-2.5 px-3 font-medium text-slate-200">{f.observation}</td>
                            <td className="py-2.5 px-3 font-mono uppercase text-[10px] text-amber-400">{f.severity}</td>
                            <td className="py-2.5 px-3 text-slate-300">{f.customerImpact}</td>
                            <td className="py-2.5 px-3 text-emerald-400">{f.recommendedAction}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-surface-50 rounded-lg text-xs text-slate-400 italic">
                Website audit pending execution.
              </div>
            )}
          </div>

          {/* Section 4: Actionable Opportunities */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-blue-400 font-bold">
              4. Evidence-Backed Growth Opportunities
            </h3>
            {opportunities.length === 0 ? (
              <div className="p-4 bg-surface-50 rounded-lg text-xs text-slate-400 italic">
                No opportunities logged yet.
              </div>
            ) : (
              <div className="space-y-2">
                {opportunities.map(opp => (
                  <div key={opp.id} className="p-3.5 rounded-lg bg-surface-50 border border-border text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-100">
                        {opp.recommendedSolution}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        {opp.relevantWatechService.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-slate-300">
                      <strong>Problem:</strong> {opp.identifiedProblem}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      <strong>Evidence:</strong> {opp.evidence} • Impact: {opp.impact} • Effort: {opp.effort}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: Sources & Citations */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
              5. Sourced Evidence & Verification Limitations
            </h3>
            <div className="text-xs text-slate-400 leading-relaxed space-y-2">
              <p>
                <strong>Methodology & Limitations:</strong> All data presented in this report is derived from public HTTP inspection, domain records, and defensible public registries. No proprietary internal analytics or private revenue data is fabricated or inferred.
              </p>
              {sources.length > 0 && (
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400">
                  {sources.map(s => (
                    <li key={s.id}>
                      {s.sourceName} ({s.sourceType}) — Verified {s.verificationStatus} on {s.retrievalDate}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-surface-100 rounded-xl border border-border text-slate-400 text-xs">
          Select a business to view its executive research report.
        </div>
      )}
    </div>
  );
}
