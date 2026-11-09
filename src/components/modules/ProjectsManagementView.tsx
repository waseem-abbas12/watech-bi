'use client';

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Layers,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Zap,
  Trash2,
  MapPin,
  Target,
  ShieldCheck,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { repository } from '@/lib/db/repository';
import type { ResearchProject, Business } from '@/types';
import { ProjectModal } from '@/components/modals/ProjectModal';

export function ProjectsManagementView() {
  const { projects, activeProject, setActiveProject, setActiveModule, deleteProject } = useProject();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectStats, setProjectStats] = useState<Record<string, { totalBusinesses: number; qualifiedCount: number }>>({});
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Load business statistics for each project
  useEffect(() => {
    async function loadStats() {
      setIsLoadingStats(true);
      const statsMap: Record<string, { totalBusinesses: number; qualifiedCount: number }> = {};
      try {
        await Promise.all(
          projects.map(async (p) => {
            const biz = await repository.getBusinesses(p.id);
            const qualified = biz.filter((b) => b.status === 'qualified').length;
            statsMap[p.id] = {
              totalBusinesses: biz.length,
              qualifiedCount: qualified,
            };
          })
        );
        setProjectStats(statsMap);
      } catch (err) {
        console.error('Failed to load project stats:', err);
      } finally {
        setIsLoadingStats(false);
      }
    }
    if (projects.length > 0) {
      loadStats();
    }
  }, [projects]);

  const industries = Array.from(new Set(projects.map((p) => p.industryNiche).filter(Boolean)));

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.cityArea.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.industryNiche.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesIndustry = selectedIndustry === 'all' || p.industryNiche === selectedIndustry;
    return matchesSearch && matchesIndustry;
  });

  const handleLaunchPipeline = (project: ResearchProject) => {
    setActiveProject(project);
    setActiveModule('lead_pipeline');
  };

  const handleOpenIntelligence = (project: ResearchProject) => {
    setActiveProject(project);
    setActiveModule('lead_intelligence');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-surface-100 border border-border">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Briefcase className="w-5 h-5 text-blue-400" />
            Market Research & Project Management
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Configure target geographic territories, launch autonomous lead discovery pipelines, and manage commercial sales campaigns.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Research Project</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-surface-100 border border-border">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by name, city, niche..."
            className="w-full bg-surface-50 border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs text-slate-400 font-medium shrink-0">Industry:</label>
          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className="w-full sm:w-44 bg-surface-50 border border-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Industries ({projects.length})</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface-100 border border-dashed border-border space-y-3">
          <Layers className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-200">No Projects Found</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No projects matched "${searchQuery}". Try clearing your search filters.`
              : 'Create your first market research project to start autonomous business discovery.'}
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
          >
            Create First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((p) => {
            const isActive = activeProject?.id === p.id;
            const stats = projectStats[p.id] || { totalBusinesses: 0, qualifiedCount: 0 };

            return (
              <div
                key={p.id}
                className={`p-5 rounded-2xl bg-surface-100 border transition-all flex flex-col justify-between space-y-4 ${
                  isActive ? 'border-blue-500/60 ring-1 ring-blue-500/30' : 'border-border hover:border-slate-700'
                }`}
              >
                {/* Project Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-slate-200 text-sm">{p.name}</h3>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>
                          {p.cityArea}, {p.stateRegion || p.country}
                        </span>
                      </div>
                    </div>
                    {p.isDemo ? (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase shrink-0">
                        Demo
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase shrink-0">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-surface-50 border border-border text-slate-300 font-medium">
                      {p.industryNiche}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-surface-50 border border-border text-slate-400 capitalize">
                      {p.businessModel}
                    </span>
                  </div>
                </div>

                {/* Metrics Summary */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-surface-50 border border-border/80 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total Discovered</span>
                    <strong className="text-slate-200 text-sm font-semibold">{stats.totalBusinesses}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Qualified Leads</span>
                    <strong className="text-emerald-400 text-sm font-semibold">{stats.qualifiedCount}</strong>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleLaunchPipeline(p)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Run Pipeline</span>
                    </button>

                    <button
                      onClick={() => handleOpenIntelligence(p)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition border border-border"
                    >
                      <span>View Leads</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    {isActive ? (
                      <span className="text-blue-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Active Project
                      </span>
                    ) : (
                      <button
                        onClick={() => setActiveProject(p)}
                        className="text-slate-400 hover:text-slate-200 transition"
                      >
                        Set as Active
                      </button>
                    )}

                    {!p.isDemo && projects.length > 1 && (
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete project "${p.name}"?`)) {
                            deleteProject(p.id);
                          }
                        }}
                        className="text-rose-400 hover:text-rose-300 transition"
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ProjectModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </div>
  );
}
