'use client';

import React, { useState, useEffect } from 'react';
import { X, Building2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Business, VerificationStatus } from '@/types';
import { useProject } from '@/context/ProjectContext';
import { repository, DuplicateMatch } from '@/lib/db/repository';
import { extractDomain } from '@/lib/utils';

interface BusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBusinessSaved: () => void;
  initialBusiness?: Business | null;
}

export function BusinessModal({
  isOpen,
  onClose,
  onBusinessSaved,
  initialBusiness,
}: BusinessModalProps) {
  const { activeProject } = useProject();
  const [officialName, setOfficialName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [businessModel, setBusinessModel] = useState('Commercial Services');
  const [foundingYear, setFoundingYear] = useState('');
  const [teamSizeEstimate, setTeamSizeEstimate] = useState('');
  const [fleetCapacity, setFleetCapacity] = useState('');
  const [ownerManagerName, setOwnerManagerName] = useState('');
  const [ownerManagerRole, setOwnerManagerRole] = useState('President / Owner');
  const [ownerVerificationStatus, setOwnerVerificationStatus] = useState<VerificationStatus>('unverified');
  const [reviewRating, setReviewRating] = useState('');
  const [reviewCount, setReviewCount] = useState('');
  const [marketingChannelsInput, setMarketingChannelsInput] = useState('');
  const [growthSignalsInput, setGrowthSignalsInput] = useState('');
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [isCheckingDedupe, setIsCheckingDedupe] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialBusiness) {
      setOfficialName(initialBusiness.officialName);
      setBrandName(initialBusiness.brandName || '');
      setWebsiteUrl(initialBusiness.websiteUrl || '');
      setPhone(initialBusiness.phone || '');
      setEmail(initialBusiness.email || '');
      setCity(initialBusiness.city || '');
      setState(initialBusiness.state || '');
      setServiceArea(initialBusiness.serviceArea || '');
      setBusinessModel(initialBusiness.businessModel || 'Commercial Services');
      setFoundingYear(initialBusiness.foundingYear ? String(initialBusiness.foundingYear) : '');
      setTeamSizeEstimate(initialBusiness.teamSizeEstimate || '');
      setFleetCapacity(initialBusiness.fleetCapacity || '');
      setOwnerManagerName(initialBusiness.ownerManagerName || '');
      setOwnerManagerRole(initialBusiness.ownerManagerRole || '');
      setOwnerVerificationStatus(initialBusiness.ownerVerificationStatus || 'unverified');
      setReviewRating(initialBusiness.reviewRating ? String(initialBusiness.reviewRating) : '');
      setReviewCount(initialBusiness.reviewCount ? String(initialBusiness.reviewCount) : '');
      setMarketingChannelsInput((initialBusiness.marketingChannels || []).join(', '));
      setGrowthSignalsInput((initialBusiness.growthSignals || []).join(', '));
    } else {
      setOfficialName('');
      setBrandName('');
      setWebsiteUrl('');
      setPhone('');
      setEmail('');
      setCity(activeProject?.cityArea || '');
      setState(activeProject?.stateRegion || '');
      setServiceArea('');
      setBusinessModel(activeProject?.industryNiche || 'Commercial Services');
      setFoundingYear('');
      setTeamSizeEstimate('');
      setFleetCapacity('');
      setOwnerManagerName('');
      setOwnerManagerRole('President / Owner');
      setOwnerVerificationStatus('unverified');
      setReviewRating('');
      setReviewCount('');
      setMarketingChannelsInput('');
      setGrowthSignalsInput('');
      setDuplicates([]);
    }
  }, [initialBusiness, isOpen, activeProject]);

  // Live Duplicate Check
  useEffect(() => {
    if (!websiteUrl && !phone && !officialName) {
      setDuplicates([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingDedupe(true);
      const matches = await repository.findDuplicates(
        {
          id: initialBusiness?.id,
          officialName,
          websiteUrl,
          phone,
          domain: websiteUrl ? extractDomain(websiteUrl) : '',
        },
        activeProject?.id
      );
      setDuplicates(matches);
      setIsCheckingDedupe(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [officialName, websiteUrl, phone, initialBusiness, activeProject]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officialName.trim() || !websiteUrl.trim()) {
      setError('Official Business Name and Website URL are required.');
      return;
    }
    if (!activeProject) {
      setError('Please select or create an active research project first.');
      return;
    }

    const domain = extractDomain(websiteUrl.trim());

    const business: Business = {
      id: initialBusiness?.id || `biz-${Date.now()}`,
      projectId: activeProject.id,
      officialName: officialName.trim(),
      brandName: brandName.trim() || undefined,
      domain,
      websiteUrl: websiteUrl.trim().startsWith('http') ? websiteUrl.trim() : `https://${websiteUrl.trim()}`,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      country: activeProject.country,
      serviceArea: serviceArea.trim() || undefined,
      businessModel: businessModel.trim(),
      foundingYear: foundingYear ? parseInt(foundingYear, 10) : undefined,
      teamSizeEstimate: teamSizeEstimate.trim() || undefined,
      fleetCapacity: fleetCapacity.trim() || undefined,
      ownerManagerName: ownerManagerName.trim() || undefined,
      ownerManagerRole: ownerManagerRole.trim() || undefined,
      ownerVerificationStatus,
      reviewRating: reviewRating ? parseFloat(reviewRating) : undefined,
      reviewCount: reviewCount ? parseInt(reviewCount, 10) : undefined,
      marketingChannels: marketingChannelsInput
        ? marketingChannelsInput.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      growthSignals: growthSignalsInput
        ? growthSignalsInput.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      status: initialBusiness?.status || 'discovered',
      isDemo: false,
      createdAt: initialBusiness?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await repository.saveBusiness(business);
    onBusinessSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-surface-100 border border-border rounded-xl w-full max-w-2xl my-8 p-6 shadow-2xl relative text-left">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-100">
              {initialBusiness ? 'Edit Business Record' : 'Add Business Record'}
            </h2>
            <p className="text-xs text-slate-400">
              Enter verified or observable public facts. Identity details must have provenance.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Duplicate Warning Banner */}
        {duplicates.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Potential Duplicate Match Detected:</p>
              <p className="text-slate-300 mt-0.5">
                Matches existing record: <strong>{duplicates[0].existing.officialName}</strong> (by {duplicates[0].matchField}, confidence: {Math.round(duplicates[0].confidence * 100)}%).
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Official Business Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={officialName}
                onChange={e => setOfficialName(e.target.value)}
                placeholder="e.g. Apex Mechanical Solutions Inc"
                className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Brand / DBA Name</label>
              <input
                type="text"
                value={brandName}
                onChange={e => setBrandName(e.target.value)}
                placeholder="e.g. Apex Mechanical TX"
                className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Website URL <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                placeholder="https://apexmechanicaltx.com"
                className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(214) 555-0144"
                className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="info@apexmechanicaltx.com"
                className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Service Area / Corridors</label>
              <input
                type="text"
                value={serviceArea}
                onChange={e => setServiceArea(e.target.value)}
                placeholder="Dallas, Irving, Plano"
                className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Leadership & Verification */}
          <div className="p-3 bg-surface-50 rounded-lg border border-border space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Leadership & Provenance
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Owner / Decision-Maker Name</label>
                <input
                  type="text"
                  value={ownerManagerName}
                  onChange={e => setOwnerManagerName(e.target.value)}
                  placeholder="e.g. Marcus Vance"
                  className="w-full bg-surface-100 border border-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Role / Title</label>
                <input
                  type="text"
                  value={ownerManagerRole}
                  onChange={e => setOwnerManagerRole(e.target.value)}
                  placeholder="e.g. President"
                  className="w-full bg-surface-100 border border-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Verification Status</label>
                <select
                  value={ownerVerificationStatus}
                  onChange={e => setOwnerVerificationStatus(e.target.value as VerificationStatus)}
                  className="w-full bg-surface-100 border border-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="verified">Verified (Registry / Official source)</option>
                  <option value="estimated">Estimated</option>
                  <option value="hypothesis">Hypothesis</option>
                  <option value="unverified">Unverified (Requires verification)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Operational Capacity & Reviews */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Team Size</label>
              <input
                type="text"
                value={teamSizeEstimate}
                onChange={e => setTeamSizeEstimate(e.target.value)}
                placeholder="25 employees"
                className="w-full bg-surface-50 border border-border rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Fleet Capacity</label>
              <input
                type="text"
                value={fleetCapacity}
                onChange={e => setFleetCapacity(e.target.value)}
                placeholder="16 service vans"
                className="w-full bg-surface-50 border border-border rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Rating (★)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={reviewRating}
                onChange={e => setReviewRating(e.target.value)}
                placeholder="4.8"
                className="w-full bg-surface-50 border border-border rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Review Count</label>
              <input
                type="number"
                value={reviewCount}
                onChange={e => setReviewCount(e.target.value)}
                placeholder="64"
                className="w-full bg-surface-50 border border-border rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-lg shadow-cyan-500/20"
            >
              Save Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
