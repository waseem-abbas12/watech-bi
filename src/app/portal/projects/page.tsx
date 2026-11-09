'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Calendar,
  Clock,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  ShieldCheck,
} from 'lucide-react';
import { useClientPortalAuth } from '@/context/ClientPortalAuthContext';
import { getClientVisibleProjects } from '@/lib/engines/clientPortalEngine';
import { ClientProject } from '@/types';

export default function PortalProjectsPage() {
  const { currentClient, isLoading: authLoading } = useClientPortalAuth();
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      if (!currentClient) return;
      try {
        setIsLoading(true);
        const data = await getClientVisibleProjects(currentClient.id);
        setProjects(data);
      } catch (err) {
        console.error('Error loading client projects:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading && currentClient) {
      loadProjects();
    }
  }, [currentClient, authLoading]);

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <span className="text-xs font-mono text-slate-400">Loading Project Workspaces...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">Assigned Client Projects</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Active and completed delivery scopes managed by Watech for {currentClient?.companyName}.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-100 border border-border text-xs text-slate-400 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>{projects.length} Project Scope(s) Active</span>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {projects.map((proj) => (
          <div
            key={proj.id}
            className="bg-surface-50 border border-border rounded-xl p-5 hover:border-emerald-500/30 transition-all shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white tracking-tight">{proj.name}</h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold">
                    {proj.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">{proj.description}</p>
              </div>

              <Link
                href={`/portal/projects/${proj.id}`}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow shrink-0"
              >
                <span>Open Project Workspace</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Milestone Delivery Progress</span>
                <span className="font-mono font-bold text-emerald-400">{proj.progressPercent}%</span>
              </div>
              <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${proj.progressPercent}%` }}
                />
              </div>
            </div>

            {/* Meta Tags */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 border-t border-border font-mono">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Start: {proj.startDate}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Target Launch: {proj.targetCompletionDate}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Delivery Lead: Sarah Jenkins (PM)
              </span>
            </div>
          </div>
        ))}

        {projects.length === 0 && (
          <div className="bg-surface-50 border border-border rounded-xl p-8 text-center text-xs text-slate-400 space-y-2">
            <Briefcase className="w-6 h-6 text-slate-500 mx-auto" />
            <p>No projects currently associated with your client account.</p>
          </div>
        )}
      </div>
    </div>
  );
}
