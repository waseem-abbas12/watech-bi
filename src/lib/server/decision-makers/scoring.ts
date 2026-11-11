import type { ContactVerificationStatus } from './types';
import { classifySeniorityTier } from './normalization';

export interface ScoreDecisionMakerInput {
  fullName: string;
  roleOrTitle: string;
  sourceType: 'official_website' | 'corporate_registry' | 'search_intelligence' | 'public_directory';
  companyDomain?: string;
  email?: string;
  hasAppointmentDate?: boolean;
  isCurrentOfficer?: boolean;
  corroboratingSourcesCount: number;
}

export interface ScoreOutput {
  confidence: number; // 0 - 100
  verificationStatus: ContactVerificationStatus;
  breakdown: {
    sourceAuthority: number; // Max 30
    identityMatch: number; // Max 25
    roleSeniority: number; // Max 25
    informationFreshness: number; // Max 10
    crossSourceConsistency: number; // Max 10
    rationale: string[];
  };
}

export function calculateDecisionMakerConfidenceScore(input: ScoreDecisionMakerInput): ScoreOutput {
  const rationale: string[] = [];

  // 1. Source Authority (Max 30)
  let sourceAuthority = 10;
  if (input.sourceType === 'official_website') {
    sourceAuthority = 30;
    rationale.push('Discovered directly on official company website / leadership bio (+30 pts)');
  } else if (input.sourceType === 'corporate_registry') {
    sourceAuthority = 28;
    rationale.push('Discovered from legally registered corporate registry (+28 pts)');
  } else if (input.sourceType === 'search_intelligence') {
    sourceAuthority = 20;
    rationale.push('Discovered via authorized search engine citation on domain (+20 pts)');
  } else {
    sourceAuthority = 12;
    rationale.push('Discovered in public business directory (+12 pts)');
  }

  // 2. Identity Match & Business Association (Max 25)
  let identityMatch = 15;
  if (input.companyDomain && input.email && input.email.includes(input.companyDomain)) {
    identityMatch = 25;
    rationale.push(`Named professional email matches company domain (${input.companyDomain}) (+25 pts)`);
  } else if (input.sourceType === 'official_website' || input.sourceType === 'corporate_registry') {
    identityMatch = 22;
    rationale.push('Explicit legal or corporate affiliation with the business (+22 pts)');
  } else {
    identityMatch = 15;
    rationale.push('Contextual association with business name (+15 pts)');
  }

  // 3. Role Seniority & Evidence (Max 25)
  let roleSeniority = 5;
  const classification = classifySeniorityTier(input.roleOrTitle);

  if (classification.seniorityRank === 1) {
    roleSeniority = 25;
    rationale.push(`Top-tier executive role: ${input.roleOrTitle} (Owner/Founder/CEO) (+25 pts)`);
  } else if (classification.seniorityRank === 2) {
    roleSeniority = 20;
    rationale.push(`Senior director role: ${input.roleOrTitle} (COO/GM/VP) (+20 pts)`);
  } else if (classification.seniorityRank === 3) {
    roleSeniority = 15;
    rationale.push(`Marketing / Commercial leadership: ${input.roleOrTitle} (+15 pts)`);
  } else if (classification.seniorityRank === 4) {
    roleSeniority = 10;
    rationale.push(`Functional management role: ${input.roleOrTitle} (+10 pts)`);
  } else {
    roleSeniority = 5;
    rationale.push(`General staff / unverified title: ${input.roleOrTitle} (+5 pts)`);
  }

  // 4. Information Freshness (Max 10)
  let informationFreshness = 5;
  if (input.isCurrentOfficer !== false) {
    informationFreshness = 10;
    rationale.push('Active current status confirmed (+10 pts)');
  } else {
    informationFreshness = 3;
    rationale.push('Status might be historical or undated (+3 pts)');
  }

  // 5. Cross-Source Consistency (Max 10)
  let crossSourceConsistency = 0;
  if (input.corroboratingSourcesCount >= 2) {
    crossSourceConsistency = 10;
    rationale.push(`Corroborated across ${input.corroboratingSourcesCount} independent sources (+10 pts)`);
  } else {
    crossSourceConsistency = 4;
    rationale.push('Single verified source citation (+4 pts)');
  }

  const confidence = Math.min(100, sourceAuthority + identityMatch + roleSeniority + informationFreshness + crossSourceConsistency);

  let verificationStatus: ContactVerificationStatus = 'UNVERIFIED';
  if (confidence >= 80 && classification.isDecisionMaker) {
    verificationStatus = 'VERIFIED';
  } else if (confidence >= 60) {
    verificationStatus = 'PARTIALLY_VERIFIED';
  }

  return {
    confidence,
    verificationStatus,
    breakdown: {
      sourceAuthority,
      identityMatch,
      roleSeniority,
      informationFreshness,
      crossSourceConsistency,
      rationale,
    },
  };
}
