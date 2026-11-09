'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FolderPlus,
  Upload,
  Zap,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { useTenant } from '@/context/TenantContext';

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  isComplete: boolean;
  actionModule?: string;
  actionUrl?: string;
}

export function OnboardingChecklistWidget() {
  const { activeProject, setActiveModule } = useProject();
  const { currentTenant, currentUser } = useTenant();

  const [isDismissed, setIsDismissed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('watech_checklist_dismissed');
      if (dismissed === 'true') {
        setIsDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('watech_checklist_dismissed', 'true');
    }
  };

  const hasAccount = Boolean(currentUser);
  const hasOrg = Boolean(currentTenant && currentTenant.id !== 'tenant-watech-primary');
  const hasProject = Boolean(activeProject);
  const hasBusinesses = Boolean(activeProject); // When project is selected/created
  const hasPipelineRun = typeof window !== 'undefined' && localStorage.getItem('watech_onboarding_completed') === 'true';

  const items: ChecklistItem[] = [
    {
      id: 'step-account',
      title: 'Administrator Account Provisioning',
      description: 'Account created with Organization Owner privileges.',
      isComplete: true, // User is currently logged in
    },
    {
      id: 'step-org',
      title: 'Organization & Workspace Setup',
      description: 'Agency branding, industry parameters, and team workspaces configured.',
      isComplete: hasOrg || hasAccount,
      actionUrl: '/onboarding',
    },
    {
      id: 'step-project',
      title: 'First Research Project Created',
      description: 'Target market defined (e.g., Canton Commercial HVAC).',
      isComplete: hasProject,
      actionModule: 'overview',
    },
    {
      id: 'step-import',
      title: 'Business Leads Ingested',
      description: 'Candidate HVAC contractors loaded via CSV or verified dataset.',
      isComplete: hasBusinesses,
      actionModule: 'discovery',
    },
    {
      id: 'step-pipeline',
      title: 'Autonomous Pipeline Activated',
      description: 'Unified 10-stage technical and contact intelligence executed.',
      isComplete: hasPipelineRun,
      actionModule: 'lead_pipeline',
    },
    {
      id: 'step-qualified',
      title: 'Qualified Leads Discovered',
      description: 'High-margin commercial gaps identified with 40+ point scores.',
      isComplete: hasPipelineRun,
      actionModule: 'lead_scoring',
    },
    {
      id: 'step-crm',
      title: 'Review CRM & Cadence Follow-ups',
      description: 'Inspect follow-up schedule and prepared outreach strategy.',
      isComplete: hasPipelineRun,
      actionModule: 'lead_crm',
    },
  ];

  const completedCount = items.filter((i) => i.isComplete).length;
  const progressPercent = Math.round((completedCount / items.length) * 100);

  if (isDismissed) return null;

  return (
    <div className="mb-6 bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/30 rounded-xl p-4 shadow-xl transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold text-white tracking-wide uppercase font-mono">
                Customer Activation Checklist
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                {completedCount} of {items.length} Complete ({progressPercent}%)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Complete these milestones to fully activate autonomous client acquisition in your agency.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/onboarding"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            <span>Resume Onboarding</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'Expand Checklist' : 'Collapse Checklist'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            title="Dismiss Checklist"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
        <div
          className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Expandable Step Items */}
      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-slate-800/80">
          {items.map((item) => (
            <div
              key={item.id}
              className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                item.isComplete
                  ? 'bg-slate-900/60 border-emerald-500/20 text-slate-300'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-blue-500/40'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {item.isComplete ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                )}
                <span className={`font-medium truncate ${item.isComplete ? 'text-white' : 'text-slate-300'}`}>
                  {item.title}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-snug line-clamp-2 pl-6">
                {item.description}
              </p>
              {!item.isComplete && item.actionModule && (
                <button
                  onClick={() => setActiveModule(item.actionModule as any)}
                  className="mt-2 ml-6 text-[10px] text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1"
                >
                  Start Step <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
