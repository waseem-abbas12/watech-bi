'use client';

import React, { useState, useEffect } from 'react';
import {
  GitFork,
  Zap,
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  Plus,
  Sliders,
  Send,
  Eye,
  UserCheck,
} from 'lucide-react';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  trigger: {
    type: string;
    eventType?: string;
  };
  nodes: Array<{
    id: string;
    type: string;
    title: string;
    config?: any;
  }>;
  executionCount?: number;
  successCount?: number;
  failureCount?: number;
  lastExecutedAt?: string;
}

interface Execution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'running' | 'success' | 'failed' | 'waiting_for_approval' | 'cancelled';
  steps: Array<{
    stepId: string;
    title: string;
    status: string;
    durationMs?: number;
    error?: string;
  }>;
  startedAt: string;
  completedAt?: string;
  totalDurationMs?: number;
  errorSummary?: string;
}

interface Approval {
  id: string;
  workflowName: string;
  actionTitle: string;
  requiredRole: string;
  instructions: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
}

export function AutomationsManagementView() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/automations');
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data.workflows || []);
        setExecutions(data.executions || []);
        setApprovals(data.approvals || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleWorkflow = async (workflow: Workflow) => {
    try {
      const updated = { ...workflow, isActive: !workflow.isActive };
      await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerTest = async (workflow: Workflow) => {
    setTriggeringId(workflow.id);
    try {
      await fetch('/api/automations/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: workflow.trigger.eventType || 'lead.qualified',
          sourceModule: 'ui_manual_test',
          recordId: `rec_test_${Date.now()}`,
          payload: { testRun: true, companyName: 'Apex Mechanical Canton' },
        }),
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setTriggeringId(null);
    }
  };

  const handleResolveApproval = async (approvalId: string, decision: 'approved' | 'rejected') => {
    try {
      await fetch('/api/automations/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalId, decision }),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <GitFork className="w-6 h-6 text-purple-500" />
            Automation Workflow Engine
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Event-driven triggers, conditional logic branching, human-in-the-loop approvals, and background job synchronization.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-3.5 py-1.5 rounded-lg border border-border bg-surface-100 hover:bg-surface-200 text-slate-300 text-xs font-medium flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Human Approvals Gate Banner */}
      {approvals.filter((a) => a.status === 'pending').length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
              <UserCheck className="w-4 h-4" />
              Pending Human Approval Gates ({approvals.filter((a) => a.status === 'pending').length})
            </div>
            <span className="text-xs text-amber-300/80">Action required before workflow resumes</span>
          </div>

          <div className="space-y-2">
            {approvals
              .filter((a) => a.status === 'pending')
              .map((appr) => (
                <div
                  key={appr.id}
                  className="rounded-lg bg-surface-100 border border-border p-3 flex items-center justify-between gap-4"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-white">{appr.workflowName}: {appr.actionTitle}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{appr.instructions}</p>
                    <span className="text-[10px] text-slate-500">Requested: {new Date(appr.requestedAt).toLocaleTimeString()}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResolveApproval(appr.id, 'rejected')}
                      className="px-3 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleResolveApproval(appr.id, 'approved')}
                      className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
                    >
                      Approve & Resume
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Workflows List */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-400" />
          Active Workflows ({workflows.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className={`rounded-xl border p-5 flex flex-col justify-between space-y-4 transition-all ${
                wf.isActive
                  ? 'border-border bg-surface-100 hover:border-slate-600'
                  : 'border-border/50 bg-surface-50 opacity-60'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{wf.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{wf.description}</p>
                  </div>

                  <button
                    onClick={() => handleToggleWorkflow(wf)}
                    className={`p-1.5 rounded-lg border text-xs ${
                      wf.isActive
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-surface-200 border-border text-slate-400 hover:text-white'
                    }`}
                    title={wf.isActive ? 'Active — click to pause' : 'Paused — click to activate'}
                  >
                    {wf.isActive ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="p-2.5 rounded-lg bg-surface-200/50 border border-border/50 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Trigger:</span>
                    <span className="font-mono text-purple-300 font-semibold">{wf.trigger.eventType || wf.trigger.type}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Step Count:</span>
                    <span className="text-slate-200 font-medium">{(wf.nodes || []).length} Nodes</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Success Rate:</span>
                    <span className="text-emerald-400 font-medium">
                      {wf.executionCount ? Math.round(((wf.successCount || 0) / wf.executionCount) * 100) : 100}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <span className="text-[10px] text-slate-500">
                  {wf.lastExecutedAt ? `Last: ${new Date(wf.lastExecutedAt).toLocaleTimeString()}` : 'Never run'}
                </span>

                <button
                  onClick={() => handleTriggerTest(wf)}
                  disabled={triggeringId === wf.id}
                  className="px-2.5 py-1 rounded bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-medium flex items-center gap-1 transition-all"
                >
                  <Send className={`w-3 h-3 ${triggeringId === wf.id ? 'animate-pulse' : ''}`} />
                  Test Trigger
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Execution History */}
      <div className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          Execution Log ({executions.length})
        </h2>

        <div className="rounded-xl border border-border bg-surface-100 overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-200/50 text-slate-400">
                <th className="py-2.5 px-4 font-semibold">Workflow</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
                <th className="py-2.5 px-4 font-semibold">Steps</th>
                <th className="py-2.5 px-4 font-semibold">Duration</th>
                <th className="py-2.5 px-4 font-semibold">Time</th>
                <th className="py-2.5 px-4 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {executions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No executions recorded yet.
                  </td>
                </tr>
              ) : (
                executions.slice(0, 15).map((exec) => (
                  <tr key={exec.id} className="hover:bg-surface-200/30 transition-colors">
                    <td className="py-3 px-4 text-white font-medium">{exec.workflowName}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          exec.status === 'success'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : exec.status === 'failed'
                            ? 'bg-rose-500/10 text-rose-400'
                            : exec.status === 'waiting_for_approval'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-blue-500/10 text-blue-400'
                        }`}
                      >
                        {exec.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {(exec.steps || []).filter((s) => s.status === 'success').length}/{(exec.steps || []).length} Done
                    </td>
                    <td className="py-3 px-4 text-slate-400">{exec.totalDurationMs ? `${exec.totalDurationMs}ms` : '—'}</td>
                    <td className="py-3 px-4 text-slate-400">{new Date(exec.startedAt).toLocaleTimeString()}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedExecution(exec)}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Execution Inspect Modal */}
      {selectedExecution && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-100 border border-border rounded-xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-semibold text-white">Execution Breakdown: {selectedExecution.workflowName}</h3>
              <button onClick={() => setSelectedExecution(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase text-slate-400">Executed Nodes</h4>
              <div className="space-y-1.5">
                {(selectedExecution.steps || []).map((step, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-surface-200/50 border border-border/50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {step.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      )}
                      <span className="text-white font-medium">{step.title}</span>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px]">{step.durationMs ? `${step.durationMs}ms` : '0ms'}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedExecution.errorSummary && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                <strong>Error Summary:</strong> {selectedExecution.errorSummary}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-border">
              <button
                onClick={() => setSelectedExecution(null)}
                className="px-4 py-1.5 rounded-lg bg-surface-200 text-slate-300 hover:bg-surface-300 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
