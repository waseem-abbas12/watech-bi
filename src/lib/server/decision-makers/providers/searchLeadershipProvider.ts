import type { DecisionMakerCandidate, DecisionMakerProvider } from '../types';
import { normalizePersonName, classifySeniorityTier, classifyEmail } from '../normalization';
import { calculateDecisionMakerConfidenceScore } from '../scoring';

export class SearchLeadershipProvider implements DecisionMakerProvider {
  readonly name = 'search_leadership';
  readonly displayName = 'Authorized Search Leadership Provider';

  isConfigured(): boolean {
    const googleKey = process.env.GOOGLE_CSE_KEY?.trim();
    const googleCx = process.env.GOOGLE_CSE_CX?.trim();
    const bingKey = process.env.BING_SEARCH_API_KEY?.trim();
    return Boolean((googleKey && googleCx) || bingKey);
  }

  async discover(params: {
    businessId: string;
    projectId: string;
    businessName: string;
    websiteUrl?: string;
    domain?: string;
    city?: string;
    state?: string;
    country?: string;
    companyNumber?: string;
    jurisdictionCode?: string;
  }): Promise<DecisionMakerCandidate[]> {
    if (!this.isConfigured()) {
      return [];
    }

    const { businessId, projectId, businessName, domain, city } = params;
    const cleanDomain = domain?.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').trim();

    if (!cleanDomain && !businessName) {
      return [];
    }

    const candidates: DecisionMakerCandidate[] = [];
    const now = new Date().toISOString();

    try {
      const googleKey = process.env.GOOGLE_CSE_KEY?.trim();
      const googleCx = process.env.GOOGLE_CSE_CX?.trim();
      const bingKey = process.env.BING_SEARCH_API_KEY?.trim();

      const searchQuery = cleanDomain
        ? `site:${cleanDomain} (founder OR owner OR ceo OR president OR "managing director" OR "operations director")`
        : `"${businessName}" "${city || ''}" (founder OR owner OR ceo OR "managing director")`;

      let items: Array<{ title: string; snippet: string; link: string }> = [];

      if (googleKey && googleCx) {
        const url = new URL('https://www.googleapis.com/customsearch/v1');
        url.searchParams.set('key', googleKey);
        url.searchParams.set('cx', googleCx);
        url.searchParams.set('q', searchQuery);
        url.searchParams.set('num', '5');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);

        const res = await fetch(url.toString(), {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          items = (data.items || []).map((it: any) => ({
            title: String(it.title || ''),
            snippet: String(it.snippet || ''),
            link: String(it.link || ''),
          }));
        }
      } else if (bingKey) {
        const url = new URL('https://api.bing.microsoft.com/v7.0/search');
        url.searchParams.set('q', searchQuery);
        url.searchParams.set('count', '5');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);

        const res = await fetch(url.toString(), {
          headers: { 'Ocp-Apim-Subscription-Key': bingKey },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          items = (data.webPages?.value || []).map((it: any) => ({
            title: String(it.name || ''),
            snippet: String(it.snippet || ''),
            link: String(it.url || ''),
          }));
        }
      }

      // Extract leadership mentions from official search snippets
      // Common patterns: "Jane Doe, CEO", "Founder & Owner John Smith", "Dr. Alan Grant - Managing Director"
      const leadPatterns = [
        /(?:founder|co-founder|owner|ceo|president|managing\s+director|director)\s*[:–-]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\s*[,–-]\s*(founder|co-founder|owner|ceo|president|managing\s+director|director\s+of\s+\w+|general\s+manager)/i,
        /(?:led\s+by|founded\s+by|owned\s+by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i,
      ];

      for (const item of items) {
        const combinedText = `${item.title} . ${item.snippet}`;

        for (const pattern of leadPatterns) {
          const match = combinedText.match(pattern);
          if (match) {
            let extractedName = '';
            let extractedRole = 'Executive Officer';

            if (pattern === leadPatterns[0]) {
              extractedName = match[1];
              const roleMatch = combinedText.match(/\b(founder|co-founder|owner|ceo|president|managing\s+director|director)\b/i);
              if (roleMatch) extractedRole = roleMatch[0];
            } else if (pattern === leadPatterns[1]) {
              extractedName = match[1];
              extractedRole = match[2];
            } else if (pattern === leadPatterns[2]) {
              extractedName = match[1];
              extractedRole = 'Founder / Owner';
            }

            const cleanName = normalizePersonName(extractedName);
            if (!cleanName || cleanName.split(' ').length < 2) continue;

            // Check if email is explicitly mentioned in the official search snippet
            const emailMatch = combinedText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            const explicitEmail = emailMatch ? emailMatch[0].toLowerCase() : undefined;
            const emailCls = classifyEmail(explicitEmail, true);

            const { tier, isDecisionMaker, normalizedTitle } = classifySeniorityTier(extractedRole);

            const score = calculateDecisionMakerConfidenceScore({
              fullName: cleanName,
              roleOrTitle: extractedRole,
              sourceType: 'search_intelligence',
              companyDomain: cleanDomain,
              email: explicitEmail,
              isCurrentOfficer: true,
              corroboratingSourcesCount: 1,
            });

            candidates.push({
              id: `dm_srch_${businessId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              businessId,
              projectId,
              fullName: cleanName,
              roleOrTitle: extractedRole,
              normalizedTitle,
              decisionMakerTier: tier,
              isDecisionMaker,
              company: businessName,
              email: explicitEmail,
              emailClassification: emailCls,
              sourceName: 'Search Engine API',
              sourceUrl: item.link,
              corroboratingSources: ['Search Engine API Index'],
              discoveryTimestamp: now,
              verificationStatus: score.verificationStatus,
              confidence: score.confidence,
              confidenceBreakdown: score.breakdown,
              notes: `Identified via indexed public presence on ${item.link}`,
              isCurrent: true,
            });
            break; // Stop after first match per search item
          }
        }
      }
    } catch {
      // Graceful error handling for search timeouts or network restrictions
    }

    return candidates;
  }
}
