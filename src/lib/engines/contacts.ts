import type {
  Contact,
  Business,
  WebsiteAudit,
  Opportunity,
  OutreachSequence,
  EmailDiscoveryRecord,
} from '@/types';

export {
  classifyDecisionMakerRole,
  calculateDecisionMakerConfidence,
  detectMissingContactInfo,
  mergeContactProfiles,
  CONTACT_SOURCE_DEFINITIONS,
} from './decisionMakerEngine';

export function scoreContactPrioritization(
  contact: Contact,
  business: Business,
  emailRecord?: EmailDiscoveryRecord
): { score: number; reasoning: string } {
  let score = 50;
  const reasons: string[] = [];

  const titleLower = contact.roleOrTitle.toLowerCase();

  // Role weight
  if (/owner|founder|co-founder|proprietor/i.test(titleLower)) {
    score += 35;
    reasons.push('Direct owner/founder equity holder');
  } else if (/ceo|chief executive|president/i.test(titleLower)) {
    score += 30;
    reasons.push('C-level executive leadership');
  } else if (/general manager|managing director|vp|vice president/i.test(titleLower)) {
    score += 20;
    reasons.push('Key operational leadership');
  } else if (/director of operations|marketing director/i.test(titleLower)) {
    score += 15;
    reasons.push('Functional department director');
  }

  // Verification status
  if (contact.verificationStatus === 'verified') {
    score += 15;
    reasons.push('Publicly verified in official state registry or professional license');
  } else if (contact.verificationStatus === 'unverified') {
    score -= 10;
    reasons.push('Unverified: Requires manual confirmation before direct outreach');
  }

  // Email verification quality
  if (emailRecord) {
    if (emailRecord.verificationStatus === 'verified_provider' || emailRecord.verificationStatus === 'domain_passed_unconfirmed') {
      score += 10;
      reasons.push(`Direct email verified with active MX records (${emailRecord.email})`);
    } else if (emailRecord.verificationStatus === 'invalid') {
      score -= 25;
      reasons.push('Email failed MX/syntax validation');
    }
  } else if (contact.phone) {
    score += 5;
    reasons.push('Telephone route available');
  }

  const finalScore = Math.max(10, Math.min(100, score));
  return {
    score: finalScore,
    reasoning: reasons.join(' • ') || 'Standard business contact record',
  };
}

export function generateOutreachSequence(
  business: Business,
  topOpportunity?: Opportunity,
  contact?: Contact
): OutreachSequence {
  const contactName = contact?.fullName ? contact.fullName.split(' ')[0] : 'there';
  const bizName = business.brandName || business.officialName;
  const area = business.city || 'your area';

  const prob = topOpportunity?.identifiedProblem || 'quote request friction on mobile';
  const solution = topOpportunity?.recommendedSolution || 'implementing a 2-step direct quote estimator';

  // 1. First Contact (Honest, low-pressure, evidence-backed)
  const firstContact = {
    subject: `Observation regarding ${bizName}'s quote flow in ${area}`,
    body: `Hi ${contactName},

I was recently reviewing commercial mechanical contractors across ${area} and spent a few minutes analyzing ${bizName}'s web presence.

We noticed ${prob.toLowerCase()}. For companies operating with active service fleets, this often creates drop-off when prospective commercial facility managers need fast emergency service.

We specialize in ${solution.toLowerCase()} to capture these requests directly without extra admin overhead.`,
    cta: `Would you be open to a 2-page brief summarizing our observations? Happy to send it over with zero sales pressure.`,
  };

  // 2. Follow-Up (Gentle nudge referencing the original audit note)
  const followUpNoResponse = {
    subject: `Follow-up: research brief for ${bizName}`,
    body: `Hi ${contactName},

Following up on my previous note regarding ${bizName}'s quote capture flow.

I realize you're busy running operations. I wanted to verify if you would prefer me to share the audit brief or if digital improvements aren't a priority this quarter.`,
    cta: `Let me know either way so I don't follow up unnecessarily.`,
  };

  // 3. Positive Reply (Direct value delivery, no pushy pitch)
  const positiveReply = {
    subject: `Research observations & wireframe for ${bizName}`,
    body: `Hi ${contactName},

Thanks for getting back to me.

As promised, here is the executive breakdown of what we observed:
1. Specific friction points: ${prob}
2. Recommended resolution: ${solution}
3. Estimated turnaround: 2-3 business weeks

We've prepared a clean visual blueprint comparing the current flow against our high-converting flow.`,
    cta: `Would 15 minutes next Tuesday or Wednesday work for a quick screen share walkthrough?`,
  };

  // 4. Request for More Information
  const requestMoreInfo = {
    subject: `Details on Watech's implementation process for ${bizName}`,
    body: `Hi ${contactName},

Happy to share more details on how this works.

We handle the entire technical implementation end-to-end:
- Custom responsive development with zero downtime
- Full local schema injection and tap-to-call mobile headers
- Direct routing to your dispatch team via SMS/CRM
- Fixed turnaround guarantee with transparent milestones`,
    cta: `What is the biggest operational priority your team is focused on right now?`,
  };

  // 5. Not Interested (Respectful acknowledgment)
  const notInterested = {
    subject: `Understood — thank you ${contactName}`,
    body: `Hi ${contactName},

Understood completely. Thank you for letting me know.

I have updated our records so our team will not reach out again. If anything changes as your commercial footprint expands, feel free to reach back out anytime.`,
    cta: `Wishing you and the ${bizName} team continued success.`,
  };

  // 6. Opt-Out Confirmation
  const optOutNotice = {
    subject: `Opt-out confirmed: ${bizName}`,
    body: `Hello,

Your opt-out request has been processed. Your domain and email address have been permanently added to our global suppression registry across all Watech projects.

You will receive no further communications from our platform.`,
    cta: `No further action required on your part.`,
  };

  return {
    firstContact,
    followUpNoResponse,
    positiveReply,
    requestMoreInfo,
    notInterested,
    optOutNotice,
  };
}
