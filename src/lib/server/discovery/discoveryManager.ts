import type {
  BusinessDiscoveryProvider,
  DiscoveryParams,
  DiscoveryResult,
  DiscoveredBusinessRaw,
  MultiSourceDiscoveryResult,
  ProviderStatus,
} from './types';
import { googlePlacesProvider } from './googlePlacesProvider';
import { openCorporatesProvider } from './openCorporatesProvider';
import { companiesHouseProvider } from './companiesHouseProvider';
import { searchEngineProvider } from './searchEngineProvider';
import {
  filterGeographic,
  filterIndustry,
  deduplicateAndMergeCandidates,
} from './discoveryFilter';
import type { Business } from '@/types';

class DiscoveryManager {
  private providers: Map<string, BusinessDiscoveryProvider> = new Map();

  constructor() {
    this.registerProvider(googlePlacesProvider);
    this.registerProvider(openCorporatesProvider);
    this.registerProvider(companiesHouseProvider);
    this.registerProvider(searchEngineProvider);
  }

  registerProvider(provider: BusinessDiscoveryProvider): void {
    this.providers.set(provider.name, provider);
  }

  getProvider(name: string): BusinessDiscoveryProvider | undefined {
    return this.providers.get(name);
  }

  getAllProviders(): BusinessDiscoveryProvider[] {
    return Array.from(this.providers.values());
  }

  isAnyProviderConfigured(): boolean {
    for (const p of this.getAllProviders()) {
      if (p.isConfigured()) return true;
    }
    return false;
  }

  getProviderStatuses(): ProviderStatus[] {
    return this.getAllProviders().map((p) => ({
      name: p.name,
      displayName: p.displayName,
      sourceType: p.sourceType,
      configured: p.isConfigured(),
      active: p.isConfigured(),
    }));
  }

  /**
   * Primary entry point: Multi-Source Business Discovery Engine
   * Queries all configured providers, applies strict geographic and industry filtering,
   * performs cross-source deduplication, and returns genuine verified business records.
   */
  async discoverMultiSource(params: DiscoveryParams): Promise<MultiSourceDiscoveryResult> {
    const requestedCount = Math.max(1, Math.min(params.count || 25, 100));
    const locationParts = [params.area, params.city, params.state, params.postalCode, params.country]
      .filter(Boolean)
      .join(', ');
    const query = `${params.niche || params.industry} in ${locationParts || params.location || 'Target Region'}`;

    const statuses = this.getProviderStatuses();
    const configuredProviders = this.getAllProviders().filter((p) => p.isConfigured());

    // Honest reporting when no providers are configured
    if (configuredProviders.length === 0) {
      return {
        success: false,
        query,
        requestedCount,
        count: 0,
        businesses: [],
        metrics: {
          totalRawDiscovered: 0,
          geographicFilteredOut: 0,
          industryFilteredOut: 0,
          duplicatesMerged: 0,
          finalVerifiedCount: 0,
        },
        providerStatuses: statuses,
        errorCode: 'PROVIDER_NOT_CONFIGURED',
        error:
          'No external business discovery providers are configured. Please configure at least one authorized provider API key (GOOGLE_MAPS_API_KEY, OPENCORPORATES_API_KEY, COMPANIES_HOUSE_API_KEY, or GOOGLE_CSE_KEY).',
        help:
          'To test the full 10-stage intelligence and audit pipeline without external API keys, switch to Mode B (Process Existing Businesses) to audit verified records in your database.',
      };
    }

    // Execute configured providers concurrently using Promise.allSettled
    const providerPromises = configuredProviders.map(async (provider) => {
      try {
        const result = await provider.search({
          ...params,
          count: requestedCount,
        });
        return {
          providerName: provider.name,
          result,
        };
      } catch (err: any) {
        return {
          providerName: provider.name,
          result: {
            success: false,
            provider: provider.name,
            query,
            count: 0,
            businesses: [],
            errorCode: 'REQUEST_FAILED' as const,
            error: err?.message || 'Provider execution failed unexpectedly',
          },
        };
      }
    });

    const settled = await Promise.allSettled(providerPromises);

    const rawCandidates: DiscoveredBusinessRaw[] = [];
    const updatedStatuses: ProviderStatus[] = [];

    for (const item of settled) {
      if (item.status === 'fulfilled') {
        const { providerName, result } = item.value;
        const providerObj = this.getProvider(providerName);
        const st: ProviderStatus = {
          name: providerName,
          displayName: providerObj?.displayName || providerName,
          sourceType: providerObj?.sourceType || 'verified_local_directory',
          configured: true,
          active: result.success,
          lastError: result.error,
          lastErrorCode: result.errorCode,
          candidatesReturned: result.businesses?.length || 0,
        };
        updatedStatuses.push(st);

        if (result.success && Array.isArray(result.businesses)) {
          rawCandidates.push(...result.businesses);
        }
      }
    }

    // 1. Strict Geographic Filtering
    const geoFiltered: DiscoveredBusinessRaw[] = [];
    let geographicFilteredOut = 0;

    for (const cand of rawCandidates) {
      const geoCheck = filterGeographic(cand, {
        country: params.country,
        state: params.state,
        city: params.city,
        area: params.area,
        postalCode: params.postalCode,
      });

      if (geoCheck.passes) {
        geoFiltered.push({
          ...cand,
          confidenceIndicator: Math.min(cand.confidenceIndicator || 75, geoCheck.confidence),
        });
      } else {
        geographicFilteredOut++;
      }
    }

    // 2. Strict Industry / Niche Relevance Filtering
    const industryFiltered: DiscoveredBusinessRaw[] = [];
    let industryFilteredOut = 0;

    for (const cand of geoFiltered) {
      const indCheck = filterIndustry(cand, {
        industry: params.industry,
        niche: params.niche,
        keyword: params.keyword,
      });

      if (indCheck.passes) {
        industryFiltered.push({
          ...cand,
          confidenceIndicator: Math.min(cand.confidenceIndicator || 75, indCheck.confidence),
        });
      } else {
        industryFilteredOut++;
      }
    }

    // 3. Cross-Source Deduplication & Normalization
    const { deduplicated, mergedCount } = deduplicateAndMergeCandidates(industryFiltered);

    // Limit to requested count
    const finalBusinesses = deduplicated.slice(0, requestedCount);

    return {
      success: true,
      query,
      requestedCount,
      count: finalBusinesses.length,
      businesses: finalBusinesses,
      metrics: {
        totalRawDiscovered: rawCandidates.length,
        geographicFilteredOut,
        industryFilteredOut,
        duplicatesMerged: mergedCount,
        finalVerifiedCount: finalBusinesses.length,
      },
      providerStatuses: updatedStatuses,
    };
  }

  /**
   * Backwards-compatible discover() wrapper for existing pipelineRunner callers
   */
  async discover(params: DiscoveryParams): Promise<DiscoveryResult> {
    const multiResult = await this.discoverMultiSource(params);

    if (!multiResult.success) {
      return {
        success: false,
        provider: 'multi_source_orchestrator',
        query: multiResult.query,
        count: 0,
        businesses: [],
        errorCode: multiResult.errorCode,
        error: multiResult.error,
        help: multiResult.help,
      };
    }

    return {
      success: true,
      provider: 'multi_source_orchestrator',
      query: multiResult.query,
      count: multiResult.count,
      businesses: multiResult.businesses,
    };
  }

  /**
   * Transforms raw discovered business from external provider into Watech Business entity,
   * preserving multi-source provenance, confidence indicators, and branch identifiers.
   */
  normalizeToBusinessModel(
    raw: DiscoveredBusinessRaw,
    projectId: string,
    existingBusinesses: Business[] = []
  ): { business: Business; isDuplicate: boolean; duplicateReason?: string } {
    const rawDomain = (raw.domain || '').toLowerCase().trim();
    const rawName = raw.name.toLowerCase().trim();
    const rawPlaceId = raw.providerId;
    const rawAddress = (raw.formattedAddress || raw.streetAddress || '').toLowerCase().trim();

    // Check for duplicate in existing database businesses
    for (const existing of existingBusinesses) {
      if (rawPlaceId && existing.googlePlaceId && existing.googlePlaceId === rawPlaceId) {
        return { business: existing, isDuplicate: true, duplicateReason: `Matched Google Place ID: ${rawPlaceId}` };
      }
      if (rawDomain && existing.domain && existing.domain.toLowerCase() === rawDomain) {
        return { business: existing, isDuplicate: true, duplicateReason: `Matched domain: ${rawDomain}` };
      }
      if (existing.officialName.toLowerCase().trim() === rawName) {
        // If address is different, treat as a separate physical branch
        if (rawAddress && existing.fullAddress && rawAddress !== existing.fullAddress.toLowerCase().trim()) {
          continue;
        }
        return { business: existing, isDuplicate: true, duplicateReason: `Matched business name & address: ${raw.name}` };
      }
    }

    const businessId = `biz-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const business: Business = {
      id: businessId,
      projectId,
      googlePlaceId: raw.providerId,
      officialName: raw.officialName || raw.name,
      brandName: raw.name,
      domain: raw.domain || (raw.websiteUrl ? new URL(raw.websiteUrl).hostname.replace(/^www\./, '') : ''),
      websiteUrl: raw.websiteUrl || '',
      hasWebsite: Boolean(raw.websiteUrl && raw.websiteUrl.length > 5),
      phone: raw.phone || undefined,
      fullAddress: raw.formattedAddress || raw.streetAddress,
      city: raw.city,
      state: raw.state,
      country: raw.country || 'Global',
      postalCode: raw.postalCode,
      serviceArea: raw.city ? `${raw.city} & surrounding areas` : undefined,
      businessModel: 'commercial',
      ownerVerificationStatus: raw.verificationStatus || 'unverified',
      confidenceIndicator: raw.confidenceIndicator || 75,
      sourceName: raw.sourceName || raw.providerName,
      sourceUrls: raw.sourceUrls || (raw.sourceUrl ? [raw.sourceUrl] : []),
      discoveryTimestamp: now,
      reviewRating: raw.rating,
      reviewCount: raw.userRatingCount,
      marketingChannels: raw.websiteUrl ? ['website'] : [],
      status: 'discovered',
      queueStatus: 'research_next',
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    };

    return { business, isDuplicate: false };
  }
}

export const discoveryManager = new DiscoveryManager();
