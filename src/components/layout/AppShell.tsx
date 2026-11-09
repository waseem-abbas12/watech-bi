'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Compass,
  MapPin,
  Search,
  Globe2,
  Users,
  BrainCircuit,
  FileText,
  Target,
  Calculator,
  FileCheck2,
  Users2,
  MailCheck,
  Send,
  Settings,
  Plus,
  ChevronDown,
  Layers,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  Menu,
  X,
  Eye,
  PackageCheck,
  Zap,
  Briefcase,
  TrendingUp,
  GitFork,
  Crown,
  Building2,
  ShieldCheck,
  CreditCard,
  User,
  LogOut,
  Command,
  Cpu,
  Key,
  Bell,
} from 'lucide-react';
import Link from 'next/link';
import { useProject, AppModuleId } from '@/context/ProjectContext';
import { useTenant } from '@/context/TenantContext';
import { ProjectModal } from '@/components/modals/ProjectModal';
import { GlobalSearchDialog } from '@/components/modals/GlobalSearchDialog';

interface NavItem {
  id: AppModuleId;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'WORKSPACE',
    items: [
      { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard },
      { id: 'projects', label: 'Projects Manager', icon: Briefcase },
    ],
  },
  {
    title: 'INTELLIGENCE',
    items: [
      { id: 'lead_pipeline', label: 'Autonomous Pipeline', icon: Zap, badge: '10-Stage' },
      { id: 'discovery', label: 'Discover & Import', icon: Search },
      { id: 'lead_intelligence', label: 'Lead Intelligence Dossier', icon: BrainCircuit },
      { id: 'website_audit', label: 'Website Audits', icon: Globe2 },
      { id: 'opportunity_analysis', label: 'Revenue Opportunities', icon: Target },
    ],
  },
  {
    title: 'SALES & CRM',
    items: [
      { id: 'lead_crm', label: 'CRM Pipeline Board', icon: Users2 },
      { id: 'followups', label: 'Follow-Up Workspace', icon: Send },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      { id: 'research_reports', label: 'Research Reports', icon: FileCheck2 },
      { id: 'automation', label: 'Workflow Automations', icon: GitFork },
      { id: 'jobs', label: 'Background Jobs', icon: Cpu },
      { id: 'command_center', label: 'CEO Command Center', icon: Crown },
    ],
  },
  {
    title: 'ACCOUNT',
    items: [
      { id: 'billing', label: 'Subscription & Usage', icon: CreditCard },
      { id: 'integrations', label: 'Integrations Hub', icon: Key },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    projects,
    activeProject,
    activeModule,
    setActiveModule,
    setActiveProject,
    isLoading,
  } = useProject();

  const {
    currentTenant,
    currentBranding,
    userTenants,
    isSuperAdmin,
    switchTenant,
  } = useTenant();

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isTenantDropdownOpen, setIsTenantDropdownOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const brandPrimaryColor = currentBranding?.primaryColor || '#2563eb';
  const brandName = currentBranding?.companyName || 'WATECH';
  const brandInitial = brandName.charAt(0).toUpperCase() || 'W';
  const planTag = (currentTenant?.planId.replace('plan-', '') || 'starter').toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-[#070b16] text-slate-100 selection:bg-brand-500 selection:text-white">
      {/* Top Header */}
      <header className="h-16 border-b border-border bg-[#0b1329]/95 backdrop-blur sticky top-0 z-40 flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3 lg:gap-4">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-white"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Dynamic White-Label Brand Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-md text-sm shrink-0"
              style={{ backgroundColor: brandPrimaryColor }}
            >
              {brandInitial}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tracking-tight text-white uppercase">{brandName}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25 uppercase font-bold">
                  {planTag}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono hidden sm:block truncate max-w-[200px]">
                {currentTenant?.name || 'COMMERCIAL INTELLIGENCE OS'}
              </p>
            </div>
          </div>

          <div className="h-5 w-px bg-border hidden md:block" />

          {/* Multi-Tenant Organization Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsTenantDropdownOpen(!isTenantDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-50 border border-border text-xs text-slate-200 hover:bg-surface-100 hover:border-slate-700 transition-all text-left"
            >
              <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <div className="truncate max-w-[120px] sm:max-w-[160px]">
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">Tenant Org</span>
                <span className="font-medium truncate block">
                  {currentTenant ? currentTenant.name : 'Select Tenant'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-auto" />
            </button>

            {isTenantDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-72 bg-surface-100 border border-border rounded-xl shadow-2xl py-2 z-50">
                <div className="px-3 py-1.5 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Tenant Workspaces ({userTenants.length})</span>
                  <Link
                    href="/onboarding"
                    onClick={() => setIsTenantDropdownOpen(false)}
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium capitalize text-xs"
                  >
                    <Plus className="w-3 h-3" /> Add Tenant
                  </Link>
                </div>
                <div className="max-h-56 overflow-y-auto py-1">
                  {userTenants.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        switchTenant(t.id);
                        setIsTenantDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-surface-200 transition-colors ${
                        currentTenant?.id === t.id ? 'bg-blue-500/10 text-blue-300 font-medium' : 'text-slate-300'
                      }`}
                    >
                      <div className="truncate">
                        <div className="truncate font-medium">{t.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {t.slug} • {t.status}
                        </div>
                      </div>
                      {t.isPlatformSuperAdminTenant && (
                        <span className="text-[9px] font-mono px-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          HQ
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-border hidden md:block" />

          {/* Active Project Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-50 border border-border text-xs text-slate-200 hover:bg-surface-100 hover:border-slate-700 transition-all text-left max-w-[180px] sm:max-w-[240px]"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">Active Project</span>
                <span className="font-medium truncate block">
                  {activeProject ? activeProject.name : 'Select Project'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-auto" />
            </button>

            {isProjectDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-80 bg-surface-100 border border-border rounded-xl shadow-2xl py-2 z-50">
                <div className="px-3 py-1.5 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Projects ({projects.length})</span>
                  <button
                    onClick={() => {
                      setIsProjectDropdownOpen(false);
                      setIsProjectModalOpen(true);
                    }}
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium capitalize"
                  >
                    <Plus className="w-3 h-3" /> New
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setActiveProject(p);
                        setIsProjectDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-start gap-2 hover:bg-surface-200 transition-colors ${
                        activeProject?.id === p.id ? 'bg-blue-500/10 text-blue-300 font-medium' : 'text-slate-300'
                      }`}
                    >
                      <div className="truncate flex-1">
                        <div className="truncate font-medium">{p.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {p.cityArea}, {p.stateRegion || p.country} • {p.industryNiche}
                        </div>
                      </div>
                      {p.isDemo && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase shrink-0">
                          DEMO
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Global Search Trigger */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-50 border border-border text-slate-400 hover:text-slate-200 hover:bg-surface-100 text-xs transition"
            title="Global Search (Cmd+K)"
          >
            <Search className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Search...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono border border-slate-700 text-slate-400">
              ⌘K
            </kbd>
          </button>

          {/* Account Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
              className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-surface-50 border border-transparent hover:border-border transition"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center justify-center">
                {currentTenant?.name?.charAt(0) || 'U'}
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isAccountDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-60 bg-surface-100 border border-border rounded-xl shadow-2xl py-2 z-50 text-xs">
                <div className="px-3 py-2 border-b border-border space-y-0.5">
                  <div className="font-semibold text-slate-200 truncate">{currentTenant?.name || 'Workspace Account'}</div>
                  <div className="text-[10px] text-slate-400 font-mono">Plan: {planTag} Tier</div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setActiveModule('billing');
                      setIsAccountDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-slate-300 hover:bg-surface-200 flex items-center gap-2"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                    <span>Subscription & Quotas</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveModule('settings');
                      setIsAccountDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-slate-300 hover:bg-surface-200 flex items-center gap-2"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Settings & Integrations</span>
                  </button>

                  {isSuperAdmin && (
                    <Link
                      href="/platform-admin"
                      onClick={() => setIsAccountDropdownOpen(false)}
                      className="w-full text-left px-3 py-2 text-purple-300 hover:bg-surface-200 flex items-center gap-2"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                      <span>Platform Super-Admin</span>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar Navigation */}
        <aside className="w-64 border-r border-border bg-[#090f20] shrink-0 hidden lg:flex flex-col justify-between py-4">
          <div className="px-3 space-y-4 overflow-y-auto">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  {section.title}
                </div>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeModule === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveModule(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                        isActive
                          ? 'bg-blue-600/15 text-blue-300 border border-blue-500/30 font-semibold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-surface-50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface-100 text-slate-400 border border-border">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer Metadata */}
          <div className="px-4 py-3 mx-3 rounded-lg bg-surface-50 border border-border text-[11px] space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-mono text-[10px]">Data Layer</span>
              <span className="text-emerald-400 font-mono text-[10px]">Multi-Tenant SaaS</span>
            </div>
            <div className="text-[10px] text-slate-400 leading-tight">
              {currentBranding?.footerText || 'WATECH B2B Lead Intelligence Platform'}
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden bg-black/80 backdrop-blur flex">
            <div className="w-72 bg-[#090f20] h-full p-4 border-r border-border overflow-y-auto flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <span className="text-xs font-semibold text-white uppercase tracking-wider">Navigation</span>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {NAV_SECTIONS.map((section) => (
                  <div key={section.title} className="space-y-1">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold px-2">
                      {section.title}
                    </div>
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeModule === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveModule(item.id);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-left ${
                            isActive
                              ? 'bg-blue-600/15 text-blue-300 border border-blue-500/30 font-semibold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#070b16] p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Breadcrumb Bar */}
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">{currentTenant?.name || 'Workspace'}</span>
                <span className="text-slate-600">/</span>
                <span className="text-slate-300 font-medium">{activeProject?.name || 'All Projects'}</span>
                <span className="text-slate-600">/</span>
                <span className="text-blue-400 capitalize font-medium">{activeModule.replace(/_/g, ' ')}</span>
              </div>

              {activeProject?.isDemo && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/25">
                  DEMO ACTIVE
                </span>
              )}
            </div>

            {children}
          </div>
        </main>
      </div>

      <ProjectModal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} />
      <GlobalSearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
