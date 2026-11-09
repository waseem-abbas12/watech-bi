'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Database,
  Download,
  Upload,
  RefreshCw,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { repository } from '@/lib/db/repository';

interface ProviderStatus {
  name: string;
  category: string;
  isAvailable: boolean;
  requiresKey: boolean;
  statusText: string;
  degradedFallback: string;
}

const PROVIDERS: ProviderStatus[] = [
  {
    name: 'Direct HTTP Website Inspector',
    category: 'Website Audit',
    isAvailable: true,
    requiresKey: false,
    statusText: 'Active (Built-in Server Inspection Engine)',
    degradedFallback: 'Manual auditor inspection form',
  },
  {
    name: 'Google Gmail Drafts API',
    category: 'Outreach & CRM',
    isAvailable: false,
    requiresKey: true,
    statusText: 'OAuth 2.0 Credentials Required',
    degradedFallback: 'One-click clipboard copy with RFC 2822 formatting and mailto: links',
  },
  {
    name: 'Google PageSpeed Insights',
    category: 'Performance',
    isAvailable: false,
    requiresKey: true,
    statusText: 'Free Tier / Unconfigured',
    degradedFallback: 'Internal server TTFB and payload size measurements',
  },
  {
    name: 'Google Places / Business Profile',
    category: 'Discovery & Reviews',
    isAvailable: false,
    requiresKey: true,
    statusText: 'Optional Key Required',
    degradedFallback: 'Manual business entry and CSV bulk import',
  },
  {
    name: 'OpenAI / Anthropic Analysis',
    category: 'Intelligence Enrichment',
    isAvailable: false,
    requiresKey: true,
    statusText: 'Optional Key Required',
    degradedFallback: 'Deterministic rule-based opportunity & brief engine',
  },
];

export function SettingsView() {
  const { activeProject, resetToDemoData, refreshProjects } = useProject();
  const [stats, setStats] = useState<{
    projects: number;
    businesses: number;
    audits: number;
    opportunities: number;
    scores: number;
  }>({
    projects: 0,
    businesses: 0,
    audits: 0,
    opportunities: 0,
    scores: 0,
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStats = async () => {
    const [p, b, a, o, s] = await Promise.all([
      repository.getProjects(),
      repository.getBusinesses(),
      repository.getAudits(),
      repository.getOpportunities(),
      repository.getScores(),
    ]);
    setStats({
      projects: p.length,
      businesses: b.length,
      audits: a.length,
      opportunities: o.length,
      scores: s.length,
    });
  };

  const [gmailInfo, setGmailInfo] = useState<{
    configured: boolean;
    isConnected: boolean;
    userEmail: string | null;
    message?: string;
  }>({
    configured: false,
    isConnected: false,
    userEmail: null,
  });
  const [isCheckingGmail, setIsCheckingGmail] = useState(false);

  const checkGmail = async () => {
    setIsCheckingGmail(true);
    try {
      const res = await fetch('/api/gmail/status');
      const data = await res.json();
      setGmailInfo({
        configured: data.configured,
        isConnected: data.isConnected,
        userEmail: data.userEmail || null,
        message: data.message,
      });
    } catch {
      setGmailInfo({
        configured: false,
        isConnected: false,
        userEmail: null,
        message: 'Could not communicate with Gmail status route.',
      });
    } finally {
      setIsCheckingGmail(false);
    }
  };

  useEffect(() => {
    loadStats();
    checkGmail();
  }, [activeProject]);

  const handleExportBackup = async () => {
    const jsonStr = await repository.exportDatabase();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `WATECH-BI-OS-Backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setNotice('Full IndexedDB database backup exported successfully.');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        await repository.importDatabase(content);
        await refreshProjects();
        await loadStats();
        setNotice('Database successfully restored from backup.');
      } catch (err: any) {
        setNotice(`Restore error: ${err.message || 'Invalid backup file'}`);
      }
    };
    reader.readAsText(file);
  };

  const handleResetSeed = async () => {
    if (confirm('Reset database to clean DEMO state? This will restore the Dallas-Fort Worth sample research project.')) {
      setIsResetting(true);
      await resetToDemoData();
      await loadStats();
      setIsResetting(false);
      setNotice('Database reset to fresh DEMO project.');
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            Settings, Integrations & Local Data Store
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Local IndexedDB management, JSON backup/restore, and graceful provider degradation.
          </p>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-blue-400 hover:text-white text-[11px]">Dismiss</button>
        </div>
      )}

      {/* Database Local Storage Status Card */}
      <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Browser-Local Data Layer (IndexedDB)</h3>
              <p className="text-xs text-slate-400">All research data, audits, and scores persist locally on your machine.</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase">
            OPERATIONAL
          </span>
        </div>

        {/* Database Counts */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-surface-50 border border-border">
            <span className="text-slate-400 text-[11px] block">Projects</span>
            <span className="text-lg font-bold font-mono text-white mt-1 block">{stats.projects}</span>
          </div>
          <div className="p-3 rounded-lg bg-surface-50 border border-border">
            <span className="text-slate-400 text-[11px] block">Businesses</span>
            <span className="text-lg font-bold font-mono text-white mt-1 block">{stats.businesses}</span>
          </div>
          <div className="p-3 rounded-lg bg-surface-50 border border-border">
            <span className="text-slate-400 text-[11px] block">Audits</span>
            <span className="text-lg font-bold font-mono text-white mt-1 block">{stats.audits}</span>
          </div>
          <div className="p-3 rounded-lg bg-surface-50 border border-border">
            <span className="text-slate-400 text-[11px] block">Opportunities</span>
            <span className="text-lg font-bold font-mono text-white mt-1 block">{stats.opportunities}</span>
          </div>
          <div className="p-3 rounded-lg bg-surface-50 border border-border">
            <span className="text-slate-400 text-[11px] block">Scored Leads</span>
            <span className="text-lg font-bold font-mono text-white mt-1 block">{stats.scores}</span>
          </div>
        </div>

        {/* Data Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleExportBackup}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-50 hover:bg-surface-200 text-xs font-medium text-slate-200 border border-border transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export Database JSON Backup</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportBackup}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-50 hover:bg-surface-200 text-xs font-medium text-slate-200 border border-border transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Restore Backup from JSON</span>
          </button>

          <button
            onClick={handleResetSeed}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-xs font-medium text-amber-300 border border-amber-500/30 transition-colors ml-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset to Fresh DEMO Data</span>
          </button>
        </div>
      </div>

      {/* Google OAuth & Gmail Drafts Integration Card */}
      <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg border ${
              gmailInfo.isConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : gmailInfo.configured
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-surface-50 text-slate-400 border-border'
            }`}>
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Google OAuth 2.0 & Gmail Drafts API</h3>
              <p className="text-xs text-slate-400">
                Direct integration with Google Workspace / Gmail to compose verified outreach drafts without automated sending.
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
            gmailInfo.isConnected
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : gmailInfo.configured
              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              : 'bg-surface-50 text-slate-400 border-border'
          }`}>
            {gmailInfo.isConnected ? 'AUTHENTICATED' : gmailInfo.configured ? 'READY TO CONNECT' : 'UNCONFIGURED'}
          </span>
        </div>

        <div className="p-3.5 rounded-lg bg-surface-50 border border-border text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">OAuth Scope:</span>
            <span className="font-mono text-blue-400 text-[11px]">https://www.googleapis.com/auth/gmail.compose</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">Connection Status:</span>
            <span className="text-slate-300">
              {gmailInfo.isConnected ? (
                <span className="text-emerald-400 font-mono font-medium">
                  Connected as {gmailInfo.userEmail} (Draft Mode Enforced)
                </span>
              ) : (
                <span className="text-slate-400">{gmailInfo.message || 'Awaiting Google OAuth authentication'}</span>
              )}
            </span>
          </div>

          {!gmailInfo.configured && (
            <div className="mt-2 p-2.5 rounded bg-surface-100 border border-border text-[11px] text-slate-400 space-y-1 font-mono">
              <span className="text-amber-400 font-sans font-semibold block">To enable live Gmail OAuth integration:</span>
              <div>1. Create an OAuth 2.0 Web Application client in Google Cloud Console.</div>
              <div>2. Set Authorized Redirect URI to: <code className="text-cyan-300">http://localhost:3000/api/gmail/callback</code></div>
              <div>3. Add to your <code className="text-slate-200">.env.local</code>:</div>
              <div className="text-slate-300 pl-2">
                GOOGLE_CLIENT_ID=&quot;your_google_client_id.apps.googleusercontent.com&quot;<br />
                GOOGLE_CLIENT_SECRET=&quot;your_google_client_secret&quot;
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1">
          {gmailInfo.isConnected ? (
            <button
              onClick={async () => {
                if (confirm('Disconnect Gmail account?')) {
                  await fetch('/api/gmail/disconnect', { method: 'POST' });
                  checkGmail();
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition-colors"
            >
              Disconnect Gmail Account
            </button>
          ) : gmailInfo.configured ? (
            <a
              href="/api/gmail/auth"
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
            >
              Authenticate with Google
            </a>
          ) : (
            <span className="text-[11px] text-slate-500 italic">
              Add credentials to .env.local to activate the OAuth button.
            </span>
          )}

          <button
            onClick={checkGmail}
            disabled={isCheckingGmail}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-50 hover:bg-surface-200 text-slate-300 border border-border text-xs ml-auto transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingGmail ? 'animate-spin' : ''}`} />
            <span>Test Connection</span>
          </button>
        </div>
      </div>

      {/* Integration Providers & Graceful Degradation */}
      <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Provider Adapters & Free-Tier Readiness</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            The platform functions 100% free-tier without external paid APIs. When integrations are absent, deterministic fallback engines execute seamlessly.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-50 text-slate-400 border-b border-border">
              <tr>
                <th className="py-2.5 px-3 font-medium">Provider Service</th>
                <th className="py-2.5 px-3 font-medium">Category</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 font-medium">Fallback Degradation Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PROVIDERS.map((p, idx) => (
                <tr key={idx} className="hover:bg-surface-50/50">
                  <td className="py-3 px-3 font-medium text-slate-200 flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-slate-400" />
                    <span>{p.name}</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[10px] text-slate-400">{p.category}</td>
                  <td className="py-3 px-3">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      p.isAvailable
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-500/15 text-slate-400 border-border'
                    }`}>
                      {p.statusText}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-300 text-[11px]">{p.degradedFallback}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
