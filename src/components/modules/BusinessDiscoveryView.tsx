'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Upload,
  Download,
  Building2,
  Globe2,
  Phone,
  Mail,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Trash2,
  Edit2,
  Sparkles,
} from 'lucide-react';
import Papa from 'papaparse';
import { useProject } from '@/context/ProjectContext';
import { repository } from '@/lib/db/repository';
import type { Business, BusinessStatus } from '@/types';
import { BusinessModal } from '@/components/modals/BusinessModal';
import { CsvImportModal } from '@/components/modals/CsvImportModal';
import { extractDomain } from '@/lib/utils';
import { CANTON_REAL_BUSINESSES } from '@/lib/db/cantonHvacRealSeed';

export function BusinessDiscoveryView() {
  const { activeProject, setActiveModule } = useProject();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadBusinesses = async () => {
    if (!activeProject) return;
    const list = await repository.getBusinesses(activeProject.id);
    setBusinesses(list);
  };

  useEffect(() => {
    loadBusinesses();
  }, [activeProject]);

  const handleDelete = async (id: string) => {
    if (confirm('Delete this business record from the project?')) {
      await repository.deleteBusiness(id);
      loadBusinesses();
    }
  };

  const handleLoadSampleData = async () => {
    if (!activeProject) return;
    const businessesToLoad = CANTON_REAL_BUSINESSES.map(b => ({
      ...b,
      id: `biz-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      projectId: activeProject.id,
    }));
    await repository.saveBusinesses(businessesToLoad);
    await loadBusinesses();
    setImportNotice('Loaded 5 verified market contractor records successfully!');
    setTimeout(() => setImportNotice(null), 3000);
  };

  // CSV Export
  const handleExportCsv = () => {
    if (businesses.length === 0) return;
    const exportData = businesses.map(b => ({
      officialName: b.officialName,
      brandName: b.brandName || '',
      domain: b.domain,
      websiteUrl: b.websiteUrl,
      phone: b.phone || '',
      email: b.email || '',
      city: b.city || '',
      state: b.state || '',
      serviceArea: b.serviceArea || '',
      businessModel: b.businessModel,
      foundingYear: b.foundingYear || '',
      ownerManagerName: b.ownerManagerName || '',
      ownerManagerRole: b.ownerManagerRole || '',
      ownerVerificationStatus: b.ownerVerificationStatus,
      reviewRating: b.reviewRating || '',
      reviewCount: b.reviewCount || '',
      status: b.status,
      isDemo: b.isDemo ? 'true' : 'false',
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeProject?.name || 'watech'}-businesses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProject) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let imported = 0;
        let skippedDuplicates = 0;
        const newBusinesses: Business[] = [];

        for (const row of results.data as any[]) {
          const name = row.officialName || row.name || row.Company || row['Business Name'];
          const web = row.websiteUrl || row.website || row.url || row.Website || row.Domain;

          if (!name || !web) continue;

          const domain = extractDomain(web);

          // Check duplicate
          const duplicates = await repository.findDuplicates(
            { domain, officialName: name, phone: row.phone },
            activeProject.id
          );

          if (duplicates.length > 0) {
            skippedDuplicates++;
            continue;
          }

          const biz: Business = {
            id: `biz-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            projectId: activeProject.id,
            officialName: name.trim(),
            brandName: row.brandName || undefined,
            domain,
            websiteUrl: web.startsWith('http') ? web : `https://${web}`,
            phone: row.phone || undefined,
            email: row.email || undefined,
            city: row.city || activeProject.cityArea,
            state: row.state || activeProject.stateRegion,
            country: activeProject.country,
            serviceArea: row.serviceArea || undefined,
            businessModel: row.businessModel || activeProject.businessModel,
            foundingYear: row.foundingYear ? parseInt(row.foundingYear, 10) : undefined,
            teamSizeEstimate: row.teamSizeEstimate || undefined,
            fleetCapacity: row.fleetCapacity || undefined,
            ownerManagerName: row.ownerManagerName || undefined,
            ownerManagerRole: row.ownerManagerRole || undefined,
            ownerVerificationStatus: (row.ownerVerificationStatus as any) || 'unverified',
            reviewRating: row.reviewRating ? parseFloat(row.reviewRating) : undefined,
            reviewCount: row.reviewCount ? parseInt(row.reviewCount, 10) : undefined,
            marketingChannels: row.marketingChannels ? row.marketingChannels.split(';') : [],
            growthSignals: row.growthSignals ? row.growthSignals.split(';') : [],
            status: 'discovered',
            isDemo: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          newBusinesses.push(biz);
          imported++;
        }

        if (newBusinesses.length > 0) {
          await repository.saveBusinesses(newBusinesses);
          loadBusinesses();
        }

        setImportNotice(`Import complete: ${imported} imported, ${skippedDuplicates} duplicate(s) prevented.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
    });
  };

  const filteredBusinesses = businesses.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      b.officialName.toLowerCase().includes(query) ||
      b.domain.toLowerCase().includes(query) ||
      (b.city && b.city.toLowerCase().includes(query)) ||
      (b.ownerManagerName && b.ownerManagerName.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            Business Discovery Directory
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified local companies, domains, contact paths, and duplicate prevention.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 text-xs font-medium text-slate-200 border border-border transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 text-xs font-medium text-slate-200 border border-border transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => {
              setEditingBusiness(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-md shadow-blue-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Business</span>
          </button>
        </div>
      </div>

      {importNotice && (
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center justify-between">
          <span>{importNotice}</span>
          <button onClick={() => setImportNotice(null)} className="text-blue-400 hover:text-white text-[11px]">Dismiss</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-xl bg-surface-100 border border-border flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by company, domain, owner, or city..."
            className="w-full bg-surface-50 border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 shrink-0">Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-surface-50 border border-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Stages ({businesses.length})</option>
            <option value="discovered">Discovered</option>
            <option value="audited">Audited</option>
            <option value="qualified">Qualified</option>
            <option value="outreach_ready">Outreach Ready</option>
            <option value="contacted">Contacted</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-surface-100 border border-border overflow-hidden">
        {filteredBusinesses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-slate-200">No Businesses in this Project</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Get started by loading verified sample market data, running the Autonomous Pipeline, or importing a CSV file.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleLoadSampleData}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load Verified Market Data</span>
              </button>
              <button
                onClick={() => setActiveModule?.('lead_pipeline')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Run Autonomous Pipeline</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 text-slate-400 border-b border-border">
                <tr>
                  <th className="py-2.5 px-3 font-medium">Official Company</th>
                  <th className="py-2.5 px-3 font-medium">Domain / Website</th>
                  <th className="py-2.5 px-3 font-medium">Contact Details</th>
                  <th className="py-2.5 px-3 font-medium">Decision-Maker</th>
                  <th className="py-2.5 px-3 font-medium">Reviews</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBusinesses.map(b => (
                  <tr key={b.id} className="hover:bg-surface-50/50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-200">{b.officialName}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {b.city || 'N/A'}, {b.state || ''} • {b.businessModel}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <a
                        href={b.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px]"
                      >
                        <span>{b.domain}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                      {b.isDemo && (
                        <span className="text-[8px] font-mono px-1 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase mt-0.5 inline-block">
                          DEMO
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {b.phone && (
                        <div className="flex items-center gap-1 text-slate-300 text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{b.phone}</span>
                        </div>
                      )}
                      {b.email && (
                        <div className="flex items-center gap-1 text-slate-400 text-[11px] mt-0.5">
                          <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate max-w-[140px]">{b.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {b.ownerManagerName ? (
                        <div>
                          <div className="text-slate-200 font-medium">{b.ownerManagerName}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <span>{b.ownerManagerRole || 'Owner'}</span>
                            <span className={`text-[8px] px-1 rounded font-mono ${
                              b.ownerVerificationStatus === 'verified'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-500/15 text-slate-400'
                            }`}>
                              {b.ownerVerificationStatus}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Unverified</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {b.reviewRating ? (
                        <div className="font-mono text-[11px]">
                          <span className="text-amber-400 font-bold">{b.reviewRating}★</span>
                          <span className="text-slate-400 ml-1">({b.reviewCount || 0})</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-500/15 text-slate-300 border border-border">
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingBusiness(b);
                            setIsModalOpen(true);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-surface-200"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-surface-200"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BusinessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onBusinessSaved={loadBusinesses}
        initialBusiness={editingBusiness}
      />

      {activeProject && (
        <CsvImportModal
          isOpen={isCsvModalOpen}
          onClose={() => setIsCsvModalOpen(false)}
          projectId={activeProject.id}
          onImportComplete={(count) => {
            loadBusinesses();
            setImportNotice(`Successfully ingested ${count} business leads via high-precision CSV engine.`);
          }}
        />
      )}
    </div>
  );
}
