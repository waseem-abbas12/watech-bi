import type {
  BusinessDiscoveryProvider,
  DiscoveryParams,
  DiscoveryResult,
  DiscoveredBusinessRaw,
  DiscoverySourceType,
} from './types';
import { normalizeDomain } from './discoveryFilter';

export class SearchEngineDiscoveryProvider implements BusinessDiscoveryProvider {
  readonly name = 'search_engine';
  readonly displayName = 'Authorized Search Engine API';
  readonly sourceType: DiscoverySourceType = 'authorized_search_api';

  isConfigured(): boolean {
    const googleKey = process.env.GOOGLE_CSE_KEY?.trim();
    const googleCx = process.env.GOOGLE_CSE_CX?.trim();
    const bingKey = process.env.BING_SEARCH_API_KEY?.trim();
    return Boolean((googleKey && googleCx) || bingKey);
  }

  async search(params: DiscoveryParams): Promise<DiscoveryResult> {
    const startTime = Date.now();
    const { industry, niche, city, state, country, count = 25 } = params;
    const locationParts = [city, state, country].filter(Boolean).join(', ');
    const query = `"${niche || industry}" "${city || ''}" ${country || ''} official website`.trim();

    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.name,
        sourceType: this.sourceType,
        query,
        count: 0,
        businesses: [],
        errorCode: 'PROVIDER_NOT_CONFIGURED',
        error: 'Search Engine API is not configured. Add GOOGLE_CSE_KEY and GOOGLE_CSE_CX (or BING_SEARCH_API_KEY) to environment variables.',
        help: 'Configure a Google Programmable Search Engine or Azure Bing Web Search API for authorized search results.',
        durationMs: Date.now() - startTime,
      };
    }

    const targetCount = Math.max(1, Math.min(count, 100));
    const googleKey = process.env.GOOGLE_CSE_KEY?.trim();
    const googleCx = process.env.GOOGLE_CSE_CX?.trim();

    try {
      if (googleKey && googleCx) {
        return await this.searchGoogleCse(query, googleKey, googleCx, targetCount, params, startTime);
      } else {
        const bingKey = process.env.BING_SEARCH_API_KEY!.trim();
        return await this.searchBing(query, bingKey, targetCount, params, startTime);
      }
    } catch (err: any) {
      const isTimeout = err?.name === 'AbortError';
      return {
        success: false,
        provider: this.name,
        sourceType: this.sourceType,
        query,
        count: 0,
        businesses: [],
        errorCode: isTimeout ? 'TIMEOUT' : 'REQUEST_FAILED',
        error: isTimeout ? 'Search Engine API request timed out' : `Search Engine API error: ${err.message}`,
        durationMs: Date.now() - startTime,
      };
    }
  }

  private async searchGoogleCse(
    query: string,
    key: string,
    cx: string,
    targetCount: number,
    params: DiscoveryParams,
    startTime: number
  ): Promise<DiscoveryResult> {
    const candidates: DiscoveredBusinessRaw[] = [];
    let startIndex = 1;

    while (candidates.length < targetCount && startIndex <= 31) {
      const url = new URL('https://www.googleapis.com/customsearch/v1');
      url.searchParams.set('key', key);
      url.searchParams.set('cx', cx);
      url.searchParams.set('q', query);
      url.searchParams.set('num', Math.min(targetCount - candidates.length, 10).toString());
      url.searchParams.set('start', startIndex.toString());

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(url.toString(), {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        if (candidates.length > 0) break;
        return {
          success: false,
          provider: this.name,
          sourceType: this.sourceType,
          query,
          count: 0,
          businesses: [],
          errorCode: res.status === 429 ? 'RATE_LIMITED' : 'REQUEST_FAILED',
          error: `Google Custom Search returned HTTP ${res.status}`,
          durationMs: Date.now() - startTime,
        };
      }

      const data = await res.json();
      const items: any[] = data.items || [];
      if (items.length === 0) break;

      for (const item of items) {
        const link = item.link;
        const domain = normalizeDomain(link);
        if (!domain) continue;

        // Clean company name from title
        let name = (item.title || '').split(/[-|–:]/)[0].trim();
        if (!name || name.length < 3) name = domain.split('.')[0].toUpperCase();

        candidates.push({
          providerId: `cse_${domain}`,
          providerName: this.name,
          sourceName: this.displayName,
          sourceUrl: link,
          sourceUrls: [link],
          name,
          websiteUrl: link,
          domain,
          city: params.city,
          state: params.state,
          country: params.country,
          primaryType: params.industry,
          confidenceIndicator: 75,
          verificationStatus: 'estimated',
        });

        if (candidates.length >= targetCount) break;
      }

      startIndex += 10;
    }

    return {
      success: true,
      provider: this.name,
      sourceType: this.sourceType,
      query,
      count: candidates.length,
      businesses: candidates,
      durationMs: Date.now() - startTime,
    };
  }

  private async searchBing(
    query: string,
    key: string,
    targetCount: number,
    params: DiscoveryParams,
    startTime: number
  ): Promise<DiscoveryResult> {
    const url = new URL('https://api.bing.microsoft.com/v7.0/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', Math.min(targetCount, 50).toString());
    url.searchParams.set('responseFilter', 'Webpages');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Ocp-Apim-Subscription-Key': key,
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        success: false,
        provider: this.name,
        sourceType: this.sourceType,
        query,
        count: 0,
        businesses: [],
        errorCode: res.status === 429 ? 'RATE_LIMITED' : 'REQUEST_FAILED',
        error: `Bing Search API returned HTTP ${res.status}`,
        durationMs: Date.now() - startTime,
      };
    }

    const data = await res.json();
    const webPages = data.webPages?.value || [];
    const candidates: DiscoveredBusinessRaw[] = [];

    for (const item of webPages) {
      const link = item.url;
      const domain = normalizeDomain(link);
      if (!domain) continue;

      let name = (item.name || '').split(/[-|–:]/)[0].trim();
      if (!name || name.length < 3) name = domain.split('.')[0].toUpperCase();

      candidates.push({
        providerId: `bing_${domain}`,
        providerName: this.name,
        sourceName: this.displayName,
        sourceUrl: link,
        sourceUrls: [link],
        name,
        websiteUrl: link,
        domain,
        city: params.city,
        state: params.state,
        country: params.country,
        primaryType: params.industry,
        confidenceIndicator: 75,
        verificationStatus: 'estimated',
      });

      if (candidates.length >= targetCount) break;
    }

    return {
      success: true,
      provider: this.name,
      sourceType: this.sourceType,
      query,
      count: candidates.length,
      businesses: candidates,
      durationMs: Date.now() - startTime,
    };
  }
}

export const searchEngineProvider = new SearchEngineDiscoveryProvider();
