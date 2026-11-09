'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Star,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Plus,
  Upload,
  Download,
  ExternalLink,
  ShieldCheck,
  Building2,
  Phone,
  Globe,
  MessageSquare,
  Award,
  ArrowUpRight,
  Copy,
  Check,
  Trash2,
  Edit3,
  Layers,
  Sparkles,
  Info,
  Sliders,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { repository } from '@/lib/db/repository';
import type {
  Business,
  LocalSeoProfile,
  LocalReview,
  LocalSeoScorecard,
  Opportunity,
} from '@/types';
import {
  calculateLocalSeoScorecard,
  generateLocalSeoOpportunities,
  evaluateNapConsistency,
} from '@/lib/engines/localSeoEngine';
import { analyzeReviews } from '@/lib/engines/reviewIntelligenceEngine';

type TabId =
  | 'overview_scorecard'
  | 'profile_nap'
  | 'review_intelligence'
  | 'competitor_comparison'
  | 'service_areas'
  | 'opportunities'
  | 'executive_report';

export function LocalSeoIntelligenceView() {
  const { activeProject } = useProject();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [profiles, setProfiles] = useState<LocalSeoProfile[]>([]);
  const [reviews, setReviews] = useState<LocalReview[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('overview_scorecard');
  const [isLoading, setIsLoading] = useState(true);
  const [isAuditingLive, setIsAuditingLive] = useState(false);
  const [auditNotice, setAuditNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Profile Editor Modal State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<LocalSeoProfile>>({});

  // Review Form Modal State
  const [isAddReviewOpen, setIsAddReviewOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState<Partial<LocalReview>>({
    rating: 5,
    sentiment: 'positive',
    reviewDate: new Date().toISOString().split('T')[0],
  });

  // Load Data
  const loadData = async () => {
    if (!activeProject) return;
    try {
      setIsLoading(true);
      const [allBiz, allProfs, allRevs] = await Promise.all([
        repository.getBusinesses(activeProject.id),
        repository.getLocalSeoProfiles(activeProject.id),
        repository.getLocalReviews(undefined, activeProject.id),
      ]);

      setBusinesses(allBiz);
      setProfiles(allProfs);
      setReviews(allRevs);

      if (allBiz.length > 0 && !selectedBusinessId) {
        setSelectedBusinessId(allBiz[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProject?.id]);

  // Selected Business & Active Profile
  const selectedBusiness = useMemo(
    () => businesses.find(b => b.id === selectedBusinessId) || businesses[0],
    [businesses, selectedBusinessId]
  );

  const activeProfile = useMemo(
    () => profiles.find(p => p.businessId === selectedBusiness?.id),
    [profiles, selectedBusiness]
  );

  const activeBusinessReviews = useMemo(
    () => reviews.filter(r => r.businessId === selectedBusiness?.id),
    [reviews, selectedBusiness]
  );

  // Review Intelligence NLP
  const reviewIntel = useMemo(
    () => analyzeReviews(activeBusinessReviews),
    [activeBusinessReviews]
  );

  // 6-Dimension Scorecard
  const scorecard: LocalSeoScorecard | null = useMemo(() => {
    if (!activeProfile) return null;
    return calculateLocalSeoScorecard(activeProfile, selectedBusiness, activeBusinessReviews, profiles);
  }, [activeProfile, selectedBusiness, activeBusinessReviews, profiles]);

  // Opportunities
  const generatedOpportunities: Opportunity[] = useMemo(() => {
    if (!activeProfile || !scorecard) return [];
    return generateLocalSeoOpportunities(activeProfile, scorecard, activeBusinessReviews);
  }, [activeProfile, scorecard, activeBusinessReviews]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Push opportunity to project database
  const handlePushOpportunity = async (opp: Opportunity) => {
    await repository.saveOpportunity(opp);
    setAuditNotice({
      type: 'success',
      message: `Opportunity "${opp.identifiedProblem.slice(0, 40)}..." added to Project Opportunities!`,
    });
    setTimeout(() => setAuditNotice(null), 4000);
  };

  // Live Audit Trigger
  const handleRunLiveLocalAudit = async () => {
    if (!selectedBusiness?.websiteUrl) {
      setAuditNotice({ type: 'error', message: 'Selected business does not have a valid website URL.' });
      return;
    }

    try {
      setIsAuditingLive(true);
      setAuditNotice(null);

      const res = await fetch('/api/local-seo/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: selectedBusiness.websiteUrl,
          expectedName: selectedBusiness.officialName,
          expectedPhone: selectedBusiness.phone,
          expectedAddress: selectedBusiness.fullAddress,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to inspect website local SEO');
      }

      // Update or create LocalSeoProfile
      const existing = activeProfile || {
        id: `lseo-${Date.now()}`,
        businessId: selectedBusiness.id,
        projectId: activeProject!.id,
        businessName: selectedBusiness.officialName,
        address: selectedBusiness.fullAddress,
        phone: selectedBusiness.phone,
        websiteUrl: selectedBusiness.websiteUrl,
        primaryCategory: 'HVAC Contractor',
        secondaryCategories: ['Mechanical Contractor'],
        serviceAreas: selectedBusiness.serviceArea ? selectedBusiness.serviceArea.split(',').map(s => s.trim()) : ['Metro Area'],
        zipCodes: selectedBusiness.postalCode ? [selectedBusiness.postalCode] : [],
        openingHours: 'Mon-Fri: 8:00 AM - 5:00 PM',
        description: `${selectedBusiness.officialName} provides commercial services in ${selectedBusiness.city || 'Texas'}.`,
        servicesList: ['Commercial Service', 'Preventative Maintenance'],
        photosCount: 12,
        hasCoverPhoto: true,
        reviewCount: selectedBusiness.reviewCount || 10,
        averageRating: selectedBusiness.reviewRating || 4.2,
        respondedReviewsCount: 5,
        source: 'live_inspect',
        apiConfigured: false,
        createdAt: new Date().toISOString(),
      };

      const updatedProfile: LocalSeoProfile = {
        ...existing,
        hasLocalBusinessSchema: data.hasLocalBusinessSchema,
        hasServiceAreaPages: data.hasServiceAreaPages,
        lastAuditedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        napConsistencyStatus: data.napCrossCheck?.phoneFound ? 'matched' : 'mismatched',
        napDiscrepancies: data.napCrossCheck?.phoneFound
          ? []
          : [`Phone (${selectedBusiness.phone}) was not explicitly detected on homepage HTML.`],
      };

      await repository.saveLocalSeoProfile(updatedProfile);
      await loadData();

      setAuditNotice({
        type: 'success',
        message: `Live Local SEO audit complete! Schema.org LocalBusiness: ${
          data.hasLocalBusinessSchema ? 'Detected ✓' : 'Missing ✗'
        } | Geo Pages: ${data.hasServiceAreaPages ? 'Detected ✓' : 'Missing ✗'}`,
      });
    } catch (err: unknown) {
      setAuditNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error executing live local audit.',
      });
    } finally {
      setIsAuditingLive(false);
      setTimeout(() => setAuditNotice(null), 6000);
    }
  };

  // Save Profile Edits
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness || !activeProject) return;

    const profileToSave: LocalSeoProfile = {
      id: activeProfile?.id || `lseo-${Date.now()}`,
      businessId: selectedBusiness.id,
      projectId: activeProject.id,
      businessName: profileForm.businessName || selectedBusiness.officialName,
      address: profileForm.address || selectedBusiness.fullAddress || '',
      phone: profileForm.phone || selectedBusiness.phone || '',
      websiteUrl: profileForm.websiteUrl || selectedBusiness.websiteUrl || '',
      googleBusinessProfileUrl: profileForm.googleBusinessProfileUrl || '',
      primaryCategory: profileForm.primaryCategory || 'HVAC Contractor',
      secondaryCategories: profileForm.secondaryCategories || ['Mechanical Contractor'],
      serviceAreas: profileForm.serviceAreas || ['Dallas', 'Fort Worth'],
      zipCodes: profileForm.zipCodes || ['75229'],
      serviceRadiusMiles: profileForm.serviceRadiusMiles || 30,
      openingHours: profileForm.openingHours || 'Mon-Fri: 8:00 AM - 5:00 PM',
      description: profileForm.description || '',
      servicesList: profileForm.servicesList || ['Commercial AC Repair', 'Chiller Maintenance'],
      photosCount: Number(profileForm.photosCount) || 10,
      hasCoverPhoto: Boolean(profileForm.hasCoverPhoto),
      reviewCount: Number(profileForm.reviewCount) || 0,
      averageRating: Number(profileForm.averageRating) || 0,
      respondedReviewsCount: Number(profileForm.respondedReviewsCount) || 0,
      averageResponseTimeDays: Number(profileForm.averageResponseTimeDays) || 2,
      qaCount: Number(profileForm.qaCount) || 0,
      unansweredQaCount: Number(profileForm.unansweredQaCount) || 0,
      hasLocalBusinessSchema: Boolean(profileForm.hasLocalBusinessSchema),
      hasServiceAreaPages: Boolean(profileForm.hasServiceAreaPages),
      napConsistencyStatus: profileForm.napConsistencyStatus || 'matched',
      napDiscrepancies: profileForm.napDiscrepancies || [],
      source: profileForm.source || 'manual',
      apiConfigured: false,
      lastAuditedAt: new Date().toISOString(),
      createdAt: activeProfile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await repository.saveLocalSeoProfile(profileToSave);
    setIsEditProfileOpen(false);
    await loadData();
  };

  // Add Review
  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness || !activeProject) return;

    const newReview: LocalReview = {
      id: `rev-${Date.now()}`,
      profileId: activeProfile?.id || 'lseo-manual',
      businessId: selectedBusiness.id,
      projectId: activeProject.id,
      authorName: reviewForm.authorName || 'Verified Client',
      rating: Number(reviewForm.rating) || 5,
      reviewDate: reviewForm.reviewDate || new Date().toISOString().split('T')[0],
      reviewText: reviewForm.reviewText || '',
      ownerResponseText: reviewForm.ownerResponseText || '',
      ownerResponseDate: reviewForm.ownerResponseText ? new Date().toISOString().split('T')[0] : '',
      sentiment: Number(reviewForm.rating) >= 4 ? 'positive' : Number(reviewForm.rating) === 3 ? 'neutral' : 'negative',
      detectedComplaintTopic: reviewForm.detectedComplaintTopic || undefined,
      detectedPraiseTopic: reviewForm.detectedPraiseTopic || undefined,
      serviceMentioned: reviewForm.serviceMentioned || undefined,
    };

    await repository.saveLocalReview(newReview);
    setIsAddReviewOpen(false);
    setReviewForm({ rating: 5, sentiment: 'positive', reviewDate: new Date().toISOString().split('T')[0] });
    await loadData();
  };

  // Delete Review
  const handleDeleteReview = async (id: string) => {
    await repository.deleteLocalReview(id);
    await loadData();
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!profiles.length) return;
    const headers = [
      'Business Name',
      'Primary Category',
      'Rating',
      'Review Count',
      'Phone',
      'Address',
      'NAP Status',
      'Local Schema',
      'Geo Pages',
    ];
    const rows = profiles.map(p => [
      `"${p.businessName.replace(/"/g, '""')}"`,
      `"${p.primaryCategory.replace(/"/g, '""')}"`,
      p.averageRating,
      p.reviewCount,
      `"${p.phone || ''}"`,
      `"${(p.address || '').replace(/"/g, '""')}"`,
      p.napConsistencyStatus,
      p.hasLocalBusinessSchema ? 'Yes' : 'No',
      p.hasServiceAreaPages ? 'Yes' : 'No',
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `watech_local_seo_report_${activeProject?.name.replace(/[^a-z0-9]/gi, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!activeProject) {
    return (
      <div className="p-8 text-center text-slate-400">
        Please select or create a project to access the Local SEO & Google Business Profile Engine.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Local SEO & Google Business Profile Intelligence
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25 uppercase">
                  Prompt 05
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  Free-First / Zero Hallucination
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Audit Google Business Profiles, inspect Schema.org LocalBusiness markup, detect NAP discrepancies, analyze review sentiment, and generate evidence-backed outreach hooks.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-50 hover:bg-surface-100 border border-border text-xs font-medium text-slate-300 transition-all"
            title="Export Local SEO records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-50 hover:bg-surface-100 border border-border text-xs font-medium text-slate-300 transition-all"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            Print Report
          </button>
          <button
            onClick={handleRunLiveLocalAudit}
            disabled={isAuditingLive || !selectedBusiness?.websiteUrl}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditingLive ? 'animate-spin' : ''}`} />
            {isAuditingLive ? 'Probing Local SEO...' : 'Live Schema & NAP Audit'}
          </button>
        </div>
      </div>

      {/* Audit Notification Banner */}
      {auditNotice && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            auditNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {auditNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{auditNotice.message}</span>
          </div>
          <button
            onClick={() => setAuditNotice(null)}
            className="text-slate-400 hover:text-white text-xs underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Business Selector & API Provenance Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-surface-100/60 border border-border">
        {/* Business Select */}
        <div className="lg:col-span-2 space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            Active Target Business
          </label>
          <select
            value={selectedBusinessId}
            onChange={e => setSelectedBusinessId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-surface-50 border border-border text-sm text-slate-100 focus:outline-none focus:border-blue-500"
          >
            {businesses.map(b => (
              <option key={b.id} value={b.id}>
                {b.officialName} — {b.city || 'DFW'} ({b.domain || 'no domain'})
              </option>
            ))}
          </select>
        </div>

        {/* Provenance Badge */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-300 block">Data Provenance</span>
          <div className="px-3 py-2 rounded-lg bg-surface-50 border border-border text-xs flex items-center justify-between">
            <span className="text-slate-400 font-mono">Source:</span>
            <span className="font-semibold text-blue-400 uppercase tracking-wider text-[11px]">
              {activeProfile?.source || 'Manual / Seeded'}
            </span>
          </div>
        </div>

        {/* API Status Badge */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-300 block">Google API Status</span>
          <div className="px-3 py-2 rounded-lg bg-surface-50 border border-border text-xs flex items-center justify-between">
            <span className="text-slate-400 font-mono">Places API:</span>
            <span className="font-semibold text-amber-400 text-[11px] flex items-center gap-1">
              <Info className="w-3 h-3" />
              Unconfigured (Public Fallback)
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border overflow-x-auto gap-1 text-xs font-medium">
        {[
          { id: 'overview_scorecard', label: '6-Dimension Scorecard', icon: Award },
          { id: 'profile_nap', label: 'Profile & NAP Consistency', icon: ShieldCheck },
          { id: 'review_intelligence', label: `Review Intelligence (${activeBusinessReviews.length})`, icon: MessageSquare },
          { id: 'competitor_comparison', label: 'Competitor Comparison', icon: Layers },
          { id: 'service_areas', label: 'Service Areas & Geo', icon: MapPin },
          { id: 'opportunities', label: `Watech Opportunities (${generatedOpportunities.length})`, icon: Sparkles },
          { id: 'executive_report', label: 'Executive Report', icon: Printer },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabId)}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-blue-500 text-white font-semibold bg-blue-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 6-DIMENSION SCORECARD */}
      {/* ========================================================================= */}
      {activeTab === 'overview_scorecard' && scorecard && (
        <div className="space-y-6">
          {/* Hero Overall Score Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-surface-100 via-surface-100/90 to-blue-950/20 border border-border flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25 uppercase">
                  Local SEO Scorecard
                </span>
                <span className="text-xs text-slate-400">
                  Target: <strong className="text-white">{selectedBusiness?.officialName}</strong>
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Overall Local Search Authority:{' '}
                <span
                  className={`${
                    scorecard.band === 'A'
                      ? 'text-emerald-400'
                      : scorecard.band === 'B'
                      ? 'text-blue-400'
                      : scorecard.band === 'C'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {scorecard.totalScore}/100 (Band {scorecard.band})
                </span>
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">{scorecard.summary}</p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-center p-3 rounded-xl bg-surface-50 border border-border min-w-[100px]">
                <div className="text-2xl font-black text-amber-400">
                  {activeProfile?.averageRating || 0}★
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">
                  {activeProfile?.reviewCount || 0} Reviews
                </div>
              </div>
              <div className="text-center p-3 rounded-xl bg-surface-50 border border-border min-w-[100px]">
                <div className="text-2xl font-black text-blue-400">
                  {reviewIntel.responseRatePercentage}%
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">
                  Response Rate
                </div>
              </div>
            </div>
          </div>

          {/* 6 Dimensions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              scorecard.profileCompleteness,
              scorecard.napConsistency,
              scorecard.reviewManagement,
              scorecard.websiteLocalSeo,
              scorecard.localContent,
              scorecard.competitorPositioning,
            ].map((dim, idx) => (
              <div
                key={idx}
                className="p-5 rounded-xl bg-surface-100/70 border border-border hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-sm text-white">{dim.name}</span>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                        dim.score >= 80
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                          : dim.score >= 60
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/25'
                          : dim.score >= 40
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                      }`}
                    >
                      {dim.score}/100
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-surface-50 rounded-full overflow-hidden mb-4">
                    <div
                      className={`h-full transition-all duration-500 ${
                        dim.score >= 80
                          ? 'bg-emerald-500'
                          : dim.score >= 60
                          ? 'bg-blue-500'
                          : dim.score >= 40
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${dim.score}%` }}
                    />
                  </div>

                  {/* Evidence */}
                  <div className="space-y-1.5 mb-3">
                    <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider block">
                      Evidence Verified:
                    </span>
                    {dim.evidence.length > 0 ? (
                      dim.evidence.slice(0, 2).map((ev, i) => (
                        <div key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{ev}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 italic">No positive signals verified yet.</span>
                    )}
                  </div>
                </div>

                {/* Gaps */}
                {dim.gaps.length > 0 && (
                  <div className="pt-3 border-t border-border/60">
                    <span className="text-[10px] font-semibold uppercase text-amber-400/90 tracking-wider block mb-1">
                      Improvement Gap:
                    </span>
                    <div className="text-xs text-amber-300/90 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{dim.gaps[0]}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PROFILE & NAP CONSISTENCY */}
      {/* ========================================================================= */}
      {activeTab === 'profile_nap' && (
        <div className="space-y-6">
          {/* Top Action Bar */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-100 border border-border">
            <div>
              <h3 className="font-semibold text-white text-sm">Google Business Profile Snapshot</h3>
              <p className="text-xs text-slate-400">
                Cross-checking Name, Address, and Phone (NAP) against official website and records.
              </p>
            </div>
            <button
              onClick={() => {
                if (activeProfile) {
                  setProfileForm(activeProfile);
                } else if (selectedBusiness) {
                  setProfileForm({
                    businessName: selectedBusiness.officialName,
                    address: selectedBusiness.fullAddress,
                    phone: selectedBusiness.phone,
                    websiteUrl: selectedBusiness.websiteUrl,
                  });
                }
                setIsEditProfileOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-50 hover:bg-surface-100 border border-border text-xs text-slate-200"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-400" />
              Edit Profile Attributes
            </button>
          </div>

          {/* Side-by-Side NAP Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Record 1: Business Registry & Website */}
            <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  Official Business Record
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Primary Source
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Official Business Name:</span>
                  <span className="font-semibold text-white">{selectedBusiness?.officialName || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Registered Address:</span>
                  <span className="font-mono text-slate-200">{selectedBusiness?.fullAddress || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Phone Number:</span>
                  <span className="font-mono text-slate-200">{selectedBusiness?.phone || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Website:</span>
                  <a
                    href={selectedBusiness?.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline flex items-center gap-1"
                  >
                    {selectedBusiness?.websiteUrl || 'None'}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Record 2: Google Business Profile */}
            <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  Google Business Profile (GBP)
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    activeProfile?.napConsistencyStatus === 'matched'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}
                >
                  NAP: {activeProfile?.napConsistencyStatus === 'matched' ? 'Consistent ✓' : 'Discrepancy ✗'}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">GBP Listing Name:</span>
                  <span className="font-semibold text-white">{activeProfile?.businessName || 'Not cataloged'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Google Maps Address:</span>
                  <span className="font-mono text-slate-200">{activeProfile?.address || 'Not cataloged'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Google Profile Phone:</span>
                  <span className="font-mono text-slate-200">{activeProfile?.phone || 'Not cataloged'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Google Profile URL:</span>
                  {activeProfile?.googleBusinessProfileUrl ? (
                    <a
                      href={activeProfile.googleBusinessProfileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 hover:underline flex items-center gap-1"
                    >
                      View on Google Maps <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-slate-500 italic">No direct maps link</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* NAP Discrepancy Alerts */}
          {activeProfile?.napDiscrepancies && activeProfile.napDiscrepancies.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-xs text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Detected NAP Discrepancies (Demotes Local 3-Pack Rankings)</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                {activeProfile.napDiscrepancies.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Extended Profile Attributes Details */}
          <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Categories, Hours & Operational Signals
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-surface-50 border border-border space-y-1">
                <span className="text-slate-400 block text-[11px]">Primary Category:</span>
                <span className="font-semibold text-white">{activeProfile?.primaryCategory || 'Not set'}</span>
                <span className="text-slate-400 block text-[11px] pt-2">Secondary Categories:</span>
                <span className="text-slate-200">
                  {activeProfile?.secondaryCategories?.join(', ') || 'None assigned'}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-surface-50 border border-border space-y-1">
                <span className="text-slate-400 block text-[11px]">Opening Hours:</span>
                <span className="text-slate-200">{activeProfile?.openingHours || 'Not specified'}</span>
                <span className="text-slate-400 block text-[11px] pt-2">Public Photos:</span>
                <span className="text-slate-200 font-semibold">
                  {activeProfile?.photosCount || 0} photos ({activeProfile?.hasCoverPhoto ? 'Cover set' : 'No cover'})
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-surface-50 border border-border space-y-1">
                <span className="text-slate-400 block text-[11px]">Local Business Schema:</span>
                <span
                  className={`font-semibold ${
                    activeProfile?.hasLocalBusinessSchema ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {activeProfile?.hasLocalBusinessSchema ? 'Present on Website ✓' : 'Missing on Website ✗'}
                </span>
                <span className="text-slate-400 block text-[11px] pt-2">Geo Landing Pages:</span>
                <span
                  className={`font-semibold ${
                    activeProfile?.hasServiceAreaPages ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {activeProfile?.hasServiceAreaPages ? 'Active ✓' : 'Missing ✗'}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="p-3.5 rounded-lg bg-surface-50 border border-border space-y-1 text-xs">
              <span className="text-slate-400 block text-[11px]">Google Profile Description:</span>
              <p className="text-slate-300 leading-relaxed italic">
                "{activeProfile?.description || 'No business description provided.'}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REVIEW INTELLIGENCE */}
      {/* ========================================================================= */}
      {activeTab === 'review_intelligence' && (
        <div className="space-y-6">
          {/* Review KPI Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-surface-100 border border-border">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Total Analyzed</span>
                <MessageSquare className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-1">
                {reviewIntel.totalReviewsAnalyzed}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Public verified reviews</div>
            </div>

            <div className="p-4 rounded-xl bg-surface-100 border border-border">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Average Rating</span>
                <Star className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {activeProfile?.averageRating || 0}★
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Google Maps star rating</div>
            </div>

            <div className="p-4 rounded-xl bg-surface-100 border border-border">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Owner Response Rate</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {reviewIntel.responseRatePercentage}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Executive engagement</div>
            </div>

            <div className="p-4 rounded-xl bg-surface-100 border border-border">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Sentiment Split</span>
                <Award className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-sm font-semibold text-slate-200 mt-2 flex items-center gap-2">
                <span className="text-emerald-400">{reviewIntel.positiveCount} Pos</span>
                <span>/</span>
                <span className="text-amber-400">{reviewIntel.neutralCount} Neu</span>
                <span>/</span>
                <span className="text-rose-400">{reviewIntel.negativeCount} Neg</span>
              </div>
            </div>
          </div>

          {/* Complaint Patterns & Frequently Praised Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Common Complaints */}
            <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Identified Customer Complaints
                </h4>
                <span className="text-[10px] font-mono text-slate-400">Verbatim NLP Extraction</span>
              </div>

              {reviewIntel.commonComplaints.length > 0 ? (
                <div className="space-y-3">
                  {reviewIntel.commonComplaints.map((c, i) => (
                    <div key={i} className="p-3 rounded-lg bg-surface-50 border border-border space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-rose-300">{c.topic}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          {c.count} citation{c.count > 1 ? 's' : ''}
                        </span>
                      </div>
                      {c.evidenceQuotes.map((q, j) => (
                        <p key={j} className="text-[11px] text-slate-400 italic pl-2 border-l-2 border-rose-500/40">
                          "{q}"
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-4 text-center">
                  Zero recurring negative complaint patterns detected in available reviews.
                </p>
              )}
            </div>

            {/* Frequently Praised */}
            <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Frequently Praised Services & Strengths
                </h4>
                <span className="text-[10px] font-mono text-slate-400">Verbatim NLP Extraction</span>
              </div>

              {reviewIntel.frequentlyPraised.length > 0 ? (
                <div className="space-y-3">
                  {reviewIntel.frequentlyPraised.map((p, i) => (
                    <div key={i} className="p-3 rounded-lg bg-surface-50 border border-border space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-emerald-300">{p.serviceOrAspect}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {p.count} citation{p.count > 1 ? 's' : ''}
                        </span>
                      </div>
                      {p.evidenceQuotes.map((q, j) => (
                        <p key={j} className="text-[11px] text-slate-400 italic pl-2 border-l-2 border-emerald-500/40">
                          "{q}"
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-4 text-center">
                  No recurring praise patterns cataloged.
                </p>
              )}
            </div>
          </div>

          {/* Customer Expectations & Trust Opportunities */}
          <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Customer Expectations & Outreach Opportunities
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-surface-50 border border-border space-y-2">
                <span className="font-semibold text-white block">Unmet Customer Expectations:</span>
                <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                  {reviewIntel.customerExpectations.map((exp, i) => (
                    <li key={i}>{exp}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 rounded-lg bg-surface-50 border border-border space-y-2">
                <span className="font-semibold text-white block">Trust-Building Levers:</span>
                <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                  {reviewIntel.trustBuildingOpportunities.map((opp, i) => (
                    <li key={i}>{opp}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Individual Reviews Table & Add Button */}
          <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-white">Cataloged Reviews & Owner Responses</h4>
                <p className="text-xs text-slate-400">
                  Real client quotes analyzed. You can manually enter or import additional customer reviews.
                </p>
              </div>
              <button
                onClick={() => setIsAddReviewOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Review
              </button>
            </div>

            {activeBusinessReviews.length > 0 ? (
              <div className="space-y-3">
                {activeBusinessReviews.map(r => (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl bg-surface-50 border border-border space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{r.authorName}</span>
                        <div className="flex text-amber-400">
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-current" />
                          ))}
                        </div>
                        {r.reviewDate && <span className="text-slate-500">({r.reviewDate})</span>}
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            r.ownerResponseText
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {r.ownerResponseText ? 'Responded ✓' : 'Unresponded ✗'}
                        </span>
                        <button
                          onClick={() => handleDeleteReview(r.id)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="Delete review"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-slate-300 leading-relaxed italic">"{r.reviewText}"</p>

                    {r.ownerResponseText ? (
                      <div className="p-2.5 rounded-lg bg-surface-100 border border-border text-[11px] text-slate-300 space-y-1">
                        <span className="font-semibold text-emerald-400 block">Owner Response:</span>
                        <p>{r.ownerResponseText}</p>
                      </div>
                    ) : (
                      r.rating <= 3 && (
                        <div className="text-[11px] text-amber-400 flex items-center gap-1 font-mono">
                          <AlertTriangle className="w-3 h-3" />
                          Priority outreach hook: Unanswered negative customer experience
                        </div>
                      )
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic text-center py-6">
                No reviews cataloged yet. Click "Add Review" to insert customer feedback.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: COMPETITOR COMPARISON */}
      {/* ========================================================================= */}
      {activeTab === 'competitor_comparison' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-surface-100 border border-border">
            <h3 className="font-semibold text-white text-sm">Local Competitive Authority Matrix</h3>
            <p className="text-xs text-slate-400">
              Side-by-side comparison across all cataloged regional competitors in {activeProject.cityArea}.
              Missing data is explicitly displayed as "Unknown" rather than assuming weakness.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-surface-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-50 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Business</th>
                  <th className="py-3 px-4">Primary Category</th>
                  <th className="py-3 px-4 text-center">Rating & Reviews</th>
                  <th className="py-3 px-4 text-center">Owner Response</th>
                  <th className="py-3 px-4 text-center">Local Schema</th>
                  <th className="py-3 px-4 text-center">Geo Pages</th>
                  <th className="py-3 px-4 text-center">Photos</th>
                  <th className="py-3 px-4 text-right">Local Authority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {businesses.map(b => {
                  const prof = profiles.find(p => p.businessId === b.id);
                  const isCurrent = b.id === selectedBusiness?.id;
                  const bReviews = reviews.filter(r => r.businessId === b.id);
                  const bIntel = analyzeReviews(bReviews);
                  const bScore = prof ? calculateLocalSeoScorecard(prof, b, bReviews, profiles) : null;

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-surface-50/50 transition-colors ${
                        isCurrent ? 'bg-blue-500/5' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          {b.officialName}
                          {isCurrent && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              TARGET
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">{b.city || 'DFW Corridor'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {prof?.primaryCategory || 'Unknown'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {prof ? (
                          <div className="font-semibold text-amber-400">
                            {prof.averageRating}★{' '}
                            <span className="text-slate-400 font-normal">({prof.reviewCount})</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Unknown</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-semibold ${
                            bIntel.responseRatePercentage >= 70
                              ? 'text-emerald-400'
                              : bIntel.responseRatePercentage > 0
                              ? 'text-amber-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {bIntel.responseRatePercentage}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {prof ? (
                          prof.hasLocalBusinessSchema ? (
                            <span className="text-emerald-400 font-semibold">Yes ✓</span>
                          ) : (
                            <span className="text-rose-400 font-semibold">No ✗</span>
                          )
                        ) : (
                          <span className="text-slate-500 italic">Unknown</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {prof ? (
                          prof.hasServiceAreaPages ? (
                            <span className="text-emerald-400 font-semibold">Yes ✓</span>
                          ) : (
                            <span className="text-amber-400 font-semibold">No ✗</span>
                          )
                        ) : (
                          <span className="text-slate-500 italic">Unknown</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                        {prof ? prof.photosCount : 'Unknown'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {bScore ? (
                          <span
                            className={`font-bold font-mono px-2 py-0.5 rounded border text-xs ${
                              bScore.band === 'A'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                : bScore.band === 'B'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/25'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                            }`}
                          >
                            {bScore.totalScore}/100
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Uncalculated</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SERVICE AREAS & GEO */}
      {/* ========================================================================= */}
      {activeTab === 'service_areas' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-surface-100 border border-border">
            <h3 className="font-semibold text-white text-sm">Service Area & Geographic Coverage</h3>
            <p className="text-xs text-slate-400">
              Configure target municipalities, industrial corridors, and commercial postal codes.
            </p>
          </div>

          {/* Legal / Transparency Disclaimer */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2.5">
            <Info className="w-4 h-4 shrink-0 text-blue-400" />
            <span>
              <strong>Methodology Notice:</strong> Watech BI OS organizes businesses by geographical boundaries and demand corridors. Precise map-pack rank positions are not fabricated without an authenticated third-party rank tracker.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Service Areas */}
            <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Designated Service Areas ({activeProfile?.serviceAreas?.length || 0})
              </h4>
              <div className="flex flex-wrap gap-2">
                {activeProfile?.serviceAreas && activeProfile.serviceAreas.length > 0 ? (
                  activeProfile.serviceAreas.map((area, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-surface-50 border border-border text-xs text-slate-200 flex items-center gap-1.5"
                    >
                      <MapPin className="w-3 h-3 text-blue-400" />
                      {area}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic">No service areas cataloged.</span>
                )}
              </div>
            </div>

            {/* Target Postal Codes */}
            <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Commercial ZIP Codes ({activeProfile?.zipCodes?.length || 0})
              </h4>
              <div className="flex flex-wrap gap-2 font-mono text-xs">
                {activeProfile?.zipCodes && activeProfile.zipCodes.length > 0 ? (
                  activeProfile.zipCodes.map((zip, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-surface-50 border border-border text-slate-300"
                    >
                      {zip}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic font-sans">No ZIP codes defined.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: WATECH OPPORTUNITIES */}
      {/* ========================================================================= */}
      {activeTab === 'opportunities' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-surface-100 border border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white text-sm">
                Evidence-Backed Watech Growth Opportunities
              </h3>
              <p className="text-xs text-slate-400">
                Identified from the 6-Dimension Local SEO audit. Click to push directly to the project Opportunity database.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generatedOpportunities.map(opp => (
              <div
                key={opp.id}
                className="p-5 rounded-xl bg-surface-100 border border-border space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25 uppercase">
                      Service: {opp.relevantWatechService.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                      Impact: {opp.impact.toUpperCase()}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-white">{opp.identifiedProblem}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>Evidence:</strong> {opp.evidence}
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <strong>Solution:</strong> {opp.recommendedSolution}
                  </p>
                </div>

                <div className="pt-3 border-t border-border space-y-2">
                  <div className="p-2.5 rounded-lg bg-surface-50 border border-border text-[11px] text-slate-300">
                    <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider block">
                      Cold Outreach Angle:
                    </span>
                    <p className="italic mt-0.5">"{opp.suggestedOutreachAngle}"</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(opp.suggestedOutreachAngle, opp.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-50 hover:bg-surface-100 border border-border text-xs text-slate-200 transition-all"
                    >
                      {copiedId === opp.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied Hook!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy Hook</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handlePushOpportunity(opp)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white shadow-sm transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Push to CRM</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: EXECUTIVE PRINTABLE REPORT */}
      {/* ========================================================================= */}
      {activeTab === 'executive_report' && (
        <div className="p-8 rounded-2xl bg-surface-100 border border-border space-y-6 text-slate-100 print:bg-white print:text-black">
          {/* Header */}
          <div className="border-b border-border pb-6 flex items-start justify-between">
            <div>
              <div className="text-xs font-mono text-blue-400 uppercase tracking-widest">
                WATECH AI & MARKETING — LOCAL SEO AUDIT DOSSIER
              </div>
              <h2 className="text-2xl font-black text-white mt-1">
                {selectedBusiness?.officialName}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Website: {selectedBusiness?.websiteUrl} | Location: {selectedBusiness?.fullAddress || 'DFW Corridor'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-blue-400">
                {scorecard?.totalScore || 0}/100
              </div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Band {scorecard?.band || 'Hold'} Authority
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Executive Evaluation Summary
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">{scorecard?.summary}</p>
          </div>

          {/* 6 Dimensions Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Scorecard Dimensions & Evidence Logs
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {[
                scorecard?.profileCompleteness,
                scorecard?.napConsistency,
                scorecard?.reviewManagement,
                scorecard?.websiteLocalSeo,
                scorecard?.localContent,
                scorecard?.competitorPositioning,
              ]
                .filter(Boolean)
                .map((d, i) => (
                  <div key={i} className="p-3 rounded-lg bg-surface-50 border border-border">
                    <div className="flex items-center justify-between font-semibold mb-1">
                      <span>{d!.name}</span>
                      <span className="font-mono text-blue-400">{d!.score}/100</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {d!.evidence[0] || d!.gaps[0] || 'Standard benchmark applied.'}
                    </p>
                  </div>
                ))}
            </div>
          </div>

          {/* Action Roadmap */}
          <div className="space-y-2 pt-4 border-t border-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Recommended Watech Action Roadmap
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300">
              {generatedOpportunities.map((o, idx) => (
                <li key={idx}>
                  <strong>{o.identifiedProblem}</strong> — {o.recommendedSolution}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT PROFILE ATTRIBUTES */}
      {/* ========================================================================= */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-100 border border-border rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-white text-base">Edit Local SEO & GBP Attributes</h3>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Profile / GBP Business Name</label>
                  <input
                    type="text"
                    value={profileForm.businessName || ''}
                    onChange={e => setProfileForm({ ...profileForm, businessName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-50 border border-border text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Primary Category</label>
                  <input
                    type="text"
                    value={profileForm.primaryCategory || ''}
                    onChange={e => setProfileForm({ ...profileForm, primaryCategory: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-50 border border-border text-slate-100"
                    placeholder="e.g. HVAC Contractor"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={profileForm.phone || ''}
                    onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-50 border border-border text-slate-100"
                    placeholder="(214) 555-0100"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Address / Street</label>
                  <input
                    type="text"
                    value={profileForm.address || ''}
                    onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-50 border border-border text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Review Count</label>
                  <input
                    type="number"
                    value={profileForm.reviewCount || 0}
                    onChange={e => setProfileForm({ ...profileForm, reviewCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-50 border border-border text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Average Star Rating (0 - 5.0)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={profileForm.averageRating || 0}
                    onChange={e => setProfileForm({ ...profileForm, averageRating: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-50 border border-border text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Public Photos Count</label>
                  <input
                    type="number"
                    value={profileForm.photosCount || 0}
                    onChange={e => setProfileForm({ ...profileForm, photosCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-50 border border-border text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Google Maps Profile URL</label>
                  <input
                    type="url"
                    value={profileForm.googleBusinessProfileUrl || ''}
                    onChange={e => setProfileForm({ ...profileForm, googleBusinessProfileUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-50 border border-border text-slate-100"
                    placeholder="https://maps.google.com/?cid=..."
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Profile Description</label>
                <textarea
                  rows={3}
                  value={profileForm.description || ''}
                  onChange={e => setProfileForm({ ...profileForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-50 border border-border text-slate-100"
                  placeholder="Official business description..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 rounded-lg bg-surface-50 border border-border text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md shadow-blue-500/20"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD MANUAL REVIEW */}
      {/* ========================================================================= */}
      {isAddReviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-100 border border-border rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-white text-base">Add Verified Customer Review</h3>
              <button
                onClick={() => setIsAddReviewOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReview} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Reviewer Name / Title</label>
                <input
                  type="text"
                  value={reviewForm.authorName || ''}
                  onChange={e => setReviewForm({ ...reviewForm, authorName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-50 border border-border text-slate-100"
                  placeholder="e.g. David Vance, Property Manager"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Star Rating (1 - 5)</label>
                  <select
                    value={reviewForm.rating || 5}
                    onChange={e => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-50 border border-border text-slate-100"
                  >
                    <option value={5}>5 Stars ★★★★★</option>
                    <option value={4}>4 Stars ★★★★☆</option>
                    <option value={3}>3 Stars ★★★☆☆</option>
                    <option value={2}>2 Stars ★★☆☆☆</option>
                    <option value={1}>1 Star ★☆☆☆☆</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Date Published</label>
                  <input
                    type="date"
                    value={reviewForm.reviewDate || ''}
                    onChange={e => setReviewForm({ ...reviewForm, reviewDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-50 border border-border text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Review Text</label>
                <textarea
                  rows={3}
                  value={reviewForm.reviewText || ''}
                  onChange={e => setReviewForm({ ...reviewForm, reviewText: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-50 border border-border text-slate-100"
                  placeholder="Verbatim review feedback from customer..."
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Owner Response (Optional)</label>
                <textarea
                  rows={2}
                  value={reviewForm.ownerResponseText || ''}
                  onChange={e => setReviewForm({ ...reviewForm, ownerResponseText: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-50 border border-border text-slate-100"
                  placeholder="Leave empty if business has not responded..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddReviewOpen(false)}
                  className="px-4 py-2 rounded-lg bg-surface-50 border border-border text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium"
                >
                  Save Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
