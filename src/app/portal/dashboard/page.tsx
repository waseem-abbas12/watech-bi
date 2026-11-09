'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck2,
  CreditCard,
  MessageSquarePlus,
  ArrowRight,
  PackageCheck,
  Calendar,
  User,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useClientPortalAuth } from '@/context/ClientPortalAuthContext';
import {
  getSanitizedClientDashboard,
  getClientVisibleProjects,
  getClientActivityTimeline,
  ClientTimelineEvent,
} from '@/lib/engines/clientPortalEngine';
import { ClientDashboardSummary, ClientProject } from '@/types';

export default function PortalDashboardPage() {
  const { currentClient, portalUser, isLoading: authLoading } = useClientPortalAuth();
  const [summary, setSummary] = useState<ClientDashboardSummary | null>(null);
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [timeline, setTimeline] = useState<ClientTimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!currentClient) return;
      try {
        setIsLoading(true);
        const [dashSummary, clientProjects, timelineEvents] = await Promise.all([
          getSanitizedClientDashboard(currentClient.id),
          getClientVisibleProjects(currentClient.id),
          getClientActivityTimeline(currentClient.id),
        ]);
        setSummary(dashSummary);
        setProjects(clientProjects);
        setTimeline(timelineEvents);
      } catch (err) {
        console.error('Error loading client dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading && currentClient) {
      loadData();
    }
  }, [currentClient, authLoading]);

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <span className="text-xs font-mono text-slate-400">Loading Client Relationship Workspace...</span>
      </div>
    );
  }

  if (!currentClient || !summary) {
    return (
      <div className="bg-surface-50 border border-border rounded-xl p-8 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
        <h2 className="text-sm font-semibold text-white">No Client Record Associated</h2>
        <p className="text-xs text-slate-400">Please select an active client profile to view dashboard.</p>
        <Link
          href="/portal/login"
          className="inline-block px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
        >
          Go to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-surface-50 to-[#0e172c] border border-border rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              EXECUTIVE CLIENT WORKSPACE
            </span>
            <span className="text-xs text-slate-400">Account ID: {currentClient.id}</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight mt-1.5">
            Welcome, {portalUser?.fullName || currentClient.primaryContact?.name || 'Executive Partner'}
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Current project execution, deliverables review, milestones progress, and commercial billing overview for{' '}
            <span className="text-emerald-400 font-semibold">{currentClient.companyName}</span>.
          </p>
        </div>

        {/* Assigned PM Card */}
        <div className="bg-surface-100/80 border border-border rounded-xl p-3 flex items-center gap-3 shrink-0 self-stretch md:self-auto">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-sm">
            PM
          </div>
          <div className="text-xs">
            <span className="text-slate-400 text-[10px] block uppercase font-medium">Assigned Delivery Lead</span>
            <span className="text-white font-bold block">Sarah Jenkins</span>
            <span className="text-[10px] text-emerald-400 font-mono block">Direct SLA: &lt; 2hr Response</span>
          </div>
        </div>
      </div>

      {/* Action Required Alert Banner */}
      <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Relationship Status & Next Step</span>
            <p className="text-xs text-emerald-300 mt-0.5">{summary.nextRequiredAction}</p>
          </div>
        </div>

        {summary.pendingApprovalsCount > 0 && (
          <Link
            href="/portal/deliverables"
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow"
          >
            <span>Review Deliverables ({summary.pendingApprovalsCount})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Executive 4-KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Projects & Progress */}
        <div className="bg-surface-50 border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Projects</span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Briefcase className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {summary.activeProjectsCount}
            <span className="text-xs font-normal text-slate-400 ml-1.5">in delivery</span>
          </div>
          <div className="w-full bg-surface-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all"
              style={{ width: `${summary.overallProgressPercent}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5 flex justify-between">
            <span>Overall Completion</span>
            <span className="text-blue-400 font-mono font-semibold">{summary.overallProgressPercent}%</span>
          </div>
        </div>

        {/* KPI 2: Pending Client Approvals */}
        <div className="bg-surface-50 border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Approvals</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <PackageCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {summary.pendingApprovalsCount}
            <span className="text-xs font-normal text-slate-400 ml-1.5">deliverables</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-3 flex items-center justify-between">
            <span>Sign-off status</span>
            <span className={summary.pendingApprovalsCount > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
              {summary.pendingApprovalsCount > 0 ? 'Awaiting Your Review' : 'All Approved'}
            </span>
          </div>
        </div>

        {/* KPI 3: Outstanding Invoices */}
        <div className="bg-surface-50 border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Balance Due</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            ${summary.outstandingInvoicesTotal.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-3 flex items-center justify-between">
            <span>Current Milestones</span>
            <Link href="/portal/invoices" className="text-amber-400 hover:underline font-medium">
              View Billing &rarr;
            </Link>
          </div>
        </div>

        {/* KPI 4: Open Service Requests */}
        <div className="bg-surface-50 border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Service Requests</span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <MessageSquarePlus className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {summary.openRequestsCount}
            <span className="text-xs font-normal text-slate-400 ml-1.5">active tickets</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-3 flex items-center justify-between">
            <span>Request Center</span>
            <Link href="/portal/requests" className="text-purple-400 hover:underline font-medium">
              Track Status &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Projects & Upcoming Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Projects Overview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface-50 border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Active Projects Delivery Roadmap</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Milestone execution tracking and expected completion timelines.
                </p>
              </div>
              <Link href="/portal/projects" className="text-xs text-emerald-400 hover:underline font-medium flex items-center gap-1">
                <span>All Projects</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="bg-surface-100/70 border border-border rounded-xl p-4 hover:border-emerald-500/30 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white">{proj.name}</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold">
                          {proj.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2">{proj.description}</p>
                    </div>

                    <Link
                      href={`/portal/projects/${proj.id}`}
                      className="px-3 py-1.5 rounded-lg bg-surface-200 hover:bg-surface-300 text-white text-xs font-medium flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <span>Workspace</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Delivery Progress</span>
                      <span className="font-mono text-white font-semibold">{proj.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-surface-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all"
                        style={{ width: `${proj.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 flex flex-wrap gap-4 pt-1 border-t border-border/60">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      Started: {proj.startDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      Target Launch: {proj.targetCompletionDate}
                    </span>
                  </div>
                </div>
              ))}
              {projects.length === 0 && (
                <p className="text-xs text-slate-400 py-6 text-center italic">No projects currently assigned to this account.</p>
              )}
            </div>
          </div>

          {/* Deliverables Ready for Sign-Off */}
          <div className="bg-surface-50 border border-border rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Latest Deliverables & Work Assets</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Review production assets submitted by our delivery specialists for your review.
                </p>
              </div>
              <Link href="/portal/deliverables" className="text-xs text-emerald-400 hover:underline font-medium">
                View All Deliverables &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {summary.recentDeliverables.map((del) => (
                <div key={del.id} className="bg-surface-100 rounded-xl p-3 border border-border space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-white line-clamp-1">{del.title}</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full uppercase shrink-0 font-semibold ${
                        del.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : del.status === 'revision_requested'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {del.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 line-clamp-2">{del.description}</p>
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-slate-400">{del.handoverUrl ? 'Interactive Link' : 'Document Asset'}</span>
                    <Link href="/portal/deliverables" className="text-emerald-400 hover:underline font-medium">
                      Inspect & Sign &rarr;
                    </Link>
                  </div>
                </div>
              ))}
              {summary.recentDeliverables.length === 0 && (
                <p className="text-xs text-slate-400 py-4 col-span-2 text-center italic">No deliverables published yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Milestones & Activity Timeline */}
        <div className="space-y-6">
          {/* Upcoming Milestones */}
          <div className="bg-surface-50 border border-border rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-white">Upcoming Delivery Milestones</h3>
            <div className="space-y-2.5">
              {summary.upcomingMilestones.map((m) => (
                <div key={m.id} className="bg-surface-100 rounded-lg p-3 border border-border text-xs space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-white">{m.name}</span>
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                      Weight: {m.weightPercent}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">{m.description}</p>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono pt-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    Target Date: {m.targetDate}
                  </div>
                </div>
              ))}
              {summary.upcomingMilestones.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center italic">All milestones currently achieved.</p>
              )}
            </div>
          </div>

          {/* Recent Chronological Timeline */}
          <div className="bg-surface-50 border border-border rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-white">Recent Activity Timeline</h3>
            <div className="space-y-3 text-xs max-h-80 overflow-y-auto pr-1">
              {timeline.slice(0, 5).map((ev) => (
                <div key={ev.id} className="border-l-2 border-emerald-500/40 pl-3 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-[11px]">{ev.title}</span>
                    <span className="text-[9px] font-mono text-slate-400">{ev.timestamp.slice(0, 10)}</span>
                  </div>
                  <p className="text-[11px] text-slate-300">{ev.description}</p>
                  {ev.statusBadge && (
                    <span className="inline-block text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface-100 text-slate-400 border border-border uppercase">
                      {ev.statusBadge}
                    </span>
                  )}
                </div>
              ))}
              {timeline.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center italic">No activity logged yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
