import { safeFetch } from '../../ssrfGuard';
import type { DecisionMakerProvider, DecisionMakerCandidate } from '../types';
import {
  normalizePersonName,
  classifySeniorityTier,
  classifyEmail,
} from '../normalization';
import { calculateDecisionMakerConfidenceScore } from '../scoring';

export class WebsiteLeadershipProvider implements DecisionMakerProvider {
  readonly name = 'website_leadership';
  readonly displayName = 'Official Website Leadership Inspection';

  isConfigured(): boolean {
    return true; // Direct SSRF-safe HTTP inspection
  }

  async discover(params: {
    businessId: string;
    projectId: string;
    businessName: string;
    websiteUrl?: string;
    domain?: string;
    subpages?: {
      aboutPageUrl?: string;
      teamPageUrl?: string;
      contactPageUrl?: string;
    };
  }): Promise<DecisionMakerCandidate[]> {
    const { businessId, projectId, businessName, websiteUrl, subpages } = params;
    if (!websiteUrl) return [];

    const candidates: DecisionMakerCandidate[] = [];
    const inspectedUrls = new Set<string>();

    // Priority targets: Team page > About page > Homepage > Contact page
    const urlsToInspect = [
      subpages?.teamPageUrl,
      subpages?.aboutPageUrl,
      websiteUrl,
      subpages?.contactPageUrl,
    ].filter(Boolean) as string[];

    for (const targetUrl of urlsToInspect) {
      if (inspectedUrls.has(targetUrl)) continue;
      inspectedUrls.add(targetUrl);

      try {
        const res = await safeFetch(targetUrl, {
          timeoutMs: 6000,
          maxRedirects: 2,
          maxBytes: 1.5 * 1024 * 1024,
        });

        if (!res.ok || !res.text) continue;
        const html = res.text;

        // 1. JSON-LD schema.org Person / Founder extraction
        const schemaPersons = this.extractFromSchema(html, businessName);
        for (const p of schemaPersons) {
          const cand = this.buildCandidate({
            businessId,
            projectId,
            businessName,
            fullName: p.name,
            roleOrTitle: p.jobTitle || 'Executive Officer',
            email: p.email,
            phone: p.phone,
            sourceUrl: targetUrl,
            companyDomain: params.domain,
          });
          if (cand) candidates.push(cand);
        }

        // 2. Structured HTML Team Member Cards
        const cardPersons = this.extractFromHtmlCards(html, businessName);
        for (const p of cardPersons) {
          const cand = this.buildCandidate({
            businessId,
            projectId,
            businessName,
            fullName: p.name,
            roleOrTitle: p.title,
            email: p.email,
            phone: p.phone,
            sourceUrl: targetUrl,
            companyDomain: params.domain,
          });
          if (cand) candidates.push(cand);
        }

        // 3. Bio Sentences (e.g. "Founded in 2010 by John Doe, Owner...")
        const bioPersons = this.extractFromBioText(html, businessName);
        for (const p of bioPersons) {
          const cand = this.buildCandidate({
            businessId,
            projectId,
            businessName,
            fullName: p.name,
            roleOrTitle: p.title,
            sourceUrl: targetUrl,
            companyDomain: params.domain,
          });
          if (cand) candidates.push(cand);
        }
      } catch {
        // Safe timeout / network drop fallback
      }
    }

    return candidates;
  }

  private extractFromSchema(html: string, businessName: string): Array<{ name: string; jobTitle?: string; email?: string; phone?: string }> {
    const results: Array<{ name: string; jobTitle?: string; email?: string; phone?: string }> = [];
    const scriptTags = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];

    for (const tag of scriptTags) {
      try {
        const content = tag.replace(/<script[^>]*>|<\/script>/gi, '').trim();
        const parsed = JSON.parse(content);
        const items = Array.isArray(parsed) ? parsed : [parsed, ...(parsed['@graph'] || [])];

        for (const item of items) {
          if (!item) continue;
          if (item['@type'] === 'Person' && item.name) {
            results.push({
              name: String(item.name).trim(),
              jobTitle: item.jobTitle || item.roleName,
              email: item.email,
              phone: item.telephone,
            });
          }
          if (item.founder) {
            const founders = Array.isArray(item.founder) ? item.founder : [item.founder];
            for (const f of founders) {
              const name = typeof f === 'string' ? f : f.name;
              if (name) {
                results.push({
                  name: String(name).trim(),
                  jobTitle: 'Founder',
                  email: f.email,
                  phone: f.telephone,
                });
              }
            }
          }
        }
      } catch {
        // Ignored malformed JSON-LD
      }
    }

    return results;
  }

  private extractFromHtmlCards(html: string, businessName: string): Array<{ name: string; title: string; email?: string; phone?: string }> {
    const results: Array<{ name: string; title: string; email?: string; phone?: string }> = [];

    // Pattern for common team/leadership member markup
    // e.g. <div class="member"><h3>First Last</h3><p class="role">President & CEO</p></div>
    const cardRegex = /<(?:div|li|article)\b[^>]*?(?:class|id)=["'][^"']*(?:team|member|leader|executive|staff|person|bio)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|li|article)>/gi;
    let cardMatch: RegExpExecArray | null;

    while ((cardMatch = cardRegex.exec(html)) !== null) {
      const cardHtml = cardMatch[1];
      const headingMatch = cardHtml.match(/<(?:h2|h3|h4|strong|b)\b[^>]*>([^<]+)<\/(?:h2|h3|h4|strong|b)>/i);
      if (!headingMatch) continue;

      const rawName = headingMatch[1].trim();
      const norm = normalizePersonName(rawName);
      if (!norm || norm.split(' ').length < 2 || norm.split(' ').length > 4) continue;

      // Extract role/title
      const roleMatch = cardHtml.match(/<(?:p|span|div)\b[^>]*?(?:class|id)=["'][^"']*(?:title|role|position|designation)[^"']*["'][^>]*>([^<]+)<\/(?:p|span|div)>/i);
      const title = roleMatch ? roleMatch[1].trim() : 'Executive Officer';

      // Direct mailto
      const mailtoMatch = cardHtml.match(/href=["']mailto:([^"']+)["']/i);
      const email = mailtoMatch ? mailtoMatch[1].trim() : undefined;

      // Direct tel
      const telMatch = cardHtml.match(/href=["']tel:([^"']+)["']/i);
      const phone = telMatch ? telMatch[1].replace(/href=["']tel:/i, '').replace(/["']/g, '').trim() : undefined;

      results.push({
        name: norm,
        title,
        email,
        phone,
      });

      if (results.length >= 6) break;
    }

    return results;
  }

  private extractFromBioText(html: string, businessName: string): Array<{ name: string; title: string }> {
    const results: Array<{ name: string; title: string }> = [];
    const text = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');

    const bioPatterns = [
      /\b(?:founded|started|established)\s+(?:in\s+\d{4}\s+)?by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})(?:,\s*(owner|founder|ceo|president))?/i,
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}),\s*(?:the\s+)?(owner|founder|ceo|president|managing director)\b/i,
      /\b(owner|founder|ceo|president|managing director)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/i,
    ];

    for (const pattern of bioPatterns) {
      const match = pattern.exec(text);
      if (match) {
        let name = '';
        let title = 'Business Owner';

        if (pattern.source.startsWith('\\b(owner|founder')) {
          title = match[1];
          name = match[2];
        } else {
          name = match[1];
          title = match[2] || 'Founder';
        }

        const norm = normalizePersonName(name);
        if (norm && norm.split(' ').length >= 2) {
          results.push({
            name: norm,
            title,
          });
          break;
        }
      }
    }

    return results;
  }

  private buildCandidate(params: {
    businessId: string;
    projectId: string;
    businessName: string;
    fullName: string;
    roleOrTitle: string;
    email?: string;
    phone?: string;
    sourceUrl: string;
    companyDomain?: string;
  }): DecisionMakerCandidate | null {
    const normName = normalizePersonName(params.fullName);
    if (!normName || normName.split(' ').length < 2) return null;

    const classification = classifySeniorityTier(params.roleOrTitle);
    const emailClass = classifyEmail(params.email, normName, true);

    const scoreOutput = calculateDecisionMakerConfidenceScore({
      fullName: normName,
      roleOrTitle: params.roleOrTitle,
      sourceType: 'official_website',
      companyDomain: params.companyDomain,
      email: params.email,
      isCurrentOfficer: true,
      corroboratingSourcesCount: 1,
    });

    const now = new Date().toISOString();
    return {
      id: `dm-${params.businessId}-${normName.toLowerCase().replace(/[^a-z]/g, '')}`,
      businessId: params.businessId,
      projectId: params.projectId,
      fullName: normName,
      roleOrTitle: params.roleOrTitle,
      normalizedTitle: classification.normalizedTitle,
      decisionMakerTier: classification.tier,
      isDecisionMaker: classification.isDecisionMaker,
      company: params.businessName,
      email: params.email,
      emailClassification: emailClass,
      phone: params.phone,
      sourceLeadershipPageUrl: params.sourceUrl,
      sourceName: this.displayName,
      sourceUrl: params.sourceUrl,
      corroboratingSources: [this.displayName],
      discoveryTimestamp: now,
      verificationStatus: scoreOutput.verificationStatus,
      confidence: scoreOutput.confidence,
      confidenceBreakdown: scoreOutput.breakdown,
      isCurrent: true,
    };
  }
}

export const websiteLeadershipProvider = new WebsiteLeadershipProvider();
