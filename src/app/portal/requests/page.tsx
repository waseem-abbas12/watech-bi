'use client';

import React, { useState, useEffect } from 'react';
import { useClientPortalAuth } from '@/context/ClientPortalAuthContext';
import { repository } from '@/lib/db/repository';
import { ClientRequest, ClientRequestCategory } from '@/types';
import { submitClientRequest } from '@/lib/engines/clientPortalEngine';
import {
  MessageSquare,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Filter,
  ArrowRight,
  ShieldAlert,
  Send
} from 'lucide-react';

const CATEGORY_LABELS: Record<ClientRequestCategory, string> = {
  new_service: 'New Service Request',
  project_change: 'Scope Change',
  additional_work: 'Additional Work',
  design_revision: 'Design Revision',
  website_content: 'Website / Content Update',
  marketing_request: 'Campaign / Marketing Request',
  technical_support: 'Technical Support',
  general_question: 'General Inquiry'
};

export default function PortalRequestsPage() {
  const { currentClient, currentUser } = useClientPortalAuth();
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<ClientRequest | null>(null);

  // New Request Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ClientRequestCategory>('general_question');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const loadRequests = async () => {
    if (!currentClient) return;
    setLoading(true);
    try {
      const all = await repository.getClientRequests();
      const clientRequests = all
        .filter((r) => r.clientId === currentClient.id)
        .sort((a, b) => new Date(b.createdAt || b.submittedAt).getTime() - new Date(a.createdAt || a.submittedAt).getTime());
      setRequests(clientRequests);
    } catch (err) {
      console.error('Failed to load client requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [currentClient?.id]);

  if (!currentClient) {
    return <div className="p-8 text-center text-slate-400">Please log in to access the request center.</div>;
  }

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !title.trim() || !description.trim()) return;
    setIsSubmitting(true);
    try {
      await submitClientRequest(currentClient.id, {
        category,
        subject: title,
        description,
        priority: priority === 'normal' ? 'medium' : priority,
      });
      setSubmitSuccess(true);
      setTimeout(() => {
        setIsCreateOpen(false);
        setTitle('');
        setDescription('');
        setCategory('general_question');
        setPriority('normal');
        setSubmitSuccess(false);
        loadRequests();
      }, 1200);
    } catch (err) {
      console.error('Failed to submit client request:', err);
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
              <MessageSquare className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Client Request Center</h1>
              <p className="text-sm text-slate-400">
                Direct ticketing channel for scope changes, design edits, support tickets, and new initiatives
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition-all shadow-sm flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Submit New Request
        </button>
      </div>

      {/* SLA Commitment Banner */}
      <div className="bg-surface-50 border border-border rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 rounded-xl text-emerald-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Agency Response Guarantee</h4>
            <p className="text-xs text-slate-400">
              Urgent issues are triaged within 2 hours. Standard tickets receive initial review within 1 business day.
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono px-3 py-1 bg-slate-900 border border-border text-slate-300 rounded-lg self-start md:self-auto">
          Active SLA: Premium Tier
        </span>
      </div>

      {/* Requests Table / Cards */}
      <div className="bg-surface-50 border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-slate-900/40">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
            Submitted Tickets ({requests.length})
          </h2>
          <span className="text-xs text-slate-400">Chronological ledger</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm animate-pulse">Loading tickets...</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="font-medium text-white mb-1">No Active Tickets</h3>
            <p className="text-xs max-w-sm mx-auto text-slate-500 mb-4">
              Have a question or need an update on your website, campaigns, or services? Click below to submit your first ticket.
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-border inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Open Ticket
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {requests.map((req) => {
              const isResolved = req.status === 'resolved';
              const isInProgress = req.status === 'in_progress';
              const isInReview = req.status === 'in_review';
              const isSubmitted = req.status === 'submitted';

              return (
                <div
                  key={req.id}
                  onClick={() => setSelectedTicket(req)}
                  className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors cursor-pointer"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        {CATEGORY_LABELS[req.category] || req.category}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                          req.priority === 'urgent'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : req.priority === 'high'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-slate-800 text-slate-400 border-border'
                        }`}
                      >
                        {req.priority}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                          isResolved
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : isInProgress
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                            : isInReview
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {req.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white mb-1 hover:text-emerald-400 transition-colors">
                      {req.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 max-w-3xl mb-2">
                      {req.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>Submitted: {new Date(req.createdAt || req.submittedAt).toLocaleDateString()}</span>
                      {req.staffResponse && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400 font-medium">Team response available</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <span className="text-xs text-emerald-400 font-medium hover:underline flex items-center gap-1">
                      View Thread <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0b1329] border border-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-border mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-slate-400">
                    {CATEGORY_LABELS[selectedTicket.category]}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-slate-800 text-slate-300">
                    {selectedTicket.priority} priority
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {selectedTicket.status.replace('_', ' ')}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white">{selectedTicket.title}</h2>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-slate-800"
              >
                Close
              </button>
            </div>

            {/* Client Request Body */}
            <div className="mb-6">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Your Request Details
              </span>
              <div className="bg-slate-900/80 border border-border rounded-xl p-4 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                {selectedTicket.description}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Submitted on {new Date(selectedTicket.createdAt || selectedTicket.submittedAt).toLocaleString()}
              </div>
            </div>

            {/* Official Agency Response */}
            <div className="mb-6">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
                Watech Agency Response
              </span>
              {selectedTicket.staffResponse ? (
                <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 text-xs text-emerald-200 leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.staffResponse}
                  {selectedTicket.resolvedAt && (
                    <div className="text-[11px] text-emerald-400/80 mt-2 pt-2 border-t border-emerald-500/20">
                      Resolved on {new Date(selectedTicket.resolvedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-900/40 border border-border rounded-xl p-4 text-xs text-slate-400 italic">
                  Your ticket has been assigned to the account management team and is under review. An update will be posted here shortly.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium"
              >
                Close Ticket View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0b1329] border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <h2 className="text-lg font-bold text-white mb-1">Submit New Service Ticket</h2>
            <p className="text-xs text-slate-400 mb-6">
              Our engineering, design, and marketing teams will review your request.
            </p>

            {submitSuccess ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Ticket Submitted Successfully</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Your request has been registered in the agency delivery pipeline.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreateRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Request Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Update primary emergency service phone on landing page"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-border rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 placeholder-slate-600"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ClientRequestCategory)}
                      className="w-full px-3 py-2 bg-slate-900 border border-border rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="general_question">General Question</option>
                      <option value="new_service">New Service Offering</option>
                      <option value="project_change">Scope Change</option>
                      <option value="additional_work">Additional Work</option>
                      <option value="design_revision">Design Revision</option>
                      <option value="website_content">Website / Copy Update</option>
                      <option value="marketing_request">Marketing Campaign</option>
                      <option value="technical_support">Technical Support</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-900 border border-border rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="low">Low (Standard Backlog)</option>
                      <option value="normal">Normal (Standard SLA)</option>
                      <option value="high">High (Priority Attention)</option>
                      <option value="urgent">Urgent (Production Critical)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Detailed Description
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe what you need, any links or screenshots, and your desired target date..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-border rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 placeholder-slate-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !title.trim() || !description.trim()}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition-all flex items-center gap-2"
                  >
                    {isSubmitting ? 'Submitting...' : 'Dispatch Request'}
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
