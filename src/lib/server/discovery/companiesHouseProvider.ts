import type {
  BusinessDiscoveryProvider,
  DiscoveryParams,
  DiscoveryResult,
  DiscoveredBusinessRaw,
  DiscoverySourceType,
} from './types';

export class CompaniesHouseDiscoveryProvider implements BusinessDiscoveryProvider {
  readonly name = 'companies_house';
  readonly displayName = 'UK Companies House Registry';
  readonly sourceType: DiscoverySourceType = 'official_government_register';

  isConfigured(): boolean {
    const key = process.env.COMPANIES_HOUSE_API_KEY?.trim();
    return Boolean(key && key.length > 5);
  }

  async search(params: DiscoveryParams): Promise<DiscoveryResult> {
    const startTime = Date.now();
    const countryKey = (params.country || '').trim().toLowerCase();
    const isUk = countryKey === 'uk' || countryKey === 'united kingdom' || countryKey === 'gb' || countryKey === 'great britain' || countryKey === 'england' || countryKey === 'scotland';

    const { industry, niche, city, count = 25 } = params;
    const query = `${niche || industry} in ${city || 'UK'}`;

    // If target country is explicitly non-UK, return zero results gracefully without error
    if (params.country && !isUk) {
      return {
        success: true,
        provider: this.name,
        sourceType: this.sourceType,
        query,
        count: 0,
        businesses: [],
        durationMs: 0,
      };
    }

    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.name,
        sourceType: this.sourceType,
        query,
        count: 0,
        businesses: [],
        errorCode: 'PROVIDER_NOT_CONFIGURED',
        error: 'UK Companies House API key is not configured. Add COMPANIES_HOUSE_API_KEY to your environment variables.',
        help: 'Obtain a free authorized API key directly from UK Companies House Developer Hub: https://developer.company-information.service.gov.uk/',
        durationMs: Date.now() - startTime,
      };
    }

    const apiKey = process.env.COMPANIES_HOUSE_API_KEY!.trim();
    const targetCount = Math.max(1, Math.min(count, 100));

    try {
      const url = new URL('https://api.company-information.service.gov.uk/advanced-search/companies');
      url.searchParams.set('company_name_includes', niche || industry);
      if (city) {
        url.searchParams.set('location', city);
      }
      url.searchParams.set('company_status', 'active');
      url.searchParams.set('size', Math.min(targetCount, 50).toString());

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      // Companies House uses Basic Auth with the API key as the username and empty password
      const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;

      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const status = response.status;
        return {
          success: false,
          provider: this.name,
          sourceType: this.sourceType,
          query,
          count: 0,
          businesses: [],
          errorCode: status === 429 ? 'RATE_LIMITED' : 'REQUEST_FAILED',
          error: `Companies House API error: HTTP ${status}`,
          durationMs: Date.now() - startTime,
        };
      }

      const data = await response.json();
      const items: any[] = data.items || [];

      if (items.length === 0) {
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

      for (const item of items) {
        if (!item.company_name) continue;

        const address = item.registered_office_address || {};
        const fullAddress = [
          address.address_line_1,
          address.address_line_2,
          address.locality || city,
          address.postal_code,
          'United Kingdom',
        ]
          .filter(Boolean)
          .join(', ');

        const candidate: DiscoveredBusinessRaw = {
          providerId: `ch_${item.company_number}`,
          providerName: this.name,
          sourceName: this.displayName,
          sourceUrl: `https://find-and-update.company-information.service.gov.uk/company/${item.company_number}`,
          sourceUrls: [`https://find-and-update.company-information.service.gov.uk/company/${item.company_number}`],
          name: item.company_name,
          officialName: item.company_name,
          formattedAddress: fullAddress,
          streetAddress: address.address_line_1,
          city: address.locality || city,
          state: address.region || params.state,
          country: 'United Kingdom',
          postalCode: address.postal_code,
          companyNumber: item.company_number,
          incorporationDate: item.date_of_creation,
          businessStatus: item.company_status || 'active',
          primaryType: item.company_type || industry,
          confidenceIndicator: 85,
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
        error: isTimeout ? 'Companies House request timed out (12s)' : `Companies House error: ${err.message}`,
        durationMs: Date.now() - startTime,
      };
    }
  }
}

export const companiesHouseProvider = new CompaniesHouseDiscoveryProvider();
