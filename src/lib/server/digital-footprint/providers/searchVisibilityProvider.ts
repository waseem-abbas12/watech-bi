import type { FootprintFinding } from '../types';
import type { SocialProfiles } from '@/types';
import { canonicalizeUrl, verifySocialProfileRelevance } from '../verification';

export interface SearchVisibilityResult {
  isConfigured: boolean;
  indexedPagesCount?: number;
  publicMentionsCount?: number;
  discoveredSocialProfiles: SocialProfiles;
  findings: FootprintFinding[];
  sourceUrls: string[];
}

export class SearchVisibilityProvider {
  readonly name = 'search_visibility';
  readonly displayName = 'Authorized Search Visibility Provider';

  isConfigured(): boolean {
    const googleKey = process.env.GOOGLE_CSE_KEY?.trim();
    const googleCx = process.env.GOOGLE_CSE_CX?.trim();
    const bingKey = process.env.BING_SEARCH_API_KEY?.trim();
    return Boolean((googleKey && googleCx) || bingKey);
  }

  async discoverSearchFootprint(
    businessId: string,
    businessName: string,
    domain?: string,
    city?: string
  ): Promise<SearchVisibilityResult> {
    const findings: FootprintFinding[] = [];
    const sourceUrls: string[] = [];
    const discoveredSocialProfiles: SocialProfiles = {};
    const now = new Date().toISOString();

    if (!this.isConfigured()) {
      return {
        isConfigured: false,
        discoveredSocialProfiles,
        findings: [
          {
            businessId,
            findingType: 'search_visibility_api',
            extractedValue: 'UNCONFIGURED',
            sourceName: this.displayName,
            discoveryTimestamp: now,
            verificationStatus: 'NOT_CHECKED',
            confidenceScore: 0,
            limitation: 'Search Engine API keys (GOOGLE_CSE_KEY or BING_SEARCH_API_KEY) not configured',
          },
        ],
        sourceUrls,
      };
    }

    const cleanDomain = domain?.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').trim();
    if (!cleanDomain && !businessName) {
      return {
        isConfigured: true,
        discoveredSocialProfiles,
        findings,
        sourceUrls,
      };
    }

    try {
      const googleKey = process.env.GOOGLE_CSE_KEY?.trim();
      const googleCx = process.env.GOOGLE_CSE_CX?.trim();

      // Query official social profiles and indexed presence via Search API
      const searchQuery = cleanDomain
        ? `site:linkedin.com/company OR site:facebook.com OR site:instagram.com "${businessName}" "${cleanDomain}"`
        : `"${businessName}" "${city || ''}" official profile`;

      if (googleKey && googleCx) {
        const url = new URL('https://www.googleapis.com/customsearch/v1');
        url.searchParams.set('key', googleKey);
        url.searchParams.set('cx', googleCx);
        url.searchParams.set('q', searchQuery);
        url.searchParams.set('num', '5');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(url.toString(), {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const items: any[] = data.items || [];
          const totalResults = Number(data.searchInformation?.totalResults) || items.length;

          findings.push({
            businessId,
            findingType: 'search_visibility_presence',
            extractedValue: `${totalResults} indexed search results`,
            sourceName: this.displayName,
            discoveryTimestamp: now,
            verificationStatus: 'VERIFIED',
            confidenceScore: 85,
          });

          for (const item of items) {
            const link = canonicalizeUrl(item.link);
            if (!link) continue;
            sourceUrls.push(link);

            if (link.includes('linkedin.com/company/')) {
              const rel = verifySocialProfileRelevance(link, businessName, cleanDomain);
              if (rel.isVerified && !discoveredSocialProfiles.linkedin) {
                discoveredSocialProfiles.linkedin = link;
              }
            } else if (link.includes('facebook.com/')) {
              const rel = verifySocialProfileRelevance(link, businessName, cleanDomain);
              if (rel.isVerified && !discoveredSocialProfiles.facebook) {
                discoveredSocialProfiles.facebook = link;
              }
            } else if (link.includes('instagram.com/')) {
              const rel = verifySocialProfileRelevance(link, businessName, cleanDomain);
              if (rel.isVerified && !discoveredSocialProfiles.instagram) {
                discoveredSocialProfiles.instagram = link;
              }
            }
          }

          return {
            isConfigured: true,
            indexedPagesCount: totalResults,
            discoveredSocialProfiles,
            findings,
            sourceUrls: Array.from(new Set(sourceUrls)),
          };
        }
      }

      return {
        isConfigured: true,
        discoveredSocialProfiles,
        findings,
        sourceUrls,
      };
    } catch (err: any) {
      findings.push({
        businessId,
        findingType: 'search_visibility_error',
        extractedValue: 'ERROR',
        sourceName: this.displayName,
        discoveryTimestamp: now,
        verificationStatus: 'UNAVAILABLE',
        confidenceScore: 0,
        limitation: err.message || 'Search visibility request failed',
      });

      return {
        isConfigured: true,
        discoveredSocialProfiles,
        findings,
        sourceUrls,
      };
    }
  }
}

export const searchVisibilityProvider = new SearchVisibilityProvider();
