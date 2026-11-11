import type { DecisionMakerCandidate, ContactVerificationStatus } from './types';
import { normalizePersonName, classifySeniorityTier } from './normalization';
import type { Business } from '@/types';

/**
 * Validates decision-maker candidate against business association, role evidence, and freshness
 */
export function verifyDecisionMakerCandidate(
  candidate: DecisionMakerCandidate,
  business: Business
): {
  status: ContactVerificationStatus;
  isValid: boolean;
  conflictNotes?: string;
} {
  const normPerson = normalizePersonName(candidate.fullName);
  if (!normPerson || normPerson.length < 3 || normPerson.split(' ').length < 2) {
    return {
      status: 'UNVERIFIED',
      isValid: false,
      conflictNotes: 'Invalid or incomplete person name',
    };
  }

  // Check if candidate is marked as resigned/inactive in registry
  if (candidate.isCurrent === false) {
    return {
      status: 'UNVERIFIED',
      isValid: false,
      conflictNotes: 'Officer is historical/resigned, no longer active decision-maker',
    };
  }

  // Check business association
  const bizNameNorm = (business.officialName || business.brandName || '').toLowerCase();
  const candCompanyNorm = (candidate.company || '').toLowerCase();
  if (candCompanyNorm && bizNameNorm && !bizNameNorm.includes(candCompanyNorm) && !candCompanyNorm.includes(bizNameNorm)) {
    return {
      status: 'CONFLICTING_INFORMATION',
      isValid: false,
      conflictNotes: `Company mismatch: Candidate linked to "${candidate.company}", expected "${business.officialName}"`,
    };
  }

  // Seniority role check
  const roleCheck = classifySeniorityTier(candidate.roleOrTitle);
  if (!roleCheck.isDecisionMaker && candidate.isDecisionMaker) {
    return {
      status: 'PARTIALLY_VERIFIED',
      isValid: true,
      conflictNotes: `Role "${candidate.roleOrTitle}" does not have commercial executive authority`,
    };
  }

  if (candidate.confidence >= 80) {
    return { status: 'VERIFIED', isValid: true };
  } else if (candidate.confidence >= 60) {
    return { status: 'PARTIALLY_VERIFIED', isValid: true };
  }

  return { status: 'UNVERIFIED', isValid: true };
}

/**
 * Detects conflicting sole executive claims (e.g. multiple distinct individuals claiming sole ownership)
 */
export function detectConflictingLeadership(
  candidates: DecisionMakerCandidate[]
): DecisionMakerCandidate[] {
  const soleExecutiveTitles = ['sole proprietor', 'owner', 'ceo', 'president', 'managing director'];
  const titleMap = new Map<string, DecisionMakerCandidate[]>();

  for (const cand of candidates) {
    const titleLower = cand.roleOrTitle.toLowerCase().trim();
    for (const soleTitle of soleExecutiveTitles) {
      if (titleLower === soleTitle || titleLower === `the ${soleTitle}`) {
        const list = titleMap.get(soleTitle) || [];
        list.push(cand);
        titleMap.set(soleTitle, list);
        break;
      }
    }
  }

  // If more than 1 distinct person claims the same exclusive sole title without a partnership modifier
  for (const [title, holders] of titleMap.entries()) {
    if (holders.length > 1) {
      const distinctNames = new Set(holders.map((h) => normalizePersonName(h.fullName).toLowerCase()));
      if (distinctNames.size > 1) {
        for (const holder of holders) {
          holder.verificationStatus = 'CONFLICTING_INFORMATION';
          holder.notes = `Multiple distinct individuals claim the sole role of "${title}". Flagged for analyst verification.`;
          holder.confidence = Math.max(30, holder.confidence - 25);
        }
      }
    }
  }

  return candidates;
}
