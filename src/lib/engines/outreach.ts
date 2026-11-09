import type {
  Business,
  WebsiteAudit,
  Opportunity,
  Contact,
  OutreachDraft,
  SourceRecord,
} from '@/types';

export function generateOutreachBrief(
  business: Business,
  audit?: WebsiteAudit,
  opportunities: Opportunity[] = [],
  contacts: Contact[] = [],
  sources: SourceRecord[] = [],
  isSuppressed = false
): OutreachDraft {
  const verifiedContact = contacts.find(c => c.isDecisionMaker && c.verificationStatus === 'verified') 
    || contacts.find(c => c.verificationStatus === 'verified');

  const strongFindings: string[] = [];
  if (audit) {
    const critical = audit.findings.filter(f => f.severity === 'critical' || f.severity === 'high');
    if (critical.length > 0) {
      strongFindings.push(critical[0].observation);
    }
    if (critical.length > 1) {
      strongFindings.push(critical[1].observation);
    }
  }

  if (business.reviewCount && business.reviewRating) {
    strongFindings.push(`Public customer rating stands at ${business.reviewRating}★ across ${business.reviewCount} reviews.`);
  }

  if (strongFindings.length === 0) {
    strongFindings.push(`Operating in ${business.city || 'local area'} focusing on ${business.businessModel} services.`);
  }

  const topOpp = opportunities[0];
  const recommendedService = topOpp ? topOpp.relevantWatechService : 'website_development';
  const topOppTitle = topOpp ? topOpp.recommendedSolution : 'Modernize digital infrastructure and direct quote capture.';

  // Build honest, non-manipulative subject line
  const subjectLine = topOpp
    ? `Quick observation regarding ${business.brandName || business.officialName}'s web quote flow`
    : `Research note on ${business.brandName || business.officialName}`;

  // Honest, respectful CTA
  const callToAction = `Open to reviewing a 2-page brief on how we resolve this without any pitch pressure?`;

  // Tailored personalization angle
  const personalizationAngle = topOpp
    ? `Noticed ${topOpp.identifiedProblem.toLowerCase()} while reviewing your service presence in ${business.city || 'your area'}. Thought it might be helpful to share our findings.`
    : `Reviewed your current public web presence in ${business.city || 'your area'} and identified areas to improve direct quote capture.`;

  const sourcesSummary = sources.length > 0
    ? sources.map(s => `${s.sourceName} (${s.sourceType}, verified ${s.verificationStatus})`).join(', ')
    : 'Direct technical website inspection';

  return {
    id: `outreach-${business.id}`,
    businessId: business.id,
    projectId: business.projectId,
    verifiedIdentity: `${business.officialName} (${business.domain})`,
    targetName: verifiedContact?.fullName,
    targetRole: verifiedContact?.roleOrTitle,
    contactRouteSummary: verifiedContact
      ? `${verifiedContact.fullName} (${verifiedContact.roleOrTitle}) — ${verifiedContact.email || verifiedContact.phone || 'LinkedIn'} [Confidence: ${Math.round(verifiedContact.confidence * 100)}%]`
      : `No verified personal route. General phone: ${business.phone || 'N/A'}, email: ${business.email || 'N/A'}. Recommend manual owner verification before messaging.`,
    strongestFindings: strongFindings.slice(0, 3),
    topOpportunity: topOppTitle,
    recommendedService,
    personalizationAngle,
    suggestedSubjectLine: subjectLine,
    callToAction,
    sourcesAttribution: sourcesSummary,
    isSuppressed,
    status: isSuppressed ? 'suppressed' : 'ready',
    createdAt: new Date().toISOString(),
  };
}
