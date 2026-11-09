'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  FileCheck2,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Target,
  ArrowRight,
  Globe,
  PlusCircle,
  ExternalLink,
  Filter,
  ChevronRight,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { repository } from '@/lib/db/repository';
import type { Business, WebsiteAudit, Opportunity, LeadScore, Contact } from '@/types';
import { formatScoreGrade } from '@/lib/utils';

export function OverviewDashboard() {
  const { activeProject, setActiveModule, resetToDemoData } = useProject();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [audits, setAudits] = useState<WebsiteAudit[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [scores, setScores] = useState<LeadScore[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedBand, setSelectedBand] = useState<string>('all');

  useEffect(() => {
    async function loadData() {
      if (!activeProject) return;
      setIsLoading(true);
      try {
        const [bList, aList, oList, sList, cList] = await Promise.all([
          repository.getBusinesses(activeProject.id),
          repository.getAudits(activeProject.id),
          repository.getOpportunities(undefined, activeProject.id),
          repository.getScores(activeProject.id),
          repository.getContacts(undefined, activeProject.id),
        ]);
        setBusinesses(bList);
        setAudits(aList);
        setOpportunities(oList);
        setScores(sList);
        setContacts(cList);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [activeProject]);

  if (!activeProject) {
    return (
      <div className="text-center py-16 bg-surface-100 rounded-xl border border-border p-8 max-w-lg mx-auto my-12 space-y-4">
        <Building2 className="w-12 h-12 text-blue-400 mx-auto" />
        <h3 className="text-base font-semibold text-slate-200">No Research Project Selected</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Please select an existing project from the top bar or initialize a new research project to begin market intelligence.
        </p>
        <button
          onClick={() => resetToDemoData()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-xs transition-all shadow-md shadow-blue-500/20"
        >
          Load Dallas-Fort Worth & Austin HVAC Intelligence
        </button>
      </div>
    );
  }

  // Real Metric Calculations
  const totalBusinesses = businesses.length;
  const auditedCount = audits.length;
  const totalOpportunities = opportunities.length;
  const verifiedContactsCount = contacts.filter(c => c.verificationStatus === 'verified').length;

  const bandCounts = {
    A: scores.filter(s => s.band === 'A').length,
    B: scores.filter(s => s.band === 'B').length,
    C: scores.filter(s => s.band === 'C').length,
    Hold: scores.filter(s => s.band === 'Hold').length,
  };

  const researchCoverage = totalBusinesses > 0
    ? Math.round((auditedCount / totalBusinesses) * 100)
    : 0;

  // Filtered Businesses
  const filteredBusinesses = businesses.filter(b => {
    if (selectedCity !== 'all' && b.city !== selectedCity) return false;
    if (selectedBand !== 'all') {
      const bScore = scores.find(s => s.businessId === b.id);
      if (bScore?.band !== selectedBand) return false;
    }
    return true;
  });

  const cities = Array.from(new Set(businesses.map(b => b.city).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Project Header Banner */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-surface-100 to-surface-50 border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 uppercase">
              {activeProject.researchDepth} Depth Research
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-400">{activeProject.cityArea}, {activeProject.stateRegion || activeProject.country}</span>
            {activeProject.isDemo && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase">
                DEMO
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">{activeProject.name}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Focus: <span className="text-slate-300">{activeProject.industryNiche}</span> ({activeProject.businessModel})
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveModule('lead_pipeline')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors shadow-md shadow-blue-500/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Run Pipeline</span>
          </button>
          <button
            onClick={() => setActiveModule('lead_intelligence')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-200 hover:bg-surface-300 text-xs font-medium text-slate-200 border border-border transition-colors"
          >
            <span>Lead Dossier</span>
          </button>
          <button
            onClick={() => setActiveModule('discovery')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-200 hover:bg-surface-300 text-xs font-medium text-slate-200 border border-border transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Business</span>
          </button>
        </div>
      </div>

      {/* Real Metric KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface-100 border border-border">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Discovered Businesses</span>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{totalBusinesses}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Coverage</span>
            <span className="text-blue-400 font-mono font-medium">{researchCoverage}%</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-100 border border-border">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Audited Targets</span>
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{auditedCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {totalBusinesses - auditedCount} pending audit
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-100 border border-border">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Identified Opportunities</span>
            <Target className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{totalOpportunities}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Evidence-backed Watech services
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-100 border border-border">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Verified Contacts</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{verifiedContactsCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Reachable decision-makers
          </div>
        </div>
      </div>

      {/* Prioritization Grade Breakdown */}
      <div className="p-5 rounded-xl bg-surface-100 border border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Transparent Lead Prioritization Tiers</h3>
            <p className="text-xs text-slate-400">100-point transparent scoring model; unknown data is not penalized.</p>
          </div>
          <button
            onClick={() => setActiveModule('lead_scoring')}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
          >
            Adjust Weights <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25">
            <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Tier A (80-100)</div>
            <div className="text-xl font-bold text-emerald-300 font-mono mt-1">{bandCounts.A}</div>
            <div className="text-[10px] text-emerald-400/80 mt-0.5">High need & validated capacity</div>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/25">
            <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Tier B (60-79)</div>
            <div className="text-xl font-bold text-blue-300 font-mono mt-1">{bandCounts.B}</div>
            <div className="text-[10px] text-blue-400/80 mt-0.5">Strong specific opportunity</div>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25">
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Tier C (40-59)</div>
            <div className="text-xl font-bold text-amber-300 font-mono mt-1">{bandCounts.C}</div>
            <div className="text-[10px] text-amber-400/80 mt-0.5">Moderate leverage / partial data</div>
          </div>
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25">
            <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Hold (&lt;40)</div>
            <div className="text-xl font-bold text-rose-300 font-mono mt-1">{bandCounts.Hold}</div>
            <div className="text-[10px] text-rose-400/80 mt-0.5">Low digital urgency or modern site</div>
          </div>
        </div>
      </div>

      {/* Filterable Businesses Shortlist */}
      <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Project Target Shortlist</h3>
            <p className="text-xs text-slate-400">Records currently cataloged in this research workspace.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-surface-50 border border-border px-2.5 py-1 rounded-lg text-xs text-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>City:</span>
              <select
                value={selectedCity}
                onChange={e => setSelectedCity(e.target.value)}
                className="bg-transparent border-none text-slate-200 text-xs focus:outline-none"
              >
                <option value="all">All Cities</option>
                {cities.map(c => (
                  <option key={c} value={c} className="bg-surface-100">{c}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-surface-50 border border-border px-2.5 py-1 rounded-lg text-xs text-slate-300">
              <span>Grade:</span>
              <select
                value={selectedBand}
                onChange={e => setSelectedBand(e.target.value)}
                className="bg-transparent border-none text-slate-200 text-xs focus:outline-none"
              >
                <option value="all">All</option>
                <option value="A" className="bg-surface-100">A</option>
                <option value="B" className="bg-surface-100">B</option>
                <option value="C" className="bg-surface-100">C</option>
                <option value="Hold" className="bg-surface-100">Hold</option>
              </select>
            </div>
          </div>
        </div>

        {filteredBusinesses.length === 0 ? (
          businesses.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl bg-surface-50 border border-dashed border-border my-4 space-y-3">
              <Building2 className="w-8 h-8 text-blue-400 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-200">No Businesses in this Project Yet</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Get started by importing your lead lists or launching the autonomous 10-stage research pipeline.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setActiveModule('discovery')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-xs transition-all shadow-md shadow-blue-500/20"
                >
                  Import Leads (CSV / Discovery)
                </button>
                <button
                  onClick={() => setActiveModule('lead_pipeline')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-border font-medium rounded-lg text-xs transition-all"
                >
                  Open 10-Stage Pipeline
                </button>
                <a
                  href="/onboarding"
                  className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-medium rounded-lg text-xs transition-all"
                >
                  Launch Onboarding Wizard
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-400">
              No businesses match the selected filters.
            </div>
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 text-slate-400 border-b border-border">
                <tr>
                  <th className="py-2.5 px-3 font-medium">Business / Domain</th>
                  <th className="py-2.5 px-3 font-medium">Location</th>
                  <th className="py-2.5 px-3 font-medium">Decision-Maker</th>
                  <th className="py-2.5 px-3 font-medium">Website Audit</th>
                  <th className="py-2.5 px-3 font-medium">Lead Tier</th>
                  <th className="py-2.5 px-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBusinesses.map(b => {
                  const bAudit = audits.find(a => a.businessId === b.id);
                  const bScore = scores.find(s => s.businessId === b.id);
                  const gradeInfo = bScore ? formatScoreGrade(bScore.totalScore) : null;

                  return (
                    <tr key={b.id} className="hover:bg-surface-50/50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-200">{b.officialName}</div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <span>{b.domain}</span>
                          {b.isDemo && (
                            <span className="text-[8px] px-1 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              DEMO
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {b.city || 'N/A'}, {b.state || ''}
                      </td>
                      <td className="py-3 px-3">
                        {b.ownerManagerName ? (
                          <div>
                            <div className="text-slate-200 font-medium">{b.ownerManagerName}</div>
                            <div className="text-[10px] text-slate-400">{b.ownerManagerRole || 'Owner'}</div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {bAudit ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Score: {bAudit.totalScore}/100
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Pending</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {gradeInfo ? (
                          <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${gradeInfo.bg} ${gradeInfo.color}`}>
                            Tier {gradeInfo.grade} ({bScore?.totalScore})
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Uncalculated</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setActiveModule('lead_intelligence')}
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1"
                        >
                          Dossier <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
