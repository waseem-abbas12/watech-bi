'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Download,
  AlertCircle,
  Zap,
  Building2,
  Sparkles,
} from 'lucide-react';
import { useTenant } from '@/context/TenantContext';
import { useProject } from '@/context/ProjectContext';

export function BillingSubscriptionView() {
  const { currentTenant } = useTenant();
  const { projects } = useProject();
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');

  const currentPlan = (currentTenant?.planId.replace('plan-', '') || 'starter').toUpperCase();

  const plans = [
    {
      name: 'Starter',
      priceMonthly: 199,
      priceAnnual: 159,
      description: 'Ideal for regional agency teams initiating commercial lead discovery.',
      features: [
        'Up to 500 Discovered Leads/mo',
        'Full 10-Category Technical Audits',
        'Verified Decision-Maker Extraction',
        'Autonomous 10-Stage Pipeline',
        'Standard Email & Phone Support',
      ],
      current: currentPlan === 'STARTER',
    },
    {
      name: 'Growth',
      priceMonthly: 399,
      priceAnnual: 319,
      badge: 'POPULAR',
      description: 'For scaling agencies running continuous multi-market campaigns.',
      features: [
        'Up to 2,500 Discovered Leads/mo',
        'Multi-Market Territory Mapping',
        'Automatic MX & SMTP Verification',
        'Priority Pipeline Worker Concurrency',
        'Gmail & Webhook Integrations',
        'Dedicated Technical Account Manager',
      ],
      current: currentPlan === 'GROWTH',
    },
    {
      name: 'Enterprise Pro',
      priceMonthly: 799,
      priceAnnual: 639,
      description: 'Maximum concurrency, white-label portals, and custom API integrations.',
      features: [
        'Unlimited Discovered Leads & Audits',
        'Custom Domain White-Label Portals',
        'Client Project Delivery Module',
        'Direct SLA & Priority Engineering Support',
        'Custom Integrations & Dedicated Workers',
      ],
      current: currentPlan === 'PRO' || currentPlan === 'ENTERPRISE',
    },
  ];

  const usageStats = [
    {
      label: 'Monthly Processed Leads',
      used: 35,
      limit: 500,
      unit: 'leads',
    },
    {
      label: 'Website Audits Executed',
      used: 28,
      limit: 500,
      unit: 'audits',
    },
    {
      label: 'Active Research Projects',
      used: projects.length,
      limit: 10,
      unit: 'projects',
    },
    {
      label: 'Tenant Workspaces',
      used: 1,
      limit: 5,
      unit: 'workspaces',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-surface-100 border border-border">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <CreditCard className="w-5 h-5 text-blue-400" />
            Subscription & Usage Metering
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Monitor real-time entitlement consumption, manage organization billing plans, and inspect transaction history.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Current Plan:</span>
          <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/40 font-mono font-bold uppercase">
            {currentPlan}
          </span>
        </div>
      </div>

      {/* Real-Time Entitlement Quota Usage */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-200">Current Billing Period Quotas & Metering</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {usageStats.map((stat, idx) => {
            const pct = Math.min(100, Math.round((stat.used / stat.limit) * 100));
            return (
              <div key={idx} className="p-4 rounded-xl bg-surface-100 border border-border space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">{stat.label}</span>
                  <span className="font-mono text-slate-300 font-bold">{pct}%</span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>
                    {stat.used} / {stat.limit} {stat.unit}
                  </span>
                  <span className="text-emerald-400 font-semibold">{stat.limit - stat.used} remaining</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subscription Plans Matrix */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Commercial SaaS Subscription Plans</h2>
            <p className="text-xs text-slate-400 mt-0.5">Choose the tier matching your agency&apos;s lead intelligence volume.</p>
          </div>

          <div className="flex items-center gap-2 p-1 rounded-xl bg-surface-100 border border-border text-xs">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                billingInterval === 'monthly' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('annual')}
              className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                billingInterval === 'annual' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Annual</span>
              <span className="text-[10px] px-1 rounded bg-emerald-500/20 text-emerald-300 font-bold">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p, idx) => (
            <div
              key={idx}
              className={`p-6 rounded-2xl bg-surface-100 border transition-all flex flex-col justify-between space-y-6 ${
                p.current ? 'border-blue-500/80 ring-1 ring-blue-500/30' : 'border-border hover:border-slate-700'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-100 text-base">{p.name}</h3>
                  {p.badge && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold">
                      {p.badge}
                    </span>
                  )}
                  {p.current && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white font-mono">
                    ${billingInterval === 'monthly' ? p.priceMonthly : p.priceAnnual}
                  </span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{p.description}</p>

                <div className="space-y-2 pt-2 border-t border-border/60">
                  <span className="text-[11px] font-semibold text-slate-300 block uppercase tracking-wider">
                    Included Features:
                  </span>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {p.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <button
                disabled={p.current}
                className={`w-full py-2.5 rounded-xl text-xs font-semibold transition ${
                  p.current
                    ? 'bg-surface-50 text-slate-400 border border-border cursor-default'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20'
                }`}
              >
                {p.current ? 'Current Plan' : 'Select Plan'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
