'use client';

import React, { useState, useEffect } from 'react';
import {
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Plus,
  Trash2,
  ShieldCheck,
  Mail,
  Send,
  Webhook,
  Database,
  ExternalLink,
  Lock,
  Key,
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  category: string;
  provider: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  maskedCredentials: Record<string, string>;
  lastConnectedAt?: string;
  lastTestedAt?: string;
  lastSuccessfulOperationAt?: string;
  lastError?: string;
}

const AVAILABLE_CATALOG = [
  {
    provider: 'resend',
    name: 'Resend Email API',
    category: 'email',
    description: 'High-deliverability transactional email service for automated outreach and alerts.',
    authFields: [{ key: 'apiKey', label: 'Resend API Key', placeholder: 're_123456789...' }],
    setupGuide: 'Obtain your API key from resend.com/api-keys. Requires verified sending domain.',
  },
  {
    provider: 'sendgrid',
    name: 'Twilio SendGrid',
    category: 'email',
    description: 'Enterprise email delivery engine with dedicated IP pools and webhook tracking.',
    authFields: [{ key: 'apiKey', label: 'SendGrid API Key', placeholder: 'SG.123456789...' }],
    setupGuide: 'Create an API key with Mail Send permissions at app.sendgrid.com/settings/api_keys.',
  },
  {
    provider: 'smtp',
    name: 'Custom SMTP Server',
    category: 'email',
    description: 'Connect your corporate Microsoft 365, Google Workspace, or custom SMTP relay.',
    authFields: [
      { key: 'host', label: 'SMTP Host', placeholder: 'smtp.office365.com' },
      { key: 'username', label: 'Username / Email', placeholder: 'sales@yourdomain.com' },
      { key: 'password', label: 'Password / App Key', placeholder: '••••••••••••' },
    ],
    setupGuide: 'Ensure port 587 (STARTTLS) or port 465 (TLS) is accessible and 2FA app password is used.',
  },
  {
    provider: 'mock_sandbox',
    name: 'Watech Test Sandbox',
    category: 'email',
    description: 'Zero-configuration offline test sandbox. Validates flows without sending real emails.',
    authFields: [],
    setupGuide: 'Instantly active. Messages are recorded to the local delivery ledger without SMTP.',
  },
  {
    provider: 'custom_webhook',
    name: 'Custom Outbound Webhook',
    category: 'webhook',
    description: 'Forward lead qualification events and pipeline updates to external endpoints or n8n.',
    authFields: [{ key: 'url', label: 'Destination URL', placeholder: 'https://api.yourdomain.com/webhook' }],
    setupGuide: 'Signatures are validated with HMAC-SHA256 headers. RFC1918 addresses are blocked.',
  },
];

export function IntegrationsView() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [showConnectModal, setShowConnectModal] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/integrations');
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await fetch(`/api/integrations/${id}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResult({
        id,
        success: data.success,
        message: data.message || (data.success ? 'Connection verified successfully.' : data.error || 'Connection failed.'),
      });
      fetchIntegrations();
    } catch (err: any) {
      setTestResult({ id, success: false, message: err.message || 'Network test failed' });
    } finally {
      setTestingId(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm('Are you sure you want to disconnect this integration? Credentials will be purged.')) return;
    try {
      await fetch(`/api/integrations/${id}`, { method: 'DELETE' });
      fetchIntegrations();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showConnectModal) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: showConnectModal.name,
          category: showConnectModal.category,
          provider: showConnectModal.provider,
          credentials: formData,
        }),
      });
      if (res.ok) {
        setShowConnectModal(null);
        setFormData({});
        fetchIntegrations();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Zap className="w-6 h-6 text-blue-500" />
            Integrations & Service Connections
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Connect verified email transceivers, webhook destinations, and external CRM connectors. Credentials are encrypted at rest with AES-256-GCM.
          </p>
        </div>
        <button
          onClick={fetchIntegrations}
          className="px-3.5 py-1.5 rounded-lg border border-border bg-surface-100 hover:bg-surface-200 text-slate-300 text-xs font-medium flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      {/* Connected Integrations Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Active Connections ({integrations.length})
        </h2>

        {integrations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface-50 p-8 text-center text-slate-400">
            <Lock className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No external integrations connected yet.</p>
            <p className="text-xs text-slate-500 mt-1">Choose a provider from the catalog below to establish your first connection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((integ) => (
              <div
                key={integ.id}
                className="rounded-xl border border-border bg-surface-100 p-5 space-y-4 shadow-sm hover:border-slate-600 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      {integ.category === 'email' ? <Mail className="w-5 h-5" /> : <Webhook className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{integ.name}</h3>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">{integ.provider}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 ${
                      integ.status === 'connected'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : integ.status === 'error'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-slate-500/10 text-slate-400'
                    }`}
                  >
                    {integ.status === 'connected' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    {integ.status}
                  </span>
                </div>

                {/* Masked Credentials Display */}
                <div className="p-2.5 rounded-lg bg-surface-200/50 border border-border/50 text-[11px] font-mono text-slate-300 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[10px]">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3 text-emerald-400" /> AES-256-GCM Encrypted
                    </span>
                    <span>At Rest</span>
                  </div>
                  {Object.entries(integ.maskedCredentials || {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center">
                      <span className="text-slate-400">{k}:</span>
                      <span className="text-slate-200 font-semibold">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Status & Timestamps */}
                <div className="text-[11px] text-slate-400 space-y-1">
                  {integ.lastSuccessfulOperationAt && (
                    <div className="flex justify-between">
                      <span>Last Success:</span>
                      <span className="text-slate-300">{new Date(integ.lastSuccessfulOperationAt).toLocaleTimeString()}</span>
                    </div>
                  )}
                  {integ.lastError && (
                    <div className="text-rose-400 text-[10px] bg-rose-500/5 p-2 rounded border border-rose-500/20">
                      Error: {integ.lastError}
                    </div>
                  )}
                </div>

                {/* Inline Test Result Alert */}
                {testResult && testResult.id === integ.id && (
                  <div
                    className={`p-2.5 rounded text-xs flex items-center gap-2 ${
                      testResult.success
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                    }`}
                  >
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
                    <span>{testResult.message}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <button
                    onClick={() => handleTestConnection(integ.id)}
                    disabled={testingId === integ.id}
                    className="px-3 py-1 rounded bg-surface-200 hover:bg-surface-300 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-all"
                  >
                    <RefreshCw className={`w-3 h-3 ${testingId === integ.id ? 'animate-spin text-blue-400' : ''}`} />
                    Test Connection
                  </button>

                  <button
                    onClick={() => handleDisconnect(integ.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all"
                    title="Disconnect integration"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Catalog Section */}
      <div className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Key className="w-4 h-4 text-blue-400" />
          Available Integration Catalog
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AVAILABLE_CATALOG.map((item) => {
            const isAlreadyConnected = integrations.some((i) => i.provider === item.provider && i.status === 'connected');
            return (
              <div
                key={item.provider}
                className="rounded-xl border border-border bg-surface-100 p-5 flex flex-col justify-between space-y-4 hover:border-slate-600 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">{item.name}</h3>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-surface-200 text-slate-400">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                  <p className="text-[11px] text-slate-500 bg-surface-200/40 p-2 rounded border border-border/40">
                    <strong className="text-slate-400">Setup:</strong> {item.setupGuide}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowConnectModal(item);
                    setFormData({});
                  }}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    isAlreadyConnected
                      ? 'bg-surface-200 text-slate-400 hover:bg-surface-300'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isAlreadyConnected ? 'Reconfigure Credentials' : 'Connect Provider'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-100 border border-border rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-500" />
                Configure {showConnectModal.name}
              </h3>
              <button
                onClick={() => setShowConnectModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Credentials entered here will be encrypted using AES-256-GCM before persistent storage.
            </p>

            <form onSubmit={handleSaveConnection} className="space-y-4">
              {showConnectModal.authFields.length === 0 ? (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                  No secret keys required for this environment. Click Save to activate immediately.
                </div>
              ) : (
                showConnectModal.authFields.map((field: any) => (
                  <div key={field.key} className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">{field.label}</label>
                    <input
                      type={field.key.toLowerCase().includes('pass') || field.key.toLowerCase().includes('key') ? 'password' : 'text'}
                      placeholder={field.placeholder}
                      value={formData[field.key] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-border text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ))
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(null)}
                  className="px-3 py-1.5 rounded-lg border border-border text-slate-400 hover:bg-surface-200 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20"
                >
                  {isSubmitting ? 'Saving Encrypted...' : 'Save & Encrypt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
