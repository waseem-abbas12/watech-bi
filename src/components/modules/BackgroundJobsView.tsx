'use client';

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  RefreshCw,
  Play,
  RotateCcw,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ShieldCheck,
  ShieldAlert,
  Flame,
} from 'lucide-react';

interface Job {
  id: string;
  type: string;
  status: 'QUEUED' | 'RUNNING' | 'RETRYING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  priority: 'critical' | 'high' | 'default' | 'low';
  attempts: number;
  maxRetries: number;
  scheduledFor: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  isDeadLetter?: boolean;
  deadLetterReason?: string;
  createdAt: string;
}

export function BackgroundJobsView() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isTicking, setIsTicking] = useState(false);
  const [tickResult, setTickResult] = useState<any | null>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/jobs');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleRunWorkerTick = async () => {
    setIsTicking(true);
    setTickResult(null);
    try {
      const res = await fetch('/api/jobs', { method: 'PUT' });
      const data = await res.json();
      setTickResult(data);
      await fetchJobs();
    } catch (err) {
      console.error(err);
    } finally {
      setIsTicking(false);
    }
  };

  const handleRetryJob = async (id: string) => {
    try {
      await fetch(`/api/jobs/${id}`, { method: 'POST' });
      fetchJobs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelJob = async (id: string) => {
    try {
      await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
      fetchJobs();
    } catch (err) {
      console.error(err);
    }
  };

  const queuedCount = jobs.filter((j) => j.status === 'QUEUED').length;
  const runningCount = jobs.filter((j) => j.status === 'RUNNING').length;
  const retryingCount = jobs.filter((j) => j.status === 'RETRYING').length;
  const completedCount = jobs.filter((j) => j.status === 'COMPLETED').length;
  const deadLetterCount = jobs.filter((j) => j.isDeadLetter).length;

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Cpu className="w-6 h-6 text-emerald-500" />
            Background Job Engine & Worker Queue
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Persistent job queue with bounded concurrency, exponential backoff retries, stale crash recovery, and dead-letter queue.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRunWorkerTick}
            disabled={isTicking}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
          >
            <Play className={`w-3.5 h-3.5 ${isTicking ? 'animate-spin' : ''}`} />
            {isTicking ? 'Processing...' : 'Process Queue Tick'}
          </button>

          <button
            onClick={fetchJobs}
            className="p-1.5 rounded-lg border border-border bg-surface-100 hover:bg-surface-200 text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Worker Tick Alert */}
      {tickResult && (
        <div className="p-3 rounded-lg bg-surface-100 border border-emerald-500/30 text-xs text-slate-300 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Worker cycle completed: {tickResult.processed} processed, {tickResult.completed} completed, {tickResult.failed} failed, {tickResult.recovered} stale recovered.
          </span>
          <button onClick={() => setTickResult(null)} className="text-slate-500 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-xl border border-border bg-surface-100 p-4 space-y-1">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Total Jobs</span>
          <p className="text-2xl font-bold text-white">{total}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-100 p-4 space-y-1">
          <span className="text-[11px] font-semibold uppercase text-blue-400">Queued</span>
          <p className="text-2xl font-bold text-blue-400">{queuedCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-100 p-4 space-y-1">
          <span className="text-[11px] font-semibold uppercase text-emerald-400">Running / Done</span>
          <p className="text-2xl font-bold text-emerald-400">{completedCount} <span className="text-xs text-slate-500 font-normal">({runningCount} active)</span></p>
        </div>
        <div className="rounded-xl border border-border bg-surface-100 p-4 space-y-1">
          <span className="text-[11px] font-semibold uppercase text-amber-400">Retrying</span>
          <p className="text-2xl font-bold text-amber-400">{retryingCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-100 p-4 space-y-1">
          <span className="text-[11px] font-semibold uppercase text-rose-400">Dead-Letter</span>
          <p className="text-2xl font-bold text-rose-400">{deadLetterCount}</p>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="rounded-xl border border-border bg-surface-100 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-200/50 text-slate-400">
              <th className="py-2.5 px-4 font-semibold">Job ID</th>
              <th className="py-2.5 px-4 font-semibold">Type</th>
              <th className="py-2.5 px-4 font-semibold">Priority</th>
              <th className="py-2.5 px-4 font-semibold">Status</th>
              <th className="py-2.5 px-4 font-semibold">Attempts</th>
              <th className="py-2.5 px-4 font-semibold">Created / Scheduled</th>
              <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  No background jobs registered in queue ledger.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="hover:bg-surface-200/30 transition-colors">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-300">{job.id.slice(0, 16)}...</td>
                  <td className="py-3 px-4 font-medium text-white">{job.type}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        job.priority === 'critical'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : job.priority === 'high'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-slate-500/10 text-slate-400'
                      }`}
                    >
                      {job.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        job.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : job.status === 'RUNNING'
                          ? 'bg-blue-500/10 text-blue-400 animate-pulse'
                          : job.status === 'RETRYING'
                          ? 'bg-amber-500/10 text-amber-400'
                          : job.status === 'FAILED'
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-slate-500/10 text-slate-300'
                      }`}
                    >
                      {job.isDeadLetter && <Flame className="w-3 h-3 text-rose-400" />}
                      {job.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-mono">
                    {job.attempts} / {job.maxRetries}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px]">
                    {new Date(job.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {job.isDeadLetter && (
                        <button
                          onClick={() => handleRetryJob(job.id)}
                          className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-medium flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" /> Retry
                        </button>
                      )}
                      {(job.status === 'QUEUED' || job.status === 'RETRYING') && (
                        <button
                          onClick={() => handleCancelJob(job.id)}
                          className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
