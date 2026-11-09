'use client';

import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Plus,
  ShieldCheck,
  Building,
  Users,
  Truck,
  DollarSign,
  TrendingUp,
  Tag,
  ExternalLink,
  HelpCircle,
  CheckCircle,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { repository } from '@/lib/db/repository';
import type { Business, IntelligenceFact, VerificationStatus } from '@/types';
import { getVerificationBadge } from '@/lib/utils';

export function BusinessIntelligenceView() {
  const { activeProject } = useProject();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [facts, setFacts] = useState<IntelligenceFact[]>([]);
  const [isAddFactOpen, setIsAddFactOpen] = useState(false);

  // New Fact Form
  const [claim, setClaim] = useState('');
  const [factValue, setFactValue] = useState('');
  const [category, setCategory] = useState<'identity' | 'leadership' | 'operations' | 'marketing' | 'reputation' | 'growth' | 'pricing'>('operations');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceType, setSourceType] = useState('Official Website');
  const [confidence, setConfidence] = useState('0.9');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('verified');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    if (!activeProject) return;
    const bList = await repository.getBusinesses(activeProject.id);
    setBusinesses(bList);
    if (bList.length > 0) {
      const activeId = selectedBusinessId || bList[0].id;
      setSelectedBusinessId(activeId);
      const bFacts = await repository.getFacts(activeId);
      setFacts(bFacts);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProject]);

  const handleSelectBusiness = async (id: string) => {
    setSelectedBusinessId(id);
    const bFacts = await repository.getFacts(id);
    setFacts(bFacts);
  };

  const handleSaveFact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claim || !selectedBusinessId || !activeProject) return;

    const newFact: IntelligenceFact = {
      id: `fact-${Date.now()}`,
      businessId: selectedBusinessId,
      projectId: activeProject.id,
      claim,
      value: factValue || claim,
      category,
      sourceUrl: sourceUrl || 'Direct Observation',
      sourceType,
      dateCollected: new Date().toISOString().split('T')[0],
      confidence: parseFloat(confidence) || 0.85,
      verificationStatus,
      notes: notes || undefined,
    };

    await repository.saveFact(newFact);
    // Also save as SourceRecord in source registry
    if (sourceUrl) {
      await repository.saveSource({
        id: `src-${Date.now()}`,
        projectId: activeProject.id,
        businessId: selectedBusinessId,
        url: sourceUrl,
        sourceName: sourceType,
        sourceType: 'official_website',
        retrievalDate: new Date().toISOString().split('T')[0],
        excerptOrNote: claim,
        verificationStatus,
        confidence: parseFloat(confidence) || 0.85,
      });
    }

    setIsAddFactOpen(false);
    setClaim('');
    setFactValue('');
    setSourceUrl('');
    setNotes('');
    loadData();
  };

  const selectedBiz = businesses.find(b => b.id === selectedBusinessId);

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-blue-400" />
            Company Intelligence & Provenance Registry
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Sourced company facts, verified leadership, fleet metrics, growth signals, and provenance audit trail.
          </p>
        </div>

        {selectedBiz && (
          <button
            onClick={() => setIsAddFactOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-md shadow-blue-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Sourced Fact</span>
          </button>
        )}
      </div>

      {/* Target Selector */}
      <div className="p-3.5 rounded-xl bg-surface-100 border border-border flex items-center gap-3">
        <span className="text-xs text-slate-400 shrink-0">Inspecting Target:</span>
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

      {selectedBiz ? (
        <div className="space-y-6">
          {/* Executive Company Card */}
          <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{selectedBiz.officialName}</h3>
                  {selectedBiz.isDemo && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      DEMO
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {selectedBiz.fullAddress || `${selectedBiz.city || ''}, ${selectedBiz.state || ''}`} • Founded: {selectedBiz.foundingYear || 'Unconfirmed'}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Owner Verification:</span>
                {(() => {
                  const badge = getVerificationBadge(selectedBiz.ownerVerificationStatus);
                  return (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${badge.color} ${badge.border}`}>
                      {badge.label}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-surface-50 border border-border">
                <span className="text-slate-400 text-[11px] block">Decision-Maker</span>
                <span className="font-semibold text-slate-200 block mt-0.5">
                  {selectedBiz.ownerManagerName || 'Unverified'}
                </span>
                <span className="text-[10px] text-slate-400">{selectedBiz.ownerManagerRole || 'Owner'}</span>
              </div>

              <div className="p-3 rounded-lg bg-surface-50 border border-border">
                <span className="text-slate-400 text-[11px] block">Operational Scale</span>
                <span className="font-semibold text-slate-200 block mt-0.5">
                  {selectedBiz.teamSizeEstimate || 'Undisclosed'}
                </span>
                <span className="text-[10px] text-slate-400">{selectedBiz.fleetCapacity || 'Fleet unverified'}</span>
              </div>

              <div className="p-3 rounded-lg bg-surface-50 border border-border">
                <span className="text-slate-400 text-[11px] block">Public Reputation</span>
                <span className="font-semibold text-slate-200 block mt-0.5">
                  {selectedBiz.reviewRating ? `${selectedBiz.reviewRating}★ (${selectedBiz.reviewCount} reviews)` : 'Unmeasured'}
                </span>
                <span className="text-[10px] text-slate-400 truncate block">
                  {selectedBiz.reviewSentimentSummary || 'No sentiment breakdown'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-surface-50 border border-border">
                <span className="text-slate-400 text-[11px] block">Observed Channels</span>
                <span className="font-semibold text-slate-200 block mt-0.5 truncate">
                  {(selectedBiz.marketingChannels || []).join(', ') || 'Website only'}
                </span>
                <span className="text-[10px] text-slate-400">Marketing footprint</span>
              </div>
            </div>

            {/* Growth Signals */}
            {selectedBiz.growthSignals && selectedBiz.growthSignals.length > 0 && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Public Growth & Expansion Signals:</span>
                  <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-emerald-200/90 text-[11px]">
                    {selectedBiz.growthSignals.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Sourced Facts Table with Strict Provenance */}
          <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">
                Verified Facts & Claims ({facts.length})
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                Source linking enforced. Zero inference.
              </span>
            </div>

            {facts.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No specific intelligence facts recorded yet. Click "Add Sourced Fact" to log verified company data.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-50 text-slate-400 border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3 font-medium">Claim / Observation</th>
                      <th className="py-2.5 px-3 font-medium">Category</th>
                      <th className="py-2.5 px-3 font-medium">Status</th>
                      <th className="py-2.5 px-3 font-medium">Confidence</th>
                      <th className="py-2.5 px-3 font-medium">Source Attribution</th>
                      <th className="py-2.5 px-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {facts.map(f => {
                      const badge = getVerificationBadge(f.verificationStatus);
                      return (
                        <tr key={f.id} className="hover:bg-surface-50/50">
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-200">{f.claim}</div>
                            {f.notes && (
                              <div className="text-[10px] text-slate-400 mt-0.5 italic">{f.notes}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono text-[10px] uppercase text-slate-400">
                            {f.category}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${badge.color} ${badge.border}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-300">
                            {Math.round(f.confidence * 100)}%
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-slate-300 font-medium">{f.sourceType}</div>
                            {f.sourceUrl && f.sourceUrl.startsWith('http') && (
                              <a
                                href={f.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-blue-400 hover:underline truncate max-w-[160px] block"
                              >
                                {f.sourceUrl}
                              </a>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-400 text-[11px] font-mono">
                            {f.dateCollected}
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
      ) : (
        <div className="p-8 text-center text-xs text-slate-400 bg-surface-100 rounded-xl border border-border">
          Please select a business to view intelligence facts.
        </div>
      )}

      {/* Add Fact Modal */}
      {isAddFactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-surface-100 border border-border rounded-xl w-full max-w-lg p-6 shadow-2xl relative text-left">
            <h3 className="text-base font-semibold text-slate-100 mb-3">Add Sourced Fact</h3>
            <form onSubmit={handleSaveFact} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Claim / Fact *</label>
                <input
                  type="text"
                  required
                  value={claim}
                  onChange={e => setClaim(e.target.value)}
                  placeholder="e.g. Added 4 service trucks and posted job listing for senior technician"
                  className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="operations">Operations & Capacity</option>
                    <option value="leadership">Leadership & Ownership</option>
                    <option value="growth">Growth & Expansion</option>
                    <option value="marketing">Marketing Channels</option>
                    <option value="pricing">Pricing & Financing</option>
                    <option value="reputation">Customer Reputation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Verification Status</label>
                  <select
                    value={verificationStatus}
                    onChange={e => setVerificationStatus(e.target.value as any)}
                    className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="verified">Verified (Official source)</option>
                    <option value="estimated">Estimated</option>
                    <option value="hypothesis">Hypothesis</option>
                    <option value="unverified">Unverified</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Source Name / Type</label>
                  <input
                    type="text"
                    value={sourceType}
                    onChange={e => setSourceType(e.target.value)}
                    placeholder="e.g. Texas Secretary of State, Official Site"
                    className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Confidence (0.1 - 1.0)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={confidence}
                    onChange={e => setConfidence(e.target.value)}
                    className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Source URL</label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={e => setSourceUrl(e.target.value)}
                  placeholder="https://example.gov/records/..."
                  className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Auditor Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Additional context on how this fact was verified..."
                  className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddFactOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium"
                >
                  Save Fact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
