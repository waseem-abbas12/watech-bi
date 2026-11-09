'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  ShieldCheck,
  Globe,
  Cpu,
  Database,
  Key,
  RefreshCw,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Paintbrush,
  Terminal,
  Copy,
  X,
} from 'lucide-react';
import type {
  Tenant,
  TenantPlan,
  TenantSubscription,
  TenantBranding,
  TenantModuleConfig,
  TenantAuditLog,
  TenantDomain,
} from '@/types';
import { repository } from '@/lib/db/repository';
import { useTenant } from '@/context/TenantContext';
import { ALL_MODULE_KEYS, MODULE_METADATA } from '@/lib/engines/rbacEngine';
import { generatePostgreSqlRlsDdl, generatePrismaSchema } from '@/lib/engines/saasMigrationBridge';
import { applyTenantBrandingToDom } from '@/lib/engines/brandingEngine';

type AdminTab = 'tenants' | 'plans' | 'branding' | 'domains' | 'modules' | 'migration' | 'audit';

export function PlatformAdminView() {
  const { currentTenant, isSuperAdmin, switchTenant } = useTenant();
  const [activeTab, setActiveTab] = useState<AdminTab>('tenants');

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<TenantPlan[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedBranding, setSelectedBranding] = useState<TenantBranding | null>(null);
  const [selectedModuleConfig, setSelectedModuleConfig] = useState<TenantModuleConfig | null>(null);
  const [domains, setDomains] = useState<TenantDomain[]>([]);
  const [auditLogs, setAuditLogs] = useState<TenantAuditLog[]>([]);

  const [isCreatingTenant, setIsCreatingTenant] = useState<boolean>(false);
  const [newTenantName, setNewTenantName] = useState<string>('');
  const [newTenantSlug, setNewTenantSlug] = useState<string>('');
  const [newTenantEmail, setNewTenantEmail] = useState<string>('');
  const [newTenantPlan, setNewTenantPlan] = useState<string>('plan-professional');

  const [notification, setNotification] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const loadPlatformData = async () => {
    const allTenants = await repository.getTenants();
    setTenants(allTenants);
    const allPlans = await repository.getTenantPlans();
    setPlans(allPlans);

    const initialTenantId = selectedTenantId || currentTenant?.id || allTenants[0]?.id || '';
    setSelectedTenantId(initialTenantId);

    if (initialTenantId) {
      const b = await repository.getTenantBranding(initialTenantId);
      setSelectedBranding(b || null);
      const m = await repository.getTenantModuleConfig(initialTenantId);
      setSelectedModuleConfig(m || null);
      const d = await repository.getTenantDomains(initialTenantId);
      setDomains(d);
    }

    const logs = await repository.getTenantAuditLogs(undefined, 30);
    setAuditLogs(logs);
  };

  useEffect(() => {
    loadPlatformData();
  }, [selectedTenantId]);

  const handleSelectTenant = async (id: string) => {
    setSelectedTenantId(id);
    const b = await repository.getTenantBranding(id);
    setSelectedBranding(b || null);
    const m = await repository.getTenantModuleConfig(id);
    setSelectedModuleConfig(m || null);
    const d = await repository.getTenantDomains(id);
    setDomains(d);
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName || !newTenantSlug || !newTenantEmail) return;

    const id = `tenant-${newTenantSlug.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const now = new Date().toISOString();

    const createdTenant: Tenant = {
      id,
      slug: newTenantSlug.toLowerCase().trim(),
      name: newTenantName.trim(),
      planId: newTenantPlan,
      status: 'active',
      contactEmail: newTenantEmail.trim(),
      isPlatformSuperAdminTenant: false,
      createdAt: now,
      updatedAt: now,
    };

    await repository.saveTenant(createdTenant);

    // Default branding
    const createdBranding: TenantBranding = {
      id: `brand-${id}`,
      tenantId: id,
      companyName: createdTenant.name,
      primaryColor: '#2563eb',
      secondaryColor: '#1e40af',
      accentColor: '#10b981',
      fontStack: 'Inter, sans-serif',
      footerText: `Powered by ${createdTenant.name}`,
      supportEmail: createdTenant.contactEmail,
      updatedAt: now,
    };
    await repository.saveTenantBranding(createdBranding);

    // Default module config
    const enabledMap: Record<string, boolean> = {};
    ALL_MODULE_KEYS.forEach(m => {
      enabledMap[m] = true;
    });
    const createdModuleConfig: TenantModuleConfig = {
      id: `mcfg-${id}`,
      tenantId: id,
      enabledModules: enabledMap,
      updatedAt: now,
    };
    await repository.saveTenantModuleConfig(createdModuleConfig);

    // Subscription
    const createdSubscription: TenantSubscription = {
      id: `sub-${id}`,
      tenantId: id,
      planId: newTenantPlan,
      status: 'active',
      billingInterval: 'monthly',
      currentPeriodStart: now,
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
      billingEmail: createdTenant.contactEmail,
    };
    await repository.saveTenantSubscription(createdSubscription);

    // Initial Owner User
    await repository.saveTenantUser({
      id: `tuser-${id}-owner`,
      tenantId: id,
      email: createdTenant.contactEmail,
      fullName: `${createdTenant.name} Administrator`,
      role: 'owner',
      status: 'active',
      isPlatformSuperAdmin: false,
      createdAt: now,
    });

    setIsCreatingTenant(false);
    setNewTenantName('');
    setNewTenantSlug('');
    setNewTenantEmail('');
    showNotification(`Tenant "${createdTenant.name}" successfully provisioned.`);
    await loadPlatformData();
  };

  const handleToggleTenantStatus = async (tenant: Tenant) => {
    const updatedStatus = tenant.status === 'active' ? 'suspended' : 'active';
    const updated: Tenant = { ...tenant, status: updatedStatus, updatedAt: new Date().toISOString() };
    await repository.saveTenant(updated);
    showNotification(`Tenant "${tenant.name}" is now ${updatedStatus}.`);
    await loadPlatformData();
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranding || !selectedTenantId) return;
    const updated = { ...selectedBranding, updatedAt: new Date().toISOString() };
    await repository.saveTenantBranding(updated);
    if (selectedTenantId === currentTenant?.id) {
      applyTenantBrandingToDom(updated);
    }
    showNotification('Tenant branding updated successfully.');
  };

  const handleModuleToggle = async (moduleKey: string, isEnabled: boolean) => {
    if (!selectedTenantId) return;
    const existing = selectedModuleConfig || {
      id: `mcfg-${selectedTenantId}`,
      tenantId: selectedTenantId,
      enabledModules: {},
      updatedAt: new Date().toISOString(),
    };
    const updated: TenantModuleConfig = {
      ...existing,
      enabledModules: {
        ...existing.enabledModules,
        [moduleKey]: isEnabled,
      },
      updatedAt: new Date().toISOString(),
    };
    await repository.saveTenantModuleConfig(updated);
    setSelectedModuleConfig(updated);
    showNotification(`Module "${moduleKey}" ${isEnabled ? 'enabled' : 'disabled'}.`);
  };

  const copyToClipboard = (text: string, section: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2500);
      showNotification(`Copied ${section} to clipboard.`);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8">
          <ShieldCheck className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Platform Super-Admin Authorization Required</h2>
          <p className="text-gray-400 max-w-md mx-auto text-sm">
            Access to the Platform Admin console is strictly restricted to platform owners.
            Tenant administrators cannot view or modify cross-tenant configurations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">Platform Super-Admin Console</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  Global SaaS Control
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-0.5">
                Manage white-label tenants, subscriptions, cross-tenant isolation, branding & PostgreSQL RLS migration
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsCreatingTenant(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Provision New Tenant</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto space-x-2 border-b border-gray-800 pb-2 text-sm">
        {[
          { id: 'tenants', label: 'Tenants Directory', icon: Building2 },
          { id: 'plans', label: 'SaaS Plans & Quotas', icon: Database },
          { id: 'branding', label: 'White-Label Branding', icon: Paintbrush },
          { id: 'domains', label: 'Custom Domains & SSL', icon: Globe },
          { id: 'modules', label: 'Module Provisioning', icon: Cpu },
          { id: 'migration', label: 'PostgreSQL RLS Migration', icon: Terminal },
          { id: 'audit', label: 'Platform Audit Log', icon: Key },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tenant Selector Sub-bar for scoped tabs */}
      {['branding', 'domains', 'modules'].includes(activeTab) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <span className="text-xs uppercase font-semibold text-gray-400 tracking-wider">Scoped Tenant:</span>
            <select
              value={selectedTenantId}
              onChange={e => handleSelectTenant(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
            >
              {tenants.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.slug}) {t.isPlatformSuperAdminTenant ? '⭐ [HQ]' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => switchTenant(selectedTenantId)}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition"
            >
              Simulate Active Session as this Tenant
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: TENANTS DIRECTORY */}
      {activeTab === 'tenants' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <span className="text-xs text-gray-400">Total Tenants</span>
              <p className="text-2xl font-bold text-white mt-1">{tenants.length}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <span className="text-xs text-gray-400">Active Licenses</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                {tenants.filter(t => t.status === 'active').length}
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <span className="text-xs text-gray-400">Custom Domains Configured</span>
              <p className="text-2xl font-bold text-blue-400 mt-1">
                {tenants.filter(t => Boolean(t.customDomain)).length}
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <span className="text-xs text-gray-400">Platform Super-Admin Accounts</span>
              <p className="text-2xl font-bold text-purple-400 mt-1">
                {tenants.filter(t => t.isPlatformSuperAdminTenant).length}
              </p>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h3 className="font-semibold text-white">Registered Tenant Accounts</h3>
              <button
                onClick={loadPlatformData}
                className="text-gray-400 hover:text-white text-xs flex items-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="py-3 px-4">Organization</th>
                    <th className="py-3 px-4">Slug / Domain</th>
                    <th className="py-3 px-4">Subscription Plan</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Contact Email</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-gray-300">
                  {tenants.map(t => {
                    const plan = plans.find(p => p.id === t.planId);
                    return (
                      <tr key={t.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-white flex items-center gap-2">
                            <span>{t.name}</span>
                            {t.isPlatformSuperAdminTenant && (
                              <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded">
                                HQ Super-Admin
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">{t.id}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs">
                          <div>{t.slug}</div>
                          {t.customDomain && <div className="text-blue-400">{t.customDomain}</div>}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-800 text-gray-300 border border-gray-700">
                            {plan?.name || t.planId}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              t.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/10 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {t.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs">{t.contactEmail}</td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => switchTenant(t.id)}
                            className="text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded transition"
                          >
                            Switch To
                          </button>
                          {!t.isPlatformSuperAdminTenant && (
                            <button
                              onClick={() => handleToggleTenantStatus(t)}
                              className={`text-xs px-2.5 py-1 rounded transition ${
                                t.status === 'active'
                                  ? 'text-red-400 hover:text-red-300 bg-red-500/10'
                                  : 'text-emerald-400 hover:text-emerald-300 bg-emerald-500/10'
                              }`}
                            >
                              {t.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SAAS PLANS & QUOTAS */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {plans.map(p => (
              <div
                key={p.id}
                className={`bg-gray-900 border rounded-xl p-5 flex flex-col justify-between ${
                  p.slug === 'professional' ? 'border-blue-500/40 ring-1 ring-blue-500/20' : 'border-gray-800'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-white text-lg">{p.name}</h4>
                    <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                      {p.slug}
                    </span>
                  </div>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-white">${p.priceMonthly}</span>
                    <span className="text-xs text-gray-400 ml-1">/ month</span>
                    <div className="text-xs text-emerald-400 mt-0.5">or ${p.priceAnnual}/year (save 17%)</div>
                  </div>

                  <div className="border-t border-gray-800 pt-3 space-y-2 text-xs text-gray-300">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Team Seats:</span>
                      <span className="font-semibold text-white">{p.userLimit >= 9999 ? 'Unlimited' : p.userLimit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Target Leads / Mo:</span>
                      <span className="font-semibold text-white">{p.leadLimit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Research Projects:</span>
                      <span className="font-semibold text-white">{p.researchLimit >= 999 ? 'Unlimited' : p.researchLimit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">AI CEO Queries:</span>
                      <span className="font-semibold text-white">{p.aiQueryLimit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Storage Capacity:</span>
                      <span className="font-semibold text-white">{(p.storageLimitMb / 1024).toFixed(1)} GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Enabled Modules:</span>
                      <span className="font-semibold text-white">{p.enabledModules.length} Modules</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-800 text-center">
                  <span className="text-xs text-gray-500">
                    Active Tenants on Plan: {tenants.filter(t => t.planId === p.id).length}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: WHITE-LABEL BRANDING */}
      {activeTab === 'branding' && selectedBranding && (
        <form onSubmit={handleSaveBranding} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">White-Label Branding & Identity Engine</h3>
            <p className="text-sm text-gray-400">
              Configure CSS variables, company name, typography, and support metadata for{' '}
              <span className="text-white font-medium">{selectedBranding.companyName}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Display Brand Name</label>
              <input
                type="text"
                value={selectedBranding.companyName}
                onChange={e => setSelectedBranding({ ...selectedBranding, companyName: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Support Email Address</label>
              <input
                type="email"
                value={selectedBranding.supportEmail}
                onChange={e => setSelectedBranding({ ...selectedBranding, supportEmail: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Font Stack</label>
              <input
                type="text"
                value={selectedBranding.fontStack}
                onChange={e => setSelectedBranding({ ...selectedBranding, fontStack: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Primary Color Hex</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={selectedBranding.primaryColor}
                  onChange={e => setSelectedBranding({ ...selectedBranding, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded border border-gray-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={selectedBranding.primaryColor}
                  onChange={e => setSelectedBranding({ ...selectedBranding, primaryColor: e.target.value })}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Secondary Color Hex</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={selectedBranding.secondaryColor}
                  onChange={e => setSelectedBranding({ ...selectedBranding, secondaryColor: e.target.value })}
                  className="w-10 h-10 rounded border border-gray-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={selectedBranding.secondaryColor}
                  onChange={e => setSelectedBranding({ ...selectedBranding, secondaryColor: e.target.value })}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Accent Color Hex</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={selectedBranding.accentColor}
                  onChange={e => setSelectedBranding({ ...selectedBranding, accentColor: e.target.value })}
                  className="w-10 h-10 rounded border border-gray-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={selectedBranding.accentColor}
                  onChange={e => setSelectedBranding({ ...selectedBranding, accentColor: e.target.value })}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono"
                />
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-gray-400 mb-2">Footer Watermark / Copyright Text</label>
              <input
                type="text"
                value={selectedBranding.footerText}
                onChange={e => setSelectedBranding({ ...selectedBranding, footerText: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-gray-400 mb-2">
                Sanitized Custom CSS (Scoped Variables & Micro-Styles)
              </label>
              <textarea
                rows={4}
                value={selectedBranding.customCss || ''}
                onChange={e => setSelectedBranding({ ...selectedBranding, customCss: e.target.value })}
                placeholder=":root { --custom-accent: #6366f1; }"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-800">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition"
            >
              Save Branding Configuration
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: CUSTOM DOMAINS */}
      {activeTab === 'domains' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-white">Custom Domain & SSL Provisioning</h3>
              <p className="text-sm text-gray-400">
                Active hostnames and CNAME records mapped to tenant {selectedTenantId}
              </p>
            </div>
          </div>

          {domains.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-gray-800 rounded-xl text-gray-500 text-sm">
              No custom domains provisioned for this tenant yet.
            </div>
          ) : (
            <div className="space-y-4">
              {domains.map(d => (
                <div key={d.id} className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <Globe className="w-5 h-5 text-blue-400" />
                      <span className="font-mono text-sm font-bold text-white">{d.domain}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        SSL {d.sslStatus.toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/30">
                        DNS {d.verificationStatus.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-900 p-3 rounded-lg text-xs font-mono text-gray-300 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <span className="text-gray-500">Record Type:</span> {d.dnsVerificationRecord.type}
                    </div>
                    <div>
                      <span className="text-gray-500">Host / Name:</span> {d.dnsVerificationRecord.name}
                    </div>
                    <div>
                      <span className="text-gray-500">Target Value:</span> {d.dnsVerificationRecord.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: MODULE PROVISIONING */}
      {activeTab === 'modules' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">Module Entitlements & Feature Gates</h3>
            <p className="text-sm text-gray-400">
              Enable or disable specific modules for tenant <span className="text-white font-medium">{selectedTenantId}</span>.
              Disabled modules will be hidden from their left sidebar and blocked at the route gate.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ALL_MODULE_KEYS.map(key => {
              const meta = MODULE_METADATA[key];
              const isEnabled = selectedModuleConfig?.enabledModules?.[key] !== false;
              return (
                <div
                  key={key}
                  className={`p-4 rounded-xl border transition-all ${
                    isEnabled
                      ? 'bg-gray-800/50 border-gray-700'
                      : 'bg-gray-900/40 border-gray-800 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                        {meta.category}
                      </span>
                      <h4 className="text-sm font-semibold text-white mt-0.5">{meta.title}</h4>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{meta.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-2">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={e => handleModuleToggle(key, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: POSTGRESQL RLS MIGRATION BRIDGE */}
      {activeTab === 'migration' && (
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-blue-400" />
                  <span>Production Cloud Migration: PostgreSQL Row-Level Security (RLS)</span>
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Ready-to-execute DDL schema ensuring tamper-proof cryptographic isolation across all multi-tenant tables.
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(generatePostgreSqlRlsDdl(), 'PostgreSQL RLS Script')}
                className="flex items-center space-x-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition"
              >
                <Copy className="w-4 h-4" />
                <span>{copiedSection === 'PostgreSQL RLS Script' ? 'Copied!' : 'Copy RLS DDL Script'}</span>
              </button>
            </div>
            <pre className="bg-gray-950 p-4 rounded-lg text-xs font-mono text-gray-300 overflow-x-auto max-h-72 border border-gray-800">
              {generatePostgreSqlRlsDdl()}
            </pre>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-purple-400" />
                  <span>Production Prisma Multi-Tenant Schema</span>
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  ORM schema mapping 100% of Dexie IndexedDB models into relational PostgreSQL entities.
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(generatePrismaSchema(), 'Prisma Schema')}
                className="flex items-center space-x-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition"
              >
                <Copy className="w-4 h-4" />
                <span>{copiedSection === 'Prisma Schema' ? 'Copied!' : 'Copy schema.prisma'}</span>
              </button>
            </div>
            <pre className="bg-gray-950 p-4 rounded-lg text-xs font-mono text-gray-300 overflow-x-auto max-h-72 border border-gray-800">
              {generatePrismaSchema()}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 7: PLATFORM AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">Cross-Tenant Platform Audit Trail</h3>
          <p className="text-sm text-gray-400">
            Immutable log of administrative interventions, user invitations, and security events.
          </p>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-800/50 text-gray-400 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Tenant</th>
                  <th className="py-2.5 px-3">Actor Email</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Resource</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-300">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-500">
                      No administrative audit records logged yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(l => (
                    <tr key={l.id} className="hover:bg-gray-800/30">
                      <td className="py-2 px-3 font-mono text-gray-400">{new Date(l.timestamp).toLocaleString()}</td>
                      <td className="py-2 px-3 font-semibold text-white">{l.tenantId}</td>
                      <td className="py-2 px-3">{l.actorEmail}</td>
                      <td className="py-2 px-3 text-blue-400 font-mono">{l.action}</td>
                      <td className="py-2 px-3">{l.resourceType}</td>
                      <td className="py-2 px-3 text-gray-400 max-w-xs truncate">{l.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: PROVISION NEW TENANT */}
      {isCreatingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="font-bold text-white text-lg">Provision New Tenant Account</h3>
              <button
                onClick={() => setIsCreatingTenant(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Company / Organization Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Growth Marketing"
                  value={newTenantName}
                  onChange={e => {
                    setNewTenantName(e.target.value);
                    if (!newTenantSlug) {
                      setNewTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                    }
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Tenant Slug (Identifier)</label>
                <input
                  type="text"
                  required
                  placeholder="apex-growth"
                  value={newTenantSlug}
                  onChange={e => setNewTenantSlug(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Administrator Email</label>
                <input
                  type="email"
                  required
                  placeholder="admin@apexgrowth.com"
                  value={newTenantEmail}
                  onChange={e => setNewTenantEmail(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Subscription Plan</label>
                <select
                  value={newTenantPlan}
                  onChange={e => setNewTenantPlan(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${p.priceMonthly}/mo)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingTenant(false)}
                  className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition"
                >
                  Deploy Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
