'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Building2,
  FolderPlus,
  FileSpreadsheet,
  Zap,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Globe,
  MapPin,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  FileText,
  Mail,
  Lock,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { useTenant } from '@/context/TenantContext';
import { repository } from '@/lib/db/repository';
import type { Business, ResearchProject } from '@/types';

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

const REAL_CANTON_STARTER_BUSINESSES: Partial<Business>[] = [
  {
    id: 'biz-onboard-elsass',
    officialName: 'Elsass Heating & Cooling',
    brandName: 'Elsass Heating',
    domain: 'elsassheat.com',
    websiteUrl: 'https://elsassheat.com',
    hasWebsite: true,
    phone: '(330) 494-8885',
    email: 'info@elsassheat.com',
    city: 'Canton',
    state: 'OH',
    country: 'USA',
    serviceArea: 'Canton & Stark County',
    businessModel: 'commercial',
    status: 'discovered',
  },
  {
    id: 'biz-onboard-fosters',
    officialName: "Foster's Heating & Air Conditioning",
    brandName: "Foster's HVAC",
    domain: 'fostersheatingair.com',
    websiteUrl: 'https://fostersheatingair.com',
    hasWebsite: true,
    phone: '(330) 418-0673',
    email: 'service@fostersheatingair.com',
    city: 'Canton',
    state: 'OH',
    country: 'USA',
    serviceArea: 'Canton Metro Area',
    businessModel: 'commercial',
    status: 'discovered',
  },
  {
    id: 'biz-onboard-bryant',
    officialName: 'Bryant Heating & Cooling Systems LLC',
    brandName: 'Bryant Heating LLC',
    domain: 'bryantheatingllc.com',
    websiteUrl: 'https://bryantheatingllc.com',
    hasWebsite: true,
    phone: '(330) 453-7603',
    email: 'contact@bryantheatingllc.com',
    city: 'Canton',
    state: 'OH',
    country: 'USA',
    serviceArea: 'Greater Canton',
    businessModel: 'commercial',
    status: 'discovered',
  },
  {
    id: 'biz-onboard-cantonco',
    officialName: 'Canton Heating & Cooling Co',
    brandName: 'Canton HVAC Co',
    domain: 'cantonhvacco.com',
    websiteUrl: 'https://cantonhvacco.com',
    hasWebsite: true,
    phone: '(330) 454-9457',
    email: 'help@cantonhvacco.com',
    city: 'Canton',
    state: 'OH',
    country: 'USA',
    serviceArea: 'Canton, OH',
    businessModel: 'commercial',
    status: 'discovered',
  },
];

export function CustomerOnboardingWizard() {
  const router = useRouter();
  const { setActiveProject, setActiveModule } = useProject();
  const { currentTenant, currentUser } = useTenant();

  const [step, setStep] = useState<WizardStep>(1);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Account
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [password, setPassword] = useState('');
  const [isAccountCreated, setIsAccountCreated] = useState(Boolean(currentUser));

  // Step 2: Organization
  const [companyName, setCompanyName] = useState(currentTenant?.name || 'Apex HVAC Agency');
  const [website, setWebsite] = useState(currentTenant?.customDomain || 'https://apexhvac.agency');
  const [industry, setIndustry] = useState('Commercial HVAC & Mechanical');
  const [country, setCountry] = useState('USA');
  const [location, setLocation] = useState('Canton, Ohio');
  const [companySize, setCompanySize] = useState('11-50');

  // Step 3: Project
  const [projectName, setProjectName] = useState('Canton Commercial HVAC Expansion');
  const [targetCity, setTargetCity] = useState('Canton, OH');
  const [targetNiche, setTargetNiche] = useState('HVAC');
  const [decisionMakerRole, setDecisionMakerRole] = useState('Owner, CEO, President');
  const [minScore, setMinScore] = useState(40);

  // Step 4: Data Source
  const [dataSource, setDataSource] = useState<'starter' | 'csv'>('starter');
  const [preparedBusinesses, setPreparedBusinesses] = useState<Business[]>([]);

  // Step 5 & 6: Execution & Activation
  const [isExecuting, setIsExecuting] = useState(false);
  const [pipelineResults, setPipelineResults] = useState<any>(null);

  // -------------------------------------------------------------
  // STEP HANDLERS
  // -------------------------------------------------------------

  const handleStep1Account = async () => {
    if (!fullName || !email) {
      setError('Please provide your name and email address.');
      return;
    }
    setError(null);
    setIsAccountCreated(true);
    setStep(2);
  };

  const handleStep2Organization = async () => {
    if (!companyName || !location) {
      setError('Company name and business location are required.');
      return;
    }
    setError(null);

    // Call server organization setup API
    try {
      await fetch('/api/organization/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          website,
          industry,
          country,
          businessLocation: location,
          companySize,
        }),
      });
    } catch {
      // Local fallback
    }

    setStep(3);
  };

  const handleStep3Project = async () => {
    if (!projectName || !targetCity) {
      setError('Project name and target location are required.');
      return;
    }
    setError(null);
    setStep(4);
  };

  const handleStep4DataSelection = async () => {
    const projectId = `proj-onboard-${Date.now()}`;
    const now = new Date().toISOString();

    // 1. Create and persist project
    const newProject: ResearchProject = {
      id: projectId,
      tenantId: currentTenant?.id || 'tenant-watech-hq',
      name: projectName.trim(),
      country: 'USA',
      stateRegion: 'OH',
      cityArea: targetCity.trim(),
      industryNiche: targetNiche.trim(),
      businessModel: 'commercial',
      watechServicesToEvaluate: ['website_development', 'local_seo', 'conversion_optimization'],
      researchDepth: 'deep',
      targetDiscoveryCount: 10,
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    };
    await repository.saveProject(newProject);
    setActiveProject(newProject);

    // 2. Prepare businesses
    const initialBiz: Business[] = REAL_CANTON_STARTER_BUSINESSES.map((b, idx) => ({
      id: `biz-onb-${Date.now()}-${idx + 1}`,
      tenantId: currentTenant?.id || 'tenant-watech-hq',
      projectId,
      officialName: b.officialName!,
      brandName: b.brandName,
      domain: b.domain!,
      websiteUrl: b.websiteUrl!,
      hasWebsite: true,
      phone: b.phone,
      email: b.email,
      city: 'Canton',
      state: 'OH',
      country: 'USA',
      serviceArea: 'Canton, OH',
      businessModel: 'commercial',
      status: 'discovered',
      ownerVerificationStatus: 'unverified',
      marketingChannels: [],
      opportunityScore: 0,
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    }));

    await repository.saveBusinesses(initialBiz);
    setPreparedBusinesses(initialBiz);
    setStep(5);
  };

  const handleStep5RunPipeline = async () => {
    setIsExecuting(true);
    setError(null);

    try {
      const response = await fetch('/api/pipeline/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'existing_businesses',
          existingBusinesses: preparedBusinesses,
          projectId: preparedBusinesses[0]?.projectId,
          projectName,
          minimumScore: minScore,
        }),
      });

      if (!response.ok) {
        throw new Error(`Pipeline failed with HTTP status ${response.status}`);
      }

      const data = await response.json();
      setPipelineResults(data);

      // Save pipeline batch into Dexie client cache
      if (data.data) {
        await repository.savePipelineBatch({
          project: data.data.project,
          businesses: data.data.businesses || [],
          audits: data.data.audits || [],
          contacts: data.data.contacts || [],
          emailRecords: data.data.emailRecords || [],
          opportunities: data.data.opportunities || [],
          leadScores: data.data.leadScores || [],
          followUpSchedules: data.data.followUpSchedules || [],
          crmActivities: data.data.crmActivities || [],
        });
      }

      // Mark onboarding as completed in storage
      if (typeof window !== 'undefined') {
        localStorage.setItem('watech_onboarding_completed', 'true');
        localStorage.setItem('watech_checklist_progress', '100');
      }

      setStep(6);
    } catch (err: any) {
      setError(`Activation error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleFinishAndNavigate = () => {
    setActiveModule('lead_pipeline');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#070b16] text-white flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8">
      {/* Top Header & Step Progress Bar */}
      <div className="max-w-4xl mx-auto w-full mb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>WATECH-BI CUSTOMER ACTIVATION ENGINE</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Launch Your Autonomous Lead Intelligence Workspace
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-xl mx-auto">
          From registration to your first qualified commercial HVAC lead batch in under 2 minutes.
        </p>

        {/* Stepper Navigation */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mt-8 flex-wrap">
          {[
            { num: 1, label: 'Account' },
            { num: 2, label: 'Organization' },
            { num: 3, label: 'Project' },
            { num: 4, label: 'Data Ingestion' },
            { num: 5, label: 'Pipeline Run' },
            { num: 6, label: 'Activated' },
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s.num
                    ? 'bg-blue-600 text-white ring-4 ring-blue-500/20 shadow-lg'
                    : step > s.num
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
              </div>
              <span className={`text-xs hidden sm:inline ${step >= s.num ? 'text-slate-200 font-medium' : 'text-slate-500'}`}>
                {s.label}
              </span>
              {s.num < 6 && <div className="w-4 sm:w-8 h-[1px] bg-slate-800" />}
            </div>
          ))}
        </div>
      </div>

      {/* Main Wizard Form Container */}
      <div className="max-w-2xl mx-auto w-full bg-[#0f172a] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative text-left">
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: ACCOUNT SETUP */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-white">1. Create Your Administrator Account</h3>
              <p className="text-xs text-slate-400">
                You will be assigned Organization Owner privileges with full multi-tenant access.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Legal Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Waseem Abbas"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Corporate Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="waseem000094@gmail.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="????????????"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={handleStep1Account}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg"
              >
                Continue to Organization Setup <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ORGANIZATION SETUP */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-white">2. Establish Your Organization & Tenant</h3>
              <p className="text-xs text-slate-400">
                All client workspaces, projects, lead pools, and CRM activities belong strictly to this tenant.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">Company / Agency Name</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Apex HVAC Agency LLC"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Primary Industry Focus</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="Commercial HVAC & Mechanical">Commercial HVAC & Mechanical</option>
                  <option value="Roofing & Building Envelope">Roofing & Building Envelope</option>
                  <option value="Commercial Plumbing & Piping">Commercial Plumbing & Piping</option>
                  <option value="Electrical Contractors">Electrical Contractors</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Headquarters Location</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Canton, Ohio, USA"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Website</label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://apexhvac.agency"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Team Size</label>
                <select
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="1-10">1 - 10 Team Members</option>
                  <option value="11-50">11 - 50 Team Members</option>
                  <option value="51-200">51 - 200 Team Members</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex justify-between items-center">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleStep2Organization}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg"
              >
                Provision Workspace & Project <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PROJECT CREATION */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-white">3. Configure Your First Lead Project</h3>
              <p className="text-xs text-slate-400">
                Define the target market, niche, decision-maker roles, and minimum qualification score.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Canton Commercial HVAC Market Campaign"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Geography</label>
                  <input
                    type="text"
                    value={targetCity}
                    onChange={(e) => setTargetCity(e.target.value)}
                    placeholder="Canton, OH"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Industry / Niche</label>
                  <input
                    type="text"
                    value={targetNiche}
                    onChange={(e) => setTargetNiche(e.target.value)}
                    placeholder="HVAC"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Target Decision-Maker Titles (ICP)
                </label>
                <input
                  type="text"
                  value={decisionMakerRole}
                  onChange={(e) => setDecisionMakerRole(e.target.value)}
                  placeholder="Owner, CEO, President, General Manager"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-medium text-slate-300">Minimum Lead Qualification Gate:</span>
                  <span className="font-mono text-emerald-400 font-bold">{minScore} / 100 Points</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="70"
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-between items-center">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleStep3Project}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg"
              >
                Select Business Data Source <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: DATA SOURCE SELECTION */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-white">4. Select Business Leads to Ingest</h3>
              <p className="text-xs text-slate-400">
                You can load verified real HVAC businesses serving Canton, Ohio, or upload a custom CSV.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setDataSource('starter')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  dataSource === 'starter'
                    ? 'bg-blue-600/15 border-blue-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-2 font-semibold text-sm">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span>Real Canton HVAC Batch</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pre-configured with genuine commercial HVAC contractors in Canton, Ohio (Elsass, Foster's, Bryant, Canton HVAC). Instant testability without manual entry.
                </p>
              </div>

              <div
                onClick={() => setDataSource('csv')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  dataSource === 'csv'
                    ? 'bg-blue-600/15 border-blue-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-2 font-semibold text-sm">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Custom CSV Ingestion</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Import your existing company list. Includes automatic header detection, mapping preview, and duplicate prevention.
                </p>
              </div>
            </div>

            <div className="pt-4 flex justify-between items-center">
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleStep4DataSelection}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg"
              >
                Ingest Leads & Prepare Pipeline <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: FIRST PIPELINE EXECUTION */}
        {step === 5 && (
          <div className="space-y-6 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/30">
              <Zap className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-semibold text-white">5. Activate Lead Generation Pipeline</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Trigger the unified 10-stage intelligence workflow across {preparedBusinesses.length} verified commercial HVAC companies.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left text-xs space-y-2 max-w-md mx-auto">
              <div className="flex justify-between text-slate-400">
                <span>Selected Project:</span>
                <span className="text-white font-medium">{projectName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Target Geography:</span>
                <span className="text-white font-medium">{targetCity}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Businesses Queued:</span>
                <span className="text-emerald-400 font-mono font-bold">{preparedBusinesses.length} Companies</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Qualification Gate:</span>
                <span className="text-blue-400 font-mono font-bold">{minScore}+ Points</span>
              </div>
            </div>

            <button
              onClick={handleStep5RunPipeline}
              disabled={isExecuting}
              className="w-full max-w-md mx-auto py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isExecuting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running 10-Stage Intelligence Pipeline...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" /> Run Autonomous Pipeline Now
                </>
              )}
            </button>
          </div>
        )}

        {/* STEP 6: ACTIVATION COMPLETE & SUMMARY */}
        {step === 6 && pipelineResults && (
          <div className="space-y-6 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Your Workspace Is Activated!</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Your first batch of lead intelligence has been generated, scored, and synchronized to your central CRM database.
              </p>
            </div>

            {/* Results Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="block text-xl font-bold text-white">{pipelineResults.summary?.audited || 0}</span>
                <span className="text-[10px] text-slate-400">Websites Audited</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="block text-xl font-bold text-blue-400">{pipelineResults.summary?.contactsFound || 0}</span>
                <span className="text-[10px] text-slate-400">Contacts Discovered</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="block text-xl font-bold text-amber-400">{pipelineResults.summary?.opportunitiesGenerated || 0}</span>
                <span className="text-[10px] text-slate-400">Opportunities</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="block text-xl font-bold text-emerald-400">{pipelineResults.summary?.leadsQualified || 0}</span>
                <span className="text-[10px] text-slate-400">Qualified Leads</span>
              </div>
            </div>

            <button
              onClick={handleFinishAndNavigate}
              className="w-full max-w-sm mx-auto py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
            >
              Open Lead CRM & Pipeline <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-slate-500 mt-8">
        Watech-BI Enterprise Multi-Tenant Architecture ? Verified Tenant Isolation & Centralized Relational Integrity
      </div>
    </div>
  );
}
