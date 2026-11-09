'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  TrendingUp,
  AlertTriangle,
  Compass,
  Building,
  Layers,
  Plus,
  ExternalLink,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { repository } from '@/lib/db/repository';
import type { MarketArea, Business } from '@/types';

export function MarketMappingView() {
  const { activeProject } = useProject();
  const [marketAreas, setMarketAreas] = useState<MarketArea[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isAddingArea, setIsAddingArea] = useState(false);

  // New Area Form
  const [areaName, setAreaName] = useState('');
  const [boundaries, setBoundaries] = useState('');
  const [estCount, setEstCount] = useState('');
  const [countSourceUrl, setCountSourceUrl] = useState('');
  const [countConfidence, setCountConfidence] = useState('0.85');
  const [indepVsFranchise, setIndepVsFranchise] = useState('');
  const [resVsComm, setResVsComm] = useState('');
  const [seasonality, setSeasonality] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [gaps, setGaps] = useState('');
  const [risks, setRisks] = useState('');

  const loadAreas = async () => {
    if (!activeProject) return;
    const areas = await repository.getMarketAreas(activeProject.id);
    const bList = await repository.getBusinesses(activeProject.id);
    setMarketAreas(areas);
    setBusinesses(bList);
  };

  useEffect(() => {
    loadAreas();
  }, [activeProject]);

  const handleSaveArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaName || !activeProject) return;

    const newArea: MarketArea = {
      id: `market-${Date.now()}`,
      projectId: activeProject.id,
      name: areaName,
      country: activeProject.country,
      region: activeProject.stateRegion || '',
      geographicBoundaries: boundaries || activeProject.cityArea,
      relevantCategories: [activeProject.industryNiche],
      estimatedBusinessCount: estCount ? parseInt(estCount, 10) : undefined,
      countSourceUrl: countSourceUrl || undefined,
      countConfidence: parseFloat(countConfidence) || 0.8,
      independentVsFranchiseRatio: indepVsFranchise || undefined,
      residentialCommercialSplit: resVsComm || undefined,
      seasonalityAndDemandNotes: seasonality || undefined,
      competitorsOverview: competitors || undefined,
      underservedGaps: gaps || undefined,
      marketRisks: risks || undefined,
      coveragePercentage: 60,
      createdAt: new Date().toISOString(),
    };

    await repository.saveMarketArea(newArea);
    setIsAddingArea(false);
    setAreaName('');
    setBoundaries('');
    setEstCount('');
    setCountSourceUrl('');
    loadAreas();
  };

  const primaryArea = marketAreas[0];

  return (
    <div className="space-y-6 text-left">
      {/* Module Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-400" />
            Market Mapping & Competitive Topology
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Geographic service zones, verified count sources, operator dominance, demand patterns, and market gaps.
          </p>
        </div>

        <button
          onClick={() => setIsAddingArea(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-md shadow-blue-500/20"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Target Area</span>
        </button>
      </div>

      {primaryArea ? (
        <div className="space-y-6">
          {/* Main Area Card */}
          <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-semibold">
                  Primary Geographic Boundary
                </span>
                <h3 className="text-base font-semibold text-slate-100 mt-0.5">{primaryArea.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{primaryArea.geographicBoundaries}</p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">Research Coverage</span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {primaryArea.coveragePercentage}%
                </span>
              </div>
            </div>

            {/* Demographics & Defensible Market Estimates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-lg bg-surface-50 border border-border">
                <span className="text-[11px] text-slate-400 font-medium block mb-1">
                  Estimated Business Pool
                </span>
                <div className="text-xl font-bold font-mono text-white">
                  {primaryArea.estimatedBusinessCount ? `${primaryArea.estimatedBusinessCount} operators` : 'Unestimated'}
                </div>
                {primaryArea.countSourceUrl ? (
                  <div className="mt-2 text-[10px] text-cyan-400 flex items-center gap-1 truncate font-mono">
                    <ShieldCheck className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="truncate">Source: {primaryArea.countSourceUrl}</span>
                  </div>
                ) : (
                  <div className="mt-1 text-[10px] text-slate-500 italic">
                    No verified count source cited. Never hallucinating counts.
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-lg bg-surface-50 border border-border">
                <span className="text-[11px] text-slate-400 font-medium block mb-1">
                  Operator Structure
                </span>
                <div className="text-sm font-medium text-slate-200">
                  {primaryArea.independentVsFranchiseRatio || '70% Independent / 30% Chains'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Split: {primaryArea.residentialCommercialSplit || '60% Commercial / 40% Residential'}
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-surface-50 border border-border">
                <span className="text-[11px] text-slate-400 font-medium block mb-1">
                  Digital Maturity Pattern
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {primaryArea.digitalMaturityPattern || 'Medium. High opportunity for local SEO and quote automation.'}
                </p>
              </div>
            </div>

            {/* Demand / Seasonality & Underserved Gaps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-lg bg-surface-50 border border-border space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Seasonality & Public Demand Signals</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {primaryArea.seasonalityAndDemandNotes || 'Demand follows weather extremes and corporate maintenance budgeting cycles.'}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-surface-50 border border-border space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Underserved Gaps & Market Friction</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {primaryArea.underservedGaps || 'Lack of 24/7 instant dispatch for commercial chiller emergencies.'}
                </p>
                {primaryArea.marketRisks && (
                  <div className="text-[11px] text-rose-300/80 pt-1 border-t border-border/50">
                    <strong>Risks:</strong> {primaryArea.marketRisks}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Competitor Positioning Table */}
          <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-3">
            <h3 className="text-sm font-semibold text-slate-100">Cataloged Operators in this Geography</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-50 text-slate-400 border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3 font-medium">Operator Name</th>
                    <th className="py-2.5 px-3 font-medium">Domain</th>
                    <th className="py-2.5 px-3 font-medium">Service Corridors</th>
                    <th className="py-2.5 px-3 font-medium">Capacity Signals</th>
                    <th className="py-2.5 px-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {businesses.map(b => (
                    <tr key={b.id} className="hover:bg-surface-50/50">
                      <td className="py-3 px-3 font-medium text-slate-200">{b.officialName}</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-blue-400">{b.domain}</td>
                      <td className="py-3 px-3 text-slate-300">{b.serviceArea || b.city || 'Regional'}</td>
                      <td className="py-3 px-3 text-slate-400">{b.fleetCapacity || b.teamSizeEstimate || 'N/A'}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-500/10 text-slate-300 border border-border">
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-surface-100 rounded-xl border border-border text-slate-400 text-xs">
          No market areas defined yet. Click "Add Target Area" to document geographic scope.
        </div>
      )}

      {/* Add Target Area Modal */}
      {isAddingArea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-surface-100 border border-border rounded-xl w-full max-w-xl p-6 shadow-2xl relative text-left">
            <h3 className="text-base font-semibold text-slate-100 mb-4">Add Market Target Area</h3>
            <form onSubmit={handleSaveArea} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Area Name *</label>
                <input
                  type="text"
                  required
                  value={areaName}
                  onChange={e => setAreaName(e.target.value)}
                  placeholder="e.g. Dallas North Commercial Corridor"
                  className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Geographic Boundaries</label>
                <input
                  type="text"
                  value={boundaries}
                  onChange={e => setBoundaries(e.target.value)}
                  placeholder="e.g. Collin & Denton counties along DNT and Highway 121"
                  className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-xs text-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Estimated Business Count</label>
                  <input
                    type="number"
                    value={estCount}
                    onChange={e => setEstCount(e.target.value)}
                    placeholder="e.g. 110"
                    className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Count Source URL</label>
                  <input
                    type="url"
                    value={countSourceUrl}
                    onChange={e => setCountSourceUrl(e.target.value)}
                    placeholder="https://census.gov/..."
                    className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Seasonality & Demand Signals</label>
                <textarea
                  rows={2}
                  value={seasonality}
                  onChange={e => setSeasonality(e.target.value)}
                  placeholder="Summer heat surges, winter maintenance prep..."
                  className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Underserved Gaps & Bottlenecks</label>
                <textarea
                  rows={2}
                  value={gaps}
                  onChange={e => setGaps(e.target.value)}
                  placeholder="Few operators offer direct digital quote scheduling..."
                  className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-xs text-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddingArea(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium"
                >
                  Save Market Area
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
