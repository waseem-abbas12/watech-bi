'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Layers,
  ExternalLink,
  Search,
  RefreshCw,
  Download,
  Printer,
  Calendar,
  Sparkles,
  Building2,
  Trash2,
  Check,
  Copy,
  ArrowUpRight,
  Filter,
  Video,
  Share2,
  Tag,
  BookOpen,
  Compass,
  MessageSquare,
  Clock,
  UserCheck,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { repository } from '@/lib/db/repository';
import type {
  Business,
  ContentItem,
  ContentClassification,
  CustomerQuestionInsight,
  ContentOpportunityItem,
  ContentCalendarItem,
  CompetitorContentMetric,
} from '@/types';
import {
  calculateCompetitorContentMetrics,
  detectContentGaps,
  generateContentOpportunities,
} from '@/lib/engines/contentGapEngine';
import { extractCustomerQuestions } from '@/lib/engines/questionIntelligenceEngine';

type TabId =
  | 'inventory_scanner'
  | 'competitor_matrix'
  | 'gap_detection'
  | 'customer_questions'
  | 'content_opportunities'
  | 'content_calendar'
  | 'executive_report';

export function ContentDiscoveryView() {
  const { activeProject } = useProject();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [allContent, setAllContent] = useState<ContentItem[]>([]);
  const [customerQuestions, setCustomerQuestions] = useState<CustomerQuestionInsight[]>([]);
  const [calendarItems, setCalendarItems] = useState<ContentCalendarItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('inventory_scanner');
  const [isLoading, setIsLoading] = useState(true);

  // Live URL Extraction state
  const [extractUrl, setExtractUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractNotice, setExtractNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [classificationFilter, setClassificationFilter] = useState<string>('all');
  const [calendarStatusFilter, setCalendarStatusFilter] = useState<string>('all');

  // Modals
  const [isAddContentOpen, setIsAddContentOpen] = useState(false);
  const [newContentForm, setNewContentForm] = useState<Partial<ContentItem>>({
    contentType: 'service_page',
    classification: 'service_focused',
    callToActionQuality: 'weak',
    dateObserved: new Date().toISOString().split('T')[0],
  });

  const [isAddCalendarOpen, setIsAddCalendarOpen] = useState(false);
  const [newCalendarForm, setNewCalendarForm] = useState<Partial<ContentCalendarItem>>({
    contentFormat: 'pillar_guide',
    platform: 'website_blog',
    status: 'planned',
    priority: 'high',
    plannedDate: new Date().toISOString().split('T')[0],
    assignedPerson: 'Content Strategist',
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load Data
  const loadData = async () => {
    if (!activeProject) return;
    try {
      setIsLoading(true);
      const [allBiz, items, calItems, questions] = await Promise.all([
        repository.getBusinesses(activeProject.id),
        repository.getContentItems(undefined, activeProject.id),
        repository.getContentCalendarItems(undefined, activeProject.id),
        repository.getCustomerQuestions(undefined, activeProject.id),
      ]);

      setBusinesses(allBiz);
      setAllContent(items);
      setCalendarItems(calItems);
      setCustomerQuestions(questions);

      if (allBiz.length > 0 && !selectedBusinessId) {
        setSelectedBusinessId(allBiz[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProject?.id]);

  // Selected Target Business
  const selectedBusiness = useMemo(
    () => businesses.find(b => b.id === selectedBusinessId) || businesses[0],
    [businesses, selectedBusinessId]
  );

  // Content for selected business
  const targetContent = useMemo(
    () => allContent.filter(c => c.businessId === selectedBusiness?.id),
    [allContent, selectedBusiness]
  );

  // Filtered Content Inventory
  const filteredContent = useMemo(() => {
    if (classificationFilter === 'all') return targetContent;
    return targetContent.filter(c => c.classification === classificationFilter);
  }, [targetContent, classificationFilter]);

  // Competitor Content Metrics
  const competitorMetrics: CompetitorContentMetric[] = useMemo(
    () => calculateCompetitorContentMetrics(businesses, allContent),
    [businesses, allContent]
  );

  // Content Gaps
  const contentGaps = useMemo(() => {
    if (!selectedBusiness) return null;
    const competitorContent = allContent.filter(c => c.businessId !== selectedBusiness.id);
    return detectContentGaps(selectedBusiness, targetContent, competitorContent);
  }, [selectedBusiness, targetContent, allContent]);

  // Content Opportunities
  const generatedOpportunities: ContentOpportunityItem[] = useMemo(() => {
    if (!selectedBusiness || !contentGaps) return [];
    return generateContentOpportunities(selectedBusiness, contentGaps);
  }, [selectedBusiness, contentGaps]);

  // Customer Questions for Target
  const targetQuestions = useMemo(() => {
    if (!selectedBusiness) return [];
    const directQuestions = customerQuestions.filter(q => q.businessId === selectedBusiness.id);
    if (directQuestions.length > 0) return directQuestions;
    // Derive from reviews & content if empty
    return extractCustomerQuestions(
      selectedBusiness.id,
      selectedBusiness.projectId,
      selectedBusiness.officialName,
      [],
      targetContent
    );
  }, [selectedBusiness, customerQuestions, targetContent]);

  // Filtered Calendar Items
  const filteredCalendar = useMemo(() => {
    const bizCalendar = calendarItems.filter(c => c.businessId === selectedBusiness?.id);
    if (calendarStatusFilter === 'all') return bizCalendar;
    return bizCalendar.filter(c => c.status === calendarStatusFilter);
  }, [calendarItems, selectedBusiness, calendarStatusFilter]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Live Extract Content URL
  const handleLiveExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extractUrl || !selectedBusiness || !activeProject) return;

    try {
      setIsExtracting(true);
      setExtractNotice(null);

      const res = await fetch('/api/content/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: extractUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract content from target URL');
      }

      const newContent: ContentItem = {
        id: `content-${Date.now()}`,
        businessId: selectedBusiness.id,
        projectId: activeProject.id,
        contentType: data.url.includes('youtube.com')
          ? 'youtube'
          : data.classification === 'faq'
          ? 'faq'
          : data.classification === 'service_focused'
          ? 'service_page'
          : 'blog',
        classification: data.classification,
        title: data.title,
        url: data.url,
        mainTopic: data.mainTopic,
        summary: data.summary,
        headings: data.headings,
        publicationDate: data.publicationDate,
        lastUpdatedDate: data.lastUpdatedDate,
        callToActionText: data.callToActionText,
        callToActionQuality: data.callToActionQuality,
        imagesCount: data.imagesCount,
        internalLinksCount: data.internalLinksCount,
        themes: data.headings?.slice(0, 3) || ['Extracted Article'],
        sourceUrl: data.url,
        sourceType: 'website',
        dateObserved: new Date().toISOString().split('T')[0],
      };

      await repository.saveContentItem(newContent);
      setExtractUrl('');
      await loadData();

      setExtractNotice({
        type: 'success',
        message: `Extracted and classified "${data.title.slice(0, 40)}..." as [${data.classification.toUpperCase()}]!`,
      });
    } catch (err: unknown) {
      setExtractNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error extracting content.',
      });
    } finally {
      setIsExtracting(false);
      setTimeout(() => setExtractNotice(null), 6000);
    }
  };

  // Add Opportunity to Content Calendar
  const handleAddOpportunityToCalendar = async (opp: ContentOpportunityItem) => {
    if (!selectedBusiness || !activeProject) return;

    const calendarItem: ContentCalendarItem = {
      id: `cal-${Date.now()}`,
      projectId: activeProject.id,
      businessId: selectedBusiness.id,
      topic: opp.topic,
      contentFormat: opp.suggestedFormat,
      platform:
        opp.suggestedFormat === 'service_page'
          ? 'service_page'
          : opp.suggestedFormat === 'case_study'
          ? 'linkedin'
          : opp.suggestedFormat === 'video_script'
          ? 'youtube'
          : 'website_blog',
      plannedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'planned',
      assignedPerson: 'Content Strategist',
      priority: opp.priority,
      targetAudience: opp.targetAudience,
      notes: `Suggested Title: "${opp.suggestedTitle}". Outline: ${opp.suggestedOutline.join('; ')}`,
      linkedOpportunityId: opp.id,
    };

    await repository.saveContentCalendarItem(calendarItem);
    await loadData();

    setExtractNotice({
      type: 'success',
      message: `Added "${opp.topic}" to Content Calendar!`,
    });
    setTimeout(() => setExtractNotice(null), 4000);
  };

  // Update Calendar Status
  const handleUpdateCalendarStatus = async (
    item: ContentCalendarItem,
    newStatus: ContentCalendarItem['status']
  ) => {
    const updated = { ...item, status: newStatus };
    await repository.saveContentCalendarItem(updated);
    await loadData();
  };

  // Delete Calendar Item
  const handleDeleteCalendarItem = async (id: string) => {
    await repository.deleteContentCalendarItem(id);
    await loadData();
  };

  // Export Calendar CSV
  const handleExportCalendarCsv = () => {
    const bizCalendar = calendarItems.filter(c => c.businessId === selectedBusiness?.id);
    if (!bizCalendar.length) return;

    const headers = ['Topic', 'Format', 'Platform', 'Planned Date', 'Status', 'Priority', 'Assigned Person', 'Target Audience'];
    const rows = bizCalendar.map(c => [
      `"${c.topic.replace(/"/g, '""')}"`,
      c.contentFormat,
      c.platform,
      c.plannedDate,
      c.status,
      c.priority,
      `"${c.assignedPerson || ''}"`,
      `"${(c.targetAudience || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `watech_content_calendar_${selectedBusiness?.officialName.replace(/[^a-z0-9]/gi, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!activeProject) {
    return (
      <div className="p-8 text-center text-slate-400">
        Please select or create a project to access the Content & Competitor Intelligence Engine.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Content & Competitor Intelligence Engine
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/25 uppercase">
                  Prompt 06
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25">
                  10-Type Classification / No Fake Metrics
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Analyze publishing patterns, uncover competitor topical coverage, extract customer questions, detect white-space gaps, and plan editorial calendars.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCalendarCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-50 hover:bg-surface-100 border border-border text-xs font-medium text-slate-300 transition-all"
            title="Export Calendar to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Export Calendar CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-50 hover:bg-surface-100 border border-border text-xs font-medium text-slate-300 transition-all"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            Print Report
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {extractNotice && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            extractNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {extractNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{extractNotice.message}</span>
          </div>
          <button
            onClick={() => setExtractNotice(null)}
            className="text-slate-400 hover:text-white text-xs underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Target Business & Live Extraction Bar */}
      <div className="p-4 rounded-xl bg-surface-100/70 border border-border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Target Business Switcher */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-purple-400" />
              Target Business Under Analysis
            </label>
            <select
              value={selectedBusinessId}
              onChange={e => setSelectedBusinessId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-50 border border-border text-sm text-slate-100 focus:outline-none focus:border-purple-500"
            >
              {businesses.map(b => (
                <option key={b.id} value={b.id}>
                  {b.officialName} ({b.city || 'DFW'})
                </option>
              ))}
            </select>
          </div>

          {/* Live URL Scraper & 10-Type Classifier */}
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-purple-400" />
                Live Public Content Scraper & 10-Type Classifier
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                Blog, Service, FAQ, Social, or YouTube URL
              </span>
            </label>
            <form onSubmit={handleLiveExtract} className="flex gap-2">
              <input
                type="url"
                value={extractUrl}
                onChange={e => setExtractUrl(e.target.value)}
                placeholder="https://apexmechanicaltx.com/blog/chiller-preventative-maintenance"
                className="flex-1 px-3 py-2 rounded-lg bg-surface-50 border border-border text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                required
              />
              <button
                type="submit"
                disabled={isExtracting}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-medium text-white flex items-center gap-1.5 shadow-md shadow-purple-500/20 disabled:opacity-50 transition-all shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isExtracting ? 'animate-spin' : ''}`} />
                {isExtracting ? 'Extracting...' : 'Extract & Classify'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border overflow-x-auto gap-1 text-xs font-medium">
        {[
          { id: 'inventory_scanner', label: `Discovered Content (${targetContent.length})`, icon: BookOpen },
          { id: 'competitor_matrix', label: 'Competitor Content Matrix', icon: Layers },
          { id: 'gap_detection', label: 'Content Gaps & Opportunities', icon: AlertTriangle },
          { id: 'customer_questions', label: `Customer Questions (${targetQuestions.length})`, icon: MessageSquare },
          { id: 'content_opportunities', label: `Opportunity Generator (${generatedOpportunities.length})`, icon: Sparkles },
          { id: 'content_calendar', label: `Content Calendar (${filteredCalendar.length})`, icon: Calendar },
          { id: 'executive_report', label: 'Executive Strategy Report', icon: Printer },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabId)}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-purple-500 text-white font-semibold bg-purple-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DISCOVERED CONTENT INVENTORY */}
      {/* ========================================================================= */}
      {activeTab === 'inventory_scanner' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-surface-100 border border-border">
            <div className="flex items-center gap-2 text-xs">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-slate-300 font-semibold">Filter Classification:</span>
              <select
                value={classificationFilter}
                onChange={e => setClassificationFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-surface-50 border border-border text-xs text-slate-200"
              >
                <option value="all">All Classifications ({targetContent.length})</option>
                <option value="service_focused">Service Focused</option>
                <option value="educational">Educational</option>
                <option value="problem_solving">Problem Solving</option>
                <option value="case_study">Case Study</option>
                <option value="faq">FAQ</option>
                <option value="comparison">Comparison</option>
                <option value="seasonal">Seasonal</option>
                <option value="local_community">Local Community</option>
                <option value="promotional">Promotional</option>
                <option value="brand_awareness">Brand Awareness</option>
              </select>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Target: <strong className="text-white">{selectedBusiness?.officialName}</strong>
            </div>
          </div>

          {/* Content Items Grid */}
          {filteredContent.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredContent.map(item => (
                <div
                  key={item.id}
                  className="p-5 rounded-xl bg-surface-100 border border-border space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25 uppercase font-semibold">
                        {item.classification ? item.classification.replace('_', ' ') : 'Content'}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {item.publicationDate || item.dateObserved}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-white hover:text-purple-300 transition-colors">
                      <a href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5">
                        {item.title}
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      </a>
                    </h4>

                    {item.summary && (
                      <p className="text-xs text-slate-300 leading-relaxed italic">
                        "{item.summary}"
                      </p>
                    )}

                    {/* Headings */}
                    {item.headings && item.headings.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                          Key Headings & Sections:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {item.headings.slice(0, 3).map((h, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] px-2 py-0.5 rounded bg-surface-50 border border-border text-slate-300"
                            >
                              {h}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Metadata Footer */}
                  <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-3">
                      <span>Images: {item.imagesCount ?? 'N/A'}</span>
                      <span>Links: {item.internalLinksCount ?? 'N/A'}</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        item.callToActionQuality === 'strong'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      CTA: {item.callToActionQuality.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center rounded-xl bg-surface-100 border border-border space-y-2">
              <BookOpen className="w-8 h-8 text-slate-500 mx-auto" />
              <h4 className="text-sm font-semibold text-white">No Content Cataloged Yet</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Paste any live blog, service page, FAQ, or YouTube URL in the scraper above to extract and classify content in real time.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COMPETITOR CONTENT MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'competitor_matrix' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-surface-100 border border-border">
            <h3 className="font-semibold text-white text-sm">Competitor Content Distribution Matrix</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparative analysis across discovered competitor content assets in {activeProject.cityArea}.
              (Note: Discovered pages represent cataloged public URLs, not estimated search-engine indexed counts).
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-surface-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-50 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Business</th>
                  <th className="py-3 px-4 text-center">Discovered Pages</th>
                  <th className="py-3 px-4 text-center">Service Pages</th>
                  <th className="py-3 px-4 text-center">FAQ Coverage</th>
                  <th className="py-3 px-4 text-center">Educational</th>
                  <th className="py-3 px-4 text-center">Case Studies</th>
                  <th className="py-3 px-4 text-center">Freshness</th>
                  <th className="py-3 px-4 text-right">CTA Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {competitorMetrics.map(metric => {
                  const isCurrent = metric.businessId === selectedBusiness?.id;
                  return (
                    <tr
                      key={metric.businessId}
                      className={`hover:bg-surface-50/50 transition-colors ${
                        isCurrent ? 'bg-purple-500/5' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex items-center gap-1.5">
                          {metric.businessName}
                          {isCurrent && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              TARGET
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-normal">
                          {metric.topTopics.slice(0, 2).join(' • ')}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-white">
                        {metric.discoveredPagesCount}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                        {metric.servicePagesCount}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                        {metric.faqCount}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                        {metric.educationalCount}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                        {metric.caseStudyCount}
                      </td>
                      <td className="py-3.5 px-4 text-center text-[11px] text-slate-300">
                        {metric.lastUpdatedCadence}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded border text-xs ${
                            metric.ctaEffectivenessScore >= 70
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                          }`}
                        >
                          {metric.ctaEffectivenessScore}/100
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CONTENT GAP DETECTION */}
      {/* ========================================================================= */}
      {activeTab === 'gap_detection' && contentGaps && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-surface-100 border border-border">
            <h3 className="font-semibold text-white text-sm">
              Content Gaps & White-Space Opportunities for {selectedBusiness?.officialName}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Topics covered by regional competitors or demanded by commercial searchers that are absent from target assets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Missing Service Pages */}
            <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Missing Dedicated Service Pages
              </h4>
              <div className="space-y-2.5">
                {contentGaps.missingServicePages.map((gap, i) => (
                  <div key={i} className="p-3 rounded-lg bg-surface-50 border border-border space-y-1 text-xs">
                    <span className="font-semibold text-white block">{gap.serviceName}</span>
                    <p className="text-slate-400">{gap.businessRelevance}</p>
                    <span className="text-[10px] text-purple-400 font-mono block">
                      {gap.competitorEvidence}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Missing Customer FAQs */}
            <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" />
                Missing Customer FAQ Coverage
              </h4>
              <div className="space-y-2.5">
                {contentGaps.missingFaqs.map((faq, i) => (
                  <div key={i} className="p-3 rounded-lg bg-surface-50 border border-border space-y-1 text-xs">
                    <span className="font-semibold text-amber-300 block">"{faq.question}"</span>
                    <p className="text-slate-400">
                      <strong>Why it matters:</strong> {faq.whyItMatters}
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      Category: {faq.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Missing Location Pages */}
            <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Compass className="w-4 h-4" />
                Missing Regional Location Pages
              </h4>
              <div className="space-y-2.5">
                {contentGaps.missingLocationPages.map((loc, i) => (
                  <div key={i} className="p-3 rounded-lg bg-surface-50 border border-border space-y-1 text-xs">
                    <span className="font-semibold text-white block">{loc.locationName}</span>
                    <p className="text-slate-400">{loc.opportunityDescription}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Seasonal Content Opportunities */}
            <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Seasonal Texas Demand Cycles
              </h4>
              <div className="space-y-2.5">
                {contentGaps.seasonalOpportunities.map((s, i) => (
                  <div key={i} className="p-3 rounded-lg bg-surface-50 border border-border space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-300">{s.season}</span>
                      <span className="text-[10px] font-mono text-emerald-400">{s.urgency.split(' ')[0]}</span>
                    </div>
                    <p className="text-slate-300 font-medium">{s.topic}</p>
                    <p className="text-[11px] text-slate-400">{s.urgency}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CUSTOMER QUESTION INTELLIGENCE */}
      {/* ========================================================================= */}
      {activeTab === 'customer_questions' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-surface-100 border border-border">
            <h3 className="font-semibold text-white text-sm">Customer Question & Pain Point Intelligence</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Extracted from verified customer reviews, competitor FAQs, and commercial RFP inquiries.
              Every insight is explicitly attributed to its source.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {targetQuestions.map(q => (
              <div
                key={q.id}
                className="p-5 rounded-xl bg-surface-100 border border-border space-y-3 text-xs flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25 uppercase font-semibold">
                      {q.category.replace('_', ' ')}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                        q.priority === 'high'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}
                    >
                      Priority: {q.priority}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-white">"{q.question}"</h4>
                  <p className="text-slate-300 leading-relaxed italic">
                    <strong>Context:</strong> {q.customerContext}
                  </p>
                </div>

                <div className="pt-3 border-t border-border space-y-1.5">
                  <div className="text-[11px] text-slate-400">
                    <strong className="text-slate-300">Source:</strong> {q.sourceLabel}
                  </div>
                  <div className="text-[11px] text-purple-300">
                    <strong className="text-slate-300">Suggested Content Angle:</strong>{' '}
                    {q.suggestedContentAngle}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: CONTENT OPPORTUNITIES */}
      {/* ========================================================================= */}
      {activeTab === 'content_opportunities' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-surface-100 border border-border">
            <h3 className="font-semibold text-white text-sm">Generated Content Opportunities</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Structured editorial briefs mapped to Watech services, search intent, and buyer funnel stages.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generatedOpportunities.map(opp => (
              <div
                key={opp.id}
                className="p-5 rounded-xl bg-surface-100 border border-border space-y-3.5 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25 uppercase font-semibold">
                      {opp.suggestedFormat.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25">
                      {opp.funnelStage.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-white">{opp.suggestedTitle}</h4>
                    <p className="text-xs text-slate-300 mt-1">
                      <strong>Problem Addressed:</strong> {opp.customerProblem}
                    </p>
                  </div>

                  {/* Outline */}
                  <div className="p-3 rounded-lg bg-surface-50 border border-border space-y-1 text-xs">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Proposed Content Outline:
                    </span>
                    <ul className="space-y-1 text-slate-300 list-disc list-inside">
                      {opp.suggestedOutline.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    Service: <strong className="text-white">{opp.relevantWatechService.replace('_', ' ')}</strong>
                  </div>
                  <button
                    onClick={() => handleAddOpportunityToCalendar(opp)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-medium text-white shadow-sm transition-all"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Add to Calendar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: WORKING CONTENT CALENDAR */}
      {/* ========================================================================= */}
      {activeTab === 'content_calendar' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-100 border border-border">
            <div>
              <h3 className="font-semibold text-white text-sm">Working Editorial Calendar</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Editorial production pipeline with status stages, assignees, formats, and scheduled dates.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={calendarStatusFilter}
                onChange={e => setCalendarStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-surface-50 border border-border text-xs text-slate-200"
              >
                <option value="all">All Stages ({calendarItems.length})</option>
                <option value="idea">Idea</option>
                <option value="planned">Planned</option>
                <option value="in_production">In Production</option>
                <option value="ready">Ready</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          {/* Calendar Items Table */}
          <div className="overflow-x-auto rounded-xl border border-border bg-surface-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-50 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Topic / Title</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Platform</th>
                  <th className="py-3 px-4">Planned Date</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCalendar.map(item => (
                  <tr key={item.id} className="hover:bg-surface-50/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white max-w-[280px]">
                      <div>{item.topic}</div>
                      {item.notes && (
                        <div className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                          {item.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300 uppercase font-mono text-[10px]">
                      {item.contentFormat.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 text-slate-300 text-xs">
                      {item.platform.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300 text-xs">
                      {item.plannedDate}
                    </td>
                    <td className="py-3 px-4 text-slate-300 text-xs">
                      {item.assignedPerson || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                          item.priority === 'high'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <select
                        value={item.status}
                        onChange={e =>
                          handleUpdateCalendarStatus(
                            item,
                            e.target.value as ContentCalendarItem['status']
                          )
                        }
                        className={`px-2 py-1 rounded-lg border text-[11px] font-semibold ${
                          item.status === 'published'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : item.status === 'ready'
                            ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                            : item.status === 'in_production'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-surface-50 text-slate-300 border-border'
                        }`}
                      >
                        <option value="idea">Idea</option>
                        <option value="planned">Planned</option>
                        <option value="in_production">In Production</option>
                        <option value="ready">Ready</option>
                        <option value="published">Published</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteCalendarItem(item.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: EXECUTIVE CONTENT REPORT */}
      {/* ========================================================================= */}
      {activeTab === 'executive_report' && (
        <div className="p-8 rounded-2xl bg-surface-100 border border-border space-y-6 text-slate-100 print:bg-white print:text-black">
          {/* Header */}
          <div className="border-b border-border pb-6 flex items-start justify-between">
            <div>
              <div className="text-xs font-mono text-purple-400 uppercase tracking-widest">
                WATECH AI & MARKETING — CONTENT & COMPETITOR STRATEGY REPORT
              </div>
              <h2 className="text-2xl font-black text-white mt-1">
                {selectedBusiness?.officialName}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Market: {activeProject.cityArea} | Industry: {activeProject.industryNiche}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-purple-400">
                {targetContent.length} Assets
              </div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Cataloged Footprint
              </div>
            </div>
          </div>

          {/* Competitor Overview */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Competitor Publishing Footprint
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {competitorMetrics.map(m => (
                <div key={m.businessId} className="p-3.5 rounded-lg bg-surface-50 border border-border space-y-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-white">{m.businessName}</span>
                    <span className="font-mono text-purple-400">{m.discoveredPagesCount} pgs</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Services: {m.servicePagesCount} | FAQs: {m.faqCount} | Case Studies: {m.caseStudyCount}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Top 3 Strategic Recommendations */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Watech Recommended Next Actions
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300">
              {generatedOpportunities.slice(0, 3).map((opp, idx) => (
                <li key={idx}>
                  <strong>{opp.suggestedTitle}</strong> ({opp.suggestedFormat.replace('_', ' ')}) —{' '}
                  <span className="text-slate-400">
                    Addresses {opp.customerProblem} (Supports Watech {opp.relevantWatechService.replace('_', ' ')}).
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
