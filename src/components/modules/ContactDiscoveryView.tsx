'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users2,
  Mail,
  ShieldCheck,
  Building2,
  ExternalLink,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  Search,
  Filter,
  Check,
  X,
  Edit2,
  Trash2,
  Globe2,
  Share2,
  MapPin,
  FileText,
  BadgeCheck,
  Phone,
  GitMerge,
  HelpCircle,
  Lock,
  ArrowRight,
  Eye,
  RefreshCw,
  Sliders,
  CheckCheck,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { repository } from '@/lib/db/repository';
import type {
  Business,
  Contact,
  EmailDiscoveryRecord,
  VerificationStatus,
  EmailVerificationStatus,
  EmailType,
  ContactSourceLabel,
  DecisionMakerTier,
  ContactReviewStatus,
  ContactResearchHistoryEntry,
} from '@/types';
import {
  classifyDecisionMakerRole,
  calculateDecisionMakerConfidence,
  detectMissingContactInfo,
  mergeContactProfiles,
  CONTACT_SOURCE_DEFINITIONS,
} from '@/lib/engines/decisionMakerEngine';

type TabId =
  | 'decision_maker_workspace'
  | 'discovery_pipeline'
  | 'manual_review_merge'
  | 'research_gaps'
  | 'audit_history';

export function ContactDiscoveryView() {
  const { activeProject } = useProject();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [emails, setEmails] = useState<EmailDiscoveryRecord[]>([]);
  const [history, setHistory] = useState<ContactResearchHistoryEntry[]>([]);

  const [activeTab, setActiveTab] = useState<TabId>('decision_maker_workspace');
  const [isExtractingWebsite, setIsExtractingWebsite] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState<string | null>(null);

  // Filters
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterReview, setFilterReview] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected contact for detail drawer / modal
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeSecondaryId, setMergeSecondaryId] = useState<string>('');

  // Form State for Add / Edit
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('President & Founder');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formLinkedin, setFormLinkedin] = useState('');
  const [formSourceLabel, setFormSourceLabel] = useState<ContactSourceLabel>('official_company_source');
  const [formSourceUrl, setFormSourceUrl] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formIsDecisionMaker, setFormIsDecisionMaker] = useState(true);

  // Notice
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load Data
  const loadData = async () => {
    if (!activeProject) return;
    const bList = await repository.getBusinesses(activeProject.id);
    setBusinesses(bList);
    if (bList.length > 0) {
      const activeId = selectedBusinessId || bList[0].id;
      setSelectedBusinessId(activeId);
      await loadBusinessContacts(activeId);
    }
  };

  const loadBusinessContacts = async (bId: string) => {
    const [cList, eList] = await Promise.all([
      repository.getContacts(bId),
      repository.getEmails(bId),
    ]);
    setContacts(cList);
    setEmails(eList);
  };

  useEffect(() => {
    loadData();
  }, [activeProject?.id]);

  const selectedBiz = useMemo(
    () => businesses.find(b => b.id === selectedBusinessId) || businesses[0],
    [businesses, selectedBusinessId]
  );

  // Filtered Contacts for Target Business
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      if (filterTier !== 'all' && c.decisionMakerTier !== filterTier) return false;
      if (filterReview !== 'all' && (c.reviewStatus || 'approved') !== filterReview) return false;
      if (filterSource !== 'all' && c.contactSourceLabel !== filterSource) return false;
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.fullName.toLowerCase().includes(q);
        const matchesRole = c.roleOrTitle.toLowerCase().includes(q);
        const matchesEmail = (c.email || '').toLowerCase().includes(q);
        if (!matchesName && !matchesRole && !matchesEmail) return false;
      }
      return true;
    });
  }, [contacts, filterTier, filterReview, filterSource, searchQuery]);

  // Executive Decision Makers (Tier 1 & Tier 2)
  const decisionMakers = useMemo(() => {
    return filteredContacts.filter(c => c.isDecisionMaker && !c.isFallbackGeneralRoute);
  }, [filteredContacts]);

  // Fallback General Routes (Dispatch, Office, General Inboxes)
  const fallbackRoutes = useMemo(() => {
    return filteredContacts.filter(c => c.isFallbackGeneralRoute || !c.isDecisionMaker);
  }, [filteredContacts]);

  // Handle Switch Target Business
  const handleSelectBusiness = async (bId: string) => {
    setSelectedBusinessId(bId);
    await loadBusinessContacts(bId);
  };

  // STEP 1: Live Website Contact Extraction
  const handleRunWebsiteExtraction = async () => {
    if (!selectedBiz || !selectedBiz.websiteUrl) return;

    setIsExtractingWebsite(true);
    try {
      const res = await fetch('/api/contact/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: selectedBiz.websiteUrl, businessId: selectedBiz.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed extraction');

      const now = new Date().toISOString();

      // Process Staff / Leadership candidates with Prompt 09 Classification & Confidence
      for (const staff of (data.staffCandidates || []) as any[]) {
        const { tier, isDecisionMaker } = classifyDecisionMakerRole(staff.title || 'Executive');
        const contactRec: Contact = {
          id: `con-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          businessId: selectedBiz.id,
          projectId: activeProject!.id,
          fullName: staff.name,
          roleOrTitle: staff.title || 'Leadership',
          company: selectedBiz.officialName,
          verificationStatus: 'unverified',
          isDecisionMaker,
          decisionMakerTier: tier,
          contactSourceLabel: 'official_company_source',
          reviewStatus: 'pending_review',
          confidence: 75,
          sourceUrl: data.url,
          discoveryDate: now,
          notes: `Found published on website: "${staff.excerpt || 'Company Team Directory'}"`,
          isApproved: false,
          corroboratingSources: [data.url],
        };

        const conf = calculateDecisionMakerConfidence(contactRec, selectedBiz);
        contactRec.confidence = conf.totalConfidence;
        contactRec.confidenceBreakdown = conf;

        await repository.saveContact(contactRec);
      }

      // Also ingest extracted emails as verified communication endpoints
      if (Array.isArray(data.emails) && data.emails.length > 0) {
        for (const rawEmail of data.emails as string[]) {
          const isRole = rawEmail.includes('info') || rawEmail.includes('service') || rawEmail.includes('sales');
          const emailRec: EmailDiscoveryRecord = {
            id: `eml-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            businessId: selectedBiz.id,
            projectId: activeProject!.id,
            email: rawEmail,
            emailType: isRole ? 'general_business' : 'named_professional',
            discoverySource: 'website',
            sourceType: 'official_website_dom',
            sourceUrl: data.url,
            discoveryDate: now,
            confidence: 85,
            verificationStatus: 'unknown',
            syntaxValid: true,
            mxRecordsPresent: false,
            isDisposable: false,
            isRoleBased: isRole,
            notes: 'Extracted from official website DOM contact links',
          };
          await repository.saveEmail(emailRec);

          // If no staff candidates found, create a designated operational contact
          if (!data.staffCandidates || data.staffCandidates.length === 0) {
            const prefix = rawEmail.split('@')[0];
            const cleanTitle = prefix.includes('service') ? 'Service Dispatch Manager' : prefix.includes('info') ? 'Office Operations Administrator' : 'Department Contact';
            const fallbackContact: Contact = {
              id: `con-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              businessId: selectedBiz.id,
              projectId: activeProject!.id,
              fullName: `${selectedBiz.officialName} (${cleanTitle})`,
              roleOrTitle: cleanTitle,
              company: selectedBiz.officialName,
              email: rawEmail,
              phone: selectedBiz.phone,
              verificationStatus: 'verified',
              isDecisionMaker: false,
              isFallbackGeneralRoute: true,
              decisionMakerTier: 'general_staff',
              contactSourceLabel: 'official_company_source',
              reviewStatus: 'approved',
              confidence: 80,
              sourceUrl: data.url,
              discoveryDate: now,
              notes: 'Discovered from official website contact information',
              isApproved: true,
              corroboratingSources: [data.url],
            };
            await repository.saveContact(fallbackContact);
          }
        }
      }

      // Add to Research History
      const historyItem: ContactResearchHistoryEntry = {
        id: `hist-${Date.now()}`,
        businessId: selectedBiz.id,
        action: 'discovered',
        timestamp: now,
        details: `Inspected official website DOM. Extracted ${data.staffCandidates?.length || 0} leadership candidates and ${data.emails?.length || 0} emails.`,
        actor: 'DOM Extractor Engine',
      };
      setHistory(prev => [historyItem, ...prev]);

      await loadBusinessContacts(selectedBiz.id);
      setNotice({
        type: 'success',
        message: `Extracted ${data.staffCandidates?.length || 0} leadership candidates from ${data.url}.`,
      });
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      setNotice({ type: 'error', message: `Website Extraction Error: ${err.message}` });
    } finally {
      setIsExtractingWebsite(false);
    }
  };

  // STEP 2: Live DNS MX & Syntax Verification
  const handleVerifyEmail = async (contact: Contact) => {
    if (!contact.email) return;
    setIsVerifyingEmail(contact.id);
    try {
      const res = await fetch('/api/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: contact.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      const isVerified = data.verificationStatus === 'verified_provider' || data.verificationStatus === 'domain_passed_unconfirmed';
      const updatedContact: Contact = {
        ...contact,
        verificationStatus: isVerified ? 'verified' : 'unverified',
        notes: `${contact.notes || ''} [DNS MX: ${data.details || 'Checked'}]`,
      };

      const conf = calculateDecisionMakerConfidence(updatedContact, selectedBiz, [], isVerified);
      updatedContact.confidence = conf.totalConfidence;
      updatedContact.confidenceBreakdown = conf;

      await repository.saveContact(updatedContact);

      // Add to History
      const historyItem: ContactResearchHistoryEntry = {
        id: `hist-${Date.now()}`,
        contactId: contact.id,
        businessId: selectedBiz.id,
        action: 'verified_mx',
        timestamp: new Date().toISOString(),
        details: `Live DNS MX check for ${contact.email}: ${data.verificationStatus} (${data.details}).`,
        actor: 'DNS MX Validator',
      };
      setHistory(prev => [historyItem, ...prev]);

      await loadBusinessContacts(selectedBiz.id);
      setNotice({
        type: 'success',
        message: `DNS MX Check completed for ${contact.email}: ${data.verificationStatus}.`,
      });
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      setNotice({ type: 'error', message: `Verification failed: ${err.message}` });
    } finally {
      setIsVerifyingEmail(null);
    }
  };

  // Manual Review: Approve Contact
  const handleApproveContact = async (c: Contact) => {
    try {
      const updated: Contact = { ...c, reviewStatus: 'approved', isApproved: true };
      await repository.saveContact(updated);

      const historyItem: ContactResearchHistoryEntry = {
        id: `hist-${Date.now()}`,
        contactId: c.id,
        businessId: selectedBiz.id,
        action: 'approved',
        timestamp: new Date().toISOString(),
        details: `Approved ${c.fullName} (${c.roleOrTitle}) for personalized outreach.`,
        actor: 'Intelligence Analyst',
      };
      setHistory(prev => [historyItem, ...prev]);

      await loadBusinessContacts(selectedBiz.id);
      setNotice({ type: 'success', message: `Approved ${c.fullName} for personalized outreach campaigns.` });
      setTimeout(() => setNotice(null), 2500);
    } catch {
      setNotice({ type: 'error', message: 'Failed to approve contact.' });
    }
  };

  // Manual Review: Reject / Suppress Contact
  const handleRejectContact = async (c: Contact) => {
    try {
      const updated: Contact = { ...c, reviewStatus: 'rejected', isApproved: false };
      await repository.saveContact(updated);

      const historyItem: ContactResearchHistoryEntry = {
        id: `hist-${Date.now()}`,
        contactId: c.id,
        businessId: selectedBiz.id,
        action: 'rejected',
        timestamp: new Date().toISOString(),
        details: `Rejected ${c.fullName} (${c.roleOrTitle}). Excluded from outreach.`,
        actor: 'Intelligence Analyst',
      };
      setHistory(prev => [historyItem, ...prev]);

      await loadBusinessContacts(selectedBiz.id);
      setNotice({ type: 'success', message: `Rejected and suppressed ${c.fullName} from outreach.` });
      setTimeout(() => setNotice(null), 2500);
    } catch {
      setNotice({ type: 'error', message: 'Failed to reject contact.' });
    }
  };

  // Manual Review: Save Edit or Add Contact
  const handleSaveContactModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !selectedBiz) return;

    const { tier, isDecisionMaker } = classifyDecisionMakerRole(formRole);
    const now = new Date().toISOString();

    const contactToSave: Contact = {
      id: selectedContact ? selectedContact.id : `con-${Date.now()}`,
      businessId: selectedBiz.id,
      projectId: activeProject!.id,
      fullName: formName.trim(),
      roleOrTitle: formRole.trim(),
      company: selectedBiz.officialName,
      email: formEmail.trim() || undefined,
      phone: formPhone.trim() || undefined,
      publicBusinessPhone: formPhone.trim() || undefined,
      linkedinUrl: formLinkedin.trim() || undefined,
      professionalProfileUrl: formLinkedin.trim() || undefined,
      contactSourceLabel: formSourceLabel,
      sourceUrl: formSourceUrl.trim() || undefined,
      notes: formNotes.trim() || undefined,
      isDecisionMaker: formIsDecisionMaker || isDecisionMaker,
      decisionMakerTier: tier,
      reviewStatus: 'approved',
      verificationStatus: selectedContact?.verificationStatus || 'unverified',
      confidence: 80,
      discoveryDate: selectedContact?.discoveryDate || now,
      corroboratingSources: selectedContact?.corroboratingSources || [formSourceUrl || selectedBiz.websiteUrl],
    };

    const conf = calculateDecisionMakerConfidence(contactToSave, selectedBiz);
    contactToSave.confidence = conf.totalConfidence;
    contactToSave.confidenceBreakdown = conf;

    await repository.saveContact(contactToSave);

    const historyItem: ContactResearchHistoryEntry = {
      id: `hist-${Date.now()}`,
      contactId: contactToSave.id,
      businessId: selectedBiz.id,
      action: selectedContact ? 'edited' : 'discovered',
      timestamp: now,
      details: selectedContact
        ? `Edited profile details for ${contactToSave.fullName}.`
        : `Manually added ${contactToSave.fullName} (${contactToSave.roleOrTitle}).`,
      actor: 'Intelligence Analyst',
    };
    setHistory(prev => [historyItem, ...prev]);

    setIsEditModalOpen(false);
    setIsAddModalOpen(false);
    setSelectedContact(null);
    await loadBusinessContacts(selectedBiz.id);
    setNotice({ type: 'success', message: `Saved contact record for ${contactToSave.fullName}.` });
    setTimeout(() => setNotice(null), 3000);
  };

  // Manual Review: Merge Duplicate Contacts
  const handleMergeContacts = async () => {
    if (!selectedContact || !mergeSecondaryId) return;
    const secondary = contacts.find(c => c.id === mergeSecondaryId);
    if (!secondary) return;

    const merged = mergeContactProfiles(selectedContact, secondary);
    const conf = calculateDecisionMakerConfidence(merged, selectedBiz, [], true);
    merged.confidence = conf.totalConfidence;
    merged.confidenceBreakdown = conf;

    await repository.saveContact(merged);
    await repository.deleteContact(secondary.id);

    const historyItem: ContactResearchHistoryEntry = {
      id: `hist-${Date.now()}`,
      contactId: merged.id,
      businessId: selectedBiz.id,
      action: 'merged',
      timestamp: new Date().toISOString(),
      details: `Merged duplicate record "${secondary.fullName}" into "${merged.fullName}". Corroborating sources preserved.`,
      actor: 'Intelligence Analyst',
    };
    setHistory(prev => [historyItem, ...prev]);

    setIsMergeModalOpen(false);
    setSelectedContact(null);
    setMergeSecondaryId('');
    await loadBusinessContacts(selectedBiz.id);
    setNotice({ type: 'success', message: `Merged contacts into primary profile for ${merged.fullName}.` });
    setTimeout(() => setNotice(null), 3500);
  };

  // Open Edit Modal
  const openEditModal = (c: Contact) => {
    setSelectedContact(c);
    setFormName(c.fullName);
    setFormRole(c.roleOrTitle);
    setFormEmail(c.email || '');
    setFormPhone(c.phone || c.publicBusinessPhone || '');
    setFormLinkedin(c.linkedinUrl || c.professionalProfileUrl || '');
    setFormSourceLabel(c.contactSourceLabel || 'official_company_source');
    setFormSourceUrl(c.sourceUrl || '');
    setFormNotes(c.notes || '');
    setFormIsDecisionMaker(c.isDecisionMaker);
    setIsEditModalOpen(true);
  };

  // Open Add Modal
  const openAddModal = () => {
    setSelectedContact(null);
    setFormName('');
    setFormRole('President & Founder');
    setFormEmail('');
    setFormPhone('');
    setFormLinkedin('');
    setFormSourceLabel('official_company_source');
    setFormSourceUrl(selectedBiz?.websiteUrl || '');
    setFormNotes('');
    setFormIsDecisionMaker(true);
    setIsAddModalOpen(true);
  };

  // Missing info for Target Business
  const targetGaps = useMemo(() => {
    if (!selectedBiz) return [];
    const gaps: { contactId: string; name: string; role: string; missing: string[] }[] = [];
    for (const c of contacts) {
      const m = detectMissingContactInfo(c, selectedBiz);
      if (m.length > 0) {
        gaps.push({ contactId: c.id, name: c.fullName, role: c.roleOrTitle, missing: m });
      }
    }
    return gaps;
  }, [contacts, selectedBiz]);

  return (
    <div className="space-y-6 text-left">
      {/* Privacy & Compliance Banner */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            <strong>PERMITTED PUBLIC SOURCES ONLY:</strong> Official company website, Secretary of State corporate filings, and public directories. No private account scraping or login bypass.
          </span>
        </div>
        <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-indigo-500/20 text-[10px] uppercase font-bold tracking-wider">
          Prompt 09 Certified
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users2 className="w-6 h-6 text-brand-400" />
            Decision-Maker Intelligence & Contact Discovery
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Discover publicly identifiable business decision-makers, calculate 5-pillar explainable confidence, and preserve fallback general business channels.
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 text-xs font-medium text-slate-200 border border-border transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-brand-400" />
            <span>Add Manual Contact</span>
          </button>

          <button
            onClick={handleRunWebsiteExtraction}
            disabled={isExtractingWebsite || !selectedBiz?.websiteUrl}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-medium transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isExtractingWebsite ? 'Scanning Website...' : 'Extract from Website'}</span>
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
            notice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{notice.message}</span>
        </div>
      )}

      {/* Target Business Quick Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs text-slate-400 font-medium shrink-0 flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5 text-slate-500" /> Target Business:
        </span>
        {businesses.map(b => {
          const isSelected = b.id === (selectedBiz?.id || '');
          return (
            <button
              key={b.id}
              onClick={() => handleSelectBusiness(b.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 border ${
                isSelected
                  ? 'bg-brand-500/20 text-white border-brand-500/50 shadow-sm'
                  : 'bg-surface-50 text-slate-300 border-border hover:bg-surface-100 hover:text-white'
              }`}
            >
              <span>{b.officialName}</span>
              <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-surface-200 text-slate-400">
                {b.ownerManagerName ? '1 Principal' : 'General Only'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Target Business Profile Summary */}
      {selectedBiz && (
        <div className="p-4 rounded-xl bg-surface-100 border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-400" />
              <h3 className="text-sm font-bold text-white">{selectedBiz.officialName}</h3>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-surface-200 text-slate-300">
                {selectedBiz.city}, {selectedBiz.state}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Official Website: <a href={selectedBiz.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline font-mono">{selectedBiz.domain || selectedBiz.websiteUrl}</a> • Switchboard: <span className="text-slate-200">{selectedBiz.phone || 'Unknown'}</span>
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs shrink-0">
            <div className="text-right">
              <span className="text-slate-400 block text-[11px]">Identified Contacts</span>
              <span className="text-base font-bold font-mono text-white">{contacts.length}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[11px]">Decision-Makers</span>
              <span className="text-base font-bold font-mono text-emerald-400">{decisionMakers.length}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[11px]">General Routes</span>
              <span className="text-base font-bold font-mono text-blue-400">{fallbackRoutes.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto scrollbar-none pb-px">
        <button
          onClick={() => setActiveTab('decision_maker_workspace')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'decision_maker_workspace'
              ? 'border-brand-500 text-brand-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BadgeCheck className="w-3.5 h-3.5" />
          <span>Decision-Maker Workspace ({decisionMakers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('discovery_pipeline')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'discovery_pipeline'
              ? 'border-brand-500 text-brand-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Multi-Source Discovery Pipeline</span>
        </button>

        <button
          onClick={() => setActiveTab('manual_review_merge')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'manual_review_merge'
              ? 'border-brand-500 text-brand-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitMerge className="w-3.5 h-3.5" />
          <span>Manual Review & Merge ({contacts.filter(c => c.reviewStatus === 'pending_review').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('research_gaps')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'research_gaps'
              ? 'border-brand-500 text-brand-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Missing Information Gaps ({targetGaps.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit_history')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'audit_history'
              ? 'border-brand-500 text-brand-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Research History & Audit Trail</span>
        </button>
      </div>

      {/* TAB 1: DECISION-MAKER WORKSPACE */}
      {activeTab === 'decision_maker_workspace' && (
        <div className="space-y-6">
          {/* Executive Decision-Makers Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Verified Executive Decision-Makers (Target Outreach Priority)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Ranked by role authority tier & 5-pillar confidence score
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {decisionMakers.map(dm => {
                const srcDef = CONTACT_SOURCE_DEFINITIONS[dm.contactSourceLabel || 'unverified'];
                const confBreakdown = dm.confidenceBreakdown;

                return (
                  <div
                    key={dm.id}
                    className="p-4 rounded-xl bg-surface-100 border border-border hover:border-border/80 transition-all space-y-3 shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white">{dm.fullName}</h4>

                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-brand-500/20 text-brand-300 border border-brand-500/30">
                            {dm.roleOrTitle}
                          </span>

                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${srcDef.badgeColor}`}>
                            {srcDef.label}
                          </span>

                          {dm.reviewStatus === 'approved' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Approved for Outreach
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Pending Review
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400">
                          {dm.notes || 'Identified via public corporate registry and official web leadership directory.'}
                        </p>
                      </div>

                      {/* Confidence Score Pill */}
                      <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Confidence</span>
                          <span className="text-sm font-mono font-bold text-white">
                            {dm.confidence || 75}%
                          </span>
                        </div>

                        <div className="w-10 h-10 rounded-lg bg-surface-200 border border-border flex items-center justify-center font-bold font-mono text-xs text-brand-400">
                          {dm.decisionMakerTier === 'tier1_executive' ? 'T1' : 'T2'}
                        </div>
                      </div>
                    </div>

                    {/* Contact Methods Bar */}
                    <div className="pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-4 flex-wrap">
                        {dm.email ? (
                          <div className="flex items-center gap-1.5 font-mono text-slate-200">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{dm.email}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                                dm.verificationStatus === 'verified'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {dm.verificationStatus}
                            </span>
                          </div>
                        ) : (
                          <span className="text-amber-400 italic flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> No direct email found
                          </span>
                        )}

                        {dm.phone && (
                          <div className="flex items-center gap-1.5 text-slate-200">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{dm.phone}</span>
                          </div>
                        )}

                        {dm.linkedinUrl && (
                          <a
                            href={dm.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-400 hover:underline"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>Public Bio</span>
                          </a>
                        )}

                        {dm.sourceUrl && (
                          <a
                            href={dm.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-slate-400 hover:text-white"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span className="truncate max-w-[140px]">Source Evidence</span>
                          </a>
                        )}
                      </div>

                      {/* Action Triggers */}
                      <div className="flex items-center gap-2 self-start sm:self-center">
                        {dm.email && dm.verificationStatus !== 'verified' && (
                          <button
                            onClick={() => handleVerifyEmail(dm)}
                            disabled={isVerifyingEmail === dm.id}
                            className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[11px] font-medium transition-colors flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{isVerifyingEmail === dm.id ? 'Checking MX...' : 'Verify DNS MX'}</span>
                          </button>
                        )}

                        {dm.reviewStatus !== 'approved' && (
                          <button
                            onClick={() => handleApproveContact(dm)}
                            className="px-2.5 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white text-[11px] font-medium transition-colors"
                          >
                            Approve
                          </button>
                        )}

                        <button
                          onClick={() => openEditModal(dm)}
                          className="px-2.5 py-1 rounded bg-surface-200 hover:bg-surface-300 text-slate-300 text-[11px] font-medium transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </div>

                    {/* 5-Pillar Confidence Drawer Snippet */}
                    {confBreakdown && (
                      <div className="pt-2 border-t border-border/50 text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2">
                        <span className="text-slate-500 font-medium">Confidence Breakdown:</span>
                        <div className="flex items-center gap-3 font-mono text-[10px]">
                          <span>Source Quality: <strong className="text-slate-300">{confBreakdown.sourceQuality}/30</strong></span>
                          <span>Role: <strong className="text-slate-300">{confBreakdown.roleRelevance}/25</strong></span>
                          <span>Company Match: <strong className="text-slate-300">{confBreakdown.companyAssociation}/20</strong></span>
                          <span>Recency: <strong className="text-slate-300">{confBreakdown.informationRecency}/15</strong></span>
                          <span>Corroboration: <strong className="text-slate-300">{confBreakdown.independentCorroboration}/10</strong></span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {decisionMakers.length === 0 && (
                <div className="p-8 text-center bg-surface-100 rounded-xl border border-dashed border-border text-slate-400 text-xs">
                  No executive decision-makers verified yet for {selectedBiz?.officialName || 'the selected business'}. Click &quot;Extract from Website&quot; or search the Texas corporate registry.
                </div>
              )}
            </div>
          </div>

          {/* General Business Contact Channels (Fallback Routing) */}
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  General Business Channels (Fallback Routing)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Retained as secondary delivery routes when executive channels are unconfirmed
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {/* Official Switchboard Phone */}
              <div className="p-3 rounded-lg bg-surface-100 border border-border space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-brand-400" /> Main Switchboard
                </span>
                <p className="text-white font-medium">{selectedBiz?.phone || 'None listed'}</p>
                <p className="text-[10px] text-slate-500">Official phone published on Google Profile & footer.</p>
              </div>

              {/* General Dispatch / Inquiries Inbox */}
              <div className="p-3 rounded-lg bg-surface-100 border border-border space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-blue-400" /> General Inbox / Dispatch
                </span>
                <p className="text-white font-medium font-mono truncate">{selectedBiz?.email || 'None listed'}</p>
                <p className="text-[10px] text-slate-500">Service desk or dispatch form fallback endpoint.</p>
              </div>

              {/* Physical Headquarters Address */}
              <div className="p-3 rounded-lg bg-surface-100 border border-border space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-400" /> Headquarters Address
                </span>
                <p className="text-white font-medium truncate">{selectedBiz?.fullAddress || (selectedBiz ? `${selectedBiz.city}, ${selectedBiz.state}` : 'None listed')}</p>
                <p className="text-[10px] text-slate-500">Registered commercial premises.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MULTI-SOURCE DISCOVERY PIPELINE */}
      {activeTab === 'discovery_pipeline' && selectedBiz && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-surface-100 border border-border space-y-2">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Permitted Public Discovery Channels
            </h3>
            <p className="text-xs text-slate-400">
              Corroborate decision-makers across multiple independent public sources to maximize confidence score.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Source 1: Official Website Leadership */}
            <div className="p-4 rounded-xl bg-surface-100 border border-border space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Official Company Source
                </span>
                <h4 className="font-bold text-white">About & Leadership Pages</h4>
                <p className="text-slate-400 text-[11px]">
                  Extracts founder bios, executive roles, and direct department emails from the target domain.
                </p>
              </div>
              <button
                onClick={handleRunWebsiteExtraction}
                disabled={isExtractingWebsite}
                className="w-full py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors shadow-sm"
              >
                {isExtractingWebsite ? 'Scanning DOM...' : 'Inspect Website Leadership'}
              </button>
            </div>

            {/* Source 2: Corporate Registry (Texas Secretary of State) */}
            <div className="p-4 rounded-xl bg-surface-100 border border-border space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Reputable Directory
                </span>
                <h4 className="font-bold text-white">State Business Filing (SOS)</h4>
                <p className="text-slate-400 text-[11px]">
                  Cross-check entity officer rosters, registered agents, and filing dates on official state registries.
                </p>
              </div>
              <a
                href={`https://mycpa.cpa.state.tx.us/coa/`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 bg-surface-200 hover:bg-surface-300 text-slate-200 text-center rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Search Texas Comptroller</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Source 3: Public Professional Profiles (LinkedIn) */}
            <div className="p-4 rounded-xl bg-surface-100 border border-border space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Public Professional Profile
                </span>
                <h4 className="font-bold text-white">Public Company Page</h4>
                <p className="text-slate-400 text-[11px]">
                  Inspect public organizational overview, current employee listings, and confirmed executive titles.
                </p>
              </div>
              <a
                href={`https://www.google.com/search?q=site:linkedin.com/in+${encodeURIComponent(selectedBiz.officialName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 bg-surface-200 hover:bg-surface-300 text-slate-200 text-center rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Search Public Profiles</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MANUAL REVIEW & CONTACT MERGER */}
      {activeTab === 'manual_review_merge' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-surface-100 border border-border flex items-start gap-3">
            <GitMerge className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                Manual Review, Quality Control & Contact Merger
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Human researcher review of all discovered contacts. Approve verified decision-makers, correct roles, or merge duplicate profiles while preserving all corroborating source URLs.
              </p>
            </div>
          </div>

          <div className="divide-y divide-border/60 bg-surface-100 border border-border rounded-xl overflow-hidden shadow-sm">
            {contacts.map(c => (
              <div key={c.id} className="p-4 hover:bg-surface-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{c.fullName}</span>
                    <span className="text-slate-400 font-mono">({c.roleOrTitle})</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] ${
                        c.reviewStatus === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : c.reviewStatus === 'rejected'
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {c.reviewStatus || 'pending_review'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Email: <span className="text-slate-200 font-mono">{c.email || 'None'}</span> • Phone: <span className="text-slate-200">{c.phone || 'None'}</span> • Sources: <span className="text-brand-400">{c.corroboratingSources?.length || 1} verified</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                  <button
                    onClick={() => handleApproveContact(c)}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] transition-colors"
                  >
                    Approve
                  </button>

                  <button
                    onClick={() => handleRejectContact(c)}
                    className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-medium text-[11px] transition-colors"
                  >
                    Reject
                  </button>

                  <button
                    onClick={() => openEditModal(c)}
                    className="px-2.5 py-1 rounded bg-surface-200 hover:bg-surface-300 text-slate-200 font-medium text-[11px] transition-colors"
                  >
                    Edit
                  </button>

                  {contacts.length > 1 && (
                    <button
                      onClick={() => {
                        setSelectedContact(c);
                        const other = contacts.find(o => o.id !== c.id);
                        if (other) setMergeSecondaryId(other.id);
                        setIsMergeModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white font-medium text-[11px] transition-colors flex items-center gap-1"
                    >
                      <GitMerge className="w-3 h-3" />
                      <span>Merge</span>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {contacts.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                No contacts cataloged for review. Run the website extractor or add a manual contact.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MISSING INFORMATION GAPS */}
      {activeTab === 'research_gaps' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-surface-100 border border-border space-y-1">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Research Completeness & Information Gaps
            </h3>
            <p className="text-xs text-slate-400">
              Identifies missing verification steps before outreach briefs are generated.
            </p>
          </div>

          <div className="space-y-3">
            {targetGaps.map(gap => (
              <div key={gap.contactId} className="p-4 rounded-xl bg-surface-100 border border-border space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-white">{gap.name}</span>
                    <span className="text-slate-400">({gap.role})</span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-mono font-bold">
                    {gap.missing.length} Gaps Pending
                  </span>
                </div>

                <ul className="space-y-1 pl-6 list-disc text-slate-300 text-[11px]">
                  {gap.missing.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            ))}

            {targetGaps.length === 0 && (
              <div className="p-8 text-center bg-surface-100 rounded-xl border border-dashed border-border text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                All identified contacts for {selectedBiz?.officialName || 'the selected business'} have complete emails, verified DNS MX status, and corroborated sources!
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: RESEARCH HISTORY & AUDIT TRAIL */}
      {activeTab === 'audit_history' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-surface-100 border border-border space-y-1">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Traceable Research Audit Trail
            </h3>
            <p className="text-xs text-slate-400">
              Chronological log of discovery actions, verification probes, manual edits, and merges.
            </p>
          </div>

          <div className="divide-y divide-border/60 bg-surface-100 border border-border rounded-xl overflow-hidden shadow-sm text-xs">
            {history.map(item => (
              <div key={item.id} className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-brand-500/20 text-brand-300">
                      {item.action.toUpperCase()}
                    </span>
                    <span className="font-medium text-white">{item.actor}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px]">{item.details}</p>
              </div>
            ))}

            {history.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                No recent actions recorded in this session. Run an extraction or verify a contact email to populate the audit trail.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Contact Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-border rounded-xl max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users2 className="w-4 h-4 text-brand-400" />
                {isEditModalOpen ? 'Edit Decision-Maker Profile' : 'Add New Business Contact'}
              </h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setIsAddModalOpen(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContactModal} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Marcus Vance"
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-200 border border-border text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Job Title / Role *</label>
                  <input
                    type="text"
                    required
                    value={formRole}
                    onChange={e => setFormRole(e.target.value)}
                    placeholder="e.g. President & Founder"
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-200 border border-border text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Contact Source Label</label>
                  <select
                    value={formSourceLabel}
                    onChange={e => setFormSourceLabel(e.target.value as ContactSourceLabel)}
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-200 border border-border text-white text-xs"
                  >
                    <option value="official_company_source">Official Company Source</option>
                    <option value="public_professional_profile">Public Professional Profile</option>
                    <option value="reputable_directory">Reputable Directory (SOS)</option>
                    <option value="third_party_provider">Third-Party Provider</option>
                    <option value="user_supplied">User Supplied</option>
                    <option value="unverified">Unverified</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Public Business Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="e.g. m.vance@company.com"
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-200 border border-border text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Direct Phone / Extension</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    placeholder="e.g. (214) 555-0144 ext 101"
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-200 border border-border text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">LinkedIn / Professional Bio URL</label>
                <input
                  type="url"
                  value={formLinkedin}
                  onChange={e => setFormLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-200 border border-border text-white text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Source URL / Corroboration Reference</label>
                <input
                  type="text"
                  value={formSourceUrl}
                  onChange={e => setFormSourceUrl(e.target.value)}
                  placeholder="https://texassecstate.gov/corp/... or website About page"
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-200 border border-border text-white text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Verification Notes & Evidence</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Confirmed on official Texas Secretary of State corporate registration filing."
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-200 border border-border text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setIsAddModalOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-surface-200 hover:bg-surface-300 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-sm"
                >
                  Save Decision-Maker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Merge Contact Modal */}
      {isMergeModalOpen && selectedContact && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-border rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl text-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <GitMerge className="w-4 h-4 text-brand-400" />
                Merge Contact Profiles
              </h3>
              <button onClick={() => setIsMergeModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-300">
              Select a secondary contact profile to merge into <strong>{selectedContact.fullName}</strong>. Corroborating sources, notes, and emails will be combined into the primary profile.
            </p>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Select Profile to Merge (Secondary)</label>
              <select
                value={mergeSecondaryId}
                onChange={e => setMergeSecondaryId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-border text-white text-xs"
              >
                {contacts
                  .filter(c => c.id !== selectedContact.id)
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} — {c.roleOrTitle} ({c.email || 'No email'})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setIsMergeModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-surface-200 hover:bg-surface-300 text-slate-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMergeContacts}
                className="px-4 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-sm"
              >
                Confirm Merge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
