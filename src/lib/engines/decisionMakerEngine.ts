import type {
  Contact,
  Business,
  SourceRecord,
  ContactSourceLabel,
  DecisionMakerTier,
  DecisionMakerConfidenceBreakdown,
  VerificationStatus,
} from '@/types';

export const CONTACT_SOURCE_DEFINITIONS: Record<
  ContactSourceLabel,
  { label: string; description: string; badgeColor: string }
> = {
  official_company_source: {
    label: 'Official Company Source',
    description: 'Extracted directly from company About, Leadership, Team, or Contact pages.',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  public_professional_profile: {
    label: 'Public Professional Profile',
    description: 'Verified public executive profile (LinkedIn Company Page, public bio).',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },
  reputable_directory: {
    label: 'Reputable Directory',
    description: 'Official corporate registry (Texas Secretary of State, Licensing Boards, BBB).',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  },
  third_party_provider: {
    label: 'Third-Party Provider',
    description: 'Enriched via external business database or configured discovery API.',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  },
  user_supplied: {
    label: 'User Supplied',
    description: 'Manually entered or verified by Watech intelligence analyst.',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  },
  unverified: {
    label: 'Unverified',
    description: 'Candidate mention requiring independent cross-check before outreach.',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
};

/**
 * Classifies the role of a contact into standard decision-maker tiers (Prompt 09 Requirement 1).
 */
export function classifyDecisionMakerRole(
  roleOrTitle: string,
  businessSize?: string
): { tier: DecisionMakerTier; isDecisionMaker: boolean; normalizedTitle: string } {
  const title = (roleOrTitle || '').trim();
  const lower = title.toLowerCase();

  // Tier 1: C-Level & Equity Owners
  if (
    /\b(owner|founder|co-founder|ceo|president|principal|proprietor|managing director|chief executive officer)\b/i.test(lower)
  ) {
    return { tier: 'tier1_executive', isDecisionMaker: true, normalizedTitle: title };
  }

  // Tier 2: Senior Management & Operational Directors
  if (
    /\b(general manager|operations director|director of [a-z0-9\s]+|director|vp|vice president|marketing director|business development|commercial director|managing partner)\b/i.test(lower)
  ) {
    return { tier: 'tier2_director', isDecisionMaker: true, normalizedTitle: title };
  }

  // Tier 3: Functional Leads & Project Managers
  if (
    /\b(manager|supervisor|lead engineer|estimator|project manager|dispatch manager)\b/i.test(lower)
  ) {
    return { tier: 'tier3_management', isDecisionMaker: false, normalizedTitle: title };
  }

  // General Staff / Technicians
  return { tier: 'general_staff', isDecisionMaker: false, normalizedTitle: title };
}

/**
 * Calculates 5-pillar 100-point Decision-Maker Confidence (Prompt 09 Requirement 4).
 * Strict Rule: Never assume someone is the owner based on their name or email alone.
 */
export function calculateDecisionMakerConfidence(
  contact: Partial<Contact>,
  business: Business,
  sources: SourceRecord[] = [],
  isCorroborated: boolean = false
): DecisionMakerConfidenceBreakdown {
  const reasons: string[] = [];

  // 1. Source Quality (Max 30 pts)
  let sourceQuality = 10;
  const sourceLabel: ContactSourceLabel = contact.contactSourceLabel || 'unverified';
  if (sourceLabel === 'official_company_source') {
    sourceQuality = 30;
    reasons.push('Verified on official company domain (About/Leadership page)');
  } else if (sourceLabel === 'reputable_directory') {
    sourceQuality = 28;
    reasons.push('Confirmed on official public corporate registry / state filing');
  } else if (sourceLabel === 'public_professional_profile') {
    sourceQuality = 22;
    reasons.push('Corroborated via public executive profile');
  } else if (sourceLabel === 'user_supplied') {
    sourceQuality = 20;
    reasons.push('Manually cataloged by intelligence researcher');
  } else if (sourceLabel === 'third_party_provider') {
    sourceQuality = 16;
    reasons.push('Retrieved from commercial business intelligence database');
  } else {
    sourceQuality = 6;
    reasons.push('Unverified mention: requires independent source validation');
  }

  // 2. Role Relevance (Max 25 pts)
  let roleRelevance = 5;
  const tier = contact.decisionMakerTier || classifyDecisionMakerRole(contact.roleOrTitle || '').tier;
  if (tier === 'tier1_executive') {
    roleRelevance = 25;
    reasons.push('Top-tier executive authority (Owner/President/CEO)');
  } else if (tier === 'tier2_director') {
    roleRelevance = 20;
    reasons.push('Senior operational authority (GM/Director)');
  } else if (tier === 'tier3_management') {
    roleRelevance = 12;
    reasons.push('Departmental manager (secondary outreach angle)');
  } else {
    roleRelevance = 5;
    reasons.push('General staff role');
  }

  // 3. Company Association (Max 20 pts)
  let companyAssociation = 10;
  const companyNameLower = (business.officialName || '').toLowerCase();
  const brandNameLower = (business.brandName || '').toLowerCase();
  const contactCompanyLower = (contact.company || '').toLowerCase();
  const contactNotesLower = (contact.notes || '').toLowerCase();

  const explicitMatch =
    contactCompanyLower.includes(brandNameLower) ||
    contactCompanyLower.includes(companyNameLower) ||
    contactNotesLower.includes(brandNameLower) ||
    contactNotesLower.includes('secretary of state') ||
    contactNotesLower.includes('corporate filing');

  if (explicitMatch) {
    companyAssociation = 20;
    reasons.push('Explicit legal entity or corporate brand association confirmed');
  } else if (contact.email && business.domain && contact.email.endsWith(business.domain)) {
    companyAssociation = 16;
    reasons.push(`Direct email domain match with ${business.domain}`);
  } else {
    companyAssociation = 8;
    reasons.push('Loose company association; pending official verification');
  }

  // 4. Information Recency (Max 15 pts)
  let informationRecency = 8;
  const now = Date.now();
  const discDate = contact.discoveryDate ? new Date(contact.discoveryDate).getTime() : now;
  const ageDays = (now - discDate) / (1000 * 60 * 60 * 24);

  if (ageDays <= 30) {
    informationRecency = 15;
    reasons.push('Recent verification (inspected within last 30 days)');
  } else if (ageDays <= 90) {
    informationRecency = 12;
    reasons.push('Active verification (inspected within last 90 days)');
  } else if (ageDays <= 365) {
    informationRecency = 8;
    reasons.push('Historical record (&lt; 1 year old)');
  } else {
    informationRecency = 4;
    reasons.push('Stale record: requires re-inspection');
  }

  // 5. Independent Corroboration (Max 10 pts)
  let independentCorroboration = 4;
  const corroborationCount = (contact.corroboratingSources?.length || 0) + (isCorroborated ? 1 : 0);
  if (corroborationCount >= 2) {
    independentCorroboration = 10;
    reasons.push(`Independently corroborated across ${corroborationCount} distinct sources`);
  } else if (contact.verificationStatus === 'verified') {
    independentCorroboration = 8;
    reasons.push('Verified against primary public registry filing');
  } else {
    independentCorroboration = 4;
    reasons.push('Single source: independent cross-validation recommended');
  }

  const totalConfidence = Math.min(
    100,
    sourceQuality + roleRelevance + companyAssociation + informationRecency + independentCorroboration
  );

  return {
    sourceQuality,
    roleRelevance,
    companyAssociation,
    informationRecency,
    independentCorroboration,
    totalConfidence,
    explanation: reasons.join(' • '),
  };
}

/**
 * Detects missing information on a contact profile (Prompt 09 Requirement 6).
 */
export function detectMissingContactInfo(contact: Contact, business: Business): string[] {
  const missing: string[] = [];

  if (!contact.email || contact.email.trim().length === 0) {
    missing.push('Missing direct business email address');
  } else if (contact.verificationStatus !== 'verified') {
    missing.push('Email pending live DNS MX server verification');
  }

  if (!contact.phone && !contact.publicBusinessPhone) {
    missing.push('No direct phone route (use general dispatch fallback)');
  }

  if (!contact.linkedinUrl && !contact.professionalProfileUrl) {
    missing.push('No public executive LinkedIn or bio URL cataloged');
  }

  if (!contact.corroboratingSources || contact.corroboratingSources.length < 2) {
    missing.push('Single source: cross-check with Secretary of State or licensing board');
  }

  if (contact.reviewStatus === 'pending_review' || !contact.reviewStatus) {
    missing.push('Awaiting human researcher sign-off');
  }

  return missing;
}

/**
 * Merges duplicate contact profiles while preserving all corroborating sources and notes.
 */
export function mergeContactProfiles(primary: Contact, secondary: Contact): Contact {
  const corroboratingSources = Array.from(
    new Set([
      ...(primary.corroboratingSources || []),
      ...(secondary.corroboratingSources || []),
      primary.sourceUrl || '',
      secondary.sourceUrl || '',
    ].filter(Boolean))
  );

  const combinedNotes = [primary.notes, secondary.notes]
    .filter(Boolean)
    .join(' | Merged source note: ');

  return {
    ...primary,
    email: primary.email || secondary.email,
    phone: primary.phone || secondary.phone,
    publicBusinessPhone: primary.publicBusinessPhone || secondary.publicBusinessPhone,
    linkedinUrl: primary.linkedinUrl || secondary.linkedinUrl,
    professionalProfileUrl: primary.professionalProfileUrl || secondary.professionalProfileUrl,
    department: primary.department || secondary.department,
    company: primary.company || secondary.company,
    corroboratingSources,
    notes: combinedNotes,
    reviewStatus: 'approved',
    verificationStatus:
      primary.verificationStatus === 'verified' || secondary.verificationStatus === 'verified'
        ? 'verified'
        : primary.verificationStatus,
  };
}
