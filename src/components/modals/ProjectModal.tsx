'use client';

import React, { useState } from 'react';
import { X, FolderPlus, Sparkles, AlertCircle } from 'lucide-react';
import type { ResearchProject, WatechService, ResearchDepth } from '@/types';
import { useProject } from '@/context/ProjectContext';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_SERVICES: { id: WatechService; label: string }[] = [
  { id: 'website_development', label: 'Website Development' },
  { id: 'seo', label: 'Technical SEO' },
  { id: 'local_seo', label: 'Local SEO & Maps' },
  { id: 'conversion_optimization', label: 'Conversion Rate Optimization' },
  { id: 'lead_generation', label: 'Lead Generation' },
  { id: 'crm', label: 'CRM & Pipeline Setup' },
  { id: 'automation', label: 'Follow-Up & Workflow Automation' },
  { id: 'custom_software', label: 'Bespoke Software / Tools' },
  { id: 'social_media', label: 'Social Media Management' },
  { id: 'content_marketing', label: 'Content & Authority Marketing' },
  { id: 'paid_advertising', label: 'Paid Search & Meta Ads' },
];

export function ProjectModal({ isOpen, onClose }: ProjectModalProps) {
  const { createProject } = useProject();
  const [name, setName] = useState('');
  const [country, setCountry] = useState('United States');
  const [stateRegion, setStateRegion] = useState('');
  const [cityArea, setCityArea] = useState('');
  const [industryNiche, setIndustryNiche] = useState('');
  const [businessModel, setBusinessModel] = useState<'residential' | 'commercial' | 'b2b' | 'b2c' | 'mixed'>('commercial');
  const [targetBusinessSize, setTargetBusinessSize] = useState('');
  const [targetServices, setTargetServices] = useState('');
  const [targetCustomerSegment, setTargetCustomerSegment] = useState('');
  const [competitorNames, setCompetitorNames] = useState('');
  const [selectedServices, setSelectedServices] = useState<WatechService[]>([
    'website_development',
    'local_seo',
    'conversion_optimization',
    'automation',
  ]);
  const [researchDepth, setResearchDepth] = useState<ResearchDepth>('standard');
  const [notesAndExclusions, setNotesAndExclusions] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const toggleService = (srv: WatechService) => {
    setSelectedServices(prev =>
      prev.includes(srv) ? prev.filter(s => s !== srv) : [...prev, srv]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a project name.');
      return;
    }
    if (!cityArea.trim() || !industryNiche.trim()) {
      setError('Target Geography and Industry/Niche are required.');
      return;
    }

    const newProject: ResearchProject = {
      id: `proj-${Date.now()}`,
      name: name.trim(),
      country: country.trim(),
      stateRegion: stateRegion.trim(),
      cityArea: cityArea.trim(),
      industryNiche: industryNiche.trim(),
      businessModel,
      targetBusinessSize: targetBusinessSize.trim() || undefined,
      targetServices: targetServices.trim() || undefined,
      targetCustomerSegment: targetCustomerSegment.trim() || undefined,
      competitorNames: competitorNames.trim() || undefined,
      watechServicesToEvaluate: selectedServices,
      researchDepth,
      notesAndExclusions: notesAndExclusions.trim() || undefined,
      isDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await createProject(newProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-surface-100 border border-border rounded-xl w-full max-w-3xl my-8 p-6 shadow-2xl relative text-left">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
          <div className="p-2.5 rounded-lg bg-brand-500/10 text-brand-500 border border-brand-500/20">
            <FolderPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Initialize Research Project</h2>
            <p className="text-xs text-slate-400">Configure target geography, niche, and research scope with strict provenance.</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Project Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Austin Commercial Roofing & Solar Contractors"
              className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Geography Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Country</label>
              <input
                type="text"
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">State / Province / Region</label>
              <input
                type="text"
                value={stateRegion}
                onChange={e => setStateRegion(e.target.value)}
                placeholder="e.g. Texas"
                className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                City / Target Area <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={cityArea}
                onChange={e => setCityArea(e.target.value)}
                placeholder="e.g. Austin Metro Corridor"
                className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Industry & Model */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Industry & Niche <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={industryNiche}
                onChange={e => setIndustryNiche(e.target.value)}
                placeholder="e.g. Commercial Roofing & Waterproofing"
                className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Business Model</label>
              <select
                value={businessModel}
                onChange={e => setBusinessModel(e.target.value as any)}
                className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
              >
                <option value="commercial">Commercial Only</option>
                <option value="residential">Residential Only</option>
                <option value="mixed">Mixed Residential & Commercial</option>
                <option value="b2b">Pure B2B / Industrial</option>
                <option value="b2c">Consumer / B2C</option>
              </select>
            </div>
          </div>

          {/* Target criteria */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Business Size (Optional)</label>
              <input
                type="text"
                value={targetBusinessSize}
                onChange={e => setTargetBusinessSize(e.target.value)}
                placeholder="e.g. 10-50 employees"
                className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Services (Optional)</label>
              <input
                type="text"
                value={targetServices}
                onChange={e => setTargetServices(e.target.value)}
                placeholder="e.g. TPO roof replacement, leak detection"
                className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Research Depth</label>
              <select
                value={researchDepth}
                onChange={e => setResearchDepth(e.target.value as ResearchDepth)}
                className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
              >
                <option value="quick">Quick (Basic Discovery + Audit)</option>
                <option value="standard">Standard (Full 10-Cat Audit + Scores)</option>
                <option value="deep">Deep (Full BI + Content Gaps + Outreach)</option>
              </select>
            </div>
          </div>

          {/* Watech Services to Evaluate */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Watech Growth Services to Evaluate
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AVAILABLE_SERVICES.map(s => {
                const isSelected = selectedServices.includes(s.id);
                return (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => toggleService(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border text-left transition-all ${
                      isSelected
                        ? 'bg-brand-500/15 border-brand-500/50 text-blue-300'
                        : 'bg-surface-50 border-border text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes & Exclusions */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Notes & Exclusions</label>
            <textarea
              rows={2}
              value={notesAndExclusions}
              onChange={e => setNotesAndExclusions(e.target.value)}
              placeholder="e.g. Exclude residential handymen; focus on contractors with active commercial portfolio."
              className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-xs font-medium bg-brand-600 hover:bg-brand-500 text-white transition-colors shadow-lg shadow-brand-500/20"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
