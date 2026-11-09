'use client';

import React, { useState, useEffect } from 'react';
import { useClientPortalAuth } from '@/context/ClientPortalAuthContext';
import { repository } from '@/lib/db/repository';
import { InvoiceRecord } from '@/types';
import { submitClientPaymentConfirmation } from '@/lib/engines/clientPortalEngine';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  Receipt,
  Download,
  FileText
} from 'lucide-react';

export default function PortalInvoicesPage() {
  const { currentClient } = useClientPortalAuth();
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);

  // Payment Confirmation Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'ach' | 'wire' | 'check' | 'credit_card'>('ach');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const loadInvoices = async () => {
    if (!currentClient) return;
    setLoading(true);
    try {
      const allInvoices = await repository.getInvoices();
      const clientInvoices = allInvoices.filter(inv => inv.clientId === currentClient.id);
      setInvoices(clientInvoices);
    } catch (err) {
      console.error('Failed to load client invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [currentClient?.id]);

  if (!currentClient) {
    return (
      <div className="p-8 text-center text-slate-400">
        Please log in to view billing and invoices.
      </div>
    );
  }

  const totalBilled = invoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
  const totalPaid = invoices.reduce((acc, inv) => acc + (inv.amountPaid || 0), 0);
  const totalBalance = invoices.reduce((acc, inv) => acc + (inv.balance || 0), 0);

  const handleOpenPayment = (invoice: InvoiceRecord) => {
    setSelectedInvoice(invoice);
    setPaymentAmount(invoice.balance > 0 ? invoice.balance : invoice.totalAmount);
    setPaymentReference('');
    setPaymentNotes('');
    setPaymentSuccess(false);
    setIsPaymentModalOpen(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setPaymentSubmitting(true);
    try {
      await submitClientPaymentConfirmation(
        selectedInvoice.id,
        currentClient.id,
        paymentAmount,
        paymentMethod,
        paymentReference,
        paymentNotes
      );
      setPaymentSuccess(true);
      setTimeout(() => {
        setIsPaymentModalOpen(false);
        loadInvoices();
      }, 1500);
    } catch (err) {
      console.error('Failed to record payment confirmation:', err);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Receipt className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Billing & Invoices</h1>
              <p className="text-sm text-slate-400">
                Transparent accounting, payment schedules, and verified transaction receipts for {currentClient.companyName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-50 border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Billed</span>
            <div className="p-2 bg-slate-800 rounded-lg text-slate-300">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            ${totalBilled.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400">Cumulative invoices issued to date</p>
        </div>

        <div className="bg-surface-50 border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Total Paid</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-emerald-400 mb-1">
            ${totalPaid.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400">Verified received agency funds</p>
        </div>

        <div className="bg-surface-50 border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Outstanding Balance</span>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-amber-400 mb-1">
            ${totalBalance.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400">Current open balance across all invoices</p>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-surface-50 border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">Official Invoices</h2>
          </div>
          <span className="text-xs text-slate-400">{invoices.length} {invoices.length === 1 ? 'record' : 'records'}</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm animate-pulse">Loading billing records...</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="font-medium text-white mb-1">No Invoices Issued Yet</p>
            <p className="text-xs max-w-md mx-auto text-slate-500">
              When your project begins or milestones are finalized, billing statements and payment instructions will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {invoices.map((inv) => {
              const isPaid = inv.balance <= 0 || inv.status === 'paid';
              return (
                <div key={inv.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-900/30 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl border mt-0.5 ${
                      isPaid 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-bold text-white tracking-wide">
                          {inv.invoiceNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                          isPaid
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {isPaid ? 'Fully Paid' : 'Balance Due'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-2">
                        {inv.notes || inv.lineItems?.[0]?.description || 'Professional Services Milestone'}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span>Issued: {new Date(inv.issueDate).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Due: {new Date(inv.dueDate).toLocaleDateString()}</span>
                        {isPaid && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400">Payment Verified</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:items-end gap-2 border-t md:border-t-0 pt-4 md:pt-0 border-border">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-slate-400">Amount:</span>
                      <span className="text-xl font-bold text-white font-mono">
                        ${inv.totalAmount.toLocaleString()}
                      </span>
                    </div>
                    {!isPaid && (
                      <div className="text-xs text-amber-400 font-medium">
                        Balance due: ${inv.balance.toLocaleString()}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-1">
                      {!isPaid && (
                        <button
                          onClick={() => handleOpenPayment(inv)}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Submit Payment Confirmation
                        </button>
                      )}
                      <button
                        onClick={() => window.print()}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-border flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Print / Receipt
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Wire & ACH Instructions */}
      <div className="bg-surface-50 border border-border rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">Direct Payment Instructions</h3>
        <p className="text-xs text-slate-400 mb-4">
          Watech accepts payment via corporate ACH, wire transfer, or certified bank draft. Please include your invoice number in the memo field for expedited reconciliation.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono bg-slate-900/60 p-4 rounded-xl border border-border">
          <div>
            <div className="text-slate-500 mb-1">Domestic ACH / Wire Routing:</div>
            <div className="text-slate-200">Beneficiary: <strong className="text-white">Watech Digital Inc.</strong></div>
            <div className="text-slate-200">Bank: <strong className="text-white">JPMorgan Chase Bank, N.A.</strong></div>
            <div className="text-slate-200">Routing (ABA): <strong className="text-emerald-400">111000614</strong></div>
          </div>
          <div>
            <div className="text-slate-500 mb-1">Account & Reference:</div>
            <div className="text-slate-200">Account Number: <strong className="text-emerald-400">98234-71239-01</strong></div>
            <div className="text-slate-200">Reference: <strong className="text-white">INV-{currentClient.companyName.replace(/\s+/g, '').slice(0, 6)}</strong></div>
            <div className="text-slate-200">Billing Email: <strong className="text-white">billing@watech-bi.internal</strong></div>
          </div>
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      {isPaymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0b1329] border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <h2 className="text-lg font-bold text-white mb-1">
              Submit Payment Confirmation
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Confirm bank wire, ACH transfer, or check remittance for invoice <strong className="text-white">{selectedInvoice.invoiceNumber}</strong>.
            </p>

            {paymentSuccess ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Payment Receipt Recorded</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Your remittance notice has been submitted to Watech finance. Our accounting team will verify the funds and update your account balance.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitPayment} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Amount Remitted ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-900 border border-border rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-border rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ach">ACH Electronic Transfer</option>
                    <option value="wire">Domestic Wire Transfer</option>
                    <option value="check">Business Check</option>
                    <option value="credit_card">Corporate Credit Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Bank Reference / Transaction ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WIRE-883921-TX or Trace #482910"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-border rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 placeholder-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Remittance Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide any additional banking comments or disbursement dates..."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-border rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 placeholder-slate-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    disabled={paymentSubmitting}
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={paymentSubmitting || paymentAmount <= 0}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition-all flex items-center gap-2"
                  >
                    {paymentSubmitting ? 'Recording...' : 'Confirm Remittance'}
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
