'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Building2, UserCheck, Layers, Target, ArrowRight, Loader2, Command } from 'lucide-react';
import { useProject, AppModuleId } from '@/context/ProjectContext';
import { useTenant } from '@/context/TenantContext';

interface SearchResultItem {
  id: string;
  type: 'project' | 'business' | 'contact' | 'opportunity';
  title: string;
  subtitle: string;
  badge?: string;
  targetModule: AppModuleId;
  entityId: string;
  projectId?: string;
}

interface GlobalSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchDialog({ isOpen, onClose }: GlobalSearchDialogProps) {
  const { setActiveModule, setActiveProject, projects } = useProject();
  const { currentTenant } = useTenant();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input upon open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search query
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&tenantId=${currentTenant?.id || 'tenant-watech-hq'}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error('Search query failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, currentTenant]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (results.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (results.length || 1)) % (results.length || 1));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelectResult(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelectResult = (item: SearchResultItem) => {
    if (item.projectId) {
      const matchProj = projects.find((p) => p.id === item.projectId);
      if (matchProj) setActiveProject(matchProj);
    }
    setActiveModule(item.targetModule);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 p-4">
      <div
        className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <Search className="w-5 h-5 text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, businesses, decision-makers, leads..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin shrink-0" />
          ) : query ? (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono border border-slate-700">
              ESC
            </kbd>
          )}
        </div>

        {/* Results Body */}
        <div className="max-h-80 overflow-y-auto p-2">
          {query.length >= 2 && results.length === 0 && !isLoading && (
            <div className="py-10 text-center text-xs text-slate-400 space-y-1">
              <p className="font-medium text-slate-300">No records found matching &ldquo;{query}&rdquo;</p>
              <p className="text-[11px] text-slate-400">Try searching by company domain, city, contact name, or industry.</p>
            </div>
          )}

          {query.length < 2 && (
            <div className="px-4 py-6 text-center text-xs text-slate-400 space-y-2">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
                <Command className="w-4 h-4" />
              </div>
              <p className="text-slate-300 font-medium">Global SaaS Intelligence Search</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Search verified HVAC leads, executive decision-makers, market research projects, and revenue opportunities.
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-1">
              {results.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelectResult(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 text-xs transition-all ${
                      isSelected ? 'bg-blue-600/20 text-white border border-blue-500/40' : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                        {item.type === 'project' && <Layers className="w-3.5 h-3.5 text-blue-400" />}
                        {item.type === 'business' && <Building2 className="w-3.5 h-3.5 text-emerald-400" />}
                        {item.type === 'contact' && <UserCheck className="w-3.5 h-3.5 text-purple-400" />}
                        {item.type === 'opportunity' && <Target className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-slate-200 truncate">{item.title}</div>
                        <div className="text-[11px] text-slate-400 truncate">{item.subtitle}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.badge && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                          {item.badge}
                        </span>
                      )}
                      <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-400' : 'text-slate-600'}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="text-slate-400 font-mono">Scoped to {currentTenant?.name || 'Active Tenant'}</span>
        </div>
      </div>
    </div>
  );
}
