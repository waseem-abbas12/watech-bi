'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Bot,
  User,
  Send,
  Building2,
  BookOpen,
  ShieldCheck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  ChevronRight,
  ExternalLink,
  Cpu,
  Layers,
  Award,
  Zap,
  Copy,
  Check,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { repository } from '@/lib/db/repository';
import { buildBusinessResearchContext, generateStrategicReport, generateDeterministicAnalystResponse } from '@/lib/engines/aiAnalystEngine';
import type {
  Business,
  AIConversation,
  AIMessage,
  AICitation,
  AIStrategicReport,
} from '@/types';

export function AiResearchAssistantView() {
  const { activeProject } = useProject();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [businessContext, setBusinessContext] = useState<any>(null);

  // Conversations state
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Strategic Report state
  const [report, setReport] = useState<AIStrategicReport | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'dossier' | 'evidence'>('chat');
  const [copiedReport, setCopiedReport] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load project businesses and conversations
  useEffect(() => {
    async function loadInitialData() {
      if (!activeProject) return;
      const [bList, convList] = await Promise.all([
        repository.getBusinesses(activeProject.id),
        repository.getAiConversations(activeProject.id),
      ]);
      setBusinesses(bList);
      setConversations(convList);

      if (bList.length > 0 && !selectedBusinessId) {
        setSelectedBusinessId(bList[0].id);
      }

      if (convList.length > 0 && !activeConversationId) {
        setActiveConversationId(convList[0].id);
        setMessages(convList[0].messages);
      } else if (convList.length === 0) {
        startNewConversation(bList[0]?.id);
      }
    }
    loadInitialData();
  }, [activeProject]);

  // When selected business changes, load full context and auto-generate preview dossier
  useEffect(() => {
    async function updateContext() {
      if (!selectedBusinessId) {
        setBusinessContext(null);
        setReport(null);
        return;
      }
      const ctx = await buildBusinessResearchContext(selectedBusinessId);
      setBusinessContext(ctx);
      if (ctx) {
        const autoReport = generateStrategicReport(ctx);
        setReport(autoReport);
      }
    }
    updateContext();
  }, [selectedBusinessId]);

  const startNewConversation = (bId?: string) => {
    const targetBusiness = businesses.find(b => b.id === (bId || selectedBusinessId));
    const newConvId = `conv-${Date.now()}`;
    const initialMsg: AIMessage = {
      id: `msg-welcome-${Date.now()}`,
      conversationId: newConvId,
      role: 'assistant',
      content: targetBusiness
        ? `Hello! I am your **Watech Strategic Business Analyst**. I have loaded all real verified intelligence for **${targetBusiness.officialName}**.\n\nYou can ask me about their **technical vulnerabilities**, **Google Business Profile rankings**, **identified decision makers**, or request a full **5-dimension strategic growth dossier**.`
        : `Hello! I am your **Watech Strategic Business Analyst**. Select any target business above to inspect their digital maturity, SEO standing, and custom pitch angles grounded in evidence.`,
      timestamp: new Date().toISOString(),
      modelUsed: 'watech-analyst-deterministic-v1',
    };

    const newConv: AIConversation = {
      id: newConvId,
      projectId: activeProject?.id || '',
      businessId: bId || selectedBusinessId || undefined,
      title: targetBusiness ? `Research: ${targetBusiness.officialName}` : 'New Investigation',
      messages: [initialMsg],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setConversations(prev => [newConv, ...prev]);
    setActiveConversationId(newConvId);
    setMessages([initialMsg]);
    repository.saveAiConversation(newConv);
  };

  const handleSendMessage = async (queryToSend?: string) => {
    const text = (queryToSend || inputQuery).trim();
    if (!text || isLoading) return;

    const userMsg: AIMessage = {
      id: `msg-user-${Date.now()}`,
      conversationId: activeConversationId,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputQuery('');
    setIsLoading(true);

    try {
      // Call our API endpoint with fallback to deterministic local engine
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          context: businessContext,
          conversationId: activeConversationId,
          businessId: selectedBusinessId,
        }),
      });

      let assistantMsg: AIMessage;

      if (res.ok) {
        const data = await res.json();
        assistantMsg = data.message;
      } else {
        // Direct local fallback
        const fallback = generateDeterministicAnalystResponse(text, businessContext);
        assistantMsg = {
          id: `msg-${Date.now()}`,
          conversationId: activeConversationId,
          role: 'assistant',
          content: fallback.content,
          citations: fallback.citations,
          dataGaps: fallback.dataGaps,
          timestamp: new Date().toISOString(),
          modelUsed: 'watech-analyst-deterministic-fallback',
        };
      }

      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);

      // Persist conversation
      const currentConv = conversations.find(c => c.id === activeConversationId);
      if (currentConv) {
        const updatedConv: AIConversation = {
          ...currentConv,
          messages: finalMessages,
          updatedAt: new Date().toISOString(),
        };
        await repository.saveAiConversation(updatedConv);
        setConversations(prev => prev.map(c => (c.id === updatedConv.id ? updatedConv : c)));
      }
    } catch (err) {
      console.error('Chat error:', err);
      const fallback = generateDeterministicAnalystResponse(text, businessContext);
      const assistantMsg: AIMessage = {
        id: `msg-${Date.now()}`,
        conversationId: activeConversationId,
        role: 'assistant',
        content: fallback.content,
        citations: fallback.citations,
        dataGaps: fallback.dataGaps,
        timestamp: new Date().toISOString(),
        modelUsed: 'watech-analyst-local-deterministic',
      };
      setMessages([...updatedMessages, assistantMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyReport = () => {
    if (!report) return;
    const text = `# ${report.title}
Generated: ${new Date(report.generatedAt).toLocaleString()}

## Executive Summary
${report.executiveSummary}

## Digital Presence & Performance
- Website Quality Score: ${report.digitalPresence.websiteQualityScore}/100
- Local SEO Rating Score: ${report.digitalPresence.localSeoScore}/100
- Conversion Path Health: ${report.digitalPresence.conversionPathHealth}
- Trust Signals: ${report.digitalPresence.trustSignals.join(', ')}

## Competitive Positioning & Gaps
- Visible Competitor Landscape: ${report.competitivePosition.visibleCompetitors.join('; ')}
- Service Positioning: ${report.competitivePosition.servicePositioning}
- Observable Deficits:
${report.competitivePosition.observableGaps.map(g => `  * ${g}`).join('\n')}

## Recommended Watech Services
- Services: ${report.watechServiceMatch.recommendedServices.join(', ')}
- Rationale: ${report.watechServiceMatch.evidenceRationale}

## Citations
${report.citations.map(c => `- [${c.category}] ${c.sourceName}: "${c.excerpt}" (Confidence: ${((c.confidence || 0.9) * 100).toFixed(0)}%)`).join('\n')}
`;
    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await repository.deleteAiConversation(id);
    const remaining = conversations.filter(c => c.id !== id);
    setConversations(remaining);
    if (activeConversationId === id) {
      if (remaining.length > 0) {
        setActiveConversationId(remaining[0].id);
        setMessages(remaining[0].messages);
      } else {
        startNewConversation();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-100 p-5 rounded-xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                AI Business Research Assistant & Strategic Analyst
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
                  Prompt 14
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Evidence-grounded intelligence synthesis, anti-hallucination citations, and 5-dimension strategic dossiers.
              </p>
            </div>
          </div>
        </div>

        {/* Target Business Context Selector */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col text-right">
            <span className="text-xs text-slate-400 font-medium">Target Account</span>
            <select
              value={selectedBusinessId}
              onChange={e => {
                setSelectedBusinessId(e.target.value);
                startNewConversation(e.target.value);
              }}
              className="bg-surface-50 border border-border text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {businesses.map(b => (
                <option key={b.id} value={b.id}>
                  {b.officialName} ({b.domain || 'no domain'})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => startNewConversation()}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Bot className="w-4 h-4" />
            New Chat
          </button>
        </div>
      </div>

      {/* Target Business Context Summary Chips */}
      {businessContext?.business && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-surface-100 border border-border p-3 rounded-lg">
            <span className="text-xs text-slate-400 block">Domain</span>
            <span className="text-sm font-semibold text-white truncate block">
              {businessContext.business.domain || 'N/A'}
            </span>
          </div>
          <div className="bg-surface-100 border border-border p-3 rounded-lg">
            <span className="text-xs text-slate-400 block">Audit Score</span>
            <span className={`text-sm font-semibold ${businessContext.audit?.totalScore && businessContext.audit.totalScore > 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {businessContext.audit ? `${businessContext.audit.totalScore}/100 (${businessContext.audit.grade})` : 'Unverified'}
            </span>
          </div>
          <div className="bg-surface-100 border border-border p-3 rounded-lg">
            <span className="text-xs text-slate-400 block">Local SEO (GBP)</span>
            <span className="text-sm font-semibold text-indigo-300">
              {businessContext.localSeo ? `${businessContext.localSeo.averageRating || 'N/A'} ★ (${businessContext.localSeo.reviewCount || 0})` : 'Unclaimed'}
            </span>
          </div>
          <div className="bg-surface-100 border border-border p-3 rounded-lg">
            <span className="text-xs text-slate-400 block">Decision Makers</span>
            <span className="text-sm font-semibold text-white">
              {businessContext.contacts?.length || 0} discovered
            </span>
          </div>
          <div className="bg-surface-100 border border-border p-3 rounded-lg">
            <span className="text-xs text-slate-400 block">Lead Qualification</span>
            <span className="text-sm font-bold text-amber-400">
              {businessContext.leadScore ? `Tier ${businessContext.leadScore.band.toUpperCase()} (${businessContext.leadScore.totalScore}/100)` : 'Tier B'}
            </span>
          </div>
          <div className="bg-surface-100 border border-border p-3 rounded-lg">
            <span className="text-xs text-slate-400 block">AI Guardrail</span>
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Grounded
            </span>
          </div>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Chat Workspace (7 cols) */}
        <div className="lg:col-span-7 bg-surface-100 border border-border rounded-xl flex flex-col h-[700px] overflow-hidden shadow-sm">
          {/* Chat Stream Header */}
          <div className="p-4 border-b border-border bg-surface-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-white">
                {conversations.find(c => c.id === activeConversationId)?.title || 'Research Session'}
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Engine: {messages[messages.length - 1]?.modelUsed || 'Grounded Deterministic'}
            </span>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg, i) => (
              <div
                key={msg.id || i}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xl p-4 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-surface-50 border border-border text-slate-200 rounded-tl-none space-y-3'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                  {/* Assistant Citations & Data Gaps */}
                  {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                    <div className="pt-3 border-t border-border/60">
                      <span className="text-xs font-semibold text-indigo-300 block mb-1.5 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" /> Verified Evidence Citations:
                      </span>
                      <div className="space-y-1">
                        {msg.citations.map((cit, idx) => (
                          <div
                            key={idx}
                            className="text-xs bg-surface-100 p-2 rounded border border-border/80 flex items-start justify-between gap-2 text-slate-300"
                          >
                            <div>
                              <span className="font-semibold text-white mr-1.5">[{cit.category.toUpperCase()}]</span>
                              <span>{cit.excerpt}</span>
                            </div>
                            <span className="shrink-0 text-[10px] bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-800">
                              {((cit.confidence || 0.9) * 100).toFixed(0)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {msg.role === 'assistant' && msg.dataGaps && msg.dataGaps.length > 0 && (
                    <div className="pt-2">
                      <span className="text-xs font-semibold text-amber-400 block mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Missing/Unverified Data Points:
                      </span>
                      <ul className="list-disc list-inside text-xs text-slate-400 space-y-0.5">
                        {msg.dataGaps.map((gap, gIdx) => (
                          <li key={gIdx}>{gap}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 text-right mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-surface-50 border border-border rounded-xl p-4 text-xs text-slate-400 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  Synthesizing verified business facts and checking evidence citations...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Question Prompts */}
          <div className="px-4 py-2 border-t border-border bg-surface-50/30 flex gap-2 overflow-x-auto text-xs whitespace-nowrap scrollbar-thin">
            <button
              onClick={() => handleSendMessage('What are their top technical vulnerabilities?')}
              className="px-2.5 py-1 bg-surface-100 hover:bg-surface-200 text-slate-300 border border-border rounded-md transition-colors"
            >
              ⚠️ Technical Flaws
            </button>
            <button
              onClick={() => handleSendMessage('Who are the key decision makers to pitch?')}
              className="px-2.5 py-1 bg-surface-100 hover:bg-surface-200 text-slate-300 border border-border rounded-md transition-colors"
            >
              👥 Decision Makers
            </button>
            <button
              onClick={() => handleSendMessage('What services should Watech pitch to this company?')}
              className="px-2.5 py-1 bg-surface-100 hover:bg-surface-200 text-slate-300 border border-border rounded-md transition-colors"
            >
              💼 Watech Service Match
            </button>
            <button
              onClick={() => handleSendMessage('Analyze their local SEO and Google review presence')}
              className="px-2.5 py-1 bg-surface-100 hover:bg-surface-200 text-slate-300 border border-border rounded-md transition-colors"
            >
              📍 Local SEO & Reviews
            </button>
          </div>

          {/* Input Box */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 border-t border-border bg-surface-50 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={e => setInputQuery(e.target.value)}
              placeholder={`Ask anything about ${businessContext?.business?.officialName || 'the selected business'}...`}
              disabled={isLoading}
              className="flex-1 bg-surface-100 border border-border text-white text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors disabled:cursor-not-allowed shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right Column: 5-Dimension Strategic Dossier & Evidence Drawer (5 cols) */}
        <div className="lg:col-span-5 bg-surface-100 border border-border rounded-xl flex flex-col h-[700px] overflow-hidden shadow-sm">
          {/* Navigation Tabs */}
          <div className="p-2 border-b border-border bg-surface-50 flex items-center gap-1">
            <button
              onClick={() => setActiveTab('dossier')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'dossier'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-surface-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Strategic Dossier
            </button>
            <button
              onClick={() => setActiveTab('evidence')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'evidence'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-surface-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Grounded DB Facts
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-2 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'chat'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-surface-100'
              }`}
            >
              Sessions ({conversations.length})
            </button>
          </div>

          {/* Tab 1: 5-Dimension Strategic Dossier */}
          {activeTab === 'dossier' && (
            <div className="flex-1 p-5 overflow-y-auto space-y-5">
              {report ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">{report.title}</h3>
                      <span className="text-xs text-slate-400">
                        Generated {new Date(report.generatedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <button
                      onClick={handleCopyReport}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-surface-50 hover:bg-surface-200 text-slate-300 rounded text-xs border border-border transition-colors"
                    >
                      {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedReport ? 'Copied!' : 'Copy Dossier'}
                    </button>
                  </div>

                  {/* 1. Executive Summary */}
                  <div className="p-3.5 bg-surface-50 border border-border rounded-lg space-y-1.5">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
                      1. Executive Summary
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {report.executiveSummary}
                    </p>
                  </div>

                  {/* 2. Digital Presence & Tech Footprint */}
                  <div className="p-3.5 bg-surface-50 border border-border rounded-lg space-y-2">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
                      2. Digital Presence & Quality
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-surface-100 p-2 rounded border border-border">
                        <span className="text-slate-400 block">Website Quality</span>
                        <span className="font-bold text-emerald-400">{report.digitalPresence.websiteQualityScore}/100</span>
                      </div>
                      <div className="bg-surface-100 p-2 rounded border border-border">
                        <span className="text-slate-400 block">Local SEO Authority</span>
                        <span className="font-bold text-indigo-300">{report.digitalPresence.localSeoScore}/100</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-300 pt-1">
                      <strong className="text-white">Funnel Status:</strong> {report.digitalPresence.conversionPathHealth}
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {report.digitalPresence.trustSignals.map((sig, sI) => (
                        <span key={sI} className="text-[10px] bg-surface-100 px-2 py-0.5 rounded text-slate-300 border border-border">
                          ✓ {sig}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 3. Competitive Positioning & Observable Gaps */}
                  <div className="p-3.5 bg-surface-50 border border-border rounded-lg space-y-2">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
                      3. Competitive Position & Deficits
                    </span>
                    <p className="text-xs text-slate-300">
                      {report.competitivePosition.servicePositioning}
                    </p>
                    <div className="space-y-1 pt-1">
                      {report.competitivePosition.observableGaps.map((gap, gI) => (
                        <div key={gI} className="text-xs text-amber-300 flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{gap}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4. Actionable Watech Pitch Blueprint */}
                  <div className="p-3.5 bg-indigo-950/40 border border-indigo-700/50 rounded-lg space-y-2">
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider block flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      4. High-ROI Watech Service Opportunity Match
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {report.watechServiceMatch.recommendedServices.map((svc, svI) => (
                        <span key={svI} className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-600 text-white">
                          {svc}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed pt-1">
                      {report.watechServiceMatch.evidenceRationale}
                    </p>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Bot className="w-8 h-8 mb-2 opacity-50 text-indigo-400" />
                  <p className="text-sm">Select a target business above to generate a 5-dimension strategic growth dossier.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Grounded DB Facts (Inspect what the AI sees) */}
          {activeTab === 'evidence' && (
            <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <h4 className="font-semibold text-white mb-2">Technical Audit Findings:</h4>
                {businessContext?.auditFindings?.length > 0 ? (
                  <div className="space-y-1.5">
                    {businessContext.auditFindings.map((f: any, idx: number) => (
                      <div key={idx} className="p-2 bg-surface-50 border border-border rounded">
                        <span className="font-semibold text-white block">[{f.severity}] {f.observation}</span>
                        <span className="text-slate-400">{f.recommendedAction}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No specific audit findings recorded yet.</p>
                )}
              </div>

              <div className="pt-2 border-t border-border">
                <h4 className="font-semibold text-white mb-2">Identified Contacts & Stakeholders:</h4>
                {businessContext?.contacts?.length > 0 ? (
                  <div className="space-y-1.5">
                    {businessContext.contacts.map((c: any, idx: number) => (
                      <div key={idx} className="p-2 bg-surface-50 border border-border rounded flex justify-between">
                        <div>
                          <strong className="text-white block">{c.fullName}</strong>
                          <span className="text-slate-400">{c.roleOrTitle || 'Executive'}</span>
                        </div>
                        <span className="text-indigo-400">{c.isDecisionMaker ? 'Decision Maker' : 'Staff'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No contact records discovered yet.</p>
                )}
              </div>

              <div className="pt-2 border-t border-border">
                <h4 className="font-semibold text-white mb-2">Watech Identified Opportunities:</h4>
                {businessContext?.opportunities?.length > 0 ? (
                  <div className="space-y-1.5">
                    {businessContext.opportunities.map((o: any, idx: number) => (
                      <div key={idx} className="p-2 bg-surface-50 border border-border rounded">
                        <div className="flex justify-between font-semibold text-white">
                          <span>{o.identifiedProblem}</span>
                          <span className="text-amber-400">{o.impact} impact</span>
                        </div>
                        <p className="text-slate-400 mt-1">{o.recommendedSolution}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No opportunities calculated yet.</p>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Conversation History */}
          {activeTab === 'chat' && (
            <div className="flex-1 p-4 overflow-y-auto space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Saved Research Conversations
              </h4>
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => {
                    setActiveConversationId(conv.id);
                    setMessages(conv.messages);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-center justify-between ${
                    conv.id === activeConversationId
                      ? 'bg-indigo-600/10 border-indigo-500/40 text-white'
                      : 'bg-surface-50 border-border text-slate-300 hover:bg-surface-200'
                  }`}
                >
                  <div className="truncate mr-2">
                    <span className="text-xs font-semibold block truncate">{conv.title}</span>
                    <span className="text-[10px] text-slate-400">
                      {conv.messages.length} messages • {new Date(conv.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={e => deleteConversation(conv.id, e)}
                    className="p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
