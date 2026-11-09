'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Building,
  Check,
  X,
  FileText,
} from 'lucide-react';
import { useClientPortalAuth } from '@/context/ClientPortalAuthContext';
import { repository } from '@/lib/db/repository';
import { submitClientProposalDecision } from '@/lib/engines/clientPortalEngine';
import { BusinessProposal } from '@/types';

export default function PortalProposalsPage() {
  const { currentClient, portalUser, isLoading: authLoading } = useClientPortalAuth();
  const [proposals, setProposals] = useState<BusinessProposal[]>([]);
  const [expandedProposalId, setExpandedProposalId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [acceptingProposal, setAcceptingProposal] = useState<BusinessProposal | null>(null);
  const [rejectingProposal, setRejectingProposal] = useState<BusinessProposal | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signerComments, setSignerComments] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadProposals = async () => {
    if (!currentClient) return;
    try {
      setIsLoading(true);
      const all = await repository.getProposals();
      // Tenant isolation: match by client businessId or projectId
      const clientProposals = all.filter(
        (p) => p.businessId === currentClient.businessId || p.projectId === currentClient.projectId
      );
      setProposals(clientProposals);
      if (clientProposals.length > 0 && !expandedProposalId) {
        setExpandedProposalId(clientProposals[0].id);
      }
    } catch (err) {
      console.error('Error loading proposals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && currentClient) {
      loadProposals();
      if (portalUser) {
        setSignerName(portalUser.fullName);
      }
    }
  }, [currentClient, authLoading, portalUser]);

  const handleAcceptConfirm = async () => {
    if (!acceptingProposal || !currentClient || !portalUser) return;
    try {
      await submitClientProposalDecision(
        acceptingProposal.id,
        currentClient.id,
        'accepted',
        signerComments || 'Digital sign-off via Client Portal',
        signerName || portalUser.fullName,
        portalUser.email
      );

      setActionSuccess(`Proposal ${acceptingProposal.proposalNumber} has been accepted and confirmed!`);
      setAcceptingProposal(null);
      setSignerComments('');
      await loadProposals();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error accepting proposal.');
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingProposal || !currentClient || !portalUser) return;
    try {
      await submitClientProposalDecision(
        rejectingProposal.id,
        currentClient.id,
        'rejected',
        signerComments || 'Client declined via Client Portal',
        signerName || portalUser.fullName,
        portalUser.email
      );

      setActionSuccess(`Proposal ${rejectingProposal.proposalNumber} status updated.`);
      setRejectingProposal(null);
      setSignerComments('');
      await loadProposals();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error updating proposal.');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <span className="text-xs font-mono text-slate-400">Loading Client Commercial Proposals...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">Commercial Proposals & Statements of Work</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Review service agreements, scopes of work, and pricing schedules shared with {currentClient?.companyName}.
          </p>
        </div>
      </div>

      {actionSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Proposals Accordion */}
      <div className="space-y-4">
        {proposals.map((prop) => {
          const isExpanded = expandedProposalId === prop.id;
          const isAccepted = prop.status === 'accepted';
          return (
            <div
              key={prop.id}
              className={`bg-surface-50 border rounded-2xl transition-all shadow-sm overflow-hidden ${
                isAccepted ? 'border-emerald-500/40' : 'border-border'
              }`}
            >
              {/* Proposal Header Card */}
              <div
                onClick={() => setExpandedProposalId(isExpanded ? null : prop.id)}
                className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer hover:bg-surface-100/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">{prop.proposalNumber}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-semibold ${
                          prop.status === 'accepted'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : prop.status === 'rejected'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {prop.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-300 font-medium block mt-0.5">{prop.title}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto text-xs">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Proposed Investment</span>
                    <span className="font-mono font-bold text-white text-sm">
                      ${prop.quotation?.totalAmount?.toLocaleString() || 'Custom'}
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              {/* Expanded Proposal Details */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-border/80 space-y-5 text-xs">
                  {/* Executive Summary */}
                  <div className="bg-surface-100 rounded-xl p-4 space-y-2">
                    <span className="font-bold text-white text-xs block">Executive Summary</span>
                    <p className="text-slate-300 leading-relaxed">{prop.executiveSummary}</p>
                  </div>

                  {/* Scope of Work Deliverables */}
                  <div className="space-y-2">
                    <span className="font-bold text-white text-xs block">Included Deliverables & Scope</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {prop.scopeOfWork?.deliverables?.map((del, idx) => (
                        <div key={idx} className="bg-surface-100 rounded-lg p-2.5 flex items-start gap-2 border border-border">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-slate-300 text-[11px]">{del}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Implementation Phases */}
                  {prop.implementationPhases && prop.implementationPhases.length > 0 && (
                    <div className="space-y-2">
                      <span className="font-bold text-white text-xs block">Phased Implementation Roadmap</span>
                      <div className="space-y-2">
                        {prop.implementationPhases.map((phase) => (
                          <div key={phase.phase} className="bg-surface-100 rounded-lg p-3 border border-border flex justify-between items-center">
                            <div>
                              <span className="font-bold text-white block">Phase {phase.phase}: {phase.name}</span>
                              <span className="text-[11px] text-slate-400">{phase.milestones}</span>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-400 shrink-0">{phase.duration}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quotation & Pricing Summary */}
                  {prop.quotation && (
                    <div className="bg-surface-100 rounded-xl p-4 border border-border space-y-3 font-mono">
                      <span className="font-bold text-white text-xs block font-sans">Quotation & Payment Terms</span>
                      <div className="divide-y divide-border/60 text-xs">
                        {prop.quotation.lineItems?.map((li) => (
                          <div key={li.id} className="py-2 flex justify-between">
                            <div>
                              <span className="text-white block">{li.description}</span>
                              <span className="text-[10px] text-slate-400">Qty: {li.quantity}</span>
                            </div>
                            <span className="font-bold text-white">${li.subtotal?.toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="pt-2 flex justify-between text-white font-bold text-sm">
                          <span>Total Investment:</span>
                          <span className="text-emerald-400">${prop.quotation.totalAmount?.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-400 font-sans pt-1">
                        Payment Terms: {prop.quotation.paymentTerms || '50% Mobilization Deposit / 50% Staging Sign-Off'}
                      </div>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 text-slate-300 text-xs flex items-center gap-1.5 transition-colors border border-border"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print / PDF Document</span>
                    </button>

                    {prop.status !== 'accepted' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRejectingProposal(prop)}
                          className="px-3.5 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 text-rose-300 text-xs font-medium border border-rose-500/30 transition-colors"
                        >
                          Request Clarification / Decline
                        </button>
                        <button
                          onClick={() => setAcceptingProposal(prop)}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept & Sign Proposal</span>
                        </button>
                      </div>
                    )}

                    {prop.status === 'accepted' && (
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Proposal Accepted & Scope Confirmed</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {proposals.length === 0 && (
          <div className="bg-surface-50 border border-border rounded-xl p-8 text-center text-xs text-slate-400 space-y-2">
            <FileText className="w-6 h-6 text-slate-500 mx-auto" />
            <p>No commercial proposals currently shared with your account.</p>
          </div>
        )}
      </div>

      {/* Accept Proposal Modal */}
      {acceptingProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface-50 border border-border rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-sm font-semibold text-white">
                Formal Acceptance: {acceptingProposal.proposalNumber}
              </h3>
              <button onClick={() => setAcceptingProposal(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              By confirming below, you accept the scope of work and pricing terms ($
              {acceptingProposal.quotation?.totalAmount?.toLocaleString() || 'N/A'}) for "{acceptingProposal.title}".
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Authorized Signer Full Name</label>
                <input
                  type="text"
                  required
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Sign-Off Notes / PO Reference (Optional)</label>
                <input
                  type="text"
                  value={signerComments}
                  onChange={(e) => setSignerComments(e.target.value)}
                  placeholder="e.g. Approved by Executive Board. PO-2026-99"
                  className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAcceptingProposal(null)}
                className="px-3.5 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptConfirm}
                disabled={!signerName.trim()}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow"
              >
                Confirm Digital Signature
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Proposal Modal */}
      {rejectingProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface-50 border border-border rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-sm font-semibold text-white">
                Request Clarification / Decline
              </h3>
              <button onClick={() => setRejectingProposal(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Please provide feedback on why this proposal requires changes or cannot be accepted at this time:
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Feedback / Requested Changes</label>
                <textarea
                  rows={3}
                  required
                  value={signerComments}
                  onChange={(e) => setSignerComments(e.target.value)}
                  placeholder="e.g. We would like to adjust the payment terms to Net 30 or remove phase 3."
                  className="w-full bg-surface-100 border border-border rounded-lg px-3 py-2 text-white resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingProposal(null)}
                className="px-3.5 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={!signerComments.trim()}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
