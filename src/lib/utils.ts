import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUrl(url: string): string {
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
}

export function extractDomain(url: string): string {
  try {
    const formatted = formatUrl(url);
    const parsed = new URL(formatted);
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
  }
}

export function formatDate(isoDate?: string): string {
  if (!isoDate) return 'N/A';
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

export function formatScoreGrade(score: number): { grade: 'A' | 'B' | 'C' | 'Hold'; color: string; bg: string } {
  if (score >= 80) return { grade: 'A', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
  if (score >= 60) return { grade: 'B', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' };
  if (score >= 40) return { grade: 'C', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' };
  return { grade: 'Hold', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' };
}

export function getVerificationBadge(status: 'verified' | 'estimated' | 'hypothesis' | 'unverified'): { label: string; color: string; border: string } {
  switch (status) {
    case 'verified':
      return { label: 'Verified', color: 'text-emerald-400 bg-emerald-500/10', border: 'border-emerald-500/30' };
    case 'estimated':
      return { label: 'Estimated', color: 'text-cyan-400 bg-cyan-500/10', border: 'border-cyan-500/30' };
    case 'hypothesis':
      return { label: 'Hypothesis', color: 'text-amber-400 bg-amber-500/10', border: 'border-amber-500/30' };
    case 'unverified':
    default:
      return { label: 'Unverified', color: 'text-slate-400 bg-slate-500/10', border: 'border-slate-500/30' };
  }
}
