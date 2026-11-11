import type { DecisionMakerTier } from '@/types';
import type { DecisionMakerCandidate, EmailClassification } from './types';

const HONORIFIC_PREFIXES = /\b(mr|mrs|ms|dr|engr|engineer|prof|professor|shaikh|sheikh|malik|haji|chaudhry|ch)\.?\s+/gi;
const ACADEMIC_SUFFIXES = /,\s*(ph\.?d|m\.?d|cpa|esq|mba|pe|pmp|llc|inc)\b/gi;

/**
 * Normalizes full person name, stripping honorifics and suffixes
 */
export function normalizePersonName(rawName?: string): string {
  if (!rawName) return '';
  let clean = rawName.trim();
  clean = clean.replace(ACADEMIC_SUFFIXES, '');
  clean = clean.replace(HONORIFIC_PREFIXES, '');
  clean = clean.replace(/[^\w\s'-]/g, ' ').replace(/\s+/g, ' ').trim();

  // Title case words
  return clean
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Classifies role seniority and assigns strict decision-maker hierarchy
 */
export function classifySeniorityTier(title?: string): {
  tier: DecisionMakerTier;
  isDecisionMaker: boolean;
  normalizedTitle: string;
  seniorityRank: number; // 1 (highest) to 5 (lowest)
} {
  const raw = (title || '').trim();
  const lower = raw.toLowerCase();

  // Tier 1: Equity Owners, Founders, Chief Executives
  if (/\b(owner|founder|co-founder|proprietor|principal)\b/i.test(lower)) {
    return {
      tier: 'tier1_executive',
      isDecisionMaker: true,
      normalizedTitle: raw || 'Business Owner',
      seniorityRank: 1,
    };
  }
  if (/\b(ceo|chief executive officer|president|managing director|md)\b/i.test(lower)) {
    return {
      tier: 'tier1_executive',
      isDecisionMaker: true,
      normalizedTitle: raw || 'Chief Executive Officer',
      seniorityRank: 1,
    };
  }

  // Tier 2: Senior Operational & Commercial Directors
  if (/\b(coo|chief operating officer|operations director|director of operations)\b/i.test(lower)) {
    return {
      tier: 'tier2_director',
      isDecisionMaker: true,
      normalizedTitle: raw || 'Operations Director',
      seniorityRank: 2,
    };
  }
  if (/\b(general manager|gm|managing partner|vice president|vp|executive vice president|evp)\b/i.test(lower)) {
    return {
      tier: 'tier2_director',
      isDecisionMaker: true,
      normalizedTitle: raw || 'General Manager',
      seniorityRank: 2,
    };
  }

  // Tier 3: Marketing & Business Development Leaders
  if (/\b(cmo|chief marketing officer|marketing director|head of marketing|director of marketing|commercial director)\b/i.test(lower)) {
    return {
      tier: 'tier2_director',
      isDecisionMaker: true,
      normalizedTitle: raw || 'Marketing Director',
      seniorityRank: 3,
    };
  }

  // Management / Functional Leads (Non-Executive)
  if (/\b(manager|supervisor|lead|head of [a-z0-9\s]+|estimator|project manager|team lead)\b/i.test(lower)) {
    return {
      tier: 'tier3_management',
      isDecisionMaker: false,
      normalizedTitle: raw || 'Department Lead',
      seniorityRank: 4,
    };
  }

  // General Staff / Operational Personnel
  return {
    tier: 'general_staff',
    isDecisionMaker: false,
    normalizedTitle: raw || 'Staff Member',
    seniorityRank: 5,
  };
}

/**
 * Classifies email address into strict verification categories
 */
export function classifyEmail(
  email?: string,
  personNameOrOfficial?: string | boolean,
  sourceIsOfficial?: boolean
): EmailClassification {
  if (!email || !email.includes('@')) return 'NOT_FOUND';

  const clean = email.toLowerCase().trim();
  const [localPart] = clean.split('@');

  const isOfficial = typeof personNameOrOfficial === 'boolean' ? personNameOrOfficial : Boolean(sourceIsOfficial);

  // Generic/Role-based addresses
  const rolePrefixes = ['info', 'contact', 'support', 'sales', 'admin', 'office', 'help', 'service', 'hello', 'inquiries'];
  const isRoleBased = rolePrefixes.includes(localPart);

  if (isOfficial) {
    if (!isRoleBased) {
      return 'VERIFIED_PUBLIC';
    }
    return 'SOURCE_LISTED';
  }

  return 'UNVERIFIED';
}

/**
 * Deduplicates candidate decision-makers across multiple sources
 * Merges source provenance while preserving distinct separate individuals
 */
export function deduplicateCandidates(
  candidates: DecisionMakerCandidate[]
): DecisionMakerCandidate[] {
  const mergedMap = new Map<string, DecisionMakerCandidate>();

  for (const cand of candidates) {
    const normName = normalizePersonName(cand.fullName).toLowerCase();
    const identityKey = `${cand.businessId}::${normName}`;

    if (mergedMap.has(identityKey)) {
      const existing = mergedMap.get(identityKey)!;

      // Combine corroborating sources
      const sources = new Set<string>(existing.corroboratingSources || []);
      if (existing.sourceName) sources.add(existing.sourceName);
      if (cand.sourceName) sources.add(cand.sourceName);
      existing.corroboratingSources = Array.from(sources);

      // Upgrade email if existing was missing or of lower classification
      if (!existing.email && cand.email) {
        existing.email = cand.email;
        existing.emailClassification = cand.emailClassification;
      }

      // Upgrade phone if existing was missing
      if (!existing.phone && cand.phone) {
        existing.phone = cand.phone;
      }
      if (!existing.publicBusinessPhone && cand.publicBusinessPhone) {
        existing.publicBusinessPhone = cand.publicBusinessPhone;
      }

      // Upgrade professional profile URL
      if (!existing.professionalProfileUrl && cand.professionalProfileUrl) {
        existing.professionalProfileUrl = cand.professionalProfileUrl;
      }

      // Upgrade title if incoming is more senior
      const existingClassification = classifySeniorityTier(existing.roleOrTitle);
      const incomingClassification = classifySeniorityTier(cand.roleOrTitle);
      if (incomingClassification.seniorityRank < existingClassification.seniorityRank) {
        existing.roleOrTitle = cand.roleOrTitle;
        existing.normalizedTitle = cand.normalizedTitle;
        existing.decisionMakerTier = cand.decisionMakerTier;
        existing.isDecisionMaker = cand.isDecisionMaker;
      }

      // Upgrade confidence score
      existing.confidence = Math.max(existing.confidence, cand.confidence);
      if (existing.corroboratingSources.length >= 2) {
        existing.confidence = Math.min(100, existing.confidence + 10);
        existing.verificationStatus = 'VERIFIED';
        existing.confidenceBreakdown.crossSourceConsistency = 10;
        existing.confidenceBreakdown.rationale.push('Corroborated across multiple independent sources (+10 pts)');
      }
    } else {
      mergedMap.set(identityKey, {
        ...cand,
        fullName: normalizePersonName(cand.fullName),
        corroboratingSources: cand.corroboratingSources?.length ? cand.corroboratingSources : [cand.sourceName],
      });
    }
  }

  // Sort by seniority rank (Owners / CEOs first)
  return Array.from(mergedMap.values()).sort((a, b) => {
    const rankA = classifySeniorityTier(a.roleOrTitle).seniorityRank;
    const rankB = classifySeniorityTier(b.roleOrTitle).seniorityRank;
    return rankA - rankB;
  });
}
