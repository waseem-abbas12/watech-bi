import type {
  EmailDiscoveryRecord,
  EmailType,
  EmailVerificationStatus,
  ContactQualityScore,
  EmailProviderConfig,
  Contact,
  Business,
} from '@/types';

// Disposable email providers blocklist (Prompt 10 Requirement 4)
export const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'tempmail.com',
  '10minutemail.com',
  'yopmail.com',
  'sharklasers.com',
  'throwawaymail.com',
  'getairmail.com',
  'dispostable.com',
  'trashmail.com',
  'temp-mail.org',
  'fakeinbox.com',
  'maildrop.cc',
  'inboxkitten.com',
]);

// Common role-based local parts
export const ROLE_BASED_LOCAL_PARTS = new Set([
  'info',
  'support',
  'sales',
  'admin',
  'contact',
  'office',
  'dispatch',
  'billing',
  'inquiries',
  'help',
  'service',
  'services',
  'careers',
  'jobs',
  'accounting',
  'reception',
  'customerservice',
  'quotes',
  'estimator',
]);

// Configurable Provider Definitions (Prompt 10 Requirement 6)
export const DEFAULT_PROVIDER_CONFIGS: EmailProviderConfig[] = [
  {
    provider: 'hunter',
    name: 'Hunter.io Email Verifier',
    apiKeyConfigured: false,
    connectionStatus: 'unconfigured',
    monthlyQuota: 50,
    usedQuota: 0,
    lastCheckedDate: '2026-11-04',
    lastError: 'API key not configured in environment (secure server-side fallback active)',
  },
  {
    provider: 'snov',
    name: 'Snov.io Multi-Tier Verifier',
    apiKeyConfigured: false,
    connectionStatus: 'unconfigured',
    monthlyQuota: 100,
    usedQuota: 0,
    lastCheckedDate: '2026-11-04',
    lastError: 'API key not configured in environment',
  },
  {
    provider: 'apollo',
    name: 'Apollo.io B2B Intelligence',
    apiKeyConfigured: false,
    connectionStatus: 'unconfigured',
    monthlyQuota: 250,
    usedQuota: 0,
    lastCheckedDate: '2026-11-04',
    lastError: 'API key not configured in environment',
  },
];

/**
 * Classifies email into Prompt 10 email types:
 * - named_professional
 * - general_business
 * - department_email
 * - contact_form_only
 * - unknown
 */
export function classifyEmailType(email: string, personName?: string): EmailType {
  const clean = (email || '').toLowerCase().trim();
  if (!clean.includes('@')) return 'unknown';

  const [localPart] = clean.split('@');

  if (clean.includes('form') || clean.includes('noreply') || clean.includes('no-reply')) {
    return 'contact_form_only';
  }

  if (['dispatch', 'sales', 'billing', 'accounting', 'service', 'services', 'quotes'].includes(localPart)) {
    return 'department_email';
  }

  if (['info', 'contact', 'office', 'admin', 'hello', 'inquiries', 'reception'].includes(localPart)) {
    return 'general_business';
  }

  // If local part contains a dot, hyphen, underscore, or matches a person's name, it's a named professional
  if (localPart.includes('.') || localPart.includes('-') || localPart.includes('_') || (personName && personName.trim().length > 0)) {
    return 'named_professional';
  }

  // Fallback: check length or presence of numbers
  return 'named_professional';
}

/**
 * Validates RFC 5322 syntax.
 */
export function validateEmailSyntax(email: string): boolean {
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return regex.test(email.trim());
}

/**
 * Checks if domain is disposable.
 */
export function isDisposableDomain(domain: string): boolean {
  return DISPOSABLE_DOMAINS.has(domain.toLowerCase().trim());
}

/**
 * Checks if localPart is role-based.
 */
export function isRoleBasedEmail(localPart: string): boolean {
  return ROLE_BASED_LOCAL_PARTS.has(localPart.toLowerCase().trim());
}

/**
 * Calculates the explainable Contact Quality Score (0–100 pts) (Prompt 10 Requirement 9).
 */
export function calculateContactQualityScore(
  email: string,
  emailType: EmailType,
  status: EmailVerificationStatus,
  sourceType: string = 'website',
  hasPerson: boolean = false,
  discoveryDate?: string
): ContactQualityScore {
  let sourceReliability = 15;
  if (sourceType.includes('official') || sourceType === 'website') {
    sourceReliability = 35;
  } else if (sourceType.includes('registry') || sourceType.includes('directory')) {
    sourceReliability = 30;
  } else if (sourceType.includes('provider')) {
    sourceReliability = 25;
  } else if (sourceType === 'csv_import') {
    sourceReliability = 20;
  } else {
    sourceReliability = 10;
  }

  let roleAssociation = 10;
  if (emailType === 'named_professional' && hasPerson) {
    roleAssociation = 30;
  } else if (emailType === 'named_professional') {
    roleAssociation = 24;
  } else if (emailType === 'department_email') {
    roleAssociation = 18;
  } else if (emailType === 'general_business') {
    roleAssociation = 12;
  } else {
    roleAssociation = 5;
  }

  let verificationQuality = 0;
  if (status === 'provider_verified' || status === 'verified_provider') {
    verificationQuality = 25;
  } else if (status === 'domain_passed_unconfirmed') {
    verificationQuality = 18;
  } else if (status === 'accept_all' || status === 'risky_accept_all') {
    verificationQuality = 10;
  } else if (status === 'risky') {
    verificationQuality = 6;
  } else if (status === 'unknown') {
    verificationQuality = 8;
  } else {
    verificationQuality = 0; // invalid or disposable
  }

  let recency = 6;
  if (discoveryDate) {
    const ageDays = (Date.now() - new Date(discoveryDate).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= 30) recency = 10;
    else if (ageDays <= 90) recency = 8;
    else recency = 4;
  }

  const totalScore = Math.min(100, sourceReliability + roleAssociation + verificationQuality + recency);

  let grade: 'high_quality' | 'acceptable' | 'low_quality' | 'excluded' = 'low_quality';
  if (status === 'invalid' || status === 'disposable') {
    grade = 'excluded';
  } else if (totalScore >= 80) {
    grade = 'high_quality';
  } else if (totalScore >= 60) {
    grade = 'acceptable';
  } else if (totalScore >= 40) {
    grade = 'low_quality';
  } else {
    grade = 'excluded';
  }

  return {
    sourceReliability,
    roleAssociation,
    verificationQuality,
    recency,
    totalScore,
    grade,
    summary: `Quality Score: ${totalScore}/100 (${grade.replace(/_/g, ' ')}). Source: ${sourceReliability}/35, Role: ${roleAssociation}/30, Verification: ${verificationQuality}/25, Recency: ${recency}/10.`,
  };
}

/**
 * Assesses Outreach Safety and identifies exclusion reasons (Prompt 10 Requirement 10).
 * Rule: Exclude invalid, disposable, suppressed and unverified from outreach-ready lists.
 */
export function evaluateOutreachSafety(
  email: string,
  status: EmailVerificationStatus,
  isDisposable: boolean,
  isSuppressed: boolean = false
): { isOutreachSafe: boolean; exclusionReason?: string } {
  if (isSuppressed) {
    return { isOutreachSafe: false, exclusionReason: 'Suppressed: Contact opted-out or excluded in project CRM.' };
  }
  if (isDisposable || status === 'disposable') {
    return { isOutreachSafe: false, exclusionReason: 'Excluded: Disposable or temporary mailbox detected.' };
  }
  if (status === 'invalid') {
    return { isOutreachSafe: false, exclusionReason: 'Excluded: Syntax or DNS MX check failed.' };
  }
  if (status === 'risky') {
    return { isOutreachSafe: false, exclusionReason: 'Excluded: High bounce risk on catch-all domain without provider confirmation.' };
  }
  if (status === 'unknown') {
    return { isOutreachSafe: false, exclusionReason: 'Pending: DNS MX verification must be executed before outreach.' };
  }

  return { isOutreachSafe: true };
}

/**
 * Deduplicates email records within a business and across imported datasets (Prompt 10 Requirement 7).
 * Preserves source URLs in sourceHistory array.
 */
export function deduplicateEmailRecords(records: EmailDiscoveryRecord[]): EmailDiscoveryRecord[] {
  const map = new Map<string, EmailDiscoveryRecord>();

  for (const r of records) {
    const key = r.email.toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, {
        ...r,
        sourceHistory: r.sourceHistory || [r.sourceUrl].filter(Boolean),
      });
    } else {
      const existing = map.get(key)!;
      const combinedHistory = Array.from(new Set([...(existing.sourceHistory || []), ...(r.sourceHistory || []), r.sourceUrl].filter(Boolean)));

      // Keep record with highest quality/verification
      const isNewBetter =
        r.verificationStatus === 'provider_verified' ||
        (r.verificationStatus === 'domain_passed_unconfirmed' && existing.verificationStatus === 'unknown');

      if (isNewBetter) {
        map.set(key, {
          ...r,
          associatedPersonName: r.associatedPersonName || existing.associatedPersonName,
          sourceHistory: combinedHistory,
        });
      } else {
        map.set(key, {
          ...existing,
          sourceHistory: combinedHistory,
        });
      }
    }
  }

  return Array.from(map.values());
}
