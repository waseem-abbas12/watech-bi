'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, Building, Key, Mail, Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import { useClientPortalAuth } from '@/context/ClientPortalAuthContext';

export default function PortalLoginPage() {
  const router = useRouter();
  const { login, allClients, switchClientSimulation, isLoading } = useClientPortalAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const success = await login(email, password);
      if (success) {
        router.push('/portal/dashboard');
      } else {
        setError('No active client portal account found for this email address.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (clientId: string) => {
    await switchClientSimulation(clientId);
    router.push('/portal/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#070b16] p-4 text-slate-100">
      {/* Return to Admin Link */}
      <div className="w-full max-w-md mb-4 flex justify-between items-center text-xs text-slate-400">
        <Link href="/" className="hover:text-white flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Internal Watech-BI Admin</span>
        </Link>
        <span className="font-mono text-[10px] text-emerald-400">P22 CLIENT CORE</span>
      </div>

      <div className="bg-surface-50 border border-border rounded-2xl max-w-md w-full p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-black text-white text-xl mx-auto shadow-lg shadow-emerald-500/20">
            W
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight">WATECH Client Portal</h1>
          <p className="text-xs text-slate-400">
            Sign in to inspect project delivery progress, review deliverables, approve proposals, and track billing.
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 font-medium block mb-1.5">Authorized Business Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. marcus.vance@apexmechanicaltx.com"
                className="w-full bg-surface-100 border border-border rounded-xl pl-9 pr-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-medium block mb-1.5">Access Password / Security Token</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your security passphrase"
                className="w-full bg-surface-100 border border-border rounded-xl pl-9 pr-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
          >
            <span>Sign In to Client Portal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Fast-Login Selector */}
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Instant Demo Evaluation:</span>
            <span className="font-mono text-[10px] text-emerald-400">Click to emulate</span>
          </div>

          <div className="space-y-2">
            {allClients.slice(0, 3).map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => handleDemoLogin(client.id)}
                className="w-full text-left p-2.5 rounded-xl bg-surface-100 hover:bg-surface-200 border border-border flex items-center justify-between text-xs transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Building className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-medium text-white block group-hover:text-emerald-300 transition-colors">
                      {client.companyName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {client.primaryContact?.name || 'Authorized Client'}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Security & Multi-Tenant Disclosure */}
        <div className="bg-surface-100/60 rounded-xl p-3 border border-border text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Tenant Isolation Guarantee</span>
          </div>
          <p>
            Authenticated client sessions strictly query isolated client records. Internal agency margins, non-client tasks, and staff notes are completely restricted.
          </p>
        </div>
      </div>
    </div>
  );
}
