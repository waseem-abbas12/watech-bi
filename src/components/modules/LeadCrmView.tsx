'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users2,
  Mail,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  FileText,
  UserCheck,
  Ban,
  Building2,
  Send,
  Sliders,
  CheckCircle2,
  Lock,
  Search,
  Filter,
  Calendar,
  Clock,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight,
  Plus,
  Trash2,
  Edit3,
  CheckSquare,
  Square,
  BarChart2,
  History,
  Info,
  RefreshCw,
  TrendingUp,
  MessageSquare,
  Award,
  FileCheck2,
  Briefcase,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { repository } from '@/lib/db/repository';
import type {
  Business,
  OutreachDraft,
  BusinessStatus,
  SuppressionRecord,
  OutreachSequence,
  Contact,
  Opportunity,
  FollowUpSchedule,
  FollowUpStatus,
  CrmActivity,
  GmailDraftRecord,
  CrmMetricsSummary,
  BusinessServiceRecommendation,
  SalesReadinessRecord,
  BusinessProposal,
} from '@/types';
import { generateOutreachSequence } from '@/lib/engines/contacts';
import {
  calculateDueDate,
  evaluateFollowUpStatus,
  checkAutomaticStopCondition,
  calculateCrmMetrics,
  DEFAULT_SEQUENCE_INTERVALS,
} from '@/lib/engines/followUpEngine';

interface CrmStageConfig {
  id: BusinessStatus;
  label: string;
  color: string;
  badgeBg: string;
}

const CRM_STAGES: CrmStageConfig[] = [
  { id: 'discovered', label: 'Discovered', color: 'border-slate-600 text-slate-300', badgeBg: 'bg-slate-500/15 text-slate-300' },
  { id: 'audited', label: 'Researched / Audited', color: 'border-blue-500 text-blue-400', badgeBg: 'bg-blue-500/15 text-blue-400' },
  { id: 'qualified', label: 'Qualified', color: 'border-emerald-500 text-emerald-400', badgeBg: 'bg-emerald-500/15 text-emerald-400' },
  { id: 'contact_ready', label: 'Contact Ready', color: 'border-cyan-500 text-cyan-400', badgeBg: 'bg-cyan-500/15 text-cyan-400' },
  { id: 'draft_ready', label: 'Draft Ready', color: 'border-indigo-500 text-indigo-400', badgeBg: 'bg-indigo-500/15 text-indigo-400' },
  { id: 'contacted', label: 'Contacted', color: 'border-amber-500 text-amber-400', badgeBg: 'bg-amber-500/15 text-amber-400' },
  { id: 'replied', label: 'Replied', color: 'border-teal-500 text-teal-400', badgeBg: 'bg-teal-500/15 text-teal-400' },
  { id: 'meeting_booked', label: 'Meeting Booked', color: 'border-purple-500 text-purple-400', badgeBg: 'bg-purple-500/15 text-purple-400' },
  { id: 'in_discussion', label: 'In Discussion', color: 'border-violet-500 text-violet-400', badgeBg: 'bg-violet-500/15 text-violet-400' },
  { id: 'proposal_sent', label: 'Proposal Sent', color: 'border-sky-500 text-sky-400', badgeBg: 'bg-sky-500/15 text-sky-400' },
  { id: 'negotiation', label: 'Negotiation', color: 'border-orange-500 text-orange-400', badgeBg: 'bg-orange-500/15 text-orange-400' },
  { id: 'won', label: 'Won / Client Closed', color: 'border-emerald-400 text-emerald-300', badgeBg: 'bg-emerald-500/20 text-emerald-300' },
  { id: 'lost', label: 'Lost', color: 'border-zinc-600 text-zinc-400', badgeBg: 'bg-zinc-600/20 text-zinc-400' },
  { id: 'not_interested', label: 'Not Interested', color: 'border-neutral-600 text-neutral-400', badgeBg: 'bg-neutral-600/20 text-neutral-400' },
  { id: 'suppressed', label: 'Suppressed / Opt-Out', color: 'border-rose-500 text-rose-400', badgeBg: 'bg-rose-500/15 text-rose-400' },
];

type MainViewMode = 'kanban' | 'table' | 'followups' | 'analytics';

export function LeadCrmView() {
  const { activeProject, setActiveModule } = useProject();

  // Core Data
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [drafts, setDrafts] = useState<OutreachDraft[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [suppressions, setSuppressions] = useState<SuppressionRecord[]>([]);
  const [schedules, setSchedules] = useState<FollowUpSchedule[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [gmailDrafts, setGmailDrafts] = useState<GmailDraftRecord[]>([]);
  const [recommendations, setRecommendations] = useState<Record<string, BusinessServiceRecommendation>>({});
  const [salesRecords, setSalesRecords] = useState<Record<string, SalesReadinessRecord>>({});
  const [proposals, setProposals] = useState<Record<string, BusinessProposal>>({});

  // Navigation & Filtering
  const [viewMode, setViewMode] = useState<MainViewMode>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // Gmail Real Connection State
  const [gmailStatus, setGmailStatus] = useState<{
    configured: boolean;
    isConnected: boolean;
    userEmail: string | null;
    message?: string;
    warning?: string;
  }>({
    configured: false,
    isConnected: false,
    userEmail: null,
  });
  const [isCheckingGmail, setIsCheckingGmail] = useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [gmailDraftSuccess, setGmailDraftSuccess] = useState<{ draftId: string; webLink?: string } | null>(null);
  const [gmailDraftError, setGmailDraftError] = useState<string | null>(null);

  // Modals & Drawers
  const [selectedDraft, setSelectedDraft] = useState<OutreachDraft | null>(null);
  const [activeSequenceTab, setActiveSequenceTab] = useState<'firstContact' | 'followUpNoResponse' | 'positiveReply' | 'requestMoreInfo' | 'notInterested' | 'optOutNotice'>('firstContact');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [humanApprovedIds, setHumanApprovedIds] = useState<Set<string>>(new Set());

  // Timeline Drawer
  const [timelineBusiness, setTimelineBusiness] = useState<Business | null>(null);
  const [newActivityNote, setNewActivityNote] = useState('');

  // Follow-up Schedule Modal
  const [schedulingBusiness, setSchedulingBusiness] = useState<Business | null>(null);
  const [schedNextDate, setSchedNextDate] = useState('');
  const [schedInterval, setSchedInterval] = useState('3');
  const [schedChannel, setSchedChannel] = useState<'email' | 'phone' | 'linkedin'>('email');
  const [schedNotes, setSchedNotes] = useState('');

  const loadData = async () => {
    if (!activeProject) return;
    const [bList, dList, sList, cList, oList, schedList, actList, gDraftList, recList, srList, propList] = await Promise.all([
      repository.getBusinesses(activeProject.id),
      repository.getOutreachDrafts(activeProject.id),
      repository.getSuppressions(),
      repository.getContacts(undefined, activeProject.id),
      repository.getOpportunities(undefined, activeProject.id),
      repository.getFollowUpSchedules(activeProject.id),
      repository.getCrmActivities(undefined, activeProject.id),
      repository.getGmailDraftRecords(activeProject.id),
      repository.getRecommendations(activeProject.id),
      repository.getSalesReadinessRecords(activeProject.id),
      repository.getProposals(activeProject.id),
    ]);

    setBusinesses(bList);
    setDrafts(dList);
    setSuppressions(sList);
    setContacts(cList);
    setOpportunities(oList);
    setSchedules(schedList);
    setActivities(actList);
    setGmailDrafts(gDraftList);

    const recMap: Record<string, BusinessServiceRecommendation> = {};
    recList.forEach(r => { recMap[r.businessId] = r; });
    setRecommendations(recMap);

    const srMap: Record<string, SalesReadinessRecord> = {};
    srList.forEach(sr => { srMap[sr.businessId] = sr; });
    setSalesRecords(srMap);

    const pMap: Record<string, BusinessProposal> = {};
    propList.forEach(p => { pMap[p.businessId] = p; });
    setProposals(pMap);
  };

  const checkGmailStatus = async () => {
    setIsCheckingGmail(true);
    try {
      const res = await fetch('/api/gmail/status');
      const data = await res.json();
      setGmailStatus({
        configured: data.configured,
        isConnected: data.isConnected,
        userEmail: data.userEmail || null,
        message: data.message,
        warning: data.warning,
      });
    } catch {
      setGmailStatus({
        configured: false,
        isConnected: false,
        userEmail: null,
        message: 'Could not communicate with Gmail status endpoint.',
      });
    } finally {
      setIsCheckingGmail(false);
    }
  };

  useEffect(() => {
    loadData();
    checkGmailStatus();
  }, [activeProject]);

  // Check URL query parameters for OAuth redirection status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('gmail_status') === 'connected') {
        checkGmailStatus();
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleStatusChange = async (businessId: string, newStatus: BusinessStatus) => {
    const biz = businesses.find(b => b.id === businessId);
    if (!biz || !activeProject) return;

    const oldStatus = biz.status;
    biz.status = newStatus;
    await repository.saveBusiness(biz);

    // Activity Log
    await repository.logCrmActivity({
      businessId: biz.id,
      projectId: activeProject.id,
      type: 'qualification_changed',
      title: `Stage Changed to ${newStatus}`,
      description: `Lead moved from "${oldStatus}" to "${newStatus}".`,
      actor: 'User',
      metadata: { oldStatus, newStatus },
    });

    // Handle Suppression registry
    if (newStatus === 'suppressed') {
      await repository.saveSuppression({
        id: `supp-${Date.now()}`,
        domain: biz.domain,
        companyName: biz.officialName,
        phone: biz.phone,
        email: biz.email,
        reason: 'Marked as suppressed / opt-out in CRM pipeline',
        addedAt: new Date().toISOString(),
      });
    }

    // Automatic Stop Condition for Follow-ups
    const stopCheck = checkAutomaticStopCondition(newStatus, newStatus === 'suppressed');
    if (stopCheck.shouldStop) {
      const existingSched = schedules.find(s => s.businessId === businessId);
      if (existingSched && existingSched.status !== 'stopped') {
        existingSched.status = 'stopped';
        existingSched.stopReason = stopCheck.reason;
        existingSched.updatedAt = new Date().toISOString();
        await repository.saveFollowUpSchedule(existingSched);

        await repository.logCrmActivity({
          businessId: biz.id,
          projectId: activeProject.id,
          type: 'followup_completed',
          title: 'Follow-Up Sequence Stopped',
          description: `Automatic stop condition triggered: ${stopCheck.reason}`,
          actor: 'System Automation',
        });
      }
    }

    // Prompt 20 Client Onboarding Linkage on Won deal
    if (newStatus === 'won') {
      const existingClients = await repository.getClients();
      const alreadyClient = existingClients.find(c => c.businessId === biz.id);
      if (!alreadyClient) {
        const { createClientFromWonDeal } = await import('@/lib/engines/clientProjectEngine');
        const { client, onboarding } = createClientFromWonDeal(biz);
        await repository.saveClient(client);
        await repository.saveClientOnboarding(onboarding);

        await repository.logCrmActivity({
          businessId: biz.id,
          projectId: activeProject.id,
          type: 'deal_won',
          title: 'Client Profile & 12-Step Onboarding Initialized',
          description: 'Deal won! Automatically created Client Profile and scheduled onboarding workflow.',
          actor: 'CRM & Client OS (Prompt 20)',
        });
      }
    }

    loadData();
  };

  const copyToClipboard = (field: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const openBrief = (businessId: string) => {
    const d = drafts.find(draft => draft.businessId === businessId);
    const biz = businesses.find(b => b.id === businessId);
    const bContacts = contacts.filter(c => c.businessId === businessId);
    const bOpps = opportunities.filter(o => o.businessId === businessId);
    const primaryContact = bContacts.find(c => c.isDecisionMaker) || bContacts[0];

    const sequence = biz ? generateOutreachSequence(biz, bOpps[0], primaryContact) : undefined;

    setGmailDraftSuccess(null);
    setGmailDraftError(null);

    if (d) {
      setSelectedDraft({ ...d, sequence });
    } else if (biz) {
      setSelectedDraft({
        id: `draft-${biz.id}`,
        businessId: biz.id,
        projectId: biz.projectId,
        verifiedIdentity: `${biz.officialName} (${biz.domain})`,
        targetName: primaryContact?.fullName || biz.ownerManagerName,
        targetRole: primaryContact?.roleOrTitle || biz.ownerManagerRole,
        contactRouteSummary: primaryContact?.email || biz.email || biz.phone || 'Website only',
        strongestFindings: ['Public business record verified in local market.'],
        topOpportunity: bOpps[0]?.recommendedSolution || 'Enhance quote capture flow.',
        recommendedService: bOpps[0]?.relevantWatechService || 'website_development',
        personalizationAngle: `Noticed your service presence in ${biz.city || 'your area'}.`,
        suggestedSubjectLine: `Quick observation regarding ${biz.brandName || biz.officialName}`,
        callToAction: 'Open to reviewing a brief 2-page overview of our observations?',
        sequence,
        sourcesAttribution: 'Direct discovery records',
        isSuppressed: biz.status === 'suppressed',
        status: 'ready',
        createdAt: new Date().toISOString(),
      });
    }
  };

  const toggleHumanApproval = async (businessId: string) => {
    setHumanApprovedIds(prev => {
      const next = new Set(prev);
      const isNowApproved = !next.has(businessId);
      if (isNowApproved) {
        next.add(businessId);
      } else {
        next.delete(businessId);
      }

      if (activeProject) {
        repository.logCrmActivity({
          businessId,
          projectId: activeProject.id,
          type: 'draft_approved',
          title: isNowApproved ? 'Approved by Human' : 'Approval Revoked',
          description: isNowApproved
            ? 'Human auditor reviewed and approved outreach draft for sequence creation.'
            : 'Human approval removed.',
          actor: 'User',
        });
      }

      return next;
    });
  };

  // Gmail Draft Creation
  const handleCreateGmailDraft = async () => {
    if (!selectedDraft || !selectedDraft.sequence) return;
    const currentMsg = selectedDraft.sequence[activeSequenceTab];
    const biz = businesses.find(b => b.id === selectedDraft.businessId);

    // Find recipient email
    const bContacts = contacts.filter(c => c.businessId === selectedDraft.businessId);
    const recipientEmail = bContacts.find(c => c.email)?.email || biz?.email;

    if (!recipientEmail) {
      setGmailDraftError('No valid recipient email found for this business record. Add a verified email first.');
      return;
    }

    if (selectedDraft.isSuppressed || biz?.status === 'suppressed') {
      setGmailDraftError('This contact or domain is on the global suppression list. Outreach creation is blocked.');
      return;
    }

    setIsCreatingDraft(true);
    setGmailDraftError(null);
    setGmailDraftSuccess(null);

    try {
      const res = await fetch('/api/gmail/create-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedDraft.businessId,
          projectId: activeProject?.id,
          recipient: recipientEmail,
          subject: currentMsg.subject,
          body: `${currentMsg.body}\n\n${currentMsg.cta}\n\n---\nTo opt-out from future correspondence, reply with 'unsubscribe'.`,
          leadId: selectedDraft.businessId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create Gmail draft');
      }

      // Record in IndexedDB
      const record: GmailDraftRecord = {
        id: `gmd-${Date.now()}`,
        businessId: selectedDraft.businessId,
        projectId: activeProject?.id || '',
        gmailDraftId: data.draftId,
        gmailMessageId: data.messageId,
        recipient: recipientEmail,
        subject: currentMsg.subject,
        bodySnippet: currentMsg.body.substring(0, 140),
        status: 'draft_created',
        webLink: data.webLink,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await repository.saveGmailDraftRecord(record);

      if (activeProject) {
        await repository.logCrmActivity({
          businessId: selectedDraft.businessId,
          projectId: activeProject.id,
          type: 'gmail_draft_created',
          title: 'Gmail Draft Created',
          description: `Draft "${currentMsg.subject}" created in Gmail for ${recipientEmail} (ID: ${data.draftId}).`,
          actor: 'Gmail Integration',
          metadata: { draftId: data.draftId, recipient: recipientEmail },
        });
      }

      // Automatically advance status to 'draft_ready' if it was lower
      if (biz && (biz.status === 'discovered' || biz.status === 'audited' || biz.status === 'qualified' || biz.status === 'contact_ready')) {
        await handleStatusChange(biz.id, 'draft_ready');
      }

      setGmailDraftSuccess({
        draftId: data.draftId,
        webLink: data.webLink || 'https://mail.google.com/mail/u/0/#drafts',
      });

      loadData();
    } catch (err: any) {
      setGmailDraftError(err.message || 'Error communicating with Gmail API');
    } finally {
      setIsCreatingDraft(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (confirm('Disconnect your Gmail account from Watech-BI?')) {
      await fetch('/api/gmail/disconnect', { method: 'POST' });
      checkGmailStatus();
    }
  };

  // Follow-up Scheduling Handlers
  const openFollowUpModal = (biz: Business) => {
    setSchedulingBusiness(biz);
    const existing = schedules.find(s => s.businessId === biz.id);
    if (existing) {
      setSchedNextDate(existing.nextFollowUpDate);
      setSchedInterval(String(existing.followUpIntervalDays));
      setSchedChannel(existing.preferredChannel);
      setSchedNotes(existing.notes || '');
    } else {
      setSchedNextDate(calculateDueDate(new Date().toISOString(), 3));
      setSchedInterval('3');
      setSchedChannel('email');
      setSchedNotes('');
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingBusiness || !activeProject) return;

    const existing = schedules.find(s => s.businessId === schedulingBusiness.id);
    const schedule: FollowUpSchedule = {
      id: existing?.id || `sched-${Date.now()}`,
      businessId: schedulingBusiness.id,
      projectId: activeProject.id,
      firstOutreachDate: existing?.firstOutreachDate || new Date().toISOString().split('T')[0],
      nextFollowUpDate: schedNextDate,
      followUpIntervalDays: parseInt(schedInterval, 10) || 3,
      attemptNumber: existing?.attemptNumber || 1,
      maxAttempts: 4,
      preferredChannel: schedChannel,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      status: 'scheduled',
      notes: schedNotes || undefined,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    schedule.status = evaluateFollowUpStatus(schedule);
    await repository.saveFollowUpSchedule(schedule);

    await repository.logCrmActivity({
      businessId: schedulingBusiness.id,
      projectId: activeProject.id,
      type: 'followup_scheduled',
      title: 'Follow-Up Scheduled',
      description: `Follow-up set for ${schedNextDate} via ${schedChannel} (${schedInterval}-day cadence).`,
      actor: 'User',
      metadata: { nextFollowUpDate: schedNextDate, channel: schedChannel },
    });

    setSchedulingBusiness(null);
    loadData();
  };

  // Timeline Activity Note Addition
  const handleAddTimelineNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timelineBusiness || !newActivityNote.trim() || !activeProject) return;

    await repository.logCrmActivity({
      businessId: timelineBusiness.id,
      projectId: activeProject.id,
      type: 'reply_received',
      title: 'Auditor / CRM Note',
      description: newActivityNote.trim(),
      actor: 'User',
    });

    setNewActivityNote('');
    loadData();
  };

  // Bulk Operations
  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllLeads = () => {
    if (selectedLeadIds.size === filteredBusinesses.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(filteredBusinesses.map(b => b.id)));
    }
  };

  const handleBulkStageChange = async (newStage: BusinessStatus) => {
    for (const id of Array.from(selectedLeadIds)) {
      await handleStatusChange(id, newStage);
    }
    setSelectedLeadIds(new Set());
  };

  // Filtered Leads
  const filteredBusinesses = useMemo(() => {
    return businesses.filter(b => {
      if (stageFilter !== 'all' && b.status !== stageFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = b.officialName.toLowerCase().includes(q) || (b.brandName || '').toLowerCase().includes(q);
        const matchesDomain = b.domain.toLowerCase().includes(q);
        const matchesCity = (b.city || '').toLowerCase().includes(q);
        const matchesOwner = (b.ownerManagerName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDomain && !matchesCity && !matchesOwner) return false;
      }
      return true;
    });
  }, [businesses, stageFilter, searchQuery]);

  // CRM Analytics Metrics
  const crmMetrics: CrmMetricsSummary = useMemo(() => {
    return calculateCrmMetrics(businesses, drafts, gmailDrafts, schedules);
  }, [businesses, drafts, gmailDrafts, schedules]);

  return (
    <div className="space-y-6 text-left">
      {/* Module Title & Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users2 className="w-5 h-5 text-blue-400" />
            Outreach CRM & Follow-Up Automation
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            14-stage sales pipeline, real Gmail drafts integration, scheduled cadences, and activity audit trails.
          </p>
        </div>

        {/* Real Gmail Integration Status Badge */}
        <div className="flex items-center gap-2">
          {gmailStatus.isConnected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 font-medium">
                Gmail: Connected ({gmailStatus.userEmail || 'Draft Mode'})
              </span>
              <button
                onClick={handleDisconnectGmail}
                className="text-slate-400 hover:text-rose-400 text-[10px] ml-1 font-mono transition-colors"
                title="Disconnect Gmail"
              >
                Disconnect
              </button>
            </div>
          ) : gmailStatus.configured ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-amber-300">Gmail: Ready to Connect</span>
              <a
                href="/api/gmail/auth"
                className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] transition-colors"
              >
                Connect with Google
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-100 border border-border text-xs text-slate-400">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Gmail: Credentials Required (.env.local)</span>
              <button
                onClick={checkGmailStatus}
                disabled={isCheckingGmail}
                className="text-blue-400 hover:text-white text-[10px] ml-1"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingGmail ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Analytics KPI Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
        <div className="p-2.5 rounded-lg bg-surface-100 border border-border">
          <span className="text-slate-400 text-[10px] block">Total Leads</span>
          <span className="text-base font-bold font-mono text-white mt-0.5 block">{crmMetrics.totalLeads}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-surface-100 border border-border">
          <span className="text-slate-400 text-[10px] block">Qualified</span>
          <span className="text-base font-bold font-mono text-emerald-400 mt-0.5 block">{crmMetrics.qualifiedLeads}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-surface-100 border border-border">
          <span className="text-slate-400 text-[10px] block">Drafts Created</span>
          <span className="text-base font-bold font-mono text-indigo-400 mt-0.5 block">{crmMetrics.draftsCreated}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-surface-100 border border-border">
          <span className="text-slate-400 text-[10px] block">Gmail Drafts</span>
          <span className="text-base font-bold font-mono text-cyan-400 mt-0.5 block">{crmMetrics.gmailDrafts}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-surface-100 border border-border">
          <span className="text-slate-400 text-[10px] block">Contacted</span>
          <span className="text-base font-bold font-mono text-amber-400 mt-0.5 block">{crmMetrics.contacted}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-surface-100 border border-border">
          <span className="text-slate-400 text-[10px] block">Replies / Conv.</span>
          <span className="text-base font-bold font-mono text-teal-400 mt-0.5 block">
            {crmMetrics.repliesReceived}
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-surface-100 border border-border">
          <span className="text-slate-400 text-[10px] block">Due Today</span>
          <span className={`text-base font-bold font-mono mt-0.5 block ${crmMetrics.followUpsDueCount > 0 ? 'text-amber-400 font-extrabold' : 'text-slate-300'}`}>
            {crmMetrics.followUpsDueCount}
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-surface-100 border border-border">
          <span className="text-slate-400 text-[10px] block">Won Opportunities</span>
          <span className="text-base font-bold font-mono text-emerald-300 mt-0.5 block">{crmMetrics.dealsWon}</span>
        </div>
      </div>

      {/* View Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-100 p-3 rounded-xl border border-border">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-surface-50 p-1 rounded-lg border border-border text-xs">
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              viewMode === 'kanban' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Kanban Pipeline</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              viewMode === 'table' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Table View</span>
          </button>
          <button
            onClick={() => setViewMode('followups')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              viewMode === 'followups' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Follow-Up Scheduler</span>
            {crmMetrics.followUpsDueCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-bold">
                {crmMetrics.followUpsDueCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setViewMode('analytics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              viewMode === 'analytics' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Pipeline Analytics</span>
          </button>
        </div>

        {/* Search & Stage Filter */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search leads, domains, contacts..."
              className="w-full bg-surface-50 border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            className="bg-surface-50 border border-border rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">All Stages ({businesses.length})</option>
            {CRM_STAGES.map(s => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Action Controls */}
      {selectedLeadIds.size > 0 && (
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-blue-300">
            <CheckSquare className="w-4 h-4 text-blue-400" />
            <span className="font-semibold">{selectedLeadIds.size} lead(s) selected</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Move stage to:</span>
            <select
              onChange={e => {
                if (e.target.value) handleBulkStageChange(e.target.value as BusinessStatus);
              }}
              className="bg-surface-100 border border-border text-xs text-slate-200 rounded px-2 py-1"
            >
              <option value="">Select Stage...</option>
              {CRM_STAGES.map(s => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setSelectedLeadIds(new Set())}
              className="px-2 py-1 rounded text-slate-400 hover:text-white"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Empty State Banner when no leads exist */}
      {businesses.length === 0 && (
        <div className="p-8 rounded-2xl bg-surface-100 border border-dashed border-border text-center space-y-4 my-4 max-w-2xl mx-auto">
          <Users2 className="w-10 h-10 text-blue-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-200">No Leads in Pipeline CRM Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Leads are populated here after running the 10-stage autonomous pipeline or discovering businesses. You can track qualification, schedule follow-ups, and review outreach drafts.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setActiveModule('lead_pipeline')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20"
            >
              Open 10-Stage Pipeline
            </button>
            <button
              onClick={() => setActiveModule('discovery')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-border text-xs font-medium"
            >
              Import Leads (CSV)
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 overflow-x-auto pb-4">
          {CRM_STAGES.filter(s => s.id !== 'closed').map(stage => {
            const stageLeads = filteredBusinesses.filter(b => b.status === stage.id);

            return (
              <div
                key={stage.id}
                className="rounded-xl bg-surface-100 border border-border p-3 space-y-2.5 flex flex-col min-h-[460px] min-w-[240px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className={`text-[11px] font-semibold uppercase tracking-wider font-mono ${stage.color}`}>
                    {stage.label}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-50 border border-border text-slate-300 font-bold">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-2 flex-1 overflow-y-auto max-h-[600px] pr-1">
                  {stageLeads.length === 0 ? (
                    <div className="text-center py-12 text-[10px] text-slate-500 italic">
                      Empty stage
                    </div>
                  ) : (
                    stageLeads.map(biz => {
                      const isApproved = humanApprovedIds.has(biz.id);
                      const isSelected = selectedLeadIds.has(biz.id);
                      const sched = schedules.find(s => s.businessId === biz.id);
                      const gDraft = gmailDrafts.find(g => g.businessId === biz.id);

                      return (
                        <div
                          key={biz.id}
                          className={`p-3 rounded-lg bg-surface-50 border transition-all text-xs space-y-2 ${
                            isSelected ? 'border-blue-500 bg-blue-500/5' : 'border-border hover:border-slate-500'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <button
                              onClick={() => toggleSelectLead(biz.id)}
                              className="text-slate-500 hover:text-white mt-0.5"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                              ) : (
                                <Square className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-slate-200 truncate">{biz.officialName}</h4>
                              <span className="text-[10px] text-blue-400 font-mono block truncate">
                                {biz.domain}
                              </span>
                            </div>
                          </div>

                          {/* Decision Maker & Route */}
                          <div className="text-[11px] text-slate-400 flex items-center justify-between">
                            {biz.ownerManagerName ? (
                              <div className="flex items-center gap-1 text-slate-300 truncate">
                                <UserCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span className="truncate">{biz.ownerManagerName}</span>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-[10px]">DM unverified</span>
                            )}
                            {gDraft && (
                              <span className="text-[9px] font-mono px-1 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                                Draft Synced
                              </span>
                            )}
                          </div>

                          {/* Recommended Package (Prompt 18) & Sales Readiness (Prompt 17) */}
                          {recommendations[biz.id] && (
                            <div className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 truncate flex items-center justify-between">
                              <span className="truncate">📦 {recommendations[biz.id].recommendedSolution.title.replace('Recommended: ', '')}</span>
                              {salesRecords[biz.id] && (
                                <span className="font-mono font-bold text-emerald-400 shrink-0 ml-1">
                                  {salesRecords[biz.id].overallScore} SR
                                </span>
                              )}
                            </div>
                          )}

                          {/* Commercial Proposal (Prompt 19) */}
                          {proposals[biz.id] && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveModule('proposals');
                              }}
                              className="w-full text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 truncate flex items-center justify-between transition-colors text-left"
                            >
                              <span className="truncate flex items-center gap-1 font-medium">
                                <FileCheck2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                Proposal: {proposals[biz.id].status.toUpperCase()}
                              </span>
                              {proposals[biz.id].quotation?.totalAmount !== null && (
                                <span className="font-mono font-bold text-emerald-400 shrink-0 ml-1">
                                  ${proposals[biz.id].quotation?.totalAmount?.toLocaleString()}
                                </span>
                              )}
                            </button>
                          )}

                          {/* Follow-Up Status Tag */}
                          {sched && (
                            <div className="pt-1 border-t border-border/60 flex items-center justify-between text-[10px]">
                              <span className="text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                Next: {sched.nextFollowUpDate}
                              </span>
                              <span
                                className={`px-1 rounded font-mono ${
                                  sched.status === 'due_today'
                                    ? 'bg-amber-500/20 text-amber-300 font-bold'
                                    : sched.status === 'overdue'
                                    ? 'bg-rose-500/20 text-rose-300 font-bold'
                                    : 'text-slate-400'
                                }`}
                              >
                                {sched.status.replace('_', ' ')}
                              </span>
                            </div>
                          )}

                          {/* Approval Gate */}
                          <div className="flex items-center justify-between pt-1 text-[10px] font-mono">
                            <button
                              onClick={() => toggleHumanApproval(biz.id)}
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
                                isApproved
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold'
                                  : 'bg-surface-100 text-slate-400 border-border hover:text-slate-200'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{isApproved ? 'Approved by Human' : 'Require Approval'}</span>
                            </button>

                            <button
                              onClick={() => setTimelineBusiness(biz)}
                              className="text-slate-400 hover:text-blue-300 flex items-center gap-1"
                              title="View Activity Timeline"
                            >
                              <History className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Quick Card Actions */}
                          <div className="pt-2 border-t border-border flex items-center justify-between gap-1.5">
                            <button
                              onClick={() => openBrief(biz.id)}
                              className="text-[11px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" /> Sequence
                            </button>

                            <button
                              onClick={() => openFollowUpModal(biz)}
                              className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                              title="Set Follow-Up Cadence"
                            >
                              <Clock className="w-3 h-3" />
                            </button>

                            <select
                              value={biz.status}
                              onChange={e => handleStatusChange(biz.id, e.target.value as BusinessStatus)}
                              className="bg-surface-100 border border-border text-[10px] text-slate-300 rounded px-1 py-0.5 focus:outline-none"
                            >
                              {CRM_STAGES.map(s => (
                                <option key={s.id} value={s.id}>
                                  → {s.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="rounded-xl bg-surface-100 border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 text-slate-400 border-b border-border">
                <tr>
                  <th className="py-2.5 px-3 w-8">
                    <button onClick={selectAllLeads} className="text-slate-400 hover:text-white">
                      {selectedLeadIds.size === filteredBusinesses.length && filteredBusinesses.length > 0 ? (
                        <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-3 font-medium">Business / Domain</th>
                  <th className="py-2.5 px-3 font-medium">Location</th>
                  <th className="py-2.5 px-3 font-medium">Decision-Maker</th>
                  <th className="py-2.5 px-3 font-medium">Pipeline Stage</th>
                  <th className="py-2.5 px-3 font-medium">Follow-Up Due</th>
                  <th className="py-2.5 px-3 font-medium">Approval</th>
                  <th className="py-2.5 px-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBusinesses.map(biz => {
                  const isApproved = humanApprovedIds.has(biz.id);
                  const isSelected = selectedLeadIds.has(biz.id);
                  const sched = schedules.find(s => s.businessId === biz.id);
                  const stageObj = CRM_STAGES.find(s => s.id === biz.status);

                  return (
                    <tr key={biz.id} className="hover:bg-surface-50/50">
                      <td className="py-2.5 px-3">
                        <button onClick={() => toggleSelectLead(biz.id)} className="text-slate-500 hover:text-white">
                          {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-blue-400" /> : <Square className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-200">{biz.officialName}</div>
                        <div className="font-mono text-[10px] text-blue-400">{biz.domain}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {biz.city || biz.serviceArea || 'Metro'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {biz.ownerManagerName ? (
                          <div>
                            <span className="font-medium text-slate-200">{biz.ownerManagerName}</span>
                            <span className="text-[10px] text-slate-400 block">{biz.ownerManagerRole || 'Principal'}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Unverified</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={biz.status}
                          onChange={e => handleStatusChange(biz.id, e.target.value as BusinessStatus)}
                          className={`border text-[11px] rounded px-2 py-1 font-mono ${stageObj?.badgeBg || 'bg-surface-50 text-slate-300 border-border'}`}
                        >
                          {CRM_STAGES.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {sched ? (
                          <div>
                            <span className="text-slate-200">{sched.nextFollowUpDate}</span>
                            <span className="text-[10px] text-slate-400 block">{sched.preferredChannel}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => openFollowUpModal(biz)}
                            className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Schedule
                          </button>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => toggleHumanApproval(biz.id)}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            isApproved
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold'
                              : 'bg-surface-50 text-slate-400 border-border'
                          }`}
                        >
                          {isApproved ? 'Approved' : 'Pending'}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openBrief(biz.id)}
                            className="px-2 py-1 rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-[11px] font-medium"
                          >
                            Sequence
                          </button>
                          <button
                            onClick={() => setTimelineBusiness(biz)}
                            className="p-1 rounded text-slate-400 hover:text-white"
                            title="Timeline"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: FOLLOW-UP SCHEDULER & DUE DASHBOARD */}
      {viewMode === 'followups' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-surface-100 border border-border">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              Active Follow-Up Queue & Chronological Due Dates
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated cadence tracker based on local system time. Follow-ups stop immediately when a lead replies, opts out, or is marked closed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Due Today */}
            <div className="p-4 rounded-xl bg-surface-100 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-semibold text-amber-400 uppercase font-mono flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Due Today
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                  {schedules.filter(s => evaluateFollowUpStatus(s) === 'due_today').length}
                </span>
              </div>

              <div className="space-y-2">
                {schedules.filter(s => evaluateFollowUpStatus(s) === 'due_today').length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic py-6 text-center">No follow-ups due today.</p>
                ) : (
                  schedules
                    .filter(s => evaluateFollowUpStatus(s) === 'due_today')
                    .map(s => {
                      const biz = businesses.find(b => b.id === s.businessId);
                      return (
                        <div key={s.id} className="p-3 rounded-lg bg-surface-50 border border-border text-xs space-y-1.5">
                          <div className="font-semibold text-slate-200">{biz?.officialName}</div>
                          <div className="text-[10px] text-slate-400 flex items-center justify-between">
                            <span>Attempt #{s.attemptNumber} of {s.maxAttempts}</span>
                            <span className="font-mono text-amber-400">Via {s.preferredChannel}</span>
                          </div>
                          <div className="pt-2 flex items-center justify-between border-t border-border">
                            <button
                              onClick={() => biz && openBrief(biz.id)}
                              className="text-[11px] text-blue-400 hover:underline font-medium"
                            >
                              Review Follow-Up Draft
                            </button>
                            <button
                              onClick={() => biz && openFollowUpModal(biz)}
                              className="text-[10px] text-slate-400 hover:text-white"
                            >
                              Reschedule
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Overdue */}
            <div className="p-4 rounded-xl bg-surface-100 border border-rose-500/30 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-semibold text-rose-400 uppercase font-mono flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-rose-400" /> Overdue
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                  {schedules.filter(s => evaluateFollowUpStatus(s) === 'overdue').length}
                </span>
              </div>

              <div className="space-y-2">
                {schedules.filter(s => evaluateFollowUpStatus(s) === 'overdue').length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic py-6 text-center">No overdue follow-ups.</p>
                ) : (
                  schedules
                    .filter(s => evaluateFollowUpStatus(s) === 'overdue')
                    .map(s => {
                      const biz = businesses.find(b => b.id === s.businessId);
                      return (
                        <div key={s.id} className="p-3 rounded-lg bg-surface-50 border border-rose-500/20 text-xs space-y-1.5">
                          <div className="font-semibold text-slate-200">{biz?.officialName}</div>
                          <div className="text-[10px] text-rose-400 font-mono">
                            Was Due: {s.nextFollowUpDate}
                          </div>
                          <div className="pt-2 flex items-center justify-between border-t border-border">
                            <button
                              onClick={() => biz && openBrief(biz.id)}
                              className="text-[11px] text-blue-400 hover:underline font-medium"
                            >
                              Take Action Now
                            </button>
                            <button
                              onClick={() => biz && openFollowUpModal(biz)}
                              className="text-[10px] text-slate-400 hover:text-white"
                            >
                              Snooze
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Upcoming Schedules */}
            <div className="p-4 rounded-xl bg-surface-100 border border-border space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-semibold text-slate-300 uppercase font-mono flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" /> Upcoming (Next 14 Days)
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-50 border border-border text-slate-300">
                  {schedules.filter(s => evaluateFollowUpStatus(s) === 'scheduled').length}
                </span>
              </div>

              <div className="space-y-2">
                {schedules.filter(s => evaluateFollowUpStatus(s) === 'scheduled').length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic py-6 text-center">No upcoming follow-ups scheduled.</p>
                ) : (
                  schedules
                    .filter(s => evaluateFollowUpStatus(s) === 'scheduled')
                    .slice(0, 5)
                    .map(s => {
                      const biz = businesses.find(b => b.id === s.businessId);
                      return (
                        <div key={s.id} className="p-2.5 rounded-lg bg-surface-50 border border-border text-xs flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-200 block">{biz?.officialName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">Due: {s.nextFollowUpDate}</span>
                          </div>
                          <span className="text-[10px] text-blue-400 font-mono uppercase">{s.preferredChannel}</span>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: PIPELINE ANALYTICS */}
      {viewMode === 'analytics' && (
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-4">
            <h3 className="text-sm font-semibold text-white">Outreach Pipeline Conversion Telemetry</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-lg bg-surface-50 border border-border space-y-1">
                <span className="text-slate-400 text-[11px] block">Lead-to-Draft Rate</span>
                <span className="text-xl font-bold font-mono text-indigo-400">
                  {crmMetrics.totalLeads > 0 ? `${Math.round((crmMetrics.draftsCreated / crmMetrics.totalLeads) * 100)}%` : '0%'}
                </span>
                <span className="text-[10px] text-slate-500 block">Drafts created per discovered lead</span>
              </div>
              <div className="p-4 rounded-lg bg-surface-50 border border-border space-y-1">
                <span className="text-slate-400 text-[11px] block">Contacted Conversion</span>
                <span className="text-xl font-bold font-mono text-amber-400">
                  {crmMetrics.contacted > 0 ? `${Math.round((crmMetrics.repliesReceived / crmMetrics.contacted) * 100)}%` : '0%'}
                </span>
                <span className="text-[10px] text-slate-500 block">Reply rate on contacted leads</span>
              </div>
              <div className="p-4 rounded-lg bg-surface-50 border border-border space-y-1">
                <span className="text-slate-400 text-[11px] block">Close / Win Rate</span>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {crmMetrics.contacted > 0 ? `${Math.round((crmMetrics.dealsWon / crmMetrics.contacted) * 100)}%` : '0%'}
                </span>
                <span className="text-[10px] text-slate-500 block">Deals won from active outreach</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: OUTREACH BRIEF & REAL GMAIL DRAFT CREATION */}
      {selectedDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-surface-100 border border-border rounded-xl w-full max-w-2xl p-6 shadow-2xl relative text-left space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-semibold">
                    Multi-Stage Outreach Sequence & Gmail Engine
                  </span>
                  {selectedDraft.isSuppressed && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 uppercase">
                      DO NOT CONTACT — SUPPRESSED
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-white mt-1">{selectedDraft.verifiedIdentity}</h3>
              </div>
              <button
                onClick={() => setSelectedDraft(null)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                Close (ESC)
              </button>
            </div>

            {/* Sequence Stage Tabs */}
            {selectedDraft.sequence && (
              <div className="flex items-center gap-1 border-b border-border overflow-x-auto pb-1 text-[11px]">
                <button
                  onClick={() => setActiveSequenceTab('firstContact')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors shrink-0 ${
                    activeSequenceTab === 'firstContact' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  1. First Contact
                </button>
                <button
                  onClick={() => setActiveSequenceTab('followUpNoResponse')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors shrink-0 ${
                    activeSequenceTab === 'followUpNoResponse' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  2. No Response
                </button>
                <button
                  onClick={() => setActiveSequenceTab('positiveReply')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors shrink-0 ${
                    activeSequenceTab === 'positiveReply' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  3. Positive Reply
                </button>
                <button
                  onClick={() => setActiveSequenceTab('requestMoreInfo')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors shrink-0 ${
                    activeSequenceTab === 'requestMoreInfo' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  4. Request Info
                </button>
                <button
                  onClick={() => setActiveSequenceTab('notInterested')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors shrink-0 ${
                    activeSequenceTab === 'notInterested' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  5. Not Interested
                </button>
                <button
                  onClick={() => setActiveSequenceTab('optOutNotice')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors shrink-0 ${
                    activeSequenceTab === 'optOutNotice' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  6. Opt-Out
                </button>
              </div>
            )}

            {/* Render Selected Sequence Copy */}
            {selectedDraft.sequence && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-surface-50 border border-border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Subject Line</span>
                    <button
                      onClick={() => copyToClipboard('seq_subject', selectedDraft.sequence![activeSequenceTab].subject)}
                      className="text-blue-400 hover:text-white text-[10px] flex items-center gap-1 font-mono"
                    >
                      {copiedField === 'seq_subject' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                  <div className="font-mono text-xs text-slate-200 bg-surface-100 p-2 rounded border border-border">
                    {selectedDraft.sequence[activeSequenceTab].subject}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-surface-50 border border-border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Email Body</span>
                    <button
                      onClick={() => copyToClipboard('seq_body', selectedDraft.sequence![activeSequenceTab].body)}
                      className="text-blue-400 hover:text-white text-[10px] flex items-center gap-1 font-mono"
                    >
                      {copiedField === 'seq_body' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="font-sans text-xs text-slate-300 whitespace-pre-wrap bg-surface-100 p-2.5 rounded border border-border leading-relaxed">
                    {selectedDraft.sequence[activeSequenceTab].body}
                  </pre>
                </div>

                <div className="p-3 rounded-lg bg-surface-50 border border-border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Low-Pressure Call To Action</span>
                    <button
                      onClick={() => copyToClipboard('seq_cta', selectedDraft.sequence![activeSequenceTab].cta)}
                      className="text-blue-400 hover:text-white text-[10px] flex items-center gap-1 font-mono"
                    >
                      {copiedField === 'seq_cta' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 font-medium bg-surface-100 p-2 rounded border border-border">
                    {selectedDraft.sequence[activeSequenceTab].cta}
                  </p>
                </div>

                {/* Real Gmail Draft Action Bar */}
                <div className="p-3.5 rounded-lg bg-surface-50 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-white block">Real Gmail Draft Dispatch</span>
                      <span className="text-[10px] text-slate-400">
                        Never sends automatically. Creates a drafted message in your Google Mail for manual review and dispatch.
                      </span>
                    </div>

                    <button
                      onClick={handleCreateGmailDraft}
                      disabled={isCreatingDraft || selectedDraft.isSuppressed}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        selectedDraft.isSuppressed
                          ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {isCreatingDraft ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Creating in Gmail...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Create Gmail Draft</span>
                        </>
                      )}
                    </button>
                  </div>

                  {gmailDraftSuccess && (
                    <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Draft created in Gmail! (ID: {gmailDraftSuccess.draftId})
                      </span>
                      <a
                        href={gmailDraftSuccess.webLink || 'https://mail.google.com/mail/u/0/#drafts'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline flex items-center gap-1 text-[11px]"
                      >
                        Open Drafts in Gmail <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {gmailDraftError && (
                    <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{gmailDraftError}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: FOLLOW-UP SCHEDULER MODAL */}
      {schedulingBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveSchedule}
            className="bg-surface-100 border border-border rounded-xl w-full max-w-md p-6 shadow-2xl relative text-left space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  Follow-Up Cadence
                </h3>
                <span className="text-xs text-slate-400">{schedulingBusiness.officialName}</span>
              </div>
              <button
                type="button"
                onClick={() => setSchedulingBusiness(null)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Next Follow-Up Due Date</label>
                <input
                  type="date"
                  value={schedNextDate}
                  onChange={e => setSchedNextDate(e.target.value)}
                  required
                  className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Follow-Up Cadence Interval (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={schedInterval}
                  onChange={e => setSchedInterval(e.target.value)}
                  className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-slate-200 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Preferred Channel</label>
                <select
                  value={schedChannel}
                  onChange={e => setSchedChannel(e.target.value as any)}
                  className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                >
                  <option value="email">Email Outreach</option>
                  <option value="phone">Phone Follow-Up</option>
                  <option value="linkedin">LinkedIn Direct Message</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Follow-Up Action Notes</label>
                <textarea
                  value={schedNotes}
                  onChange={e => setSchedNotes(e.target.value)}
                  placeholder="e.g. Inquire about summer RTU maintenance contracts..."
                  rows={2}
                  className="w-full bg-surface-50 border border-border rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setSchedulingBusiness(null)}
                className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs"
              >
                Dismiss
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs transition-colors"
              >
                Save Schedule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DRAWER 3: LEAD ACTIVITY TIMELINE */}
      {timelineBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-100 border-l border-border w-full max-w-md h-full p-6 shadow-2xl flex flex-col text-left space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-semibold block">
                  Lead Activity Audit Trail
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">{timelineBusiness.officialName}</h3>
              </div>
              <button
                onClick={() => setTimelineBusiness(null)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                Close (ESC)
              </button>
            </div>

            {/* Add Custom Note Form */}
            <form onSubmit={handleAddTimelineNote} className="space-y-2">
              <textarea
                value={newActivityNote}
                onChange={e => setNewActivityNote(e.target.value)}
                placeholder="Log activity note or phone conversation summary..."
                rows={2}
                className="w-full bg-surface-50 border border-border rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!newActivityNote.trim()}
                className="w-full py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium"
              >
                Log Activity Note
              </button>
            </form>

            {/* Timeline Events List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {activities.filter(a => a.businessId === timelineBusiness.id).length === 0 ? (
                <p className="text-slate-500 italic text-center py-10">No activity recorded yet for this lead.</p>
              ) : (
                activities
                  .filter(a => a.businessId === timelineBusiness.id)
                  .map(act => (
                    <div key={act.id} className="p-3 rounded-lg bg-surface-50 border border-border space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-semibold text-blue-300 font-mono">{act.title}</span>
                        <span>{new Date(act.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-300 text-[11px]">{act.description}</p>
                      <span className="text-[9px] text-slate-500 font-mono block">Actor: {act.actor}</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
