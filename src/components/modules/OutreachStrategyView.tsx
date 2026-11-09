'use client';

import React, { useState, useEffect } from 'react';
import {
  Send,
  Users2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Building2,
  ExternalLink,
  ChevronRight,
  Sliders,
  Filter,
  FileText,
  MessageSquare,
  Mail,
  Flame,
  ArrowRight,
  Eye,
  Calendar,
  Lock,
  Ban,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { repository } from '@/lib/db/repository';
import type {
  Business,
  WebsiteAudit,
  LocalSeoProfile,
  Opportunity,
  Contact,
  IntelligenceFact,
  SourceRecord,
  OutreachProspectStrategy,
  OutreachStrategyAngle,
  OutreachAngleId,
  OutreachStyle,
  OutreachMessageType,
  OutreachPerformanceMetrics,
} from '@/types';
import {
  generateProspectOutreachStrategy,
  recomputeStrategyMessages,
  calculateOutreachPerformanceMetrics,
  generateComplianceFooter,
} from '@/lib/engines/outreachStrategyEngine';

const LinkedinIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const MESSAGE_TYPE_LABELS: Record<OutreachMessageType, { label: string; icon: React.ElementType; group: string }> = {
  first_cold_email: { label: 'First Cold Email', icon: Mail, group: 'Initial Outreach' },
  short_intro: { label: 'Short Intro (<75 words)', icon: FileText, group: 'Initial Outreach' },
  value_first: { label: 'Value-First Checklist', icon: Sparkles, group: 'Initial Outreach' },
  permission_offer: { label: 'Permission-Based Offer', icon: ShieldCheck, group: 'Initial Outreach' },
  website_concept_intro: { label: 'Website Concept Preview', icon: ExternalLink, group: 'Initial Outreach' },
  personalized_follow_up: { label: 'Personalized Follow-Up', icon: Clock, group: 'Follow-Ups' },
  polite_closing: { label: 'Polite Closing Note', icon: CheckCircle2, group: 'Follow-Ups' },
  linkedin_connect: { label: 'LinkedIn Connection', icon: LinkedinIcon, group: 'LinkedIn' },
  linkedin_follow_up: { label: 'LinkedIn Follow-Up', icon: LinkedinIcon, group: 'LinkedIn' },
  response_interested: { label: 'Response to Interested', icon: ThumbsUp, group: 'Inbound Responses' },
  response_not_interested: { label: 'Response to Not-Interested', icon: ThumbsDown, group: 'Inbound Responses' },
};

const WRITING_STYLES: { id: OutreachStyle; label: string; desc: string }[] = [
  { id: 'professional', label: 'Professional', desc: 'Balanced, respectful B2B tone with standard formatting.' },
  { id: 'conversational', label: 'Conversational', desc: 'Natural, peer-to-peer phrasing that reads like a warm colleague.' },
  { id: 'short_direct', label: 'Short & Direct', desc: 'Concise, under 75 words, bulleted, no unnecessary filler.' },
  { id: 'consultative', label: 'Consultative', desc: 'Analytical diagnosis framework focused on operational findings.' },
  { id: 'executive', label: 'Executive-Level', desc: 'Strategic high-level impact and ROI leverage for owners & CEOs.' },
];

export function OutreachStrategyView() {
  const { activeProject } = useProject();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [strategy, setStrategy] = useState<OutreachProspectStrategy | null>(null);
  const [allStrategies, setAllStrategies] = useState<OutreachProspectStrategy[]>([]);
  const [suppressionsCount, setSuppressionsCount] = useState<number>(0);
  const [metrics, setMetrics] = useState<OutreachPerformanceMetrics>({
    draftsCreated: 0,
    messagesApproved: 0,
    messagesSent: 0,
    replies: 0,
    positiveReplies: 0,
    meetings: 0,
    optOuts: 0,
  });

  const [activeMessageType, setActiveMessageType] = useState<OutreachMessageType>('first_cold_email');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [includeComplianceFooter, setIncludeComplianceFooter] = useState(true);
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [editedCta, setEditedCta] = useState('');
  const [followUpDateInput, setFollowUpDateInput] = useState('');
  const [responseNotesInput, setResponseNotesInput] = useState('');
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);

  // Load project data
  useEffect(() => {
    if (!activeProject) return;

    const loadData = async () => {
      const [bList, stratList, suppList] = await Promise.all([
        repository.getBusinesses(activeProject.id),
        repository.getOutreachStrategies(activeProject.id),
        repository.getSuppressions(),
      ]);

      setBusinesses(bList);
      setAllStrategies(stratList);
      setSuppressionsCount(suppList.length);
      setMetrics(calculateOutreachPerformanceMetrics(stratList, suppList.length));

      if (bList.length > 0) {
        const initialBiz = bList[0];
        setSelectedBusinessId(initialBiz.id);
        await loadOrGenerateStrategyForBusiness(initialBiz.id, stratList);
      }
    };

    loadData();
  }, [activeProject]);

  const loadOrGenerateStrategyForBusiness = async (bizId: string, existingStrategies = allStrategies) => {
    if (!activeProject) return;

    const existing = existingStrategies.find(s => s.businessId === bizId);
    if (existing) {
      setStrategy(existing);
      const angle = existing.angles.find(a => a.id === existing.selectedAngleId) || existing.angles[0];
      const msg = angle.messages[activeMessageType];
      setEditedSubject(msg.subject);
      setEditedBody(msg.body);
      setEditedCta(msg.cta);
      return;
    }

    // Generate fresh strategy from cross-engine data
    const [biz, audit, lProfile, opps, contacts, facts, sources, content, questions, isSupp] = await Promise.all([
      repository.getBusiness(bizId),
      repository.getAuditForBusiness(bizId),
      repository.getLocalSeoProfileForBusiness(bizId),
      repository.getOpportunities(bizId, activeProject.id),
      repository.getContacts(bizId, activeProject.id),
      repository.getFacts(bizId, activeProject.id),
      repository.getSources(activeProject.id, bizId),
      repository.getContentItems(bizId, activeProject.id),
      repository.getCustomerQuestions(bizId, activeProject.id),
      repository.isSuppressed(undefined, undefined, undefined),
    ]);

    if (!biz) return;

    const newStrategy = generateProspectOutreachStrategy(
      biz,
      audit,
      lProfile,
      opps,
      contacts,
      facts,
      sources,
      content,
      questions,
      isSupp
    );

    await repository.saveOutreachStrategy(newStrategy);
    const updatedList = [...existingStrategies.filter(s => s.id !== newStrategy.id), newStrategy];
    setAllStrategies(updatedList);
    setStrategy(newStrategy);
    setMetrics(calculateOutreachPerformanceMetrics(updatedList, suppressionsCount));

    const angle = newStrategy.angles.find(a => a.id === newStrategy.selectedAngleId) || newStrategy.angles[0];
    const msg = angle.messages[activeMessageType];
    setEditedSubject(msg.subject);
    setEditedBody(msg.body);
    setEditedCta(msg.cta);
  };

  const handleSelectBusiness = async (bizId: string) => {
    setSelectedBusinessId(bizId);
    await loadOrGenerateStrategyForBusiness(bizId);
  };

  const handleSelectAngle = async (angleId: OutreachAngleId) => {
    if (!strategy) return;
    const updated: OutreachProspectStrategy = {
      ...strategy,
      selectedAngleId: angleId,
      updatedAt: new Date().toISOString(),
    };
    await repository.saveOutreachStrategy(updated);
    setStrategy(updated);

    const angle = updated.angles.find(a => a.id === angleId) || updated.angles[0];
    const msg = angle.messages[activeMessageType];
    setEditedSubject(msg.subject);
    setEditedBody(msg.body);
    setEditedCta(msg.cta);
  };

  const handleSelectStyle = async (style: OutreachStyle) => {
    if (!strategy) return;
    const currentBiz = businesses.find(b => b.id === strategy.businessId);
    if (!currentBiz) return;

    const contacts = await repository.getContacts(currentBiz.id, activeProject?.id);
    const updated = recomputeStrategyMessages(strategy, currentBiz, contacts[0], style);

    await repository.saveOutreachStrategy(updated);
    setStrategy(updated);

    const angle = updated.angles.find(a => a.id === updated.selectedAngleId) || updated.angles[0];
    const msg = angle.messages[activeMessageType];
    setEditedSubject(msg.subject);
    setEditedBody(msg.body);
    setEditedCta(msg.cta);
  };

  const handleSelectMessageType = (type: OutreachMessageType) => {
    setActiveMessageType(type);
    if (!strategy) return;
    const angle = strategy.angles.find(a => a.id === strategy.selectedAngleId) || strategy.angles[0];
    const msg = angle.messages[type];
    setEditedSubject(msg.subject);
    setEditedBody(msg.body);
    setEditedCta(msg.cta);
    setIsEditingMessage(false);
  };

  const handleToggleClaim = async (claimId: string) => {
    if (!strategy) return;
    const currentBiz = businesses.find(b => b.id === strategy.businessId);
    if (!currentBiz) return;

    const updatedAngles = strategy.angles.map(angle => {
      const updatedClaims = angle.evidenceClaims.map(c => (c.id === claimId ? { ...c, isIncluded: !c.isIncluded } : c));
      return {
        ...angle,
        evidenceClaims: updatedClaims,
      };
    });

    let updatedStrategy: OutreachProspectStrategy = {
      ...strategy,
      angles: updatedAngles,
      updatedAt: new Date().toISOString(),
    };

    const contacts = await repository.getContacts(currentBiz.id, activeProject?.id);
    updatedStrategy = recomputeStrategyMessages(updatedStrategy, currentBiz, contacts[0], strategy.activeStyle);

    await repository.saveOutreachStrategy(updatedStrategy);
    setStrategy(updatedStrategy);

    const angle = updatedStrategy.angles.find(a => a.id === updatedStrategy.selectedAngleId) || updatedStrategy.angles[0];
    const msg = angle.messages[activeMessageType];
    setEditedSubject(msg.subject);
    setEditedBody(msg.body);
    setEditedCta(msg.cta);
  };

  const handleSaveMessageEdits = async () => {
    if (!strategy) return;
    const updatedAngles = strategy.angles.map(angle => {
      if (angle.id !== strategy.selectedAngleId) return angle;
      return {
        ...angle,
        messages: {
          ...angle.messages,
          [activeMessageType]: {
            subject: editedSubject,
            body: editedBody,
            cta: editedCta,
          },
        },
      };
    });

    const updated: OutreachProspectStrategy = {
      ...strategy,
      angles: updatedAngles,
      updatedAt: new Date().toISOString(),
    };

    await repository.saveOutreachStrategy(updated);
    setStrategy(updated);
    setIsEditingMessage(false);
  };

  // Status transitions
  const handleUpdateStatus = async (newStatus: OutreachProspectStrategy['status'], extraData: Partial<OutreachProspectStrategy> = {}) => {
    if (!strategy) return;
    const updated: OutreachProspectStrategy = {
      ...strategy,
      status: newStatus,
      ...extraData,
      updatedAt: new Date().toISOString(),
    };

    await repository.saveOutreachStrategy(updated);
    const updatedList = allStrategies.map(s => (s.id === updated.id ? updated : s));
    setAllStrategies(updatedList);
    setStrategy(updated);
    setMetrics(calculateOutreachPerformanceMetrics(updatedList, suppressionsCount));
  };

  const handleSuppressProspect = async () => {
    if (!strategy) return;
    const currentBiz = businesses.find(b => b.id === strategy.businessId);
    if (!currentBiz) return;

    await repository.saveSuppression({
      id: `supp-${currentBiz.id}`,
      domain: currentBiz.domain,
      email: strategy.targetContactEmail || currentBiz.email,
      companyName: currentBiz.officialName,
      reason: 'Requested opt-out / Suppressed via Outreach Strategy Panel',
      addedAt: new Date().toISOString(),
    });

    const newSuppCount = suppressionsCount + 1;
    setSuppressionsCount(newSuppCount);
    await handleUpdateStatus('suppressed', { isSuppressed: true, suppressionReason: 'User initiated suppression / Opt-out' });
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const currentBusiness = businesses.find(b => b.id === selectedBusinessId);
  const currentAngle = strategy?.angles.find(a => a.id === strategy.selectedAngleId) || strategy?.angles[0];
  const currentMessage = currentAngle?.messages[activeMessageType];

  const fullEmailContent = currentMessage
    ? `Subject: ${editedSubject || currentMessage.subject}\n\n${editedBody || currentMessage.body}\n\n${editedCta || currentMessage.cta}${
        includeComplianceFooter ? generateComplianceFooter('WATECH Research Team', undefined, strategy?.targetContactEmail) : ''
      }`
    : '';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Module Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <Send className="w-6 h-6 text-brand-400" />
              Outreach Strategy & Personalization Engine
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">
              Prompt 11
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Generate personalized, evidence-backed B2B outreach strategies with 3 strategic angles, 11 message formats across 5 writing styles, and interactive claims auditing. Zero automated sending.
          </p>
        </div>
      </div>

      {/* Honest Performance Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3 rounded-lg bg-surface border border-border">
          <span className="text-xs text-slate-400 font-medium">Drafts Prepared</span>
          <div className="text-xl font-bold text-white mt-1">{metrics.draftsCreated}</div>
        </div>
        <div className="p-3 rounded-lg bg-surface border border-border">
          <span className="text-xs text-slate-400 font-medium">Human Approved</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">{metrics.messagesApproved}</div>
        </div>
        <div className="p-3 rounded-lg bg-surface border border-border">
          <span className="text-xs text-slate-400 font-medium">Manual Sent</span>
          <div className="text-xl font-bold text-blue-400 mt-1">{metrics.messagesSent}</div>
        </div>
        <div className="p-3 rounded-lg bg-surface border border-border">
          <span className="text-xs text-slate-400 font-medium">Total Replies</span>
          <div className="text-xl font-bold text-indigo-400 mt-1">{metrics.replies}</div>
        </div>
        <div className="p-3 rounded-lg bg-surface border border-border">
          <span className="text-xs text-slate-400 font-medium">Positive Replies</span>
          <div className="text-xl font-bold text-cyan-400 mt-1">{metrics.positiveReplies}</div>
        </div>
        <div className="p-3 rounded-lg bg-surface border border-border">
          <span className="text-xs text-slate-400 font-medium">Meetings Booked</span>
          <div className="text-xl font-bold text-purple-400 mt-1">{metrics.meetings}</div>
        </div>
        <div className="p-3 rounded-lg bg-surface border border-border">
          <span className="text-xs text-slate-400 font-medium">Suppressed / Opt-Out</span>
          <div className="text-xl font-bold text-rose-400 mt-1">{metrics.optOuts}</div>
        </div>
      </div>

      {/* Prospect Selector Ribbon */}
      <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-400" />
            <h2 className="text-base font-semibold text-white">Select Prospect Business</h2>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedBusinessId}
              onChange={e => handleSelectBusiness(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-surface-raised border border-border text-sm text-white focus:outline-none focus:border-brand-500"
            >
              {businesses.map(b => (
                <option key={b.id} value={b.id}>
                  {b.officialName} ({b.city || 'DFW'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {currentBusiness && (
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs border-t border-border/50">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-500">Domain:</span>
              <a
                href={currentBusiness.websiteUrl || `https://${currentBusiness.domain}`}
                target="_blank"
                rel="noreferrer"
                className="text-brand-400 hover:underline flex items-center gap-0.5"
              >
                {currentBusiness.domain}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-500">Target Contact:</span>
              <span className="font-semibold text-white">
                {strategy?.targetContactName || 'Leadership Team'}
              </span>
              <span className="text-slate-400">({strategy?.targetContactRole || 'Owner/GM'})</span>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-500">Target Email:</span>
              <span className="font-mono text-cyan-400">
                {strategy?.targetContactEmail || currentBusiness.email || 'No direct email verified'}
              </span>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Pipeline Status:</span>
              <span
                className={`px-2 py-0.5 rounded-full font-medium ${
                  strategy?.status === 'approved'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : strategy?.status === 'contacted'
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : strategy?.status === 'replied_interested'
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    : strategy?.status === 'suppressed'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {strategy?.status.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>

      {strategy?.isSuppressed && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-rose-300">Prospect Is Permanently Suppressed / Opted Out</h4>
            <p className="text-xs text-rose-200/80 mt-0.5">
              Reason: {strategy.suppressionReason || 'Contact has opted out or domain is on the global suppression list.'} No outreach messages may be approved or dispatched to this prospect.
            </p>
          </div>
        </div>
      )}

      {/* 3 Strategic Outreach Angles (Requirement 2 & 8) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            Strategic Outreach Angles (Pick 1 of 3 Evidence-Backed Angles)
          </h2>
          <span className="text-xs text-slate-400">
            Multi-angle strategy generator evaluates distinct business problems
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {strategy?.angles.map(angle => {
            const isSelected = strategy.selectedAngleId === angle.id;
            return (
              <div
                key={angle.id}
                onClick={() => handleSelectAngle(angle.id)}
                className={`p-4 rounded-xl cursor-pointer transition-all border relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-brand-500/10 border-brand-500 shadow-lg shadow-brand-500/10 ring-1 ring-brand-500'
                    : 'bg-surface border-border hover:border-slate-600'
                }`}
              >
                {angle.isRecommended && (
                  <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow">
                    <Sparkles className="w-3 h-3" /> Recommended
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-brand-400' : 'bg-slate-500'}`} />
                      {angle.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {angle.description}
                    </p>
                  </div>

                  <div className="space-y-2 text-xs pt-2 border-t border-border/50">
                    <div>
                      <span className="text-slate-500 font-medium">Business Problem:</span>
                      <p className="text-slate-300 mt-0.5 line-clamp-2">{angle.bestBusinessProblem}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Relevant Watech Service:</span>
                      <p className="text-brand-400 font-mono mt-0.5 capitalize">
                        {angle.relevantWatechService.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Why It Matters:</span>
                      <p className="text-slate-300 mt-0.5 line-clamp-2">{angle.whyFindingMatters}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {angle.evidenceClaims.filter(c => c.isIncluded).length} verified evidence claims
                  </span>
                  <span className={`font-medium flex items-center gap-1 ${isSelected ? 'text-brand-400' : 'text-slate-400'}`}>
                    {isSelected ? 'Active Angle' : 'Switch to Angle'}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {currentAngle?.isRecommended && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Why this angle is recommended: </span>
              {currentAngle.recommendedReason}
            </div>
          </div>
        )}
      </div>

      {/* Writing Style Selector (Requirement 5) */}
      <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-brand-400" />
            <h3 className="text-sm font-semibold text-white">Tone & Writing Style</h3>
          </div>
          <span className="text-xs text-slate-400">
            Adapts vocabulary & structure without altering factual evidence
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {WRITING_STYLES.map(style => {
            const isSelected = strategy?.activeStyle === style.id;
            return (
              <button
                key={style.id}
                onClick={() => handleSelectStyle(style.id)}
                className={`p-2.5 rounded-lg text-left transition-all border ${
                  isSelected
                    ? 'bg-brand-500/20 border-brand-500 text-white shadow-sm'
                    : 'bg-surface-raised border-border text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="text-xs font-bold flex items-center justify-between">
                  {style.label}
                  {isSelected && <Check className="w-3.5 h-3.5 text-brand-400" />}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-snug">
                  {style.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Outreach Workspace: Message Types & Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 11 Message Types Navigator */}
        <div className="lg:col-span-4 space-y-3">
          <div className="p-3 rounded-xl bg-surface border border-border space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                11 Message Types
              </span>
              <span className="text-[11px] text-brand-400 font-mono">Select Format</span>
            </div>

            {['Initial Outreach', 'Follow-Ups', 'LinkedIn', 'Inbound Responses'].map(group => {
              const typesInGroup = Object.entries(MESSAGE_TYPE_LABELS).filter(
                ([_, meta]) => meta.group === group
              ) as [OutreachMessageType, { label: string; icon: React.ElementType; group: string }][];

              return (
                <div key={group} className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2">
                    {group}
                  </span>
                  <div className="space-y-1">
                    {typesInGroup.map(([typeId, meta]) => {
                      const Icon = meta.icon;
                      const isActive = activeMessageType === typeId;
                      return (
                        <button
                          key={typeId}
                          onClick={() => handleSelectMessageType(typeId)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                            isActive
                              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                              : 'text-slate-300 hover:bg-surface-raised hover:text-white'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Icon className="w-4 h-4 shrink-0" />
                            {meta.label}
                          </span>
                          {isActive && <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Evidence Claims Panel (Requirement 7) */}
          <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-brand-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Supporting Evidence Claims
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">Toggle to Remove</span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Every message statement is tied to a verifiable research source. Uncheck any statement to exclude it from the approved draft.
            </p>

            <div className="space-y-2">
              {currentAngle?.evidenceClaims.map(claim => (
                <div
                  key={claim.id}
                  onClick={() => handleToggleClaim(claim.id)}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    claim.isIncluded
                      ? 'bg-surface-raised border-slate-700'
                      : 'bg-surface/50 border-border opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      {claim.isIncluded ? (
                        <CheckSquare className="w-4 h-4 text-brand-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className={`font-medium ${claim.isIncluded ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                        {claim.claimText}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="text-brand-400 font-mono">{claim.sourceName}</span>
                        <span>•</span>
                        <span>{claim.retrievalDate}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Message Editor & Live Preview */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-5 rounded-xl bg-surface border border-border space-y-4">
            {/* Action Bar Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-semibold flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {MESSAGE_TYPE_LABELS[activeMessageType].label}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Style: {strategy?.activeStyle.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditingMessage(!isEditingMessage)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    isEditingMessage
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-surface-raised text-slate-300 border-border hover:text-white'
                  }`}
                >
                  {isEditingMessage ? 'Done Editing' : 'Edit Message'}
                </button>
                <button
                  onClick={() => copyToClipboard(fullEmailContent, 'full_email')}
                  className="px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-slate-700 text-slate-200 border border-border text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  {copiedField === 'full_email' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Message
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Subject Line */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <label className="font-semibold text-slate-300">Subject Line</label>
                <span className="font-mono text-[11px] text-slate-500">
                  {editedSubject.length} chars
                </span>
              </div>
              <input
                type="text"
                disabled={!isEditingMessage}
                value={editedSubject}
                onChange={e => setEditedSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-border text-sm text-white font-medium focus:outline-none focus:border-brand-500 disabled:opacity-90"
              />
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <label className="font-semibold text-slate-300">Message Content</label>
                <span className="font-mono text-[11px] text-slate-500">
                  {editedBody.split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
              <textarea
                rows={9}
                disabled={!isEditingMessage}
                value={editedBody}
                onChange={e => setEditedBody(e.target.value)}
                className="w-full p-3 rounded-lg bg-surface-raised border border-border text-sm text-slate-200 leading-relaxed font-sans focus:outline-none focus:border-brand-500 disabled:opacity-90 resize-none"
              />
            </div>

            {/* Clear Call to Action */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Specific Call to Action (CTA)</label>
              <input
                type="text"
                disabled={!isEditingMessage}
                value={editedCta}
                onChange={e => setEditedCta(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-border text-sm text-brand-300 font-medium focus:outline-none focus:border-brand-500 disabled:opacity-90"
              />
            </div>

            {/* Compliance Footer Toggle */}
            <div className="p-3 rounded-lg bg-surface-raised border border-border/70 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">Include CAN-SPAM / GDPR Unsubscribe Notice</span>
              </div>
              <input
                type="checkbox"
                checked={includeComplianceFooter}
                onChange={e => setIncludeComplianceFooter(e.target.checked)}
                className="rounded border-slate-700 bg-surface text-brand-500 focus:ring-brand-500"
              />
            </div>

            {isEditingMessage && (
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={handleSaveMessageEdits}
                  className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-colors"
                >
                  Save Customized Copy
                </button>
              </div>
            )}
          </div>

          {/* Human Approval & Pipeline State Machine (Requirements 9 & 10) */}
          <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Human Approval & Outreach Pipeline Actions
                </h3>
              </div>
              <span className="text-xs font-mono text-emerald-400">Strictly Draft Mode</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {strategy?.status === 'draft' && (
                <button
                  disabled={strategy.isSuppressed}
                  onClick={() => handleUpdateStatus('approved', { approvalDate: new Date().toISOString() })}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve Draft for Outreach
                </button>
              )}

              {strategy?.status === 'approved' && (
                <button
                  disabled={strategy.isSuppressed}
                  onClick={() => handleUpdateStatus('contacted', { contactedDate: new Date().toISOString() })}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                  Mark as Contacted (Sent)
                </button>
              )}

              {strategy?.status !== 'suppressed' && (
                <>
                  <button
                    onClick={() => {
                      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
                      handleUpdateStatus('follow_up_scheduled', { scheduledFollowUpDate: nextWeek });
                    }}
                    className="px-3 py-2 rounded-lg bg-surface-raised hover:bg-slate-700 text-slate-200 border border-border text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-amber-400" />
                    Schedule Follow-Up (7d)
                  </button>

                  <button
                    onClick={() => setIsResponseModalOpen(true)}
                    className="px-3 py-2 rounded-lg bg-surface-raised hover:bg-slate-700 text-slate-200 border border-border text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                    Record Inbound Response
                  </button>

                  <button
                    onClick={() => handleUpdateStatus('not_interested', { responseDate: new Date().toISOString() })}
                    className="px-3 py-2 rounded-lg bg-surface-raised hover:bg-slate-700 text-slate-300 border border-border text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <ThumbsDown className="w-4 h-4 text-slate-400" />
                    Mark Not Interested
                  </button>

                  <button
                    onClick={handleSuppressProspect}
                    className="px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors ml-auto"
                  >
                    <Ban className="w-4 h-4" />
                    Suppress Contact
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Response Modal */}
      {isResponseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-400" />
              Record Inbound Prospect Response
            </h3>
            <p className="text-xs text-slate-400">
              Update prospect pipeline status based on direct communication.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => {
                  handleUpdateStatus('replied_interested', {
                    responseDate: new Date().toISOString(),
                    responseNotes: responseNotesInput || 'Positive reply: Interested in reviewing brief',
                  });
                  setIsResponseModalOpen(false);
                }}
                className="w-full p-3 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-left text-xs font-medium text-purple-300 flex items-center justify-between"
              >
                <span>Interested (Requested Brief / Meeting)</span>
                <ThumbsUp className="w-4 h-4 text-purple-400" />
              </button>

              <button
                onClick={() => {
                  handleUpdateStatus('replied_more_info', {
                    responseDate: new Date().toISOString(),
                    responseNotes: responseNotesInput || 'Requested additional details / pricing clarification',
                  });
                  setIsResponseModalOpen(false);
                }}
                className="w-full p-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-left text-xs font-medium text-blue-300 flex items-center justify-between"
              >
                <span>Requested More Info / Clarification</span>
                <Clock className="w-4 h-4 text-blue-400" />
              </button>

              <button
                onClick={() => {
                  handleUpdateStatus('not_interested', {
                    responseDate: new Date().toISOString(),
                    responseNotes: responseNotesInput || 'Politely declined',
                  });
                  setIsResponseModalOpen(false);
                }}
                className="w-full p-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-border text-left text-xs font-medium text-slate-300 flex items-center justify-between"
              >
                <span>Not Interested at this time</span>
                <ThumbsDown className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Notes / Exact Response</label>
              <textarea
                rows={3}
                placeholder="Paste verbatim reply or meeting details..."
                value={responseNotesInput}
                onChange={e => setResponseNotesInput(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-surface-raised border border-border text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsResponseModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-surface-raised text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
