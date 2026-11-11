'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BrainCircuit,
  Search,
  Filter,
  Download,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Users,
  Globe2,
  Target,
  FileCheck2,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  X,
  Layers,
  ArrowUpDown,
  Building2,
  Sparkles,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { repository } from '@/lib/db/repository';
import type { Business, WebsiteAudit, Contact, Opportunity, LeadScore } from '@/types';
import { formatScoreGrade } from '@/lib/utils';

export function LeadIntelligenceView() {
  const { activeProject, setActiveModule } = useProject();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [audits, setAudits] = useState<WebsiteAudit[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [scores, setScores] = useState<LeadScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBand, setSelectedBand] = useState<string>('all');
  const [filterVerifiedEmail, setFilterVerifiedEmail] = useState(false);
  const [filterDecisionMaker, setFilterDecisionMaker] = useState(false);
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'city'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Selected Lead for 360° Dossier Drawer
  const [selectedLead, setSelectedLead] = useState<Business | null>(null);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    business: true,
    location: true,
    websiteAudit: true,
    decisionMaker: true,
    opportunities: true,
    score: true,
  });

  useEffect(() => {
    async function loadData() {
      if (!activeProject) return;
      setIsLoading(true);
      try {
        const [bList, aList, cList, oList, sList] = await Promise.all([
          repository.getBusinesses(activeProject.id),
          repository.getAudits(activeProject.id),
          repository.getContacts(undefined, activeProject.id),
          repository.getOpportunities(undefined, activeProject.id),
          repository.getScores(activeProject.id),
        ]);
        setBusinesses(bList);
        setAudits(aList);
        setContacts(cList);
        setOpportunities(oList);
        setScores(sList);
      } catch (err) {
        console.error('Failed to load lead intelligence records:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [activeProject]);

  // Lead Enrichment & Filtering
  const enrichedLeads = useMemo(() => {
    return businesses.map((b) => {
      const audit = audits.find((a) => a.businessId === b.id);
      const leadContacts = contacts.filter((c) => c.businessId === b.id);
      const leadOpps = opportunities.filter((o) => o.businessId === b.id);
      const leadScore = scores.find((s) => s.businessId === b.id);
      const dm = leadContacts.find((c) => c.isDecisionMaker);
      const hasVerifiedEmail = leadContacts.some((c) => c.verificationStatus === 'verified');

      return {
        business: b,
        audit,
        contacts: leadContacts,
        decisionMaker: dm,
        hasVerifiedEmail,
        opportunities: leadOpps,
        score: leadScore,
      };
    });
  }, [businesses, audits, contacts, opportunities, scores]);

  const filteredLeads = useMemo(() => {
    return enrichedLeads.filter((item) => {
      const b = item.business;
      if (!b) return false;
      const q = (searchQuery || '').toLowerCase().trim();
      const matchesSearch =
        !q ||
        (b.officialName || (b as any).name || '').toLowerCase().includes(q) ||
        (b.domain || '').toLowerCase().includes(q) ||
        (b.city && b.city.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (selectedBand !== 'all') {
        if (item.score?.band !== selectedBand) return false;
      }

      if (filterVerifiedEmail && !item.hasVerifiedEmail) return false;
      if (filterDecisionMaker && !item.decisionMaker) return false;

      return true;
    });
  }, [enrichedLeads, searchQuery, selectedBand, filterVerifiedEmail, filterDecisionMaker]);

  // Sorting
  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      if (sortBy === 'score') {
        const scoreA = a.score?.totalScore ?? -1;
        const scoreB = b.score?.totalScore ?? -1;
        return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
      }
      if (sortBy === 'name') {
        const nameA = (a.business?.officialName || (a.business as any)?.name || '').toLowerCase();
        const nameB = (b.business?.officialName || (b.business as any)?.name || '').toLowerCase();
        return sortOrder === 'desc' ? nameB.localeCompare(nameA) : nameA.localeCompare(nameB);
      }
      if (sortBy === 'city') {
        const cityA = (a.business?.city || '').toLowerCase();
        const cityB = (b.business?.city || '').toLowerCase();
        return sortOrder === 'desc' ? cityB.localeCompare(cityA) : cityA.localeCompare(cityB);
      }
      return 0;
    });
  }, [filteredLeads, sortBy, sortOrder]);

  // Paginated Slice
  const totalPages = Math.ceil(sortedLeads.length / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedLeads.slice(start, start + pageSize);
  }, [sortedLeads, page]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Official Name', 'Domain', 'Phone', 'City', 'State', 'Lead Score', 'Band', 'Decision Maker', 'Verified Email'];
    const rows = sortedLeads.map((item) => [
      `"${item.business.officialName.replace(/"/g, '""')}"`,
      item.business.domain,
      item.business.phone || '',
      item.business.city || '',
      item.business.state || '',
      item.score?.totalScore ?? 'N/A',
      item.score?.band ?? 'Hold',
      `"${(item.decisionMaker?.fullName || '').replace(/"/g, '""')}"`,
      item.hasVerifiedEmail ? 'Yes' : 'No',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `watech_lead_intelligence_${activeProject?.id || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedItem = useMemo(() => {
    if (!selectedLead) return null;
    return enrichedLeads.find((item) => item.business.id === selectedLead.id) || null;
  }, [selectedLead, enrichedLeads]);

  return (
    <div className="space-y-6">
      {/* Page Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-surface-100 border border-border">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <BrainCircuit className="w-5 h-5 text-blue-400" />
            Unified Lead Intelligence & Dossier
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Multi-dimensional intelligence combining technical website performance audits, verified decision-makers, commercial opportunities, and deterministic 100-pt scoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={sortedLeads.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-50 border border-border text-slate-200 hover:text-white hover:bg-surface-200 text-xs font-medium transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export CSV ({sortedLeads.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-surface-100 border border-border space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by company name, domain, city..."
              className="w-full bg-surface-50 border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-50 border border-border">
              <span className="text-slate-400 font-medium">Band:</span>
              <select
                value={selectedBand}
                onChange={(e) => {
                  setSelectedBand(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent border-none text-slate-200 text-xs focus:outline-none"
              >
                <option value="all">All Bands</option>
                <option value="A" className="bg-slate-900">Band A (Prime)</option>
                <option value="B" className="bg-slate-900">Band B (Strong)</option>
                <option value="C" className="bg-slate-900">Band C (Moderate)</option>
                <option value="Hold" className="bg-slate-900">Hold</option>
              </select>
            </div>

            <button
              onClick={() => {
                setFilterDecisionMaker(!filterDecisionMaker);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition flex items-center gap-1.5 ${
                filterDecisionMaker
                  ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                  : 'bg-surface-50 text-slate-400 border-border hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Has Decision-Maker</span>
            </button>

            <button
              onClick={() => {
                setFilterVerifiedEmail(!filterVerifiedEmail);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition flex items-center gap-1.5 ${
                filterVerifiedEmail
                  ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-surface-50 text-slate-400 border-border hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Email</span>
            </button>
          </div>
        </div>

        {/* Counter and Sort Status */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-border/50">
          <span>
            Showing <strong className="text-slate-200">{filteredLeads.length}</strong> of{' '}
            <strong className="text-slate-200">{businesses.length}</strong> total leads in project
          </span>

          <div className="flex items-center gap-2">
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-surface-50 border border-border text-slate-300 rounded px-2 py-0.5 text-[11px]"
            >
              <option value="score">Lead Score</option>
              <option value="name">Company Name</option>
              <option value="city">City / Location</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 rounded bg-surface-50 border border-border text-slate-400 hover:text-white"
              title="Toggle sort direction"
            >
              <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Intelligence Table */}
      {paginatedLeads.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface-100 border border-dashed border-border space-y-3">
          <BrainCircuit className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-200">No Leads Match Criteria</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || selectedBand !== 'all' || filterDecisionMaker || filterVerifiedEmail
              ? 'Try relaxing your filter criteria to view more businesses.'
              : 'Launch the 10-stage pipeline to analyze and score commercial targets.'}
          </p>
          <button
            onClick={() => setActiveModule('lead_pipeline')}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
          >
            Launch 10-Stage Pipeline
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-surface-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-border">
              <thead className="bg-surface-50 text-slate-400 font-medium">
                <tr>
                  <th className="py-3 px-4">Business / Domain</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Website Audit</th>
                  <th className="py-3 px-4">Decision-Maker</th>
                  <th className="py-3 px-4">Opportunities</th>
                  <th className="py-3 px-4">Score & Band</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedLeads.map((item) => {
                  const b = item.business;
                  const score = item.score;
                  const gradeInfo = score ? formatScoreGrade(score.totalScore) : null;
                  const isSelected = selectedLead?.id === b.id;

                  return (
                    <tr
                      key={b.id}
                      onClick={() => setSelectedLead(b)}
                      className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-600/10' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">{b.officialName}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                          <span>{b.domain}</span>
                          {b.isDemo && (
                            <span className="text-[9px] px-1 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              DEMO
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        {b.city || 'Canton'}, {b.state || 'OH'}
                      </td>

                      <td className="py-3.5 px-4">
                        {item.audit ? (
                          <div className="space-y-0.5">
                            <div className="font-mono text-slate-200 text-xs font-semibold">
                              {item.audit.totalScore}/100
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Grade {item.audit.grade}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Not Audited</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {item.decisionMaker ? (
                          <div>
                            <div className="font-medium text-slate-200 flex items-center gap-1">
                              <span>{item.decisionMaker.fullName}</span>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            </div>
                            <div className="text-[10px] text-slate-400">{item.decisionMaker.roleOrTitle || 'Owner / Operator'}</div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500">Unidentified</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {item.opportunities.length > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/25 text-[11px] font-semibold">
                            {item.opportunities.length} identified
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">0 found</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {score ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                                score.band === 'A'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : score.band === 'B'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                  : score.band === 'C'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-slate-700 text-slate-400'
                              }`}
                            >
                              Band {score.band} ({score.totalScore})
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500">Unscored</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLead(b);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-border inline-flex items-center gap-1"
                        >
                          <span>Dossier</span>
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="px-4 py-3 bg-surface-50 border-t border-border flex items-center justify-between text-xs text-slate-400">
            <span>
              Page <strong className="text-slate-200">{page}</strong> of <strong className="text-slate-200">{totalPages}</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 py-1 rounded bg-surface-100 hover:bg-surface-200 text-slate-300 border border-border disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2.5 py-1 rounded bg-surface-100 hover:bg-surface-200 text-slate-300 border border-border disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 360° Lead Dossier Drawer */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-border h-full overflow-y-auto p-6 space-y-6 shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider font-semibold block">
                  360° Lead Intelligence Dossier
                </span>
                <h2 className="text-lg font-bold text-slate-100 mt-0.5">{selectedItem.business.officialName}</h2>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <Globe2 className="w-3.5 h-3.5 text-slate-400" />
                  <a
                    href={selectedItem.business.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-blue-400 underline font-mono flex items-center gap-1"
                  >
                    <span>{selectedItem.business.domain}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span>•</span>
                  <span>
                    {selectedItem.business.city || 'Canton'}, {selectedItem.business.state || 'OH'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedLead(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score & Qualification Banner */}
            <div className="p-4 rounded-xl bg-surface-100 border border-border flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Qualification Verdict</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-bold font-mono px-2.5 py-0.5 rounded ${
                      selectedItem.score?.band === 'A'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : selectedItem.score?.band === 'B'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : selectedItem.score?.band === 'C'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    Tier {selectedItem.score?.band || 'Hold'} ({selectedItem.score?.totalScore ?? 'N/A'}/100)
                  </span>
                  <span className="text-xs text-slate-300">
                    {selectedItem.score?.band !== 'Hold' ? 'Qualified Commercial Prospect' : 'Held / Low Opportunity'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedLead(null);
                  setActiveModule('lead_crm');
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                Open in CRM
              </button>
            </div>

            {/* Section 1: Decision-Maker Intelligence */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                Verified Decision-Maker & Contacts
              </h3>

              {selectedItem.contacts.length === 0 ? (
                <div className="p-4 rounded-xl bg-surface-50 border border-dashed border-border text-xs text-slate-500 text-center">
                  No individual contacts extracted for this domain yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedItem.contacts.map((c) => (
                    <div key={c.id} className="p-3 rounded-xl bg-surface-100 border border-border text-xs space-y-1">
                      <div className="font-semibold text-slate-200 flex items-center justify-between">
                        <span>{c.fullName}</span>
                        {c.isDecisionMaker && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            DM
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{c.roleOrTitle || 'General Staff'}</div>
                      {c.email && (
                        <div className="text-[11px] text-slate-300 font-mono flex items-center gap-1 pt-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span className="truncate">{c.email}</span>
                        </div>
                      )}
                      {c.phone && (
                        <div className="text-[11px] text-slate-300 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Website Audit Findings */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-blue-400" />
                Website Technical Audit Findings
              </h3>

              {selectedItem.audit ? (
                <div className="p-4 rounded-xl bg-surface-100 border border-border space-y-3 text-xs">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-surface-50 border border-border">
                      <span className="text-[10px] text-slate-400 block">Overall Score</span>
                      <strong className="text-sm text-slate-200 font-mono">{selectedItem.audit.totalScore}/100</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-surface-50 border border-border">
                      <span className="text-[10px] text-slate-400 block">Performance</span>
                      <strong className="text-sm text-blue-400 font-mono">
                        {selectedItem.audit.pageSpeedData?.performance ?? 75}/100
                      </strong>
                    </div>
                    <div className="p-2 rounded-lg bg-surface-50 border border-border">
                      <span className="text-[10px] text-slate-400 block">Grade Band</span>
                      <strong className="text-sm text-emerald-400 font-mono">
                        Grade {selectedItem.audit.grade}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-border">
                    <span>SSL Certificate: {selectedItem.audit.hasSsl ? 'Secure (HTTPS)' : 'Missing SSL'}</span>
                    <span>Response Time: {selectedItem.audit.responseTimeMs ? `${selectedItem.audit.responseTimeMs}ms` : 'Normal'}</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-surface-50 border border-dashed border-border text-xs text-slate-500 text-center">
                  Audit has not yet been executed for this website.
                </div>
              )}
            </div>

            {/* Section 3: Commercial Opportunities */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                Commercial Service Opportunities
              </h3>

              {selectedItem.opportunities.length === 0 ? (
                <div className="p-4 rounded-xl bg-surface-50 border border-dashed border-border text-xs text-slate-500 text-center">
                  No explicit revenue opportunities generated yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedItem.opportunities.map((opp) => (
                    <div key={opp.id} className="p-3 rounded-xl bg-surface-100 border border-border text-xs space-y-1">
                      <div className="font-semibold text-slate-200 flex items-center justify-between">
                        <span>{opp.identifiedProblem}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {opp.priorityBand?.toUpperCase() || 'HIGH'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{opp.recommendedSolution}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
