'use client';

import React, { useState } from 'react';
import { useClientPortalAuth } from '@/context/ClientPortalAuthContext';
import { repository } from '@/lib/db/repository';
import {
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  MapPin,
  Shield,
  Bell,
  CheckCircle2,
  Save,
  Lock
} from 'lucide-react';

export default function PortalProfilePage() {
  const { currentClient, currentUser } = useClientPortalAuth();

  const [companyName, setCompanyName] = useState(currentClient?.companyName || '');
  const [industry, setIndustry] = useState(currentClient?.industry || '');
  const [phone, setPhone] = useState(currentClient?.phone || '');
  const [email, setEmail] = useState(currentClient?.email || '');
  const [website, setWebsite] = useState(currentClient?.website || '');
  const [address, setAddress] = useState(currentClient?.address || '');

  // Notification toggles
  const [notifyDeliverables, setNotifyDeliverables] = useState(true);
  const [notifyInvoices, setNotifyInvoices] = useState(true);
  const [notifyMilestones, setNotifyMilestones] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!currentClient || !currentUser) {
    return <div className="p-8 text-center text-slate-400">Please log in to manage company profile.</div>;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedClient = {
        ...currentClient,
        companyName,
        industry,
        phone,
        email,
        website,
        address
      };
      await repository.updateClient(updatedClient);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update client profile:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Organization Profile & Settings</h1>
              <p className="text-sm text-slate-400">
                Manage corporate contact info, authorized representatives, and communication channels
              </p>
            </div>
          </div>
        </div>

        {saveSuccess && (
          <div className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-1.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4" /> Changes Saved
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Company Overview Card */}
        <div className="bg-surface-50 border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-border">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
              Company Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Company Legal Name
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-border rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Industry / Sector
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-border rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Corporate Website
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-border rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Primary Corporate Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-border rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Business Headquarters Address
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-border rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Primary Contact Person */}
        <div className="bg-surface-50 border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-border">
            <User className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
              Primary Executive Contact
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Representative Full Name
              </label>
              <input
                type="text"
                disabled
                value={currentUser.name}
                className="w-full px-3.5 py-2.5 bg-slate-900/60 border border-border rounded-xl text-slate-300 text-sm cursor-not-allowed"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Managed via authorized client portal account
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Representative Email
              </label>
              <input
                type="text"
                disabled
                value={currentUser.email}
                className="w-full px-3.5 py-2.5 bg-slate-900/60 border border-border rounded-xl text-slate-300 text-sm cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Security Role
              </label>
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900/60 border border-border rounded-xl text-white text-sm">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="capitalize">{currentUser.role.replace('_', ' ')}</span>
                <span className="text-[11px] text-slate-500 ml-auto font-mono">Full Authority</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Security & Authentication
              </label>
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900/60 border border-border rounded-xl text-slate-300 text-sm">
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Password Encrypted</span>
                <span className="text-[11px] text-emerald-400 ml-auto">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-surface-50 border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-4 border-b border-border">
            <Bell className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
              Notification Preferences
            </h2>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 border border-border cursor-pointer hover:bg-slate-900 transition-colors">
              <input
                type="checkbox"
                checked={notifyDeliverables}
                onChange={(e) => setNotifyDeliverables(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-border focus:ring-0"
              />
              <div className="text-xs">
                <div className="font-semibold text-white">Deliverable Staging & Approval Alerts</div>
                <div className="text-slate-400">Receive notifications when new designs or website builds are ready for your feedback</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 border border-border cursor-pointer hover:bg-slate-900 transition-colors">
              <input
                type="checkbox"
                checked={notifyInvoices}
                onChange={(e) => setNotifyInvoices(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-border focus:ring-0"
              />
              <div className="text-xs">
                <div className="font-semibold text-white">Invoice & Milestone Releases</div>
                <div className="text-slate-400">Receive financial statements, receipts, and payment schedule updates</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 border border-border cursor-pointer hover:bg-slate-900 transition-colors">
              <input
                type="checkbox"
                checked={notifyMilestones}
                onChange={(e) => setNotifyMilestones(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-border focus:ring-0"
              />
              <div className="text-xs">
                <div className="font-semibold text-white">Project Roadmap Milestones</div>
                <div className="text-slate-400">Weekly progress summaries and phase completion announcements</div>
              </div>
            </label>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-sm transition-all shadow-md flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
