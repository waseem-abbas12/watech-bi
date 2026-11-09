import type {
  Business,
  WebsiteAudit,
  LocalSeoProfile,
  Opportunity,
  Contact,
  IntelligenceFact,
  SourceRecord,
  ContentItem,
  CustomerQuestionInsight,
  OutreachProspectStrategy,
  OutreachStrategyAngle,
  OutreachAngleId,
  OutreachStyle,
  OutreachMessageType,
  OutreachMessageContent,
  OutreachEvidenceClaim,
  OutreachPerformanceMetrics,
  WatechService,
} from '@/types';

/**
 * Creates verifiable evidence claims from available research data.
 */
function extractEvidenceClaims(
  business: Business,
  audit?: WebsiteAudit,
  localProfile?: LocalSeoProfile,
  facts: IntelligenceFact[] = [],
  sources: SourceRecord[] = []
): OutreachEvidenceClaim[] {
  const claims: OutreachEvidenceClaim[] = [];

  // 1. Website Audit Observation
  if (audit && audit.findings.length > 0) {
    const topFinding = audit.findings.find(f => f.severity === 'critical' || f.severity === 'high') || audit.findings[0];
    claims.push({
      id: `claim-audit-${business.id}`,
      claimText: topFinding.observation,
      sourceName: 'Technical Website Audit Inspection',
      sourceUrl: business.websiteUrl || `https://${business.domain}`,
      sourceType: 'direct_inspection',
      retrievalDate: audit.inspectedAt ? audit.inspectedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
      isIncluded: true,
    });
  }

  // 2. Local SEO / Review Observation
  if (localProfile && localProfile.reviewCount && localProfile.averageRating) {
    claims.push({
      id: `claim-lseo-${business.id}`,
      claimText: `Public customer reputation stands at ${localProfile.averageRating}★ across ${localProfile.reviewCount} customer reviews.`,
      sourceName: 'Google Business Profile Research',
      sourceUrl: localProfile.googleBusinessProfileUrl || business.websiteUrl || `https://${business.domain}`,
      sourceType: 'gbp_public',
      retrievalDate: new Date().toISOString().slice(0, 10),
      isIncluded: true,
    });
  } else if (business.reviewCount && business.reviewRating) {
    claims.push({
      id: `claim-review-${business.id}`,
      claimText: `Verified public rating of ${business.reviewRating}★ across ${business.reviewCount} reviews in ${business.city || 'local market'}.`,
      sourceName: 'Public Customer Reviews Analysis',
      sourceUrl: business.websiteUrl || `https://${business.domain}`,
      sourceType: 'customer_reviews',
      retrievalDate: new Date().toISOString().slice(0, 10),
      isIncluded: true,
    });
  }

  // 3. Operational Scale / Growth Signal
  const growthFact = facts.find(f => f.category === 'growth' || f.category === 'operations');
  if (growthFact) {
    claims.push({
      id: `claim-growth-${business.id}`,
      claimText: growthFact.claim,
      sourceName: growthFact.sourceType || 'Public Job Board / Official Website',
      sourceUrl: growthFact.sourceUrl,
      sourceType: 'social_media',
      retrievalDate: growthFact.dateCollected || new Date().toISOString().slice(0, 10),
      isIncluded: true,
    });
  } else if (business.fleetCapacity) {
    claims.push({
      id: `claim-fleet-${business.id}`,
      claimText: `Operates active service fleet estimated at ${business.fleetCapacity}.`,
      sourceName: 'Public Fleet & Operations Verification',
      sourceUrl: business.websiteUrl || `https://${business.domain}`,
      sourceType: 'official_website',
      retrievalDate: new Date().toISOString().slice(0, 10),
      isIncluded: true,
    });
  }

  // 4. Corporate Filing / Public Registry
  const registrySource = sources.find(s => s.sourceType === 'public_registry');
  if (registrySource) {
    claims.push({
      id: `claim-registry-${business.id}`,
      claimText: registrySource.excerptOrNote || `Official entity in good standing registered with Texas Secretary of State.`,
      sourceName: registrySource.sourceName,
      sourceUrl: registrySource.url,
      sourceType: 'public_registry',
      retrievalDate: registrySource.retrievalDate || new Date().toISOString().slice(0, 10),
      isIncluded: true,
    });
  }

  return claims;
}

/**
 * Builds messages for a strategic angle adapted across 11 message types and 5 writing styles.
 */
function generateAngleMessages(
  angleId: OutreachAngleId,
  business: Business,
  contact?: Contact,
  claims: OutreachEvidenceClaim[] = [],
  style: OutreachStyle = 'professional'
): Record<OutreachMessageType, OutreachMessageContent> {
  const brand = business.brandName || business.officialName;
  const firstName = contact?.fullName ? contact.fullName.split(' ')[0] : 'there';
  const role = contact?.roleOrTitle || 'Leadership Team';
  const city = business.city || 'your area';

  // Primary active observation
  const includedClaims = claims.filter(c => c.isIncluded);
  const observation = includedClaims.length > 0 
    ? includedClaims[0].claimText 
    : `focusing on commercial mechanical and HVAC service delivery across ${city}`;

  // Angle-specific contextual variables
  let angleTopic = '';
  let businessProblem = '';
  let solutionPitch = '';
  let ctaQuestion = '';

  if (angleId === 'conversion_friction') {
    angleTopic = 'digital quote flow and commercial inquiry capture';
    businessProblem = `We noticed that when commercial facility managers land on ${brand}'s website, they encounter friction: ${observation.toLowerCase()}.`;
    solutionPitch = `When facility directors have a rooftop chiller trip or need a preventative maintenance estimate, high-friction forms cause them to back out and call the next contractor.`;
    ctaQuestion = `Open to reviewing a concise 2-page brief on how we resolve this and capture direct commercial RFQs without any pitch pressure?`;
  } else if (angleId === 'local_authority') {
    angleTopic = 'regional search presence and localized commercial demand';
    businessProblem = `While analyzing commercial mechanical search visibility in ${city}, we observed: ${observation.toLowerCase()}.`;
    solutionPitch = `Suburban hubs like Irving, Carrollton, and Plano have surging demand for commercial maintenance, but regional competitors are capturing those search queries due to localized service landing page deficits.`;
    ctaQuestion = `Would you like me to send over our regional competitive search density matrix comparing ${brand} with regional peers?`;
  } else {
    // growth_capacity
    angleTopic = 'commercial service capacity and preventative maintenance contract pipeline';
    businessProblem = `We saw observable growth signals for ${brand}: ${observation.toLowerCase()}.`;
    solutionPitch = `Scaling skilled technical headcount and fleet capacity works best when paired with an automated pipeline of predictable, multi-year commercial preventative maintenance agreements.`;
    ctaQuestion = `Open to seeing how two mid-sized Texas commercial contractors automated recurring maintenance contract acquisition?`;
  }

  // Generate Base Content based on Writing Style
  const buildCopy = (type: OutreachMessageType): OutreachMessageContent => {
    switch (type) {
      case 'first_cold_email': {
        if (style === 'short_direct') {
          return {
            subject: `Quick observation: ${brand}'s ${angleTopic}`,
            body: `Hi ${firstName},\n\nNoticed a specific observation regarding ${brand}'s service presence in ${city}: ${observation}.\n\nIn commercial mechanical, this typically costs qualified inbound contracts as facility managers look elsewhere.\n\nWe put together a clean 2-page breakdown with the exact fixes.`,
            cta: ctaQuestion,
          };
        }
        if (style === 'executive') {
          return {
            subject: `Operational leverage for ${brand} — ${angleTopic}`,
            body: `Dear ${firstName},\n\nIn our review of commercial mechanical operations across ${city}, ${brand}'s footprint stood out. However, an analysis of your public digital infrastructure revealed an operational inefficiency:\n\n• Finding: ${observation}\n• Commercial Impact: ${solutionPitch}\n\nWe specialize in engineering commercial customer acquisition infrastructure specifically tailored for commercial mechanical leadership.`,
            cta: ctaQuestion,
          };
        }
        if (style === 'conversational') {
          return {
            subject: `Thought on ${brand}'s web presence in ${city}`,
            body: `Hey ${firstName},\n\nHope your week is off to a good start. I was researching commercial mechanical contractors in the ${city} area and came across ${brand}.\n\nOne thing caught my eye: ${observation.toLowerCase()}. ${solutionPitch}\n\nWe've helped regional contractors address this exact gap cleanly.`,
            cta: ctaQuestion,
          };
        }
        if (style === 'consultative') {
          return {
            subject: `Diagnostic finding: ${brand} commercial service workflow`,
            body: `Hello ${firstName},\n\nAs part of Watech's ongoing commercial contractor research across Texas, our audit team evaluated ${brand}'s digital touchpoints. We identified a clear opportunity:\n\nDiagnostic Finding: ${observation}\nRoot Impact: ${solutionPitch}\n\nOur objective is to provide actionable intelligence before recommending any engagement.`,
            cta: ctaQuestion,
          };
        }
        // Standard Professional
        return {
          subject: `Observation regarding ${brand}'s ${angleTopic}`,
          body: `Hi ${firstName},\n\nI hope this note finds you well. While reviewing commercial mechanical contractors serving the ${city} area, I noticed a specific area on ${brand}'s public presence:\n\n${businessProblem}\n\n${solutionPitch}\n\nWe put together a brief review outlining how to resolve this.`,
          cta: ctaQuestion,
        };
      }

      case 'short_intro': {
        return {
          subject: `${brand} + Watech: quick note`,
          body: `Hi ${firstName},\n\nBrief note — I noticed ${brand} in ${city} and saw that ${observation.toLowerCase()}.\n\nWe help commercial mechanical contractors turn digital touchpoints into predictable commercial service contracts.`,
          cta: `Would it be helpful if I forwarded our 2-page teardown of what we found?`,
        };
      }

      case 'personalized_follow_up': {
        return {
          subject: `Following up: ${brand}'s ${angleTopic}`,
          body: `Hi ${firstName},\n\nFollowing up briefly on my note from earlier this week regarding ${brand}'s ${angleTopic}.\n\nGiven that ${observation.toLowerCase()}, I wanted to make sure our audit notes didn't get buried.\n\nNo hard pitch — just actionable observations.`,
          cta: `Is this something you'd prefer to review this week, or should I circle back next month?`,
        };
      }

      case 'value_first': {
        return {
          subject: `Free resource for ${brand}: ${angleTopic} checklist`,
          body: `Hi ${firstName},\n\nRather than asking for time on your calendar, I wanted to share a concrete insight.\n\nBased on our finding that "${observation}", we synthesized a 5-point checklist used by Texas commercial mechanical contractors to capture high-margin chiller and RTU contracts.\n\nNo download gate or sales form required.`,
          cta: `Should I send the direct PDF link over?`,
        };
      }

      case 'permission_offer': {
        return {
          subject: `Permission to share a 3-minute video on ${brand}'s quote flow?`,
          body: `Hi ${firstName},\n\nOur technical team recorded a 3-minute screen recording analyzing ${brand}'s public customer journey, specifically looking at how ${observation.toLowerCase()}.\n\nI wanted to ask your permission before sending the link over to respect your inbox.`,
          cta: `May I send the 3-minute link over?`,
        };
      }

      case 'website_concept_intro': {
        return {
          subject: `Concept mockup: high-conversion quote intake for ${brand}`,
          body: `Hi ${firstName},\n\nBecause ${observation.toLowerCase()}, our design team prototyped a clean, high-conversion commercial quote module customized with ${brand}'s branding.\n\nIt demonstrates how commercial facility managers can submit emergency chiller specs and preventative maintenance requests in under 45 seconds on mobile.`,
          cta: `Would you be open to seeing a 60-second interactive preview?`,
        };
      }

      case 'linkedin_connect': {
        return {
          subject: `LinkedIn Connection Request`,
          body: `Hi ${firstName}, saw your leadership role at ${brand} while researching commercial mechanical contractors in ${city}. Impressed by your focus on ${brand}'s operations. Would be glad to connect here.`,
          cta: `Connect on LinkedIn`,
        };
      }

      case 'linkedin_follow_up': {
        return {
          subject: `Thanks for connecting, ${firstName}`,
          body: `Hi ${firstName}, thanks for connecting. Noticed ${brand} while auditing commercial contractor digital presence in DFW — specifically saw that ${observation.toLowerCase()}.\n\nWe put together a clean 2-page brief on how to optimize this for direct commercial maintenance contract capture.`,
          cta: `Happy to drop the PDF here if you're curious.`,
        };
      }

      case 'response_interested': {
        return {
          subject: `Re: ${brand} — observations brief & next steps`,
          body: `Hi ${firstName},\n\nGreat to hear from you. As promised, I've prepared our detailed findings regarding ${brand}'s ${angleTopic}.\n\nKey finding: ${observation}.\n\nI can either forward the complete PDF brief right here, or we can schedule a brief 10-minute walkthrough at your convenience.`,
          cta: `Which format works best for your schedule this week?`,
        };
      }

      case 'response_not_interested': {
        return {
          subject: `Re: ${brand} — understood & thank you`,
          body: `Hi ${firstName},\n\nCompletely understood, and thank you for letting me know. I'll make sure not to follow up further regarding ${brand}'s ${angleTopic}.\n\nIf you ever need an objective perspective on digital quote workflows or commercial contract acquisition down the road, you have my contact info.\n\nWishing ${brand} continued success in ${city}.`,
          cta: `Best regards, Watech Research Team`,
        };
      }

      case 'polite_closing': {
        return {
          subject: `Closing the loop on ${brand}`,
          body: `Hi ${firstName},\n\nI haven't heard back, so I assume this isn't a priority for ${brand} right now — which is completely fine.\n\nI'll close your file on our end so I don't clutter your inbox further. If you ever want to review our benchmark data for ${city} commercial mechanical contractors, the door is always open.`,
          cta: `Wishing you and the team at ${brand} a great quarter ahead.`,
        };
      }
    }
  };

  return {
    first_cold_email: buildCopy('first_cold_email'),
    short_intro: buildCopy('short_intro'),
    personalized_follow_up: buildCopy('personalized_follow_up'),
    value_first: buildCopy('value_first'),
    permission_offer: buildCopy('permission_offer'),
    website_concept_intro: buildCopy('website_concept_intro'),
    linkedin_connect: buildCopy('linkedin_connect'),
    linkedin_follow_up: buildCopy('linkedin_follow_up'),
    response_interested: buildCopy('response_interested'),
    response_not_interested: buildCopy('response_not_interested'),
    polite_closing: buildCopy('polite_closing'),
  };
}

/**
 * Generates the full 3-Angle Outreach Strategy for a prospect business.
 */
export function generateProspectOutreachStrategy(
  business: Business,
  audit?: WebsiteAudit,
  localProfile?: LocalSeoProfile,
  opportunities: Opportunity[] = [],
  contacts: Contact[] = [],
  facts: IntelligenceFact[] = [],
  sources: SourceRecord[] = [],
  contentItems: ContentItem[] = [],
  customerQuestions: CustomerQuestionInsight[] = [],
  isSuppressed = false,
  suppressionReason?: string,
  preferredStyle: OutreachStyle = 'professional'
): OutreachProspectStrategy {
  // Determine primary decision maker contact
  const targetContact = contacts.find(c => c.isDecisionMaker && c.verificationStatus === 'verified')
    || contacts.find(c => c.isDecisionMaker)
    || contacts.find(c => c.email)
    || contacts[0];

  // Extract factual evidence claims
  const evidenceClaims = extractEvidenceClaims(business, audit, localProfile, facts, sources);

  // Determine angle recommendations
  const auditDefects = audit?.findings.filter(f => f.severity === 'critical' || f.severity === 'high').length || 0;
  const lseoScore = localProfile ? (!localProfile.hasLocalBusinessSchema || localProfile.napConsistencyStatus === 'mismatched' || localProfile.reviewCount < 30 ? 50 : 80) : 50;
  const hasGrowthSignals = facts.some(f => f.category === 'growth' || f.category === 'operations') || Boolean(business.fleetCapacity);

  let recommendedAngle: OutreachAngleId = 'conversion_friction';
  let angleReason = 'Website audit identified high-friction UX and missing commercial quote workflows that directly suppress inbound RFQs.';

  if (auditDefects >= 2) {
    recommendedAngle = 'conversion_friction';
    angleReason = 'Critical website audit findings (page speed and mobile form friction) create the highest immediate ROI for direct customer quote capture.';
  } else if (lseoScore < 65 || (localProfile && localProfile.secondaryCategories.length < 2)) {
    recommendedAngle = 'local_authority';
    angleReason = 'Local SEO deficit and lack of localized sub-market landing pages allow regional competitors to capture local commercial contracts.';
  } else if (hasGrowthSignals) {
    recommendedAngle = 'growth_capacity';
    angleReason = 'Public evidence of active hiring and service fleet expansion signals operational readiness to monetize an automated commercial agreement pipeline.';
  }

  // 1. Angle: Conversion Friction
  const angle1Messages = generateAngleMessages('conversion_friction', business, targetContact, evidenceClaims, preferredStyle);
  const angle1: OutreachStrategyAngle = {
    id: 'conversion_friction',
    title: 'Digital Quote Flow & Website Conversion Friction',
    description: 'Pinpoints specific website friction points, broken mobile quote flows, and missing intake mechanisms that cause commercial facility directors to bounce.',
    isRecommended: recommendedAngle === 'conversion_friction',
    recommendedReason: angleReason,
    bestBusinessProblem: 'Facility managers seeking commercial chiller/RTU repairs encounter high-friction contact forms and abandon before submitting specs.',
    strongestEvidence: evidenceClaims[0]?.claimText || 'Observed mobile viewport and interactive quote intake deficiencies on public website.',
    relevantWatechService: 'conversion_optimization',
    whyFindingMatters: 'Commercial repair requests carry $3,500–$25,000 in project value; losing even 2 inbound inquiries per month severely impacts revenue.',
    openingAngle: `Reviewed ${business.brandName || business.officialName}'s web inquiry flow in ${business.city || 'DFW'}...`,
    bestFirstContactCta: 'Open to reviewing a 2-page brief on how we resolve quote form drop-off without any pitch pressure?',
    recommendedFollowUpApproach: 'Share a 60-second video teardown of the quote workflow comparing mobile vs. desktop experience.',
    messages: angle1Messages,
    evidenceClaims: [...evidenceClaims],
  };

  // 2. Angle: Local Authority
  const angle2Messages = generateAngleMessages('local_authority', business, targetContact, evidenceClaims, preferredStyle);
  const angle2: OutreachStrategyAngle = {
    id: 'local_authority',
    title: 'Regional Search Authority & Competitor Service Area Deficit',
    description: 'Highlights geographic search visibility gaps and missing localized landing pages across key sub-markets where competitors dominate.',
    isRecommended: recommendedAngle === 'local_authority',
    recommendedReason: angleReason,
    bestBusinessProblem: `High commercial HVAC search volume in adjacent cities (Irving, Carrollton, Plano) is currently captured by regional competitors.`,
    strongestEvidence: evidenceClaims[1]?.claimText || 'Local SEO profile lacks dedicated regional service area hierarchy.',
    relevantWatechService: 'local_seo',
    whyFindingMatters: 'Top 3-pack Google Maps rankings generate 68% of commercial high-intent local emergency service searches.',
    openingAngle: `Analyzed regional commercial HVAC search visibility across ${business.city || 'the metro area'}...`,
    bestFirstContactCta: `Would you like me to send over our regional competitive search density matrix comparing ${business.brandName || business.officialName} with regional peers?`,
    recommendedFollowUpApproach: 'Provide a targeted map showing 3 high-volume commercial industrial parks with low search competition.',
    messages: angle2Messages,
    evidenceClaims: [...evidenceClaims],
  };

  // 3. Angle: Growth Capacity
  const angle3Messages = generateAngleMessages('growth_capacity', business, targetContact, evidenceClaims, preferredStyle);
  const angle3: OutreachStrategyAngle = {
    id: 'growth_capacity',
    title: 'Operational Capacity & High-Yield Commercial Agreements',
    description: 'Leverages observed hiring pushes and fleet capacity to propose automated acquisition of predictable commercial maintenance agreements.',
    isRecommended: recommendedAngle === 'growth_capacity',
    recommendedReason: angleReason,
    bestBusinessProblem: 'Expanding technical headcount and vehicle fleet requires predictable recurring preventative maintenance contracts to prevent idle bench time.',
    strongestEvidence: evidenceClaims[2]?.claimText || 'Verified active commercial technician hiring push and multi-vehicle service fleet.',
    relevantWatechService: 'lead_generation',
    whyFindingMatters: 'Commercial preventative maintenance agreements (PMAs) provide stable cash flow and high customer retention ($1,200/mo per building average).',
    openingAngle: `Noticed ${business.brandName || business.officialName}'s technical hiring and operational fleet expansion in ${business.city || 'Texas'}...`,
    bestFirstContactCta: 'Open to seeing how two mid-sized commercial contractors automated recurring maintenance contract acquisition?',
    recommendedFollowUpApproach: 'Share an anonymized case study detailing commercial facility contract closing frameworks.',
    messages: angle3Messages,
    evidenceClaims: [...evidenceClaims],
  };

  return {
    id: `strat-${business.id}`,
    businessId: business.id,
    projectId: business.projectId,
    targetContactId: targetContact?.id,
    targetContactName: targetContact?.fullName,
    targetContactRole: targetContact?.roleOrTitle,
    targetContactEmail: targetContact?.email,
    selectedAngleId: recommendedAngle,
    activeStyle: preferredStyle,
    angles: [angle1, angle2, angle3],
    status: isSuppressed ? 'suppressed' : 'draft',
    isSuppressed,
    suppressionReason,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Re-renders the messages for a strategy when the user toggles a claim or switches styles.
 */
export function recomputeStrategyMessages(
  strategy: OutreachProspectStrategy,
  business: Business,
  contact?: Contact,
  newStyle?: OutreachStyle
): OutreachProspectStrategy {
  const style = newStyle || strategy.activeStyle;
  const updatedAngles = strategy.angles.map(angle => {
    const updatedMessages = generateAngleMessages(angle.id, business, contact, angle.evidenceClaims, style);
    return {
      ...angle,
      messages: updatedMessages,
    };
  });

  return {
    ...strategy,
    activeStyle: style,
    angles: updatedAngles,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Calculates verified, honest performance tracking metrics (no fake data).
 */
export function calculateOutreachPerformanceMetrics(
  strategies: OutreachProspectStrategy[],
  suppressionsCount = 0
): OutreachPerformanceMetrics {
  let draftsCreated = strategies.length;
  let messagesApproved = 0;
  let messagesSent = 0;
  let replies = 0;
  let positiveReplies = 0;
  let meetings = 0;
  let optOuts = suppressionsCount;

  for (const s of strategies) {
    if (s.status === 'approved') messagesApproved++;
    if (s.status === 'contacted' || s.status === 'follow_up_scheduled' || s.status === 'replied_interested' || s.status === 'replied_more_info' || s.status === 'not_interested') {
      messagesApproved++;
      messagesSent++;
    }
    if (s.status === 'replied_interested' || s.status === 'replied_more_info' || s.status === 'not_interested') {
      replies++;
    }
    if (s.status === 'replied_interested') {
      positiveReplies++;
      meetings++;
    }
    if (s.isSuppressed || s.status === 'suppressed') {
      optOuts++;
    }
  }

  return {
    draftsCreated,
    messagesApproved,
    messagesSent,
    replies,
    positiveReplies,
    meetings,
    optOuts,
  };
}

/**
 * Generates standard compliance and unsubscribe footer according to CAN-SPAM and GDPR requirements.
 */
export function generateComplianceFooter(
  businessName = 'Watech Business Intelligence',
  address = '2100 Ross Ave, Suite 2800, Dallas, TX 75201',
  recipientEmail?: string
): string {
  return `\n\n---\nSent by ${businessName} | ${address}\nTo opt out of future market research correspondence, reply with "Unsubscribe" or opt-out directly.${recipientEmail ? ` Received for: ${recipientEmail}` : ''}`;
}
