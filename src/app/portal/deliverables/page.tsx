'use client';

import React, { useState, useEffect } from 'react';
import { useClientPortalAuth } from '@/context/ClientPortalAuthContext';
import { DeliverableRecord, DeliverableRevision } from '@/types';
import {
  getClientVisibleDeliverables,
  submitClientDeliverableDecision
} from '@/lib/engines/clientPortalEngine';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileCheck
} from 'lucide-react';

type ClientPortalDeliverable = DeliverableRecord & { revisions: DeliverableRevision[] };

export default function PortalDeliverablesPage() {
  const { currentClient, currentUser } = useClientPortalAuth();
  const [deliverables, setDeliverables] = useState<ClientPortalDeliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'ready_for_client_review' | 'approved' | 'revision_requested'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Decision Modal
  const [activeModal, setActiveModal] = useState<'approve' | 'revision' | null>(null);
  const [targetDeliverable, setTargetDeliverable] = useState<DeliverableRecord | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionDone, setActionDone] = useState(false);

  const loadDeliverables = async () => {
    if (!currentClient) return;
    setLoading(true);
    try {
      const data = await getClientVisibleDeliverables(currentClient.id);
      setDeliverables(data);
    } catch (err) {
      console.error('Failed to load client deliverables:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliverables();
  }, [currentClient?.id]);

  if (!currentClient) {
    return <div className="p-8 text-center text-slate-400">Please log in to view deliverables.</div>;
  }

  const filteredDeliverables = deliverables.filter((d) => {
    if (selectedFilter === 'all') return true;
    return d.status === selectedFilter;
  });

  const pendingCount = deliverables.filter((d) => d.status === 'ready_for_client_review').length;
  const approvedCount = deliverables.filter((d) => d.status === 'approved').length;
  const revisionCount = deliverables.filter((d) => d.status === 'revision_requested').length;

  const handleOpenDecision = (deliverable: DeliverableRecord, type: 'approve' | 'revision') => {
    setTargetDeliverable(deliverable);
    setActiveModal(type);
    setDecisionNotes('');
    setActionDone(false);
  };

  const handleSubmitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDeliverable || !currentUser) return;
    setIsSubmitting(true);
    try {
      await submitClientDeliverableDecision(
        targetDeliverable.id,
        currentClient.id,
        activeModal === 'approve' ? 'approved' : 'revision_requested',
        decisionNotes,
        currentUser.fullName || currentUser.name || 'Client Signer',
        currentUser.email
      );
      setActionDone(true);
      setTimeout(() => {
        setActiveModal(null);
        loadDeliverables();
      }, 1500);
    } catch (err) {
      console.error('Failed to record deliverable decision:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileCheck className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Deliverables & Approvals</h1>
              <p className="text-sm text-slate-400">
                Inspect staged digital assets, provide revision feedback, and authorize formal sign-offs
              </p>
            </div>
          </div>
        </div>

        {/* Status Filter Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedFilter === 'all'
                ? 'bg-slate-700 text-white'
                : 'bg-surface-50 text-slate-400 hover:text-slate-200 border border-border'
            }`}
          >
            All ({deliverables.length})
          </button>
          <button
            onClick={() => setSelectedFilter('ready_for_client_review')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              selectedFilter === 'ready_for_client_review'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-surface-50 text-slate-400 hover:text-slate-200 border border-border'
            }`}
          >
            <Clock className="w-3 h-3 text-amber-400" />
            Needs Review ({pendingCount})
          </button>
          <button
            onClick={() => setSelectedFilter('approved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              selectedFilter === 'approved'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-surface-50 text-slate-400 hover:text-slate-200 border border-border'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setSelectedFilter('revision_requested')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              selectedFilter === 'revision_requested'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-surface-50 text-slate-400 hover:text-slate-200 border border-border'
            }`}
          >
            <RotateCcw className="w-3 h-3 text-rose-400" />
            In Revision ({revisionCount})
          </button>
        </div>
      </div>

      {/* Deliverables Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm animate-pulse">Loading project deliverables...</div>
      ) : filteredDeliverables.length === 0 ? (
        <div className="bg-surface-50 border border-border rounded-2xl p-12 text-center">
          <FileCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Deliverables in this View</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {selectedFilter === 'all'
              ? 'Your project assets are currently in production and will be published for client review shortly.'
              : `There are currently no assets matching the "${selectedFilter.replace('_', ' ')}" filter.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredDeliverables.map((item) => {
            const isExpanded = expandedId === item.id;
            const needsReview = item.status === 'ready_for_client_review';
            const isApproved = item.status === 'approved';
            const isRevision = item.status === 'revision_requested';
            const revNumber = item.revisions?.[0]?.revisionNumber || 1;

            return (
              <div
                key={item.id}
                className={`bg-surface-50 border rounded-2xl p-6 transition-all shadow-sm ${
                  needsReview ? 'border-amber-500/30 ring-1 ring-amber-500/20' : 'border-border'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                        Rev v{revNumber}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border flex items-center gap-1 ${
                          isApproved
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : needsReview
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : isRevision
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-slate-800 text-slate-300 border-border'
                        }`}
                      >
                        {isApproved && <CheckCircle2 className="w-3 h-3" />}
                        {needsReview && <Clock className="w-3 h-3" />}
                        {isRevision && <RotateCcw className="w-3 h-3" />}
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-white mb-1.5">{item.title}</h2>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-3xl mb-4">
                      {item.description}
                    </p>

                    {/* Preview / Handover URL */}
                    {item.handoverUrl && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-border text-xs mb-3">
                        <span className="text-slate-400">Live Asset Staging:</span>
                        <a
                          href={item.handoverUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:underline flex items-center gap-1 font-mono font-medium"
                        >
                          {item.handoverUrl}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex md:flex-col items-center md:items-end gap-2.5">
                    {needsReview && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenDecision(item, 'approve')}
                          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve Asset
                        </button>
                        <button
                          onClick={() => handleOpenDecision(item, 'revision')}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Request Edits
                        </button>
                      </div>
                    )}

                    {isApproved && (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Officially Authorized
                        </span>
                        {item.approvedAt && (
                          <div className="text-[10px] text-slate-500 mt-1">
                            Signed on {new Date(item.approvedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    )}

                    {isRevision && (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold">
                          <RotateCcw className="w-3.5 h-3.5" />
                          Team Addressing Edits
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Revision History Toggle */}
                {item.revisions && item.revisions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 font-medium transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {isExpanded ? 'Hide' : 'View'} Version History ({item.revisions.length}{' '}
                      {item.revisions.length === 1 ? 'iteration' : 'iterations'})
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-2.5 pl-2 border-l-2 border-slate-800">
                        {item.revisions.map((rev: any) => (
                          <div key={rev.revisionNumber} className="text-xs bg-slate-900/60 p-3 rounded-xl border border-border">
                            <div className="flex items-center justify-between text-slate-400 mb-1 font-mono text-[11px]">
                              <span>Revision {rev.revisionNumber}</span>
                              <span>{new Date(rev.createdAt || rev.submittedAt || Date.now()).toLocaleDateString()}</span>
                            </div>
                            <p className="text-slate-300 text-xs leading-normal">
                              {rev.clientFeedback || rev.requestedChanges || 'Client feedback recorded'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Decision Modal */}
      {activeModal && targetDeliverable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0b1329] border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <h2 className="text-lg font-bold text-white mb-1">
              {activeModal === 'approve' ? 'Approve Deliverable' : 'Request Revision'}
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Asset: <strong className="text-white">{targetDeliverable.title}</strong>
            </p>

            {actionDone ? (
              <div className="p-6 text-center space-y-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto border ${
                  activeModal === 'approve'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                }`}>
                  {activeModal === 'approve' ? <CheckCircle2 className="w-6 h-6" /> : <RotateCcw className="w-6 h-6" />}
                </div>
                <h3 className="text-base font-bold text-white">
                  {activeModal === 'approve' ? 'Approval Signed & Logged' : 'Revision Feedback Dispatched'}
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  {activeModal === 'approve'
                    ? 'Your approval has been verified and registered in the project delivery ledger.'
                    : 'Your change requests have been routed to the Watech production team.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitDecision} className="space-y-4">
                {activeModal === 'approve' ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-xs text-emerald-300">
                    <p className="font-semibold mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Official Sign-Off
                    </p>
                    <p>
                      By approving, you authorize this deliverable as completed according to the agreed statement of work. Next phase dependencies will be unblocked.
                    </p>
                  </div>
                ) : (
                  <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-xs text-rose-300">
                    <p className="font-semibold mb-1 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> Clear Revision Instructions Required
                    </p>
                    <p>
                      Please describe specific changes, copy updates, or layout corrections needed. Clear itemized feedback ensures rapid turnaround.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    {activeModal === 'approve' ? 'Approval Notes (Optional)' : 'Required Feedback & Revision Notes'}
                  </label>
                  <textarea
                    rows={4}
                    required={activeModal === 'revision'}
                    placeholder={
                      activeModal === 'approve'
                        ? 'Looks great! Everything matches our brand standards.'
                        : '1. Adjust color on the dispatch callout.\n2. Update the phone number in the top header.\n3. Verify licensing badge layout.'
                    }
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-border rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 placeholder-slate-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (activeModal === 'revision' && !decisionNotes.trim())}
                    className={`px-5 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 ${
                      activeModal === 'approve'
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                        : 'bg-rose-500 hover:bg-rose-600 text-white'
                    }`}
                  >
                    {isSubmitting
                      ? 'Processing...'
                      : activeModal === 'approve'
                      ? 'Confirm & Authorize'
                      : 'Send Revision Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
