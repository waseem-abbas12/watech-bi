'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  FileCheck2,
  CreditCard,
  PackageCheck,
  MessageSquarePlus,
  HelpCircle,
  User,
  ShieldCheck,
  ArrowLeft,
  Building,
  ChevronDown,
  LogOut,
  Bell,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { ClientPortalAuthProvider, useClientPortalAuth } from '@/context/ClientPortalAuthContext';

function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentClient, portalUser, allClients, switchClientSimulation, logout } = useClientPortalAuth();
  const [isClientSwitcherOpen, setIsClientSwitcherOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // If on login page, render clean standalone view without full navigation
  if (pathname === '/portal/login') {
    return <>{children}</>;
  }

  const NAV_ITEMS = [
    { label: 'Dashboard', href: '/portal/dashboard', icon: LayoutDashboard },
    { label: 'Projects', href: '/portal/projects', icon: Briefcase },
    { label: 'Proposals', href: '/portal/proposals', icon: FileCheck2 },
    { label: 'Invoices', href: '/portal/invoices', icon: CreditCard },
    { label: 'Deliverables', href: '/portal/deliverables', icon: PackageCheck },
    { label: 'Request Center', href: '/portal/requests', icon: MessageSquarePlus },
    { label: 'Support & Updates', href: '/portal/support', icon: HelpCircle },
    { label: 'Profile', href: '/portal/profile', icon: User },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#080d1a] text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="h-16 border-b border-border/80 bg-[#0c1427]/95 backdrop-blur sticky top-0 z-40 flex items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-white"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo & Co-branding */}
          <Link href="/portal/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-black text-white text-base shadow-lg shadow-emerald-500/20">
              W
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white text-sm">WATECH</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase font-semibold">
                  Client Portal
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium block truncate max-w-[200px] sm:max-w-none">
                {currentClient ? currentClient.companyName : 'Client Workspace'}
              </span>
            </div>
          </Link>
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-3">
          {/* Tenant Isolation Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>TENANT ISOLATED: {currentClient?.companyName || 'Verified Session'}</span>
          </div>

          {/* Client Simulation Switcher (For Demo & Admin Testing) */}
          <div className="relative">
            <button
              onClick={() => setIsClientSwitcherOpen(!isClientSwitcherOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 border border-border text-xs text-slate-300 transition-colors"
            >
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline font-medium">Switch Client Session</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isClientSwitcherOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-surface-100 border border-border rounded-xl shadow-2xl py-2 z-50 text-xs">
                <div className="px-3 py-1.5 border-b border-border text-[10px] uppercase font-semibold text-slate-400">
                  Select Tenant Profile (Strict Scoping)
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {allClients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        switchClientSimulation(c.id);
                        setIsClientSwitcherOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-surface-200 transition-colors ${
                        currentClient?.id === c.id ? 'bg-emerald-500/10 text-emerald-300 font-semibold' : 'text-slate-300'
                      }`}
                    >
                      <div className="truncate">
                        <div className="font-medium truncate">{c.companyName}</div>
                        <div className="text-[10px] text-slate-400">{c.city}, {c.state || c.country}</div>
                      </div>
                      {currentClient?.id === c.id && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                          Active
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Back to Internal Admin Link */}
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 border border-border text-xs text-slate-300 hover:text-white transition-colors"
            title="Return to internal Watech-BI management workspace"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline font-medium">Internal Admin</span>
          </Link>
        </div>
      </header>

      {/* Main Client Navigation Bar */}
      <nav className="border-b border-border/80 bg-[#0a1122]/90 sticky top-16 z-30 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex items-center gap-1 py-1 text-xs">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/portal/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface-100/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-8 py-6">
        {children}
      </main>

      {/* Client Portal Footer */}
      <footer className="border-t border-border/80 bg-[#070c17] py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Watech Agency Client Portal. All rights reserved.</span>
          <span className="text-[11px] font-mono text-slate-500">
            Authenticated via Watech Security Core • Session Id: {currentClient?.id || 'demo'}
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientPortalAuthProvider>
      <PortalShell>{children}</PortalShell>
    </ClientPortalAuthProvider>
  );
}
