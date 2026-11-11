'use client';

import React, { useState, useMemo } from 'react';
import {
  Globe2,
  MapPin,
  Building2,
  Tag,
  Sliders,
  Play,
  CheckCircle2,
  AlertCircle,
  Edit3,
  RotateCcw,
  Sparkles,
  Info,
  Layers,
  ChevronRight,
  ShieldCheck,
  Search,
} from 'lucide-react';

export interface DiscoverySearchParams {
  country: string;
  state: string;
  city: string;
  area: string;
  postalCode: string;
  industry: string;
  niche: string;
  keyword: string;
  targetCount: number;
  minimumScore: number;
}

export interface DiscoveryExecutionPayload {
  location: string;
  industry: string;
  count: number;
  minimumScore: number;
  rawConfig: DiscoverySearchParams;
}

export interface DiscoverySearchInterfaceProps {
  initialValues?: Partial<DiscoverySearchParams>;
  onExecute: (payload: DiscoveryExecutionPayload) => void;
  isRunning?: boolean;
  className?: string;
  onCancel?: () => void;
  showCancelButton?: boolean;
}

const COMMON_INDUSTRY_PRESETS = [
  'Real Estate',
  'Home Services & HVAC',
  'Handcrafted Furniture & Woodwork',
  'Commercial Roofing',
  'Plumbing & Electrical',
  'Healthcare & Dental',
  'Hospitality & Event Venues',
  'Automotive & Detailing',
  'Legal & Professional Services',
  'Solar & Clean Energy',
];

export function DiscoverySearchInterface({
  initialValues,
  onExecute,
  isRunning = false,
  className = '',
  onCancel,
  showCancelButton = false,
}: DiscoverySearchInterfaceProps) {
  // Form State
  const [country, setCountry] = useState(initialValues?.country || '');
  const [state, setState] = useState(initialValues?.state || '');
  const [city, setCity] = useState(initialValues?.city || '');
  const [area, setArea] = useState(initialValues?.area || '');
  const [postalCode, setPostalCode] = useState(initialValues?.postalCode || '');

  const [industry, setIndustry] = useState(initialValues?.industry || '');
  const [niche, setNiche] = useState(initialValues?.niche || '');
  const [keyword, setKeyword] = useState(initialValues?.keyword || '');

  const [targetCount, setTargetCount] = useState<number>(initialValues?.targetCount || 25);
  const [minimumScore, setMinimumScore] = useState<number>(initialValues?.minimumScore ?? 50);

  // Review step toggle
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Validation
  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!country.trim()) errs.country = 'Country is required';
    if (!state.trim()) errs.state = 'State / Province / Region is required';
    if (!city.trim()) errs.city = 'City is required';
    if (!industry.trim()) errs.industry = 'Industry category is required';
    if (!niche.trim()) errs.niche = 'Business niche / subcategory is required';
    return errs;
  }, [country, state, city, industry, niche]);

  const isValid = Object.keys(errors).length === 0;

  // Format strings for backend contracts
  const constructedLocation = useMemo(() => {
    return [area.trim(), city.trim(), state.trim(), postalCode.trim(), country.trim()]
      .filter(Boolean)
      .join(', ');
  }, [area, city, state, postalCode, country]);

  const constructedIndustry = useMemo(() => {
    const base = [industry.trim(), niche.trim()].filter(Boolean).join(' - ');
    if (keyword.trim()) {
      return `${base} (${keyword.trim()})`;
    }
    return base;
  }, [industry, niche, keyword]);

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    if (!isValid) return;
    setIsReviewMode(true);
  };

  const handleExecute = () => {
    if (!isValid) {
      setIsReviewMode(false);
      setAttemptedSubmit(true);
      return;
    }

    onExecute({
      location: constructedLocation,
      industry: constructedIndustry,
      count: targetCount,
      minimumScore,
      rawConfig: {
        country: country.trim(),
        state: state.trim(),
        city: city.trim(),
        area: area.trim(),
        postalCode: postalCode.trim(),
        industry: industry.trim(),
        niche: niche.trim(),
        keyword: keyword.trim(),
        targetCount,
        minimumScore,
      },
    });
  };

  const handleReset = () => {
    setCountry('');
    setState('');
    setCity('');
    setArea('');
    setPostalCode('');
    setIndustry('');
    setNiche('');
    setKeyword('');
    setTargetCount(25);
    setMinimumScore(50);
    setIsReviewMode(false);
    setAttemptedSubmit(false);
  };

  return (
    <div className={`p-6 rounded-2xl bg-surface-100 border border-border shadow-sm text-left ${className}`}>
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Globe2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                Business Discovery Campaign Configuration
              </h2>
              <p className="text-xs text-slate-400">
                Precision geographic targeting &amp; granular business niche discovery
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isReviewMode ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Ready to Execute
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/30">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Configure Target Parameters
            </span>
          )}
        </div>
      </div>

      {/* Review Mode View */}
      {isReviewMode ? (
        <div className="mt-6 space-y-6">
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 space-y-1">
                <p className="font-semibold text-slate-200">
                  Campaign Pre-Execution Summary
                </p>
                <p className="text-slate-400">
                  Please review your discovery targeting parameters below. WATECH-BI will query verified local
                  business data sources using these exact specifications.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Geographic Summary Card */}
            <div className="p-4 rounded-xl bg-surface-50 border border-border space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-blue-400" />
                Geographic Targeting
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-slate-400">Country:</span>
                  <span className="font-semibold text-slate-200">{country}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-slate-400">State / Province:</span>
                  <span className="font-semibold text-slate-200">{state}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-slate-400">City:</span>
                  <span className="font-semibold text-slate-200">{city}</span>
                </div>
                {area && (
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-slate-400">Area / Neighborhood:</span>
                    <span className="font-medium text-slate-200">{area}</span>
                  </div>
                )}
                {postalCode && (
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-slate-400">ZIP / Postal Code:</span>
                    <span className="font-mono text-slate-200">{postalCode}</span>
                  </div>
                )}
                <div className="pt-1">
                  <span className="text-[11px] text-slate-500 block mb-1">Constructed Location Query:</span>
                  <div className="p-2 rounded-lg bg-surface-100 font-mono text-xs text-blue-300 border border-border break-words">
                    {constructedLocation}
                  </div>
                </div>
              </div>
            </div>

            {/* Business Targeting Summary Card */}
            <div className="p-4 rounded-xl bg-surface-50 border border-border space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                <Building2 className="w-4 h-4 text-emerald-400" />
                Business &amp; Volume Target
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-slate-400">Industry:</span>
                  <span className="font-semibold text-slate-200">{industry}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-slate-400">Niche / Subcategory:</span>
                  <span className="font-semibold text-slate-200">{niche}</span>
                </div>
                {keyword && (
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-slate-400">Search Keyword:</span>
                    <span className="font-medium text-emerald-300">{keyword}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-slate-400">Requested Quantity:</span>
                  <span className="font-mono font-bold text-blue-400">{targetCount} leads</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-slate-400">Min. Qualification Score:</span>
                  <span className="font-mono font-bold text-emerald-400">{minimumScore}/100</span>
                </div>
                <div className="pt-1">
                  <span className="text-[11px] text-slate-500 block mb-1">Constructed Business Query:</span>
                  <div className="p-2 rounded-lg bg-surface-100 font-mono text-xs text-emerald-300 border border-border break-words">
                    {constructedIndustry}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Density Notice */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/90 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-200">Volume Notice: </span>
              Target requested is <strong>{targetCount} businesses</strong>. Actual discovery volume is constrained by local market density and presence of verified business records in the selected geography. Unverified entries are filtered.
            </div>
          </div>

          {/* Action Buttons in Review Mode */}
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsReviewMode(false)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-50 hover:bg-surface-200 border border-border text-xs font-semibold text-slate-200 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-400" />
              <span>Edit Configuration</span>
            </button>

            <div className="w-full sm:w-auto flex items-center gap-2">
              {showCancelButton && onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleExecute}
                disabled={isRunning}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs shadow-lg shadow-blue-500/20 transition-all"
              >
                {isRunning ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Executing Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Launch Discovery Pipeline</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Configuration Form */
        <form onSubmit={handleProceedToReview} className="mt-6 space-y-6">
          {/* Section 1: Geographic Targeting */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-slate-200">1. Geographic Targeting</h3>
              </div>
              <span className="text-[11px] text-slate-500">Zero assumptions &bull; Global coverage</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* Country */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Country <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. Pakistan, United Kingdom, Canada"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-900 border text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none transition-colors ${
                    attemptedSubmit && errors.country
                      ? 'border-red-500/60 focus:border-red-500'
                      : 'border-border focus:border-blue-500'
                  }`}
                />
                {attemptedSubmit && errors.country && (
                  <p className="text-[10px] text-red-400 mt-1">{errors.country}</p>
                )}
              </div>

              {/* State / Province */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  State / Province / Region <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Punjab, Ontario, Texas"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-900 border text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none transition-colors ${
                    attemptedSubmit && errors.state
                      ? 'border-red-500/60 focus:border-red-500'
                      : 'border-border focus:border-blue-500'
                  }`}
                />
                {attemptedSubmit && errors.state && (
                  <p className="text-[10px] text-red-400 mt-1">{errors.state}</p>
                )}
              </div>

              {/* City */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  City <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Lahore, Toronto, Austin"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-900 border text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none transition-colors ${
                    attemptedSubmit && errors.city
                      ? 'border-red-500/60 focus:border-red-500'
                      : 'border-border focus:border-blue-500'
                  }`}
                />
                {attemptedSubmit && errors.city && (
                  <p className="text-[10px] text-red-400 mt-1">{errors.city}</p>
                )}
              </div>

              {/* Area / Neighborhood (Optional) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">Area / Neighborhood</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Optional</span>
                </div>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. Gulberg, Downtown, Soho"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-border text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* ZIP / Postal Code (Optional) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">ZIP / Postal Code</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Optional</span>
                </div>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="e.g. 54000, M5V 2T6, 78701"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-border text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Real-time Location Preview */}
              <div className="sm:col-span-2 lg:col-span-1 flex flex-col justify-end">
                <span className="text-[11px] text-slate-400 mb-1">Constructed Geo Query</span>
                <div className="px-3 py-2 rounded-xl bg-surface-50 border border-border/80 text-[11px] font-mono text-blue-300 truncate">
                  {constructedLocation || 'Waiting for inputs...'}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Business Targeting */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-200">2. Business Targeting</h3>
              </div>
              <span className="text-[11px] text-slate-500">Industry &amp; sub-niche filtering</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Industry */}
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Industry Category <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Real Estate, Home Services"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-900 border text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none transition-colors ${
                    attemptedSubmit && errors.industry
                      ? 'border-red-500/60 focus:border-red-500'
                      : 'border-border focus:border-emerald-500'
                  }`}
                />
                {attemptedSubmit && errors.industry && (
                  <p className="text-[10px] text-red-400 mt-1">{errors.industry}</p>
                )}
              </div>

              {/* Business Niche */}
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Business Niche / Subcategory <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="e.g. Commercial Plots, HVAC Repair"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-900 border text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none transition-colors ${
                    attemptedSubmit && errors.niche
                      ? 'border-red-500/60 focus:border-red-500'
                      : 'border-border focus:border-emerald-500'
                  }`}
                />
                {attemptedSubmit && errors.niche && (
                  <p className="text-[10px] text-red-400 mt-1">{errors.niche}</p>
                )}
              </div>

              {/* Optional Keyword */}
              <div className="md:col-span-1">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">Optional Business Keyword</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Optional</span>
                </div>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g. Emergency, Luxury, 24/7"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-border text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Quick Industry Presets */}
            <div>
              <span className="text-[11px] text-slate-400 block mb-1.5">Industry Presets (Click to autofill):</span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_INDUSTRY_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setIndustry(p);
                      if (!niche) {
                        setNiche('General Services');
                      }
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                      industry === p
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-surface-50 text-slate-400 border-border hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Quantity & Qualification Tuning */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-slate-200">3. Lead Volume &amp; Qualification</h3>
              </div>
              <span className="text-[11px] text-slate-500">Configurable up to 100 leads</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Target Count */}
              <div className="p-4 rounded-xl bg-surface-50 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block">Desired Lead Quantity</label>
                    <span className="text-[11px] text-slate-500">Maximum discovery targets</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={targetCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) setTargetCount(Math.min(100, Math.max(1, val)));
                      }}
                      className="w-16 px-2 py-1 rounded-lg bg-slate-900 border border-border text-center font-mono font-bold text-xs text-blue-400 focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-xs text-slate-400 font-mono">leads</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="1"
                  max="100"
                  value={targetCount}
                  onChange={(e) => setTargetCount(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-500 h-2 bg-slate-900 rounded-lg cursor-pointer"
                />

                <div className="flex items-center justify-between gap-1">
                  {[10, 25, 50, 75, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTargetCount(preset)}
                      className={`text-[10px] px-2 py-1 rounded-md border font-mono transition-colors ${
                        targetCount === preset
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                          : 'bg-slate-900 text-slate-400 border-border hover:text-slate-200'
                      }`}
                    >
                      {preset} leads
                    </button>
                  ))}
                </div>

                {/* Transparency Warning */}
                <div className="pt-2 border-t border-border/50 text-[11px] text-amber-400/90 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    Availability disclaimer: Target selection allows up to 100 leads, but actual discovered volume
                    depends strictly on local market density in {city || 'the selected location'}.
                  </span>
                </div>
              </div>

              {/* Minimum Score */}
              <div className="p-4 rounded-xl bg-surface-50 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block">Min. Qualification Score</label>
                    <span className="text-[11px] text-slate-500">Threshold for CRM ingestion</span>
                  </div>
                  <span className="font-mono font-bold text-xs text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                    {minimumScore} / 100
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="90"
                  step="5"
                  value={minimumScore}
                  onChange={(e) => setMinimumScore(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500 h-2 bg-slate-900 rounded-lg cursor-pointer"
                />

                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>0 (All leads)</span>
                  <span>50 (Moderate)</span>
                  <span>75+ (High-intent only)</span>
                </div>

                <div className="pt-2 border-t border-border/50 text-[11px] text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Prospects meeting this score will automatically progress into qualified CRM stages.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Fields</span>
            </button>

            <div className="w-full sm:w-auto flex items-center gap-2">
              {showCancelButton && onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 transition-all"
              >
                <span>Review Campaign Summary</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
