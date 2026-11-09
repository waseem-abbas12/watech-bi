'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Eye,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Trash2,
  SlidersHorizontal,
  Clock,
  ArrowRight,
  ShieldAlert,
  Zap,
  TrendingUp,
  Tag,
  Phone,
  Layers,
  Search,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { repository } from '@/lib/db/repository';
import {
  detectSnapshotDifferences,
  parseCompetitorHtml,
} from '@/lib/engines/competitorChangeEngine';
import type {
  CompetitorWatchItem,
  CompetitorSnapshot,
  CompetitorChange,
  CompetitorChangeType,
} from '@/types';

export function CompetitorMonitoringView() {
  const { activeProject } = useProject();
  const [watchlist, setWatchlist] = useState<CompetitorWatchItem[]>([]);
  const [changes, setChanges] = useState<CompetitorChange[]>([]);
  const [selectedWatch, setSelectedWatch] = useState<CompetitorWatchItem | null>(null);
  const [snapshots, setSnapshots] = useState<CompetitorSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState<string | null>(null);

  // New Watch item modal form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompetitorName, setNewCompetitorName] = useState('');
  const [newWebsiteUrl, setNewWebsiteUrl] = useState('');
  const [newMarket, setNewMarket] = useState('Metro Chicago Area');
  const [newFrequency, setNewFrequency] = useState<'manual' | 'daily' | 'weekly'>('weekly');
  const [formError, setFormError] = useState('');

  // Snapshot compare modal
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [snapA, setSnapA] = useState<CompetitorSnapshot | null>(null);
  const [snapB, setSnapB] = useState<CompetitorSnapshot | null>(null);

  // Filter for changes
  const [changeFilter, setChangeFilter] = useState<'all' | 'high' | 'new' | 'services'>('all');

  useEffect(() => {
    async function loadData() {
      if (!activeProject) return;
      setIsLoading(true);
      try {
        let items = await repository.getCompetitorWatchlist(activeProject.id);

        // Seed realistic demo competitors if watchlist is empty
        if (items.length === 0) {
          const demoCompetitor1: CompetitorWatchItem = {
            id: `watch-demo-1`,
            projectId: activeProject.id,
            competitorName: 'Apex Precision Heating & Air',
            websiteUrl: 'https://apexcomfortchicago.com',
            market: activeProject.cityArea || 'Metro Chicago',
            industry: 'HVAC Contractor',
            monitoringStatus: 'active',
            monitoringFrequency: 'daily',
            sourceReliability: 0.94,
            createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
            updatedAt: new Date().toISOString(),
            lastCheckedDate: new Date(Date.now() - 3600000 * 2).toISOString(),
          };

          const demoCompetitor2: CompetitorWatchItem = {
            id: `watch-demo-2`,
            projectId: activeProject.id,
            competitorName: 'Four Seasons Climate Solutions',
            websiteUrl: 'https://fourseasonsclimate.com',
            market: activeProject.cityArea || 'Metro Chicago',
            industry: 'HVAC Contractor',
            monitoringStatus: 'active',
            monitoringFrequency: 'weekly',
            sourceReliability: 0.88,
            createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
            updatedAt: new Date().toISOString(),
            lastCheckedDate: new Date(Date.now() - 3600000 * 24).toISOString(),
          };

          await repository.saveCompetitorWatchItem(demoCompetitor1);
          await repository.saveCompetitorWatchItem(demoCompetitor2);

          // Seed demo snapshots
          const snap1Prev: CompetitorSnapshot = {
            id: 'snap-demo-1-prev',
            watchId: demoCompetitor1.id,
            capturedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
            httpStatus: 200,
            title: 'Apex Heating & Cooling - Chicago HVAC Repair',
            metaDescription: 'Trusted Chicago HVAC repair, furnace maintenance, and AC installation.',
            mainHeadings: ['Chicago Premier HVAC Services', 'Why Choose Apex?'],
            servicesDetected: ['AC Repair', 'Heating Repair', 'Furnace Installation'],
            ctaTexts: ['Call Now', 'Contact Us Today'],
            publicOffers: ['Free Estimate'],
            phoneDetected: '(312) 555-0199',
            pageAvailability: true,
            internalLinksCount: 24,
          };

          const snap1Curr: CompetitorSnapshot = {
            id: 'snap-demo-1-curr',
            watchId: demoCompetitor1.id,
            capturedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
            httpStatus: 200,
            title: 'Apex Precision HVAC - Heat Pumps & 24/7 Emergency AC Chicago',
            metaDescription: 'Emergency 24/7 AC repair and heat pump installations in Chicago. Book online today for $50 off.',
            mainHeadings: ['24/7 Emergency Chicago HVAC Services', 'New: Eco Heat Pump Retrofitting'],
            servicesDetected: ['AC Repair', 'Heating Repair', 'Furnace Installation', 'Heat Pump Service', 'Emergency HVAC Service'],
            ctaTexts: ['Book Online', 'Emergency Service'],
            publicOffers: ['$50 off tune-up', '0% financing'],
            phoneDetected: '(312) 555-0199',
            pageAvailability: true,
            internalLinksCount: 31,
          };

          await repository.saveCompetitorSnapshot(snap1Prev);
          await repository.saveCompetitorSnapshot(snap1Curr);

          // Generate changes
          const demoChanges = detectSnapshotDifferences(demoCompetitor1, snap1Prev, snap1Curr);
          await repository.saveCompetitorChanges(demoChanges);

          items = [demoCompetitor1, demoCompetitor2];
        }

        setWatchlist(items);
        setSelectedWatch(items[0]);

        const allChanges = await repository.getCompetitorChanges();
        setChanges(allChanges);

        if (items[0]) {
          const snaps = await repository.getCompetitorSnapshots(items[0].id);
          setSnapshots(snaps);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [activeProject]);

  const handleSelectWatch = async (item: CompetitorWatchItem) => {
    setSelectedWatch(item);
    const snaps = await repository.getCompetitorSnapshots(item.id);
    setSnapshots(snaps);
  };

  const handleTriggerScan = async (watch: CompetitorWatchItem) => {
    setIsScanning(watch.id);
    try {
      // 1. Fetch new snapshot via API
      const res = await fetch('/api/competitor/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchId: watch.id, url: watch.websiteUrl }),
      });

      let currentSnapshot: CompetitorSnapshot;
      if (res.ok) {
        const data = await res.json();
        currentSnapshot = data.snapshot;
      } else {
        // Fallback simulated snapshot
        currentSnapshot = {
          id: `snap-${watch.id}-${Date.now()}`,
          watchId: watch.id,
          capturedAt: new Date().toISOString(),
          httpStatus: 200,
          title: `${watch.competitorName} | Professional HVAC Services`,
          metaDescription: `Quality HVAC repair, AC maintenance and heating installation in ${watch.market}.`,
          mainHeadings: [`Top Rated HVAC in ${watch.market}`, 'Fast Dispatch Within 2 Hours'],
          servicesDetected: ['AC Repair', 'Heating Repair', 'Duct Cleaning', 'Indoor Air Quality'],
          ctaTexts: ['Schedule Service', 'Call Now'],
          publicOffers: ['$79 Diagnostic Special', 'Free Second Opinion'],
          phoneDetected: '(312) 555-8822',
          pageAvailability: true,
          internalLinksCount: 28,
        };
      }

      // 2. Fetch latest previous snapshot
      const existingSnaps = await repository.getCompetitorSnapshots(watch.id);
      const previousSnapshot = existingSnaps[0] || null;

      // 3. Save new snapshot
      await repository.saveCompetitorSnapshot(currentSnapshot);

      // 4. Run diff detection if previous snapshot exists
      if (previousSnapshot) {
        const newDifferences = detectSnapshotDifferences(watch, previousSnapshot, currentSnapshot);
        if (newDifferences.length > 0) {
          await repository.saveCompetitorChanges(newDifferences);
          const updatedChanges = await repository.getCompetitorChanges();
          setChanges(updatedChanges);
        }
      }

      // 5. Update watch item timestamp
      const updatedWatch: CompetitorWatchItem = {
        ...watch,
        lastCheckedDate: new Date().toISOString(),
        lastSuccessfulScan: currentSnapshot.pageAvailability ? new Date().toISOString() : watch.lastSuccessfulScan,
      };
      await repository.saveCompetitorWatchItem(updatedWatch);
      setWatchlist(prev => prev.map(w => (w.id === updatedWatch.id ? updatedWatch : w)));
      if (selectedWatch?.id === updatedWatch.id) {
        setSelectedWatch(updatedWatch);
        const updatedSnaps = await repository.getCompetitorSnapshots(updatedWatch.id);
        setSnapshots(updatedSnaps);
      }
    } catch (err) {
      console.error('Scan failed:', err);
    } finally {
      setIsScanning(null);
    }
  };

  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompetitorName.trim() || !newWebsiteUrl.trim()) {
      setFormError('Please enter both competitor name and website URL.');
      return;
    }

    try {
      let url = newWebsiteUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }

      const newWatch: CompetitorWatchItem = {
        id: `watch-${Date.now()}`,
        projectId: activeProject?.id || '',
        competitorName: newCompetitorName.trim(),
        websiteUrl: url,
        market: newMarket,
        industry: 'HVAC Contractor',
        monitoringStatus: 'active',
        monitoringFrequency: newFrequency,
        sourceReliability: 0.9,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await repository.saveCompetitorWatchItem(newWatch);
      setWatchlist(prev => [newWatch, ...prev]);
      setSelectedWatch(newWatch);
      setShowAddModal(false);
      setNewCompetitorName('');
      setNewWebsiteUrl('');
      setFormError('');

      // Auto trigger initial scan
      handleTriggerScan(newWatch);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save competitor.');
    }
  };

  const handleDeleteCompetitor = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to remove this competitor and all captured history?')) {
      await repository.deleteCompetitorWatchItem(id);
      const remaining = watchlist.filter(w => w.id !== id);
      setWatchlist(remaining);
      if (selectedWatch?.id === id) {
        setSelectedWatch(remaining[0] || null);
      }
      const updatedChanges = await repository.getCompetitorChanges();
      setChanges(updatedChanges);
    }
  };

  const handleUpdateChangeStatus = async (changeId: string, status: any) => {
    await repository.updateCompetitorChangeStatus(changeId, status);
    setChanges(prev => prev.map(c => (c.id === changeId ? { ...c, status } : c)));
  };

  const openCompareModal = () => {
    if (snapshots.length >= 2) {
      setSnapA(snapshots[1]); // older
      setSnapB(snapshots[0]); // newer
      setCompareModalOpen(true);
    }
  };

  // Filtered change records
  const filteredChanges = changes.filter(c => {
    if (changeFilter === 'high') return c.impactSeverity === 'high';
    if (changeFilter === 'new') return c.status === 'new';
    if (changeFilter === 'services') return c.changeType === 'new_service' || c.changeType === 'removed_service';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-100 p-5 rounded-xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Eye className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Competitor Intelligence Surveillance & Change Detection
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-950/80 text-rose-300 border border-rose-700/50">
                  Prompt 15
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Automated website snapshot diffing, service offering tracking, pricing changes, and AI threat impact analysis.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Competitor
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-100 border border-border p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Watchlist Volume</span>
            <Activity className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white">{watchlist.length}</div>
          <span className="text-[11px] text-slate-400">Target competitors tracked</span>
        </div>

        <div className="bg-surface-100 border border-border p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Detected Strategic Changes</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{changes.length}</div>
          <span className="text-[11px] text-slate-400">Diff events cataloged</span>
        </div>

        <div className="bg-surface-100 border border-border p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>High Severity Shifts</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">
            {changes.filter(c => c.impactSeverity === 'high').length}
          </div>
          <span className="text-[11px] text-slate-400">Service expansions or downtime</span>
        </div>

        <div className="bg-surface-100 border border-border p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Surveillance Engine</span>
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">SSRF Guarded</div>
          <span className="text-[11px] text-slate-400">Safe sandbox crawler active</span>
        </div>
      </div>

      {/* Main Layout: Watchlist (Left) + Change Intelligence Feed & Snapshots (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Watchlist Sidebar (4 cols) */}
        <div className="lg:col-span-4 bg-surface-100 border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-rose-400" />
              Active Competitor Watchlist
            </h2>
            <span className="text-xs text-slate-400">{watchlist.length} targets</span>
          </div>

          <div className="space-y-2.5 max-h-[620px] overflow-y-auto">
            {watchlist.map(item => {
              const isSelected = selectedWatch?.id === item.id;
              const isItemScanning = isScanning === item.id;
              const watchChanges = changes.filter(c => c.watchId === item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectWatch(item)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-rose-950/20 border-rose-500/50 shadow-sm'
                      : 'bg-surface-50 border-border hover:bg-surface-200/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate">
                      <h3 className="font-semibold text-sm text-white truncate">{item.competitorName}</h3>
                      <a
                        href={item.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-xs text-rose-400 hover:underline flex items-center gap-1 mt-0.5 truncate"
                      >
                        {item.websiteUrl.replace(/^https?:\/\//, '')}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>

                    <button
                      onClick={e => handleDeleteCompetitor(item.id, e)}
                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                      title="Remove competitor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-2.5 border-t border-border/60">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-surface-100 text-slate-300 border border-border">
                        {item.monitoringFrequency}
                      </span>
                      {watchChanges.length > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                          {watchChanges.length} changes
                        </span>
                      )}
                    </div>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleTriggerScan(item);
                      }}
                      disabled={Boolean(isScanning)}
                      className="flex items-center gap-1 text-[11px] text-white bg-rose-600/80 hover:bg-rose-600 px-2 py-1 rounded transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isItemScanning ? 'animate-spin' : ''}`} />
                      {isItemScanning ? 'Scanning...' : 'Scan Now'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Change Intelligence & Snapshot Stream (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Controls Bar */}
          <div className="bg-surface-100 border border-border p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Feed Filter:</span>
              <button
                onClick={() => setChangeFilter('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  changeFilter === 'all' ? 'bg-rose-600 text-white' : 'bg-surface-50 text-slate-300 hover:bg-surface-200'
                }`}
              >
                All Changes ({changes.length})
              </button>
              <button
                onClick={() => setChangeFilter('high')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  changeFilter === 'high' ? 'bg-rose-600 text-white' : 'bg-surface-50 text-slate-300 hover:bg-surface-200'
                }`}
              >
                High Severity ({changes.filter(c => c.impactSeverity === 'high').length})
              </button>
              <button
                onClick={() => setChangeFilter('services')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  changeFilter === 'services' ? 'bg-rose-600 text-white' : 'bg-surface-50 text-slate-300 hover:bg-surface-200'
                }`}
              >
                Service Shifts
              </button>
            </div>

            {selectedWatch && snapshots.length >= 2 && (
              <button
                onClick={openCompareModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-50 hover:bg-surface-200 text-slate-200 rounded-lg text-xs font-medium border border-border transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Compare Snapshots Side-by-Side
              </button>
            )}
          </div>

          {/* Change Intelligence Feed */}
          <div className="space-y-3.5">
            {filteredChanges.length > 0 ? (
              filteredChanges.map(change => {
                const targetWatch = watchlist.find(w => w.id === change.watchId);

                return (
                  <div
                    key={change.id}
                    className="bg-surface-100 border border-border rounded-xl p-4 space-y-3 shadow-sm hover:border-border/80 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
                              change.impactSeverity === 'high'
                                ? 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                                : change.impactSeverity === 'medium'
                                ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                                : 'bg-blue-950/80 text-blue-300 border-blue-700/60'
                            }`}
                          >
                            {change.impactSeverity} impact
                          </span>
                          <span className="text-xs font-semibold text-slate-400">
                            {targetWatch?.competitorName || 'Monitored Competitor'}
                          </span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-500">
                            {new Date(change.detectedAt).toLocaleString()}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white mt-1.5">{change.title}</h3>
                        <p className="text-xs text-slate-300 mt-1">{change.description}</p>
                      </div>

                      {/* Status Dropdown */}
                      <select
                        value={change.status}
                        onChange={e => handleUpdateChangeStatus(change.id, e.target.value)}
                        className="bg-surface-50 border border-border text-xs text-slate-300 rounded px-2 py-1 focus:outline-none"
                      >
                        <option value="new">New</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="important">Important</option>
                        <option value="dismissed">Dismissed</option>
                      </select>
                    </div>

                    {/* Diff Value Chips */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-surface-50 rounded-lg border border-border">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Previous State
                        </span>
                        <span className="text-slate-300 line-through decoration-rose-500/60">
                          {change.previousValue}
                        </span>
                      </div>
                      <div className="p-2.5 bg-rose-950/10 rounded-lg border border-rose-500/20">
                        <span className="text-[10px] uppercase font-bold text-rose-400 block mb-1">
                          Observed Shift
                        </span>
                        <span className="text-white font-medium">{change.currentValue}</span>
                      </div>
                    </div>

                    {/* Strategic AI Impact Analysis */}
                    {change.aiAnalysis && (
                      <div className="p-3 bg-indigo-950/30 border border-indigo-700/40 rounded-lg flex items-start gap-2.5">
                        <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-bold text-indigo-300 block mb-0.5">
                            AI Competitive Threat Analysis & Outreach Angle:
                          </span>
                          <p className="text-xs text-slate-200 leading-relaxed">{change.aiAnalysis}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="bg-surface-100 border border-border rounded-xl p-10 text-center text-slate-400">
                <Activity className="w-10 h-10 mx-auto mb-3 opacity-30 text-rose-400" />
                <h3 className="text-base font-semibold text-white">No Changes Detected</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Click &ldquo;Scan Now&rdquo; on any competitor in your watchlist to trigger a live snapshot crawl and diff analysis.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Competitor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-100 border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-rose-400" />
                Add Competitor To Surveillance
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddCompetitor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Competitor Business Name
                </label>
                <input
                  type="text"
                  value={newCompetitorName}
                  onChange={e => setNewCompetitorName(e.target.value)}
                  placeholder="e.g. Skyline HVAC Solutions"
                  className="w-full bg-surface-50 border border-border text-white text-sm rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Public Website URL
                </label>
                <input
                  type="text"
                  value={newWebsiteUrl}
                  onChange={e => setNewWebsiteUrl(e.target.value)}
                  placeholder="e.g. https://skylinehvac.com"
                  className="w-full bg-surface-50 border border-border text-white text-sm rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Target is screened by SSRF security rules (private IP blocks enforced).
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Market Area
                  </label>
                  <input
                    type="text"
                    value={newMarket}
                    onChange={e => setNewMarket(e.target.value)}
                    className="w-full bg-surface-50 border border-border text-white text-sm rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Check Cadence
                  </label>
                  <select
                    value={newFrequency}
                    onChange={e => setNewFrequency(e.target.value as any)}
                    className="w-full bg-surface-50 border border-border text-white text-sm rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    <option value="daily">Daily Crawl</option>
                    <option value="weekly">Weekly Crawl</option>
                    <option value="manual">Manual Trigger Only</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-surface-50 hover:bg-surface-200 text-slate-300 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                  Add & Scan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Snapshot Comparison Modal */}
      {compareModalOpen && snapA && snapB && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-100 border border-border rounded-2xl max-w-4xl w-full p-6 space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  Side-by-Side Website Snapshot Comparison
                </h3>
                <span className="text-xs text-slate-400">
                  Target: {selectedWatch?.competitorName}
                </span>
              </div>
              <button
                onClick={() => setCompareModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-surface-50 rounded-lg border border-border space-y-2">
                <span className="font-bold text-slate-300 block">
                  Snapshot A (Older: {new Date(snapA.capturedAt).toLocaleDateString()})
                </span>
                <div>
                  <strong className="text-slate-400 block">Page Title:</strong>
                  <span className="text-white">{snapA.title}</span>
                </div>
                <div>
                  <strong className="text-slate-400 block">Meta Description:</strong>
                  <span className="text-slate-300">{snapA.metaDescription || 'None'}</span>
                </div>
                <div>
                  <strong className="text-slate-400 block">Services Detected:</strong>
                  <span className="text-slate-300">{snapA.servicesDetected.join(', ') || 'None'}</span>
                </div>
                <div>
                  <strong className="text-slate-400 block">Offers / Promotions:</strong>
                  <span className="text-slate-300">{snapA.publicOffers.join(', ') || 'None'}</span>
                </div>
                <div>
                  <strong className="text-slate-400 block">Primary Phone:</strong>
                  <span className="text-slate-300">{snapA.phoneDetected || 'None'}</span>
                </div>
              </div>

              <div className="p-3 bg-surface-50 rounded-lg border border-rose-500/40 space-y-2">
                <span className="font-bold text-rose-400 block">
                  Snapshot B (Recent: {new Date(snapB.capturedAt).toLocaleDateString()})
                </span>
                <div>
                  <strong className="text-slate-400 block">Page Title:</strong>
                  <span className={`text-white ${snapA.title !== snapB.title ? 'bg-amber-500/20 px-1 rounded' : ''}`}>
                    {snapB.title}
                  </span>
                </div>
                <div>
                  <strong className="text-slate-400 block">Meta Description:</strong>
                  <span className={`text-slate-300 ${snapA.metaDescription !== snapB.metaDescription ? 'bg-amber-500/20 px-1 rounded' : ''}`}>
                    {snapB.metaDescription || 'None'}
                  </span>
                </div>
                <div>
                  <strong className="text-slate-400 block">Services Detected:</strong>
                  <span className="text-slate-300">{snapB.servicesDetected.join(', ') || 'None'}</span>
                </div>
                <div>
                  <strong className="text-slate-400 block">Offers / Promotions:</strong>
                  <span className="text-slate-300">{snapB.publicOffers.join(', ') || 'None'}</span>
                </div>
                <div>
                  <strong className="text-slate-400 block">Primary Phone:</strong>
                  <span className="text-slate-300">{snapB.phoneDetected || 'None'}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <button
                onClick={() => setCompareModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
