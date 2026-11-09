'use client';

import React, { useState, useEffect } from 'react';
import { useClientPortalAuth } from '@/context/ClientPortalAuthContext';
import { getClientActivityTimeline } from '@/lib/engines/clientPortalEngine';
import {
  LifeBuoy,
  Mail,
  Phone,
  Clock,
  ShieldCheck,
  Calendar,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  FileText,
  DollarSign,
  ExternalLink,
  UserCheck
} from 'lucide-react';

export default function PortalSupportPage() {
  const { currentClient } = useClientPortalAuth();
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!currentClient) return;
      try {
        const events = await getClientActivityTimeline(currentClient.id);
        setTimeline(events);
      } catch (err) {
        console.error('Failed to load client timeline:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentClient?.id]);

  if (!currentClient) {
    return <div className="p-8 text-center text-slate-400">Please log in to view support.</div>;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <LifeBuoy className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Dedicated Support & SLA</h1>
              <p className="text-sm text-slate-400">
                Direct access to your Watech account team, contractual service levels, and relationship timeline
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Account Manager & Emergency Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Dedicated PM Card */}
        <div className="md:col-span-2 bg-surface-50 border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              SJ
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold uppercase tracking-wider">
                  Dedicated Account Lead
                </span>
                <span className="text-xs text-slate-500 font-mono">Dallas, TX HQ</span>
              </div>
              <h2 className="text-xl font-bold text-white">Sarah Jenkins</h2>
              <p className="text-xs text-slate-300 mb-3">
                Principal Client Success Manager & Technical Project Lead
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <a
                  href="mailto:s.jenkins@watech-bi.internal"
                  className="flex items-center gap-1.5 text-slate-300 hover:text-emerald-400 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                  s.jenkins@watech-bi.internal
                </a>
                <a
                  href="tel:+18005550199"
                  className="flex items-center gap-1.5 text-slate-300 hover:text-emerald-400 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  +1 (800) 555-0199 ext. 402
                </a>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Office Hours: Mon - Fri, 8:00 AM - 6:00 PM CST</span>
            </div>
            <a
              href="mailto:s.jenkins@watech-bi.internal?subject=Schedule%20Consultation"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium border border-border flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              Schedule 1-on-1 Review
            </a>
          </div>
        </div>

        {/* Rapid Escalation Card */}
        <div className="bg-gradient-to-br from-[#0c1a2e] to-[#080d1a] border border-sky-500/30 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-sky-400" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Production Urgent</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              For critical incidents affecting live production websites or active ad campaigns outside of standard hours:
            </p>
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-sky-500/20 text-xs font-mono space-y-1 mb-4">
              <div className="text-slate-400">Emergency Dispatch Hotline:</div>
              <div className="text-sky-300 font-bold text-sm">+1 (800) 555-0911</div>
              <div className="text-slate-500 text-[11px]">Pin: {currentClient.id.slice(-4).toUpperCase()} (Verified Client)</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Emergency calls route directly to the on-call systems engineer 24/7/365.
          </p>
        </div>
      </div>

      {/* SLA Tiers */}
      <div className="bg-surface-50 border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
            Service Level Agreement (SLA) Matrix
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-rose-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Tier 1: Critical</span>
              <span className="text-xs font-mono font-bold text-white bg-rose-500/20 px-2 py-0.5 rounded">&lt; 2 Hours</span>
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">Production Outage</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Complete site unavailability, database failure, or lead intake breakdown.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-amber-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Tier 2: High</span>
              <span className="text-xs font-mono font-bold text-white bg-amber-500/20 px-2 py-0.5 rounded">&lt; 8 Hours</span>
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">Urgent Revision</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Campaign launch deadlines, compliance updates, or critical copy corrections.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Tier 3: Normal</span>
              <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">&lt; 24 Hours</span>
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">Standard Scope</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Routine design tweaks, new content additions, or report explanations.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tier 4: Advisory</span>
              <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">&lt; 48 Hours</span>
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">General Planning</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              New initiative scoping, competitive intelligence inquiries, or quarterly reviews.
            </p>
          </div>
        </div>
      </div>

      {/* Relationship Activity Timeline */}
      <div className="bg-surface-50 border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
              Audit & Relationship History
            </h2>
          </div>
          <span className="text-xs text-slate-400">Immutable ledger</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm animate-pulse">Loading timeline events...</div>
        ) : timeline.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="font-medium text-white mb-1">No Activity Logged</p>
            <p className="text-xs text-slate-500">Your relationship activity will automatically populate as projects advance.</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="relative border-l-2 border-slate-800 ml-4 space-y-6">
              {timeline.map((event, idx) => (
                <div key={idx} className="relative pl-6">
                  <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-surface-50 flex items-center justify-center ${
                    event.type === 'approval'
                      ? 'bg-emerald-500 text-slate-950'
                      : event.type === 'invoice'
                      ? 'bg-amber-500 text-slate-950'
                      : event.type === 'proposal'
                      ? 'bg-purple-500 text-white'
                      : 'bg-sky-500 text-white'
                  }`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>

                  <div className="bg-slate-900/60 p-4 rounded-xl border border-border">
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <span className="text-xs font-bold text-white">{event.title}</span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {new Date(event.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-normal">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
