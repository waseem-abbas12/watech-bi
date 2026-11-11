import type {
  BusinessDiscoveryProvider,
  DiscoveryParams,
  DiscoveryResult,
  DiscoveredBusinessRaw,
  DiscoverySourceType,
} from './types';

// Map country names to OpenCorporates jurisdiction codes
const JURISDICTION_MAP: Record<string, string> = {
  pakistan: 'pk',
  pk: 'pk',
  'united kingdom': 'gb',
  uk: 'gb',
  gb: 'gb',
  canada: 'ca',
  ca: 'ca',
  'united states': 'us',
  usa: 'us',
  us: 'us',
  australia: 'au',
  au: 'au',
  germany: 'de',
  de: 'de',
  france: 'fr',
  fr: 'fr',
  uae: 'ae',
  'united arab emirates': 'ae',
  saudi: 'sa',
  'saudi arabia': 'sa',
};

export class OpenCorporatesDiscoveryProvider implements BusinessDiscoveryProvider {
  readonly name = 'opencorporates';
  readonly displayName = 'OpenCorporates Global Registry';
  readonly sourceType: DiscoverySourceType = 'public_corporate_registry';

  isConfigured(): boolean {
    // OpenCorporates provides public access for registered queries; optionally supports API key for higher rate quotas
    return true;
  }

  async search(params: DiscoveryParams): Promise<DiscoveryResult> {
    const startTime = Date.now();
    const { industry, niche, count = 25 } = params;
    const searchTerm = [niche || industry, params.city].filter(Boolean).join(' ').trim();
    const query = `${searchTerm}${params.country ? ` in ${params.country}` : ''}`;

    const countryKey = (params.country || '').trim().toLowerCase();
    const jurisdiction = JURISDICTION_MAP[countryKey];

    const targetCount = Math.max(1, Math.min(count, 100));
    const apiKey = process.env.OPENCORPORATES_API_KEY?.trim();

    try {
      const url = new URL('https://api.opencorporates.com/v1/companies/search');
      url.searchParams.set('q', searchTerm);
      url.searchParams.set('per_page', Math.min(targetCount, 30).toString());
      if (jurisdiction) {
        url.searchParams.set('jurisdiction_code', jurisdiction);
      }
      if (apiKey) {
        url.searchParams.set('api_token', apiKey);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'WATECH-BI-DiscoveryEngine/1.0 (Business Intelligence Platform)',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return {
            success: false,
            provider: this.name,
            sourceType: this.sourceType,
            query,
            count: 0,
            businesses: [],
            errorCode: 'RATE_LIMITED',
            error: 'OpenCorporates rate limit reached. Add OPENCORPORATES_API_KEY for expanded quotas.',
            durationMs: Date.now() - startTime,
          };
        }
        return {
          success: false,
          provider: this.name,
          sourceType: this.sourceType,
          query,
          count: 0,
          businesses: [],
          errorCode: 'REQUEST_FAILED',
          error: `OpenCorporates API returned HTTP ${status}`,
          durationMs: Date.now() - startTime,
        };
      }

      const data = await response.json();
      const rawCompanies: any[] = data.results?.companies || [];

      if (rawCompanies.length === 0) {
        return {
          success: true,
          provider: this.name,
          sourceType: this.sourceType,
          query,
          count: 0,
          businesses: [],
          errorCode: 'ZERO_RESULTS',
          durationMs: Date.now() - startTime,
        };
      }

      const candidates: DiscoveredBusinessRaw[] = [];

      for (const item of rawCompanies) {
        const company = item.company;
        if (!company || !company.name) continue;

        // Skip dissolved or inactive companies
        const currentStatus = (company.current_status || '').toLowerCase();
        if (currentStatus.includes('dissolved') || currentStatus.includes('inactive') || currentStatus.includes('struck off')) {
          continue;
        }

        const addressParts = (company.registered_address_in_full || '').split(',').map((s: string) => s.trim());
        const extractedCity = params.city || (addressParts.length >= 2 ? addressParts[addressParts.length - 2] : undefined);
        const extractedCountry = params.country || company.jurisdiction_code?.toUpperCase();

        const candidate: DiscoveredBusinessRaw = {
          providerId: `oc_${company.company_number || company.name}`,
          providerName: this.name,
          sourceName: this.displayName,
          sourceUrl: company.opencorporates_url,
          sourceUrls: company.opencorporates_url ? [company.opencorporates_url] : [],
          name: company.name,
          officialName: company.name,
          formattedAddress: company.registered_address_in_full || undefined,
          streetAddress: addressParts[0] || undefined,
          city: extractedCity,
          state: params.state || undefined,
          country: extractedCountry,
          companyNumber: company.company_number,
          jurisdictionCode: company.jurisdiction_code,
          incorporationDate: company.incorporation_date,
          businessStatus: company.current_status || 'active',
          primaryType: company.company_type || industry,
          confidenceIndicator: 80,
          verificationStatus: 'verified',
        };

        candidates.push(candidate);
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
        error: isTimeout ? 'OpenCorporates request timed out (12s limit)' : `OpenCorporates error: ${err.message}`,
        durationMs: Date.now() - startTime,
      };
    }
  }
}

export const openCorporatesProvider = new OpenCorporatesDiscoveryProvider();
