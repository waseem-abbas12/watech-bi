'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  GitFork,
  Zap,
  Play,
  Pause,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Settings,
  Layers,
  Search,
  ExternalLink,
  ChevronRight,
  Eye,
  Trash2,
  Copy,
  Sliders,
  Send,
  FileText,
  Mail,
  UserCheck,
  Check,
  AlertCircle,
  HelpCircle,
  Activity,
  Cpu,
  Globe,
  Database,
  Lock,
} from 'lucide-react';
import { repository } from '@/lib/db/repository';
import {
  AutomationWorkflow,
  AutomationExecution,
  AutomationApproval,
  IntegrationConnection,
  WebhookEndpoint,
  WebhookDelivery,
  AutomationEventType,
  WorkflowNodeType,
  WorkflowActionType,
  WorkflowTriggerType,
  WorkflowNode,
  WorkflowCondition,
} from '@/types';
import { AUTOMATION_TEMPLATES, WorkflowTemplateDefinition } from '@/lib/engines/automationTemplates';
import {
  emitAutomationEvent,
  executeWorkflow,
  decideApproval,
  calculateAutomationMetrics,
} from '@/lib/engines/automationEngine';

type AutomationTab =
  | 'dashboard'
  | 'builder'
  | 'templates'
  | 'catalog'
  | 'integrations'
  | 'executions'
  | 'failed'
  | 'approvals'
  | 'webhooks'
  | 'settings';

export function AutomationHubView() {
  const [activeTab, setActiveTab] = useState<AutomationTab>('dashboard');
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([]);
  const [executions, setExecutions] = useState<AutomationExecution[]>([]);
  const [approvals, setApprovals] = useState<AutomationApproval[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationConnection[]>([]);
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected items for modal or drawer
  const [selectedExecution, setSelectedExecution] = useState<AutomationExecution | null>(null);
  const [approvalModalItem, setApprovalModalItem] = useState<AutomationApproval | null>(null);
  const [approvalDecisionNotes, setApprovalDecisionNotes] = useState('');
  const [testEventModalOpen, setTestEventModalOpen] = useState(false);
  const [testEventType, setTestEventType] = useState<AutomationEventType>('lead.score_updated');
  const [testRecordId, setTestRecordId] = useState('biz-apex-mechanical');
  const [testScoreVal, setTestScoreVal] = useState('88');
  const [isEmittingEvent, setIsEmittingEvent] = useState(false);
  const [eventNotice, setEventNotice] = useState<string | null>(null);

  // Workflow Builder State
  const [editingWorkflow, setEditingWorkflow] = useState<AutomationWorkflow | null>(null);
  const [builderName, setBuilderName] = useState('');
  const [builderDesc, setBuilderDesc] = useState('');
  const [builderCategory, setBuilderCategory] = useState<AutomationWorkflow['category']>('lead_generation');
  const [builderTriggerType, setBuilderTriggerType] = useState<WorkflowTriggerType>('record_event');
  const [builderEventType, setBuilderEventType] = useState<AutomationEventType>('lead.created');
  const [builderNodes, setBuilderNodes] = useState<WorkflowNode[]>([]);
  const [builderTestResult, setBuilderTestResult] = useState<AutomationExecution | null>(null);
  const [isTestingWorkflow, setIsTestingWorkflow] = useState(false);

  // Integration test state
  const [n8nUrlInput, setN8nUrlInput] = useState('https://n8n.watech.example');
  const [n8nApiKeyInput, setN8nApiKeyInput] = useState('');
  const [testingN8n, setTestingN8n] = useState(false);
  const [n8nTestResult, setN8nTestResult] = useState<any>(null);

  // Webhook Hub State
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookSecret, setNewWebhookSecret] = useState(`sec_${Math.random().toString(36).substr(2, 10)}`);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);

  // Template Filter
  const [templateFilter, setTemplateFilter] = useState<string>('all');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [wf, ex, ap, intg, ep, del] = await Promise.all([
        repository.getAutomationWorkflows(),
        repository.getAutomationExecutions(),
        repository.getAutomationApprovals(),
        repository.getIntegrationConnections(),
        repository.getWebhookEndpoints(),
        repository.getWebhookDeliveries(),
      ]);

      setWorkflows(wf);
      setExecutions(ex);
      setApprovals(ap);
      setIntegrations(intg);
      setEndpoints(ep);
      setDeliveries(del);
    } catch (err) {
      console.error('Error loading automation data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const metrics = useMemo(() => {
    return calculateAutomationMetrics(workflows, executions, approvals);
  }, [workflows, executions, approvals]);

  const failedExecutions = useMemo(() => {
    return executions.filter(e => e.status === 'failed');
  }, [executions]);

  const pendingApprovals = useMemo(() => {
    return approvals.filter(a => a.status === 'pending');
  }, [approvals]);

  // Handlers
  const handleToggleWorkflow = async (workflow: AutomationWorkflow) => {
    const updated = { ...workflow, isActive: !workflow.isActive, updatedAt: new Date().toISOString() };
    await repository.saveAutomationWorkflow(updated);
    setWorkflows(prev => prev.map(w => (w.id === updated.id ? updated : w)));
  };

  const handleEmitTestEvent = async () => {
    setIsEmittingEvent(true);
    setEventNotice(null);
    try {
      const payload: Record<string, any> = {
        companyName: 'Apex Mechanical Solutions Inc',
        domain: 'apexmechanicaltx.com',
        industry: 'Commercial HVAC & Mechanical',
        totalScore: parseInt(testScoreVal, 10) || 85,
        email: 'marcus@apexmechanical.com',
        testSimulation: true,
      };

      const result = await emitAutomationEvent(testEventType, 'AutomationHub_Simulation', testRecordId, payload);
      setEventNotice(
        `Dispatched event "${result.event.type}" (ID: ${result.event.id}). Triggered ${result.triggeredExecutions.length} active workflow(s).`
      );
      await loadData();
    } catch (err: any) {
      setEventNotice(`Dispatch error: ${err.message}`);
    } finally {
      setIsEmittingEvent(false);
    }
  };

  const handleApprovalDecision = async (decision: 'approved' | 'rejected') => {
    if (!approvalModalItem) return;
    try {
      await decideApproval(approvalModalItem.id, decision, 'Agency Supervisor (Auditor)', approvalDecisionNotes);
      setApprovalModalItem(null);
      setApprovalDecisionNotes('');
      await loadData();
    } catch (err) {
      console.error('Failed to decide approval:', err);
    }
  };

  const handleTestN8n = async () => {
    setTestingN8n(true);
    setN8nTestResult(null);
    try {
      const res = await fetch('/api/n8n/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: n8nUrlInput,
          authType: n8nApiKeyInput ? 'apiKey' : 'none',
          apiKey: n8nApiKeyInput,
        }),
      });
      const data = await res.json();
      setN8nTestResult(data);
    } catch (err: any) {
      setN8nTestResult({ success: false, error: err.message });
    } finally {
      setTestingN8n(false);
    }
  };

  const handleTestWebhookEndpoint = async (endpoint: WebhookEndpoint) => {
    setTestingWebhookId(endpoint.id);
    try {
      const res = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: endpoint.url,
          secret: endpoint.secret,
          eventType: 'manual.triggered',
          payload: { testPing: true, source: 'Watech Automation Hub' },
        }),
      });
      const data = await res.json();

      const delivery: WebhookDelivery = {
        id: `del_${Date.now()}`,
        endpointId: endpoint.id,
        endpointName: endpoint.name,
        eventId: `evt_manual_test_${Date.now()}`,
        eventType: 'manual.triggered',
        url: endpoint.url,
        httpStatus: data.httpStatus || 200,
        requestHeaders: { 'X-Watech-Signature': data.signature || 'sha256=***' },
        requestPayload: { testPing: true },
        responseBody: data.responseSnippet || (data.success ? '{"ok":true}' : 'Delivery Error'),
        durationMs: data.durationMs || 120,
        status: data.success ? 'success' : 'failed',
        attemptNumber: 1,
        maxAttempts: endpoint.maxRetries || 3,
        error: data.error,
        timestamp: new Date().toISOString(),
      };

      await repository.saveWebhookDelivery(delivery);
      await loadData();
    } catch (err) {
      console.error('Webhook test error:', err);
    } finally {
      setTestingWebhookId(null);
    }
  };

  const handleCreateWebhookEndpoint = async () => {
    if (!newWebhookName.trim() || !newWebhookUrl.trim()) return;
    const ep: WebhookEndpoint = {
      id: `ep_${Date.now()}`,
      name: newWebhookName.trim(),
      url: newWebhookUrl.trim(),
      secret: newWebhookSecret.trim() || `sec_${Math.random().toString(36).substr(2, 12)}`,
      subscribedEvents: ['*'],
      isActive: true,
      timeoutMs: 5000,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await repository.saveWebhookEndpoint(ep);
    setNewWebhookName('');
    setNewWebhookUrl('');
    setWebhookModalOpen(false);
    await loadData();
  };

  const handleStartCloneTemplate = (tpl: WorkflowTemplateDefinition) => {
    setEditingWorkflow(null);
    setBuilderName(tpl.name);
    setBuilderDesc(tpl.description);
    setBuilderCategory(tpl.category);
    setBuilderTriggerType(tpl.trigger.type);
    setBuilderEventType(tpl.trigger.eventType || 'lead.created');
    setBuilderNodes(JSON.parse(JSON.stringify(tpl.nodes)));
    setBuilderTestResult(null);
    setActiveTab('builder');
  };

  const handleSaveWorkflowFromBuilder = async () => {
    if (!builderName.trim()) return;
    const newWf: AutomationWorkflow = {
      id: editingWorkflow?.id || `wf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: builderName.trim(),
      description: builderDesc.trim(),
      category: builderCategory,
      trigger: {
        type: builderTriggerType,
        eventType: builderTriggerType === 'record_event' ? builderEventType : undefined,
      },
      nodes: builderNodes,
      isActive: editingWorkflow ? editingWorkflow.isActive : true,
      version: (editingWorkflow?.version || 0) + 1,
      executionCount: editingWorkflow?.executionCount || 0,
      successCount: editingWorkflow?.successCount || 0,
      failureCount: editingWorkflow?.failureCount || 0,
      averageDurationMs: editingWorkflow?.averageDurationMs,
      lastExecutedAt: editingWorkflow?.lastExecutedAt,
      createdAt: editingWorkflow?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await repository.saveAutomationWorkflow(newWf);
    await loadData();
    setActiveTab('dashboard');
  };

  const handleTestRunInBuilder = async () => {
    setIsTestingWorkflow(true);
    setBuilderTestResult(null);
    try {
      const mockWf: AutomationWorkflow = {
        id: 'wf_temp_test',
        name: builderName || 'Test Workflow',
        description: builderDesc,
        category: builderCategory,
        trigger: { type: builderTriggerType, eventType: builderEventType },
        nodes: builderNodes,
        isActive: true,
        version: 1,
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const sampleData = {
        companyName: 'Apex Mechanical Solutions Inc',
        domain: 'apexmechanicaltx.com',
        totalScore: 88,
        email: 'marcus@apexmechanical.com',
        status: 'qualified',
      };

      const result = await executeWorkflow(mockWf, undefined, true, sampleData);
      setBuilderTestResult(result);
    } catch (err: any) {
      console.error('Test run failed:', err);
    } finally {
      setIsTestingWorkflow(false);
    }
  };

  const filteredTemplates = useMemo(() => {
    if (templateFilter === 'all') return AUTOMATION_TEMPLATES;
    return AUTOMATION_TEMPLATES.filter(t => t.category === templateFilter);
  }, [templateFilter]);

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">Workflow Automation & Integration Hub</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/25 uppercase font-medium">
                  Prompt 23
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 uppercase">
                  Dexie V14 Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized operational orchestrator connecting discovery, lead scoring, CRM, proposals, delivery, and finance.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setTestEventModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-surface-50 border border-border text-xs text-slate-300 hover:text-white hover:bg-surface-100 flex items-center gap-1.5 transition-all"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" /> Dispatch Test Event
          </button>
          <button
            onClick={() => {
              setEditingWorkflow(null);
              setBuilderName('Custom Lead Workflow');
              setBuilderDesc('Custom automation workflow');
              setBuilderNodes([
                {
                  id: 'n-trig',
                  type: 'trigger',
                  title: 'Lead Qualified',
                  config: { eventType: 'lead.qualified' },
                  nextNodeIds: ['n-act'],
                },
                {
                  id: 'n-act',
                  type: 'action',
                  title: 'Assign Owner & Send Alert',
                  config: { type: 'assign_lead_owner', parameters: { priority: 'high' } },
                },
              ]);
              setActiveTab('builder');
            }}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> New Workflow
          </button>
        </div>
      </div>

      {/* Truth in Architecture Alert Banner */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3 text-xs text-slate-300">
        <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-blue-300">Architecture & Execution Boundary Truth</p>
          <p className="text-slate-400 leading-relaxed">
            Watech-BI operates on a client-side IndexedDB engine (Dexie v14). In-app event dispatches, condition trees, approval gates, and test runs execute instantaneously in the browser. Outbound webhooks and n8n connections are securely dispatched via Next.js server-side test routes with HMAC-SHA256 signatures. Continuous 24/7 background time-triggers without an open browser tab require an external scheduler (e.g., n8n cron node, Vercel Cron, or a Node worker).
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border pb-1">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: Activity },
          { id: 'builder', label: 'Workflow Builder', icon: GitFork },
          { id: 'templates', label: 'Templates (12)', icon: Layers },
          { id: 'catalog', label: 'Triggers & Actions', icon: Sliders },
          { id: 'integrations', label: 'Integrations', icon: Cpu },
          { id: 'executions', label: `Executions (${executions.length})`, icon: Clock },
          { id: 'failed', label: `Dead-Letter (${failedExecutions.length})`, icon: AlertTriangle, badgeColor: failedExecutions.length > 0 ? 'text-rose-400 bg-rose-500/10' : undefined },
          { id: 'approvals', label: `Approval Queue (${pendingApprovals.length})`, icon: UserCheck, badgeColor: pendingApprovals.length > 0 ? 'text-amber-400 bg-amber-500/10' : undefined },
          { id: 'webhooks', label: `Webhooks (${endpoints.length})`, icon: Globe },
          { id: 'settings', label: 'Engine Settings', icon: Settings },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AutomationTab)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-50'
              } ${tab.badgeColor || ''}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================================================================== */}
      {/* 1. DASHBOARD TAB */}
      {/* ==================================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Key Metric KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border bg-surface-50 p-4">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Total Workflows</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-white font-mono">{metrics.totalWorkflows}</span>
                <span className="text-xs text-emerald-400 font-mono">({metrics.activeWorkflows} active)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{metrics.pausedWorkflows} paused / draft</p>
            </div>

            <div className="rounded-xl border border-border bg-surface-50 p-4">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Total Executions</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-white font-mono">{metrics.totalExecutions}</span>
                <span className="text-xs text-emerald-400 font-mono">({metrics.successRatePercent}% pass)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{metrics.successfulExecutions} succeeded, {metrics.failedExecutions} failed</p>
            </div>

            <div className="rounded-xl border border-border bg-surface-50 p-4">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Human Approval Queue</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-2xl font-bold font-mono ${metrics.pendingApprovals > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
                  {metrics.pendingApprovals}
                </span>
                <span className="text-xs text-slate-400">pending</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Sensitive actions paused safely</p>
            </div>

            <div className="rounded-xl border border-border bg-surface-50 p-4">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Estimated Time Saved</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-blue-400 font-mono">{metrics.estimatedHoursSaved} hrs</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">~18 mins per automated run</p>
            </div>
          </div>

          {/* Active Workflows Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Configured Operational Workflows</h2>
              <span className="text-xs text-slate-400 font-mono">{workflows.length} registered</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workflows.map(wf => (
                <div
                  key={wf.id}
                  className={`rounded-xl border p-4 transition-all ${
                    wf.isActive
                      ? 'border-border bg-surface-50 hover:border-slate-700'
                      : 'border-dashed border-border/70 bg-surface-50/50 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{wf.name}</span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-medium ${
                            wf.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                              : 'bg-slate-700/50 text-slate-400'
                          }`}
                        >
                          {wf.isActive ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">{wf.description}</p>
                    </div>

                    <button
                      onClick={() => handleToggleWorkflow(wf)}
                      title={wf.isActive ? 'Pause Workflow' : 'Activate Workflow'}
                      className={`p-1.5 rounded-lg border text-xs transition-all ${
                        wf.isActive
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          : 'border-border bg-surface-100 text-slate-400 hover:text-white'
                      }`}
                    >
                      {wf.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Flow Nodes Summary */}
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span className="font-mono text-slate-300">
                        {wf.trigger.type === 'record_event' ? wf.trigger.eventType : wf.trigger.type}
                      </span>
                      <ArrowRight className="w-2.5 h-2.5 text-slate-600" />
                      <span>{wf.nodes?.length || 0} nodes</span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[10px]">
                      <span>Runs: {wf.executionCount || 0}</span>
                      <span className="text-emerald-400">Pass: {wf.successCount || 0}</span>
                      {wf.failureCount > 0 && <span className="text-rose-400">Fail: {wf.failureCount}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Executions Snapshot */}
          <div className="rounded-xl border border-border bg-surface-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">Recent Automation Runs</h3>
              <button
                onClick={() => setActiveTab('executions')}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
              >
                View Full Execution History <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border text-slate-400 font-mono text-[11px]">
                    <th className="pb-2">Execution ID</th>
                    <th className="pb-2">Workflow</th>
                    <th className="pb-2">Trigger</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Duration</th>
                    <th className="pb-2">Timestamp</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 text-slate-300">
                  {executions.slice(0, 5).map(ex => (
                    <tr key={ex.id} className="hover:bg-surface-100/50">
                      <td className="py-2.5 font-mono text-slate-400 text-[11px]">{ex.id}</td>
                      <td className="py-2.5 font-medium text-white">{ex.workflowName}</td>
                      <td className="py-2.5 font-mono text-[11px] text-slate-400">{ex.triggerType}</td>
                      <td className="py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                            ex.status === 'success'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                              : ex.status === 'failed'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                              : ex.status === 'waiting_for_approval'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/25'
                          }`}
                        >
                          {ex.status === 'success' && <CheckCircle2 className="w-3 h-3" />}
                          {ex.status === 'failed' && <XCircle className="w-3 h-3" />}
                          {ex.status === 'waiting_for_approval' && <Clock className="w-3 h-3" />}
                          {ex.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-slate-400">
                        {ex.totalDurationMs ? `${ex.totalDurationMs}ms` : '—'}
                      </td>
                      <td className="py-2.5 text-[11px] text-slate-400 font-mono">
                        {new Date(ex.startedAt).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => setSelectedExecution(ex)}
                          className="px-2 py-1 rounded bg-surface-100 hover:bg-surface-200 text-slate-300 text-[11px] font-mono"
                        >
                          View Logs
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. WORKFLOW BUILDER TAB */}
      {/* ==================================================================== */}
      {activeTab === 'builder' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface-50 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Visual & Step-Based Workflow Builder</h2>
                <p className="text-xs text-slate-400">Design triggers, conditions, approvals, and actions without code.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestRunInBuilder}
                  disabled={isTestingWorkflow}
                  className="px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 border border-border text-xs text-slate-200 flex items-center gap-1.5 transition-all"
                >
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  {isTestingWorkflow ? 'Testing...' : 'Test Run with Sample Data'}
                </button>
                <button
                  onClick={handleSaveWorkflowFromBuilder}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all"
                >
                  <Check className="w-3.5 h-3.5" /> Save Workflow
                </button>
              </div>
            </div>

            {/* Workflow Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 uppercase">Workflow Name</label>
                <input
                  type="text"
                  value={builderName}
                  onChange={e => setBuilderName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-100 border border-border text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 uppercase">Category</label>
                <select
                  value={builderCategory}
                  onChange={e => setBuilderCategory(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-100 border border-border text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="lead_generation">Lead Generation & Research</option>
                  <option value="sales_pipeline">Sales Pipeline & CRM</option>
                  <option value="client_operations">Client Operations & Projects</option>
                  <option value="finance_billing">Finance & Billing</option>
                  <option value="intelligence_reports">Intelligence & BI Reports</option>
                  <option value="custom">Custom Workflow</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 uppercase">Trigger Event Type</label>
                <select
                  value={builderEventType}
                  onChange={e => setBuilderEventType(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-100 border border-border text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                >
                  <option value="lead.created">lead.created</option>
                  <option value="lead.qualified">lead.qualified</option>
                  <option value="lead.score_updated">lead.score_updated</option>
                  <option value="email.verified">email.verified</option>
                  <option value="proposal.created">proposal.created</option>
                  <option value="proposal.accepted">proposal.accepted</option>
                  <option value="invoice.created">invoice.created</option>
                  <option value="invoice.overdue">invoice.overdue</option>
                  <option value="project.milestone_completed">project.milestone_completed</option>
                  <option value="deliverable.approved">deliverable.approved</option>
                  <option value="client.request_created">client.request_created</option>
                  <option value="manual.triggered">manual.triggered</option>
                </select>
              </div>
            </div>

            {/* Structured Step Flow Canvas */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                Workflow Nodes Sequence ({builderNodes.length})
              </span>

              <div className="space-y-3">
                {builderNodes.map((node, idx) => (
                  <div
                    key={node.id}
                    className="rounded-xl border border-border bg-surface-100/60 p-4 space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-mono text-[10px] flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-white">{node.title}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase bg-surface-200 text-slate-300">
                          {node.type}
                        </span>
                      </div>

                      <button
                        onClick={() => setBuilderNodes(prev => prev.filter(n => n.id !== node.id))}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Remove Node"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-400">{node.description || 'Configured automation step'}</p>

                    {/* Node Config Summary */}
                    <div className="text-[11px] font-mono text-slate-400 bg-surface-200/50 p-2 rounded-lg">
                      {node.type === 'trigger' && `Fires on event: ${builderEventType}`}
                      {node.type === 'action' && `Action: ${node.config.type || 'create_notification'}`}
                      {node.type === 'approval' && `Required Approver Role: ${node.config.requiredRole || 'sales_lead'}`}
                      {node.type === 'condition' && `Logic: ${node.config.logic || 'AND'} (${node.config.conditions?.length || 0} conditions)`}
                      {node.type === 'delay' && `Simulated Delay: ${node.config.delayHours || 24} hours`}
                    </div>
                  </div>
                ))}

                {/* Add Node Controls */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      const newNode: WorkflowNode = {
                        id: `n_act_${Date.now()}`,
                        type: 'action',
                        title: 'Dispatch Notification',
                        config: { type: 'create_notification', parameters: { title: 'Operational Milestone' } },
                      };
                      setBuilderNodes(prev => [...prev, newNode]);
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-dashed border-border text-xs text-slate-300 hover:text-white hover:border-slate-600 flex items-center gap-1 font-mono"
                  >
                    <Plus className="w-3 h-3 text-blue-400" /> + Add Action
                  </button>
                  <button
                    onClick={() => {
                      const newNode: WorkflowNode = {
                        id: `n_cond_${Date.now()}`,
                        type: 'condition',
                        title: 'Evaluate Qualification Threshold',
                        config: {
                          logic: 'AND',
                          conditions: [{ id: 'c1', field: 'totalScore', operator: 'greater_than_or_equal', value: 75 }],
                        },
                      };
                      setBuilderNodes(prev => [...prev, newNode]);
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-dashed border-border text-xs text-slate-300 hover:text-white hover:border-slate-600 flex items-center gap-1 font-mono"
                  >
                    <Plus className="w-3 h-3 text-amber-400" /> + Add Condition
                  </button>
                  <button
                    onClick={() => {
                      const newNode: WorkflowNode = {
                        id: `n_appr_${Date.now()}`,
                        type: 'approval',
                        title: 'Mandatory Human Sign-off',
                        config: { requiredRole: 'sales_rep', instructions: 'Review proposal details before issue.' },
                      };
                      setBuilderNodes(prev => [...prev, newNode]);
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-dashed border-border text-xs text-slate-300 hover:text-white hover:border-slate-600 flex items-center gap-1 font-mono"
                  >
                    <Plus className="w-3 h-3 text-purple-400" /> + Add Approval Gate
                  </button>
                </div>
              </div>
            </div>

            {/* Test Run Output Panel */}
            {builderTestResult && (
              <div className="mt-4 p-4 rounded-xl border border-border bg-[#050811] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white font-mono">Test Run Execution Result</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium ${
                        builderTestResult.status === 'success'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                          : builderTestResult.status === 'waiting_for_approval'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                      }`}
                    >
                      {builderTestResult.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">Duration: {builderTestResult.totalDurationMs || 0}ms</span>
                </div>

                <div className="space-y-1.5 pt-2">
                  {builderTestResult.steps.map((st, i) => (
                    <div key={i} className="text-xs font-mono text-slate-300 flex items-center justify-between p-2 rounded bg-surface-100">
                      <span>
                        [{st.nodeType.toUpperCase()}] {st.title}
                      </span>
                      <span className={st.status === 'success' ? 'text-emerald-400' : 'text-amber-400'}>{st.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. TEMPLATES TAB */}
      {/* ==================================================================== */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Production Automation Templates</h2>
              <p className="text-xs text-slate-400">12 pre-built blueprints ready to inspect, customize, and activate.</p>
            </div>

            <div className="flex items-center gap-1.5">
              {[
                { id: 'all', label: 'All Templates' },
                { id: 'lead_generation', label: 'Lead Gen' },
                { id: 'sales_pipeline', label: 'Sales' },
                { id: 'client_operations', label: 'Operations' },
                { id: 'finance_billing', label: 'Finance' },
                { id: 'intelligence_reports', label: 'Reports' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setTemplateFilter(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                    templateFilter === cat.id
                      ? 'bg-blue-600 text-white font-medium'
                      : 'bg-surface-50 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((tpl, i) => (
              <div
                key={tpl.templateId}
                className="rounded-xl border border-border bg-surface-50 p-4 space-y-3 flex flex-col justify-between hover:border-slate-700 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/25 uppercase font-medium">
                      {tpl.category.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">#{i + 1}</span>
                  </div>

                  <h3 className="text-xs font-bold text-white tracking-tight">{tpl.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{tpl.description}</p>
                </div>

                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="flex flex-wrap gap-1">
                    {tpl.tags.map(tag => (
                      <span key={tag} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-100 text-slate-400">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => handleStartCloneTemplate(tpl)}
                    className="w-full py-2 rounded-lg bg-surface-100 hover:bg-blue-600 hover:text-white text-xs font-medium text-slate-300 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" /> Use & Configure Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. TRIGGERS & ACTIONS CATALOG TAB */}
      {/* ==================================================================== */}
      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Triggers Column */}
          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Event Triggers Catalog (16)</h2>
              <p className="text-xs text-slate-400">Native lifecycle events emitted across Watech-BI modules.</p>
            </div>

            <div className="space-y-2">
              {[
                { name: 'lead.created', module: 'Discovery Engine', desc: 'Fires when new commercial business domain is indexed' },
                { name: 'lead.qualified', module: 'CRM & Scoring', desc: 'Fires when prospect meets qualification criteria' },
                { name: 'lead.score_updated', module: 'Lead Scoring', desc: 'Fires when 100-pt digital maturity score updates' },
                { name: 'email.verified', module: 'Email Verification', desc: 'Fires when MX/SMTP check confirms verified mailbox' },
                { name: 'proposal.created', module: 'Proposals', desc: 'Fires when formal quotation and proposal are compiled' },
                { name: 'proposal.accepted', module: 'Proposals', desc: 'Fires upon digital contract acceptance & signature' },
                { name: 'invoice.created', module: 'Finance', desc: 'Fires when new agency invoice is officially issued' },
                { name: 'invoice.overdue', module: 'Finance', desc: 'Fires when invoice passes due date with balance' },
                { name: 'payment.confirmed', module: 'Finance', desc: 'Fires when client remittance is verified in ledger' },
                { name: 'project.created', module: 'Delivery PM', desc: 'Fires when new client engagement workspace is set up' },
                { name: 'project.milestone_completed', module: 'Delivery PM', desc: 'Fires when all milestone checklist items pass' },
                { name: 'deliverable.submitted', module: 'Client Portal', desc: 'Fires when deliverable is staged for client review' },
                { name: 'deliverable.approved', module: 'Client Portal', desc: 'Fires when client signs off on deliverable' },
                { name: 'client.request_created', module: 'Client Portal', desc: 'Fires when client files support / revision ticket' },
                { name: 'schedule.triggered', module: 'Scheduler', desc: 'Fires on time-based cadence (cron / interval)' },
                { name: 'manual.triggered', module: 'Manual', desc: 'Fires on demand via UI or API test ping' },
              ].map(trig => (
                <div key={trig.name} className="p-3 rounded-xl border border-border bg-surface-50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-blue-400">{trig.name}</span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">{trig.module}</span>
                  </div>
                  <p className="text-xs text-slate-400">{trig.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions Column */}
          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Reusable Action Types (14)</h2>
              <p className="text-xs text-slate-400">Automated operations executed with idempotency safeguards.</p>
            </div>

            <div className="space-y-2">
              {[
                { name: 'update_crm_record', desc: 'Update lead tags, contact details, or CRM pipeline fields' },
                { name: 'change_lead_status', desc: 'Advance prospect stage (e.g. Discovered -> Qualified -> Contacted)' },
                { name: 'assign_lead_owner', desc: 'Route prospect to account executive or industry specialist' },
                { name: 'add_internal_note', desc: 'Append timestamped record note to activity timeline' },
                { name: 'create_follow_up_task', desc: 'Schedule actionable follow-up task with assigned SLA' },
                { name: 'generate_outreach_draft', desc: 'Synthesize personalized audit-backed email draft' },
                { name: 'generate_proposal_draft', desc: 'Generate draft proposal from recommended services' },
                { name: 'create_project', desc: 'Auto-provision client project with milestones from proposal' },
                { name: 'create_notification', desc: 'Dispatch in-app alert or client portal notification' },
                { name: 'generate_research_report', desc: 'Compile synthesized intelligence summary or brief' },
                { name: 'export_csv', desc: 'Generate downloadable CSV data export snapshot' },
                { name: 'send_email', desc: 'Send email via Gmail OAuth (or safe local draft fallback)' },
                { name: 'trigger_webhook', desc: 'Dispatch signed HMAC-SHA256 payload to external endpoint' },
                { name: 'send_to_n8n', desc: 'Forward structured payload to n8n webhook workflow' },
              ].map(act => (
                <div key={act.name} className="p-3 rounded-xl border border-border bg-surface-50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-emerald-400">{act.name}</span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Idempotent</span>
                  </div>
                  <p className="text-xs text-slate-400">{act.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. INTEGRATIONS DIRECTORY TAB */}
      {/* ==================================================================== */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-white">Integration Directory & Connectivity Health</h2>
            <p className="text-xs text-slate-400">Verify genuine connection states for email, webhooks, automation runners, and APIs.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Gmail */}
            <div className="rounded-xl border border-border bg-surface-50 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white">Google Gmail OAuth 2.0</h3>
                    <p className="text-[11px] text-slate-400">Outreach draft synthesis & delivery</p>
                  </div>
                </div>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25 uppercase font-medium">
                  Drafts Fallback
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Gmail OAuth client credentials are verified server-side. When unconfigured in <code>.env.local</code>, outreach messages are safely compiled as local CRM drafts with 1-click clipboard / mailto: export rather than failing silently.
              </p>

              <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 font-mono">Scope: gmail.compose</span>
                <a
                  href="/api/gmail/auth"
                  className="px-2.5 py-1 rounded bg-surface-100 hover:bg-surface-200 text-slate-200 text-xs font-medium flex items-center gap-1"
                >
                  Configure OAuth <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* 2. n8n */}
            <div className="rounded-xl border border-border bg-surface-50 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 font-bold font-mono text-sm">
                    n8n
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white">n8n Workflow Automation</h3>
                    <p className="text-[11px] text-slate-400">Two-way webhook integration</p>
                  </div>
                </div>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-700/50 text-slate-400 uppercase font-medium">
                  Configurable
                </span>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="https://n8n.your-domain.com"
                  value={n8nUrlInput}
                  onChange={e => setN8nUrlInput(e.target.value)}
                  className="w-full px-2.5 py-1 rounded bg-surface-100 border border-border text-xs text-slate-200 font-mono"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-mono">Test ping via /api/n8n/test</span>
                  <button
                    onClick={handleTestN8n}
                    disabled={testingN8n}
                    className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
                  >
                    {testingN8n ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>

                {n8nTestResult && (
                  <div className="p-2 rounded bg-surface-200 text-[11px] font-mono text-slate-300">
                    {n8nTestResult.message || n8nTestResult.error}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Webhooks */}
            <div className="rounded-xl border border-border bg-surface-50 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white">Watech Webhooks Dispatcher</h3>
                    <p className="text-[11px] text-slate-400">HMAC-SHA256 authenticated</p>
                  </div>
                </div>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 uppercase font-medium">
                  Active
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Outbound payloads are signed with a per-endpoint secret and timestamped with replay attack protection.
              </p>

              <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 font-mono">{endpoints.length} endpoints configured</span>
                <button
                  onClick={() => setActiveTab('webhooks')}
                  className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                >
                  Manage Webhooks &rarr;
                </button>
              </div>
            </div>

            {/* 4. CSV File Engine */}
            <div className="rounded-xl border border-border bg-surface-50 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white">CSV Data Exchange Engine</h3>
                    <p className="text-[11px] text-slate-400">Built-in local import & export</p>
                  </div>
                </div>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 uppercase font-medium">
                  Built-in
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Native RFC-4180 compliant CSV engine for lead lists, financial statements, and executive intelligence dossiers.
              </p>

              <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>UTF-8 / Delimited</span>
                <span className="text-emerald-400">Zero Configuration Needed</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. EXECUTIONS TAB */}
      {/* ==================================================================== */}
      {activeTab === 'executions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Workflow Execution History</h2>
              <p className="text-xs text-slate-400">Immutable ledger of automated runs, step logs, and durations.</p>
            </div>
            <span className="text-xs font-mono text-slate-400">{executions.length} runs recorded</span>
          </div>

          <div className="rounded-xl border border-border bg-surface-50 overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border text-slate-400 font-mono text-[11px] bg-surface-100/40">
                  <th className="p-3">Execution ID</th>
                  <th className="p-3">Workflow</th>
                  <th className="p-3">Trigger Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-slate-300">
                {executions.map(ex => (
                  <tr key={ex.id} className="hover:bg-surface-100/50">
                    <td className="p-3 font-mono text-[11px] text-slate-400">{ex.id}</td>
                    <td className="p-3 font-medium text-white">{ex.workflowName}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-400">{ex.triggerType}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                          ex.status === 'success'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                            : ex.status === 'failed'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                            : ex.status === 'waiting_for_approval'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/25'
                        }`}
                      >
                        {ex.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-400">{ex.totalDurationMs ? `${ex.totalDurationMs}ms` : '—'}</td>
                    <td className="p-3 text-[11px] text-slate-400 font-mono">{new Date(ex.startedAt).toLocaleString()}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedExecution(ex)}
                        className="px-2 py-1 rounded bg-surface-100 hover:bg-surface-200 text-slate-200 text-[11px] font-mono"
                      >
                        Logs &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 7. FAILED RUNS / DEAD-LETTER QUEUE TAB */}
      {/* ==================================================================== */}
      {activeTab === 'failed' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Dead-Letter Queue & Failed Executions</h2>
            <p className="text-xs text-slate-400">Failed steps quarantined safely to prevent cascading errors or infinite loops.</p>
          </div>

          {failedExecutions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface-50 p-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-semibold text-white">No Failed Runs</p>
              <p className="text-xs text-slate-400">All workflow executions completed successfully without exceptions.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {failedExecutions.map(ex => (
                <div key={ex.id} className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{ex.workflowName}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-medium">
                          Failed
                        </span>
                      </div>
                      <p className="text-xs text-rose-300 mt-1 font-mono">{ex.errorSummary || 'Execution failed'}</p>
                    </div>

                    <button
                      onClick={async () => {
                        const wf = workflows.find(w => w.id === ex.workflowId);
                        if (wf) {
                          await executeWorkflow(wf, undefined, false, { retryOf: ex.id });
                          await loadData();
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-medium text-white flex items-center gap-1.5 transition-all shadow"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Manual Retry
                    </button>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between border-t border-rose-500/20 pt-2">
                    <span>Execution ID: {ex.id}</span>
                    <span>Idempotency Key: {ex.idempotencyKey}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 8. APPROVAL QUEUE TAB */}
      {/* ==================================================================== */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Human-in-the-Loop Approval Queue</h2>
            <p className="text-xs text-slate-400">
              Workflows requiring explicit sign-off before sending outreach emails, publishing proposals, or issuing invoices.
            </p>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface-50 p-8 text-center space-y-2">
              <UserCheck className="w-8 h-8 text-blue-400 mx-auto" />
              <p className="text-sm font-semibold text-white">Approval Queue Clear</p>
              <p className="text-xs text-slate-400">No sensitive actions are currently waiting for human intervention.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map(appr => (
                <div key={appr.id} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{appr.actionTitle}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium uppercase">
                          Action: {appr.actionType}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{appr.instructions}</p>
                      <p className="text-[11px] text-slate-400 font-mono">Workflow: {appr.workflowName}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setApprovalModalItem(appr);
                          setApprovalDecisionNotes('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-medium text-white flex items-center gap-1.5 transition-all shadow"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Review & Decide
                      </button>
                    </div>
                  </div>

                  {/* Requested Payload Preview */}
                  <div className="p-3 rounded-lg bg-surface-100 text-xs space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Target Payload Context</span>
                    <div className="text-slate-300 font-mono text-[11px] space-y-0.5">
                      {appr.requestedPayload.recipient && <div>Recipient: {appr.requestedPayload.recipient}</div>}
                      {appr.requestedPayload.companyName && <div>Company: {appr.requestedPayload.companyName}</div>}
                      {appr.requestedPayload.subject && <div>Subject: {appr.requestedPayload.subject}</div>}
                      {appr.requestedPayload.bodySnippet && <div className="text-slate-400 italic">"{appr.requestedPayload.bodySnippet}"</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 9. WEBHOOKS HUB TAB */}
      {/* ==================================================================== */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Outbound & Inbound Webhooks Management</h2>
              <p className="text-xs text-slate-400">Register destinations, rotate HMAC signing secrets, and monitor delivery status.</p>
            </div>

            <button
              onClick={() => setWebhookModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Webhook Endpoint
            </button>
          </div>

          <div className="space-y-3">
            {endpoints.map(ep => (
              <div key={ep.id} className="rounded-xl border border-border bg-surface-50 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{ep.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 uppercase font-medium">
                        Active
                      </span>
                    </div>
                    <p className="text-xs font-mono text-blue-400">{ep.url}</p>
                    <p className="text-xs text-slate-400">{ep.description}</p>
                  </div>

                  <button
                    onClick={() => handleTestWebhookEndpoint(ep)}
                    disabled={testingWebhookId === ep.id}
                    className="px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 border border-border text-xs text-slate-200 flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    {testingWebhookId === ep.id ? 'Testing...' : 'Test Delivery'}
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 border-t border-border pt-2">
                  <div className="flex items-center gap-3">
                    <span>Secret: {ep.secret ? `${ep.secret.slice(0, 8)}...` : 'None'}</span>
                    <span>Timeout: {ep.timeoutMs}ms</span>
                    <span>Retries: {ep.maxRetries}</span>
                  </div>
                  <div>Events: {ep.subscribedEvents.join(', ')}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Webhook Delivery Log */}
          <div className="rounded-xl border border-border bg-surface-50 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">Recent Webhook Deliveries</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border text-slate-400 font-mono text-[11px]">
                    <th className="pb-2">Delivery ID</th>
                    <th className="pb-2">Endpoint</th>
                    <th className="pb-2">Event</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Latency</th>
                    <th className="pb-2">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 text-slate-300 font-mono text-[11px]">
                  {deliveries.slice(0, 10).map(d => (
                    <tr key={d.id}>
                      <td className="py-2 text-slate-400">{d.id}</td>
                      <td className="py-2 text-white">{d.endpointName}</td>
                      <td className="py-2 text-blue-400">{d.eventType}</td>
                      <td className="py-2">
                        <span className={d.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}>
                          {d.httpStatus ? `HTTP ${d.httpStatus}` : d.status}
                        </span>
                      </td>
                      <td className="py-2 text-slate-400">{d.durationMs}ms</td>
                      <td className="py-2 text-slate-400">{new Date(d.timestamp).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 10. SETTINGS TAB */}
      {/* ==================================================================== */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-white">Automation Engine Settings & Safeguards</h2>
            <p className="text-xs text-slate-400">Tune retry policies, execution timeouts, and suppression guards.</p>
          </div>

          <div className="rounded-xl border border-border bg-surface-50 p-5 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-white">Event Deduplication Window</label>
              <p className="text-[11px] text-slate-400">Ignores identical events for the same record within this time window.</p>
              <select className="w-full px-3 py-1.5 rounded-lg bg-surface-100 border border-border text-xs text-white">
                <option value="30">30 Seconds (Default)</option>
                <option value="60">60 Seconds</option>
                <option value="300">5 Minutes</option>
              </select>
            </div>

            <div className="space-y-1 pt-3 border-t border-border">
              <label className="text-xs font-semibold text-white">Transient Failure Retry Policy</label>
              <p className="text-[11px] text-slate-400">Applies exponential backoff on HTTP timeouts and network drops.</p>
              <select className="w-full px-3 py-1.5 rounded-lg bg-surface-100 border border-border text-xs text-white">
                <option value="3">3 Attempts (1s, 2s, 4s backoff)</option>
                <option value="5">5 Attempts (1s, 2s, 4s, 8s, 16s)</option>
                <option value="1">1 Attempt (No automatic retry)</option>
              </select>
            </div>

            <div className="space-y-1 pt-3 border-t border-border">
              <label className="text-xs font-semibold text-white">Mandatory Human-in-the-Loop Safeguards</label>
              <p className="text-[11px] text-slate-400">
                Guarantees outreach emails, proposal publishing, and invoice generation pause for human review.
              </p>
              <div className="flex items-center gap-2 pt-1 text-xs text-emerald-400 font-mono">
                <ShieldCheck className="w-4 h-4" /> Enforced by Engine Core
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: DISPATCH TEST EVENT */}
      {/* ==================================================================== */}
      {testEventModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-[#0b1329] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-400" /> Dispatch Test Event
              </h3>
              <button onClick={() => setTestEventModalOpen(false)} className="text-slate-400 hover:text-white">
                &times;
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 uppercase">Event Type</label>
                <select
                  value={testEventType}
                  onChange={e => setTestEventType(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-100 border border-border text-xs text-white font-mono"
                >
                  <option value="lead.score_updated">lead.score_updated (Triggers High-Score Alert)</option>
                  <option value="proposal.accepted">proposal.accepted (Triggers Project Creation)</option>
                  <option value="email.verified">email.verified (Triggers Outreach Draft)</option>
                  <option value="invoice.overdue">invoice.overdue (Triggers Overdue Notice)</option>
                  <option value="manual.triggered">manual.triggered</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 uppercase">Simulated Record ID</label>
                <input
                  type="text"
                  value={testRecordId}
                  onChange={e => setTestRecordId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-100 border border-border text-xs text-white font-mono"
                />
              </div>

              {testEventType === 'lead.score_updated' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 uppercase">Simulated Score Value (0-100)</label>
                  <input
                    type="number"
                    value={testScoreVal}
                    onChange={e => setTestScoreVal(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-100 border border-border text-xs text-white font-mono"
                  />
                </div>
              )}

              {eventNotice && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 font-mono">
                  {eventNotice}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setTestEventModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 text-xs text-slate-300"
              >
                Close
              </button>
              <button
                onClick={handleEmitTestEvent}
                disabled={isEmittingEvent}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" /> {isEmittingEvent ? 'Dispatching...' : 'Fire Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: APPROVAL DECISION */}
      {/* ==================================================================== */}
      {approvalModalItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-[#0b1329] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-400" /> Human Approval Gate
              </h3>
              <button onClick={() => setApprovalModalItem(null)} className="text-slate-400 hover:text-white">
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Action Title</span>
                <p className="font-semibold text-white mt-0.5">{approvalModalItem.actionTitle}</p>
                <p className="text-slate-400 mt-0.5">{approvalModalItem.instructions}</p>
              </div>

              <div className="p-3 rounded-lg bg-surface-100 space-y-1 font-mono text-[11px] text-slate-300">
                <span className="text-slate-400 uppercase text-[10px] block">Payload Details</span>
                {Object.entries(approvalModalItem.requestedPayload).map(([k, v]) => (
                  <div key={k} className="truncate">
                    <span className="text-blue-400">{k}:</span> {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 uppercase">Decision Notes / Auditor Feedback</label>
                <textarea
                  rows={2}
                  placeholder="Optional review notes or rejection rationale..."
                  value={approvalDecisionNotes}
                  onChange={e => setApprovalDecisionNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-100 border border-border text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => handleApprovalDecision('rejected')}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-medium"
              >
                Reject & Halt Workflow
              </button>
              <button
                onClick={() => handleApprovalDecision('approved')}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 shadow"
              >
                <Check className="w-3.5 h-3.5" /> Approve & Resume Execution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: ADD WEBHOOK */}
      {/* ==================================================================== */}
      {webhookModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-[#0b1329] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" /> Add Webhook Destination
              </h3>
              <button onClick={() => setWebhookModalOpen(false)} className="text-slate-400 hover:text-white">
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 uppercase">Endpoint Name</label>
                <input
                  type="text"
                  placeholder="e.g. Production Sales Hubspot CRM"
                  value={newWebhookName}
                  onChange={e => setNewWebhookName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-100 border border-border text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 uppercase">Destination URL (HTTP/HTTPS)</label>
                <input
                  type="text"
                  placeholder="https://api.yourdomain.com/webhook"
                  value={newWebhookUrl}
                  onChange={e => setNewWebhookUrl(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-100 border border-border text-xs text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 uppercase">HMAC Signing Secret</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newWebhookSecret}
                    onChange={e => setNewWebhookSecret(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-100 border border-border text-xs text-white font-mono"
                  />
                  <button
                    onClick={() => setNewWebhookSecret(`sec_${Math.random().toString(36).substr(2, 12)}`)}
                    className="px-2.5 py-1.5 rounded-lg bg-surface-100 border border-border text-slate-300 text-xs whitespace-nowrap"
                  >
                    Regenerate
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setWebhookModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-surface-100 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWebhookEndpoint}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white"
              >
                Save Endpoint
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: EXECUTION STEP LOGS */}
      {/* ==================================================================== */}
      {selectedExecution && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-[#0b1329] p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" /> Execution Audit Trace
                </h3>
                <span className="text-xs text-slate-400 font-mono">{selectedExecution.id}</span>
              </div>
              <button onClick={() => setSelectedExecution(null)} className="text-slate-400 hover:text-white">
                &times;
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              <div className="p-3 rounded-xl bg-surface-100 text-xs grid grid-cols-2 gap-2 font-mono text-slate-300">
                <div>Workflow: {selectedExecution.workflowName}</div>
                <div>Status: {selectedExecution.status}</div>
                <div>Idempotency Key: {selectedExecution.idempotencyKey}</div>
                <div>Total Duration: {selectedExecution.totalDurationMs || 0}ms</div>
              </div>

              {selectedExecution.errorSummary && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 font-mono">
                  {selectedExecution.errorSummary}
                </div>
              )}

              <div className="space-y-2">
                <span className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                  Step-by-Step Trajectory ({selectedExecution.steps.length})
                </span>

                {selectedExecution.steps.map((st, i) => (
                  <div key={i} className="p-3 rounded-xl border border-border bg-surface-50 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">
                        {i + 1}. [{st.nodeType.toUpperCase()}] {st.title}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium ${
                          st.status === 'success'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : st.status === 'failed'
                            ? 'bg-rose-500/10 text-rose-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {st.status} ({st.durationMs || 0}ms)
                      </span>
                    </div>

                    {st.error && <p className="text-rose-400 font-mono text-[11px]">{st.error}</p>}

                    {st.output && (
                      <div className="p-2 rounded bg-surface-100 font-mono text-[11px] text-slate-300 overflow-x-auto">
                        <pre>{JSON.stringify(st.output, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-border flex justify-end shrink-0">
              <button
                onClick={() => setSelectedExecution(null)}
                className="px-4 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 text-xs text-slate-300"
              >
                Close Audit Trace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
