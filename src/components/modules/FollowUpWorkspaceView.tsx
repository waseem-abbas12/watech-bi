'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Send,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Building2,
  Mail,
  Phone,
  ArrowRight,
  Filter,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { repository } from '@/lib/db/repository';
import type { FollowUpSchedule, Business, Contact } from '@/types';

export function FollowUpWorkspaceView() {
  const { activeProject, setActiveModule } = useProject();
  const [schedules, setSchedules] = useState<FollowUpSchedule[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'overdue' | 'upcoming' | 'completed'>('today');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!activeProject) return;
      setIsLoading(true);
      try {
        const [sList, bList, cList] = await Promise.all([
          repository.getFollowUpSchedules(activeProject.id),
          repository.getBusinesses(activeProject.id),
          repository.getContacts(undefined, activeProject.id),
        ]);
        setSchedules(sList);
        setBusinesses(bList);
        setContacts(cList);
      } catch (err) {
        console.error('Failed to load follow-up schedules:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [activeProject]);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Partition schedules
  const partitioned = useMemo(() => {
    const overdue: FollowUpSchedule[] = [];
    const today: FollowUpSchedule[] = [];
    const upcoming: FollowUpSchedule[] = [];
    const completed: FollowUpSchedule[] = [];

    schedules.forEach((s) => {
      if ((s.status as any) === 'completed') {
        completed.push(s);
        return;
      }
      if ((s.status as any) === 'stopped') {
        return;
      }

      const dueDateStr = (s.nextFollowUpDate || '').split('T')[0];
      if (!dueDateStr) {
        upcoming.push(s);
        return;
      }

      if (dueDateStr < todayStr) {
        overdue.push(s);
      } else if (dueDateStr === todayStr) {
        today.push(s);
      } else {
        upcoming.push(s);
      }
    });

    return { overdue, today, upcoming, completed };
  }, [schedules, todayStr]);

  const currentList = partitioned[activeTab];

  const handleMarkCompleted = async (schedule: FollowUpSchedule) => {
    const updated: FollowUpSchedule = {
      ...schedule,
      status: 'completed' as any,
      updatedAt: new Date().toISOString(),
    };
    await repository.saveFollowUpSchedule(updated);
    setSchedules((prev) => prev.map((s) => (s.id === schedule.id ? updated : s)));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-surface-100 border border-border">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Send className="w-5 h-5 text-blue-400" />
            Outreach Follow-Up Workspace
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Track scheduled touchpoints, automated reminders, and multi-step communication cadences with commercial decision-makers.
          </p>
        </div>

        <button
          onClick={() => setActiveModule('lead_crm')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all shrink-0"
        >
          <span>Open CRM Pipeline</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Overdue Warning Alert */}
      {partitioned.overdue.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <strong>{partitioned.overdue.length} overdue follow-up task(s)</strong> require immediate outreach or rescheduling.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('overdue')}
            className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[11px] font-semibold border border-rose-500/30 transition shrink-0"
          >
            View Overdue Tasks
          </button>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'today'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-400 hover:text-white hover:bg-surface-100'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Due Today</span>
          <span className="px-1.5 py-0.2 rounded-full bg-surface-50 text-[10px] font-mono border border-border">
            {partitioned.today.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('overdue')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'overdue'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
              : 'text-slate-400 hover:text-white hover:bg-surface-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Overdue</span>
          <span className="px-1.5 py-0.2 rounded-full bg-surface-50 text-[10px] font-mono border border-border">
            {partitioned.overdue.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'upcoming'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-400 hover:text-white hover:bg-surface-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Upcoming</span>
          <span className="px-1.5 py-0.2 rounded-full bg-surface-50 text-[10px] font-mono border border-border">
            {partitioned.upcoming.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'completed'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-surface-100'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Completed</span>
          <span className="px-1.5 py-0.2 rounded-full bg-surface-50 text-[10px] font-mono border border-border">
            {partitioned.completed.length}
          </span>
        </button>
      </div>

      {/* Task List */}
      {currentList.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface-100 border border-dashed border-border space-y-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-200">No {activeTab} follow-up tasks</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            All touchpoints in this category are clear. You can schedule new outreach cadences in the Lead CRM.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentList.map((sched) => {
            const biz = businesses.find((b) => b.id === sched.businessId);
            const contact = contacts.find((c) => c.businessId === sched.businessId && c.isDecisionMaker);

            return (
              <div
                key={sched.id}
                className="p-5 rounded-2xl bg-surface-100 border border-border flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-200 text-sm">
                        {biz?.officialName || 'Target Business'}
                      </h3>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {biz?.domain || 'N/A'} • {biz?.city || 'Canton'}, {biz?.state || 'OH'}
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                        activeTab === 'overdue'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : activeTab === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      Attempt #{sched.attemptNumber || 1} • {sched.preferredChannel || 'email'}
                    </span>
                  </div>

                  {contact && (
                    <div className="p-2.5 rounded-lg bg-surface-50 border border-border/80 text-xs flex items-center justify-between">
                      <span className="text-slate-300 font-medium">{contact.fullName}</span>
                      <span className="text-[10px] text-slate-400">{contact.roleOrTitle || 'Decision Maker'}</span>
                    </div>
                  )}

                  {sched.notes && (
                    <p className="text-xs text-slate-400 leading-relaxed italic bg-surface-50/50 p-2.5 rounded-lg border border-border/60">
                      &ldquo;{sched.notes}&rdquo;
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Due: {(sched.nextFollowUpDate || '').split('T')[0] || 'Scheduled'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {sched.status !== 'completed' && (
                      <button
                        onClick={() => handleMarkCompleted(sched)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition"
                      >
                        Mark Done
                      </button>
                    )}

                    <button
                      onClick={() => setActiveModule('lead_crm')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-border transition flex items-center gap-1"
                    >
                      <span>CRM</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
