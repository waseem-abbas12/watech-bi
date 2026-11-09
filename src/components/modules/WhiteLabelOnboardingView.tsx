'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Paintbrush,
  Cpu,
  Globe,
  Users,
  Rocket,
  Check,
  Sparkles,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import type { Tenant, TenantBranding, TenantModuleConfig, TenantSubscription } from '@/types';
import { repository } from '@/lib/db/repository';
import { useTenant } from '@/context/TenantContext';
import { ALL_MODULE_KEYS, MODULE_METADATA } from '@/lib/engines/rbacEngine';
import { applyTenantBrandingToDom } from '@/lib/engines/brandingEngine';

type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

export function WhiteLabelOnboardingView() {
  const router = useRouter();
  const { switchTenant } = useTenant();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);

  // Step 1: Info
  const [agencyName, setAgencyName] = useState('');
  const [slug, setSlug] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [targetIndustry, setTargetIndustry] = useState('Commercial HVAC & Mechanical');

  // Step 2: Branding
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#1e40af');
  const [accentColor, setAccentColor] = useState('#10b981');
  const [fontStack, setFontStack] = useState('Inter, sans-serif');
  const [tagline, setTagline] = useState('Autonomous Client Acquisition Engine');

  // Step 3: Modules
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    ALL_MODULE_KEYS.forEach(k => {
      map[k] = true;
    });
    return map;
  });

  // Step 4: Domain
  const [customDomain, setCustomDomain] = useState('');
  const [useCustomDomain, setUseCustomDomain] = useState(false);

  // Step 5: Team
  const [teamInvites, setTeamInvites] = useState<{ email: string; role: string }[]>([
    { email: '', role: 'manager' },
  ]);

  // Step 6: Status
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (preset: 'full' | 'leadgen' | 'seo') => {
    const updated: Record<string, boolean> = {};
    ALL_MODULE_KEYS.forEach(k => {
      if (preset === 'full') {
        updated[k] = true;
      } else if (preset === 'leadgen') {
        const leadGenSet = [
          'overview',
          'business-discovery',
          'contact-discovery',
          'email-verification',
          'lead-scoring',
          'outreach-strategy',
          'gmail-integration',
          'crm-pipeline',
          'buyer-signals',
        ];
        updated[k] = leadGenSet.includes(k);
      } else if (preset === 'seo') {
        const seoSet = [
          'overview',
          'website-audit',
          'local-seo',
          'content-discovery',
          'competitor-monitor',
          'opportunity-analysis',
          'service-recommendations',
          'proposals',
        ];
        updated[k] = seoSet.includes(k);
      }
    });
    setEnabledModules(updated);
  };

  const handleCompleteOnboarding = async () => {
    setIsDeploying(true);
    setError(null);

    try {
      const tenantId = `tenant-${slug.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      const now = new Date().toISOString();

      // 1. Create Tenant
      const tenant: Tenant = {
        id: tenantId,
        slug: slug.toLowerCase().trim(),
        name: agencyName.trim(),
        planId: 'plan-professional',
        status: 'active',
        customDomain: useCustomDomain && customDomain ? customDomain.trim() : undefined,
        contactEmail: contactEmail.trim(),
        isPlatformSuperAdminTenant: false,
        createdAt: now,
        updatedAt: now,
      };
      await repository.saveTenant(tenant);

      // 2. Create Branding
      const branding: TenantBranding = {
        id: `brand-${tenantId}`,
        tenantId,
        companyName: agencyName.trim(),
        primaryColor,
        secondaryColor,
        accentColor,
        fontStack,
        footerText: `${agencyName} — ${tagline}`,
        supportEmail: contactEmail.trim(),
        portalBranding: {
          portalTitle: `${agencyName} Client Hub`,
          welcomeMessage: 'Welcome to your real-time campaign performance portal.',
        },
        updatedAt: now,
      };
      await repository.saveTenantBranding(branding);
      applyTenantBrandingToDom(branding);

      // 3. Create Module Config
      const moduleConfig: TenantModuleConfig = {
        id: `mcfg-${tenantId}`,
        tenantId,
        enabledModules,
        updatedAt: now,
      };
      await repository.saveTenantModuleConfig(moduleConfig);

      // 4. Create Subscription
      const sub: TenantSubscription = {
        id: `sub-${tenantId}`,
        tenantId,
        planId: 'plan-professional',
        status: 'active',
        billingInterval: 'monthly',
        currentPeriodStart: now,
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
        cancelAtPeriodEnd: false,
        billingEmail: contactEmail.trim(),
      };
      await repository.saveTenantSubscription(sub);

      // 5. Create Owner User
      await repository.saveTenantUser({
        id: `user-${tenantId}-owner`,
        tenantId,
        email: contactEmail.trim(),
        fullName: `${agencyName} Owner`,
        role: 'owner',
        status: 'active',
        isPlatformSuperAdmin: false,
        createdAt: now,
      });

      // 6. Create custom domain record if requested
      if (useCustomDomain && customDomain) {
        await repository.saveTenantDomain({
          id: `dom-${tenantId}-1`,
          tenantId,
          domain: customDomain.trim(),
          subdomain: customDomain.split('.')[0] || 'app',
          verificationStatus: 'pending',
          sslStatus: 'pending',
          dnsVerificationRecord: {
            type: 'CNAME',
            name: customDomain.split('.')[0] || 'app',
            value: 'cname.watechbi.com',
          },
          createdAt: now,
        });
      }

      // 7. Switch active tenant context
      await switchTenant(tenantId);

      // Navigate to overview dashboard
      router.push('/');
    } catch (err: unknown) {
      console.error('Failed to provision white-label tenant:', err);
      setError('An error occurred while provisioning your tenant workspace. Please verify all inputs.');
      setIsDeploying(false);
    }
  };

  const stepsList = [
    { num: 1, title: 'Agency Profile', icon: Building2 },
    { num: 2, title: 'Branding & Theme', icon: Paintbrush },
    { num: 3, title: 'Modules & Features', icon: Cpu },
    { num: 4, title: 'Custom Domain', icon: Globe },
    { num: 5, title: 'Collaborators', icon: Users },
    { num: 6, title: 'Launch Workspace', icon: Rocket },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 flex flex-col justify-between">
      <div className="max-w-4xl w-full mx-auto space-y-8 py-6">
        {/* Wizard Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
            <Sparkles className="w-4 h-4" />
            <span>White-Label Agency Onboarding Wizard</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Deploy Your Agency Operating System</h1>
          <p className="text-sm text-gray-400 max-w-lg mx-auto">
            Transform Watech-BI into your own bespoke, branded commercial growth SaaS platform in 6 simple steps.
          </p>
        </div>

        {/* Step Progress Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          {stepsList.map(s => {
            const Icon = s.icon;
            const isDone = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <div
                key={s.num}
                className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${
                  isCurrent
                    ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                    : isDone
                    ? 'bg-gray-900 border-emerald-500/30 text-emerald-400'
                    : 'bg-gray-900/40 border-gray-800 text-gray-500'
                }`}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center mb-1.5 text-xs font-bold bg-gray-800">
                  {isDone ? <Check className="w-4 h-4 text-emerald-400" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className="text-[11px] font-semibold">{s.title}</span>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* STEP 1: AGENCY INFO */}
        {currentStep === 1 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="border-b border-gray-800 pb-4">
              <h2 className="text-xl font-bold text-white">Step 1: Agency & Organization Details</h2>
              <p className="text-sm text-gray-400 mt-1">
                Enter your commercial company name and choose your workspace slug.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Agency / Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Strategic Growth"
                  value={agencyName}
                  onChange={e => {
                    setAgencyName(e.target.value);
                    if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Workspace Slug *</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    required
                    placeholder="apex-growth"
                    value={slug}
                    onChange={e => setSlug(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <span className="text-[11px] text-gray-500 mt-1 block">URL: app.watechbi.com/{slug || 'your-slug'}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Primary Contact / Admin Email *</label>
                <input
                  type="email"
                  required
                  placeholder="director@apexgrowth.com"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Primary Target Industry</label>
                <input
                  type="text"
                  value={targetIndustry}
                  onChange={e => setTargetIndustry(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: BRANDING */}
        {currentStep === 2 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="border-b border-gray-800 pb-4">
              <h2 className="text-xl font-bold text-white">Step 2: Visual Branding & Color System</h2>
              <p className="text-sm text-gray-400 mt-1">
                Choose the brand palette that will be injected into every view, proposal, and client portal.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Primary Brand Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded border border-gray-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Secondary Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={e => setSecondaryColor(e.target.value)}
                    className="w-10 h-10 rounded border border-gray-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={e => setSecondaryColor(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Accent Accent Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={e => setAccentColor(e.target.value)}
                    className="w-10 h-10 rounded border border-gray-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={e => setAccentColor(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Brand Tagline / Watermark</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Font Stack</label>
                <select
                  value={fontStack}
                  onChange={e => setFontStack(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="Inter, sans-serif">Inter (Modern & Clean)</option>
                  <option value="Poppins, sans-serif">Poppins (Punchy & Bold)</option>
                  <option value="Plus Jakarta Sans, sans-serif">Jakarta Sans (SaaS Executive)</option>
                  <option value="system-ui, sans-serif">System Native</option>
                </select>
              </div>
            </div>

            {/* Live Preview Card */}
            <div className="mt-6 p-4 rounded-xl border border-gray-800 bg-gray-950 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  {agencyName ? agencyName.slice(0, 2).toUpperCase() : 'AG'}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{agencyName || 'Your Agency OS'}</h4>
                  <p className="text-xs text-gray-400">{tagline}</p>
                </div>
              </div>
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                CTA Button Preview
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: MODULES */}
        {currentStep === 3 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Step 3: Select Enabled Modules</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Choose which features your team will have access to. You can adjust this anytime.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('full')}
                  className="text-xs px-2.5 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition"
                >
                  All 24 Modules
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('leadgen')}
                  className="text-xs px-2.5 py-1.5 bg-gray-800 text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-700 transition"
                >
                  Lead Gen Only
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('seo')}
                  className="text-xs px-2.5 py-1.5 bg-gray-800 text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-700 transition"
                >
                  SEO & Audits Only
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
              {ALL_MODULE_KEYS.map(key => {
                const meta = MODULE_METADATA[key];
                const checked = enabledModules[key] !== false;
                return (
                  <label
                    key={key}
                    className={`flex items-start p-3 rounded-xl border cursor-pointer transition ${
                      checked
                        ? 'bg-gray-800/60 border-blue-500/40'
                        : 'bg-gray-900/40 border-gray-800 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e =>
                        setEnabledModules({
                          ...enabledModules,
                          [key]: e.target.checked,
                        })
                      }
                      className="mt-1 h-4 w-4 rounded border-gray-700 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <span className="text-[10px] uppercase font-bold text-blue-400">{meta.category}</span>
                      <p className="text-xs font-semibold text-white">{meta.title}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: CUSTOM DOMAIN */}
        {currentStep === 4 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="border-b border-gray-800 pb-4">
              <h2 className="text-xl font-bold text-white">Step 4: Custom Domain & CNAME Configuration</h2>
              <p className="text-sm text-gray-400 mt-1">
                Deploy under your agency domain (e.g. portal.youragency.com) with automatic zero-config SSL.
              </p>
            </div>

            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomDomain}
                  onChange={e => setUseCustomDomain(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-white">
                  I want to configure a custom domain now (CNAME)
                </span>
              </label>

              {useCustomDomain ? (
                <div className="space-y-4 bg-gray-950 p-5 rounded-xl border border-gray-800">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Fully Qualified Domain Name
                    </label>
                    <input
                      type="text"
                      placeholder="portal.youragency.com"
                      value={customDomain}
                      onChange={e => setCustomDomain(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 text-xs font-mono space-y-2">
                    <span className="text-gray-400 block font-sans font-semibold">DNS Configuration Instructions:</span>
                    <p className="text-gray-300">
                      Add a <span className="text-blue-400 font-bold">CNAME</span> record at your DNS registrar:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-gray-400 pt-1">
                      <div>Name / Host: <span className="text-white">{customDomain.split('.')[0] || 'portal'}</span></div>
                      <div>Target / Value: <span className="text-white">cname.watechbi.com</span></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-800 text-xs text-gray-400">
                  You can use the default domain (<span className="text-blue-400 font-mono">app.watechbi.com/{slug || 'your-slug'}</span>) and bind a custom CNAME anytime from Platform Admin.
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: COLLABORATORS */}
        {currentStep === 5 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="border-b border-gray-800 pb-4">
              <h2 className="text-xl font-bold text-white">Step 5: Initial Team Members & RBAC Roles</h2>
              <p className="text-sm text-gray-400 mt-1">
                Invite your key managers or analysts. They will receive invitation links with isolated permissions.
              </p>
            </div>

            <div className="space-y-3">
              {teamInvites.map((invite, idx) => (
                <div key={idx} className="flex gap-3">
                  <input
                    type="email"
                    placeholder="colleague@agency.com"
                    value={invite.email}
                    onChange={e => {
                      const updated = [...teamInvites];
                      updated[idx].email = e.target.value;
                      setTeamInvites(updated);
                    }}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                  <select
                    value={invite.role}
                    onChange={e => {
                      const updated = [...teamInvites];
                      updated[idx].role = e.target.value;
                      setTeamInvites(updated);
                    }}
                    className="w-36 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="employee">Employee</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setTeamInvites([...teamInvites, { email: '', role: 'employee' }])}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold pt-2"
              >
                + Add Another Team Member
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: LAUNCH */}
        {currentStep === 6 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center mx-auto">
              <Rocket className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white">Ready to Initialize Your Agency Workspace</h2>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                Review your configuration below. Clicking launch will provision your database partition, apply your custom branding, and activate your operating system.
              </p>
            </div>

            <div className="bg-gray-950 p-5 rounded-xl border border-gray-800 text-left text-xs space-y-2.5 max-w-lg mx-auto">
              <div className="flex justify-between">
                <span className="text-gray-400">Agency Name:</span>
                <span className="font-bold text-white">{agencyName || 'Not Set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Workspace Slug:</span>
                <span className="font-mono text-white">{slug || 'not-set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Primary Brand Color:</span>
                <span className="font-mono text-blue-400 font-bold">{primaryColor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Active Modules:</span>
                <span className="font-bold text-white">
                  {Object.values(enabledModules).filter(Boolean).length} Enabled
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Custom Domain:</span>
                <span className="font-mono text-white">
                  {useCustomDomain && customDomain ? customDomain : 'app.watechbi.com/' + slug}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={isDeploying || !agencyName || !contactEmail}
              onClick={handleCompleteOnboarding}
              className="w-full max-w-lg mx-auto py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-base shadow-lg transition-all"
            >
              {isDeploying ? 'Initializing Tenant Workspace...' : 'Launch White-Label Workspace'}
            </button>
          </div>
        )}

        {/* Wizard Footer Nav Buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-800">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((currentStep - 1) as OnboardingStep)}
              className="flex items-center space-x-2 text-gray-400 hover:text-white text-sm font-semibold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous Step</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 6 && (
            <button
              type="button"
              disabled={currentStep === 1 && (!agencyName || !contactEmail || !slug)}
              onClick={() => setCurrentStep((currentStep + 1) as OnboardingStep)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition"
            >
              <span>Next Step</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
