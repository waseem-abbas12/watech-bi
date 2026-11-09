import type {
  BusinessDiscoveryProvider,
  DiscoveryParams,
  DiscoveryResult,
  DiscoveredBusinessRaw,
} from './types';
import { googlePlacesProvider } from './googlePlacesProvider';
import type { Business } from '@/types';

class DiscoveryManager {
  private providers: Map<string, BusinessDiscoveryProvider> = new Map();

  constructor() {
    this.registerProvider(googlePlacesProvider);
  }

  registerProvider(provider: BusinessDiscoveryProvider): void {
    this.providers.set(provider.name, provider);
  }

  getProvider(name = 'google_places'): BusinessDiscoveryProvider | undefined {
    return this.providers.get(name);
  }

  isAnyProviderConfigured(): boolean {
    for (const p of Array.from(this.providers.values())) {
      if (p.isConfigured()) return true;
    }
    return false;
  }

  async discover(params: DiscoveryParams, providerName = 'google_places'): Promise<DiscoveryResult> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      return {
        success: false,
        provider: providerName,
        query: `${params.industry} in ${params.location}`,
        count: 0,
        businesses: [],
        errorCode: 'PROVIDER_NOT_CONFIGURED',
        error: `Discovery provider "${providerName}" is not registered.`,
      };
    }

    return provider.search(params);
  }

  /**
   * Transforms raw discovered business from external provider into Watech Business entity
   */
  normalizeToBusinessModel(
    raw: DiscoveredBusinessRaw,
    projectId: string,
    existingBusinesses: Business[] = []
  ): { business: Business; isDuplicate: boolean; duplicateReason?: string } {
    const rawDomain = (raw.domain || '').toLowerCase().trim();
    const rawName = raw.name.toLowerCase().trim();
    const rawPlaceId = raw.providerId;

    // Check for duplicate in existing businesses
    for (const existing of existingBusinesses) {
      if (rawPlaceId && existing.googlePlaceId && existing.googlePlaceId === rawPlaceId) {
        return { business: existing, isDuplicate: true, duplicateReason: `Matched Google Place ID: ${rawPlaceId}` };
      }
      if (rawDomain && existing.domain && existing.domain.toLowerCase() === rawDomain) {
        return { business: existing, isDuplicate: true, duplicateReason: `Matched domain: ${rawDomain}` };
      }
      if (existing.officialName.toLowerCase().trim() === rawName) {
        return { business: existing, isDuplicate: true, duplicateReason: `Matched business name: ${raw.name}` };
      }
    }

    const businessId = `biz-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const business: Business = {
      id: businessId,
      projectId,
      googlePlaceId: raw.providerId,
      officialName: raw.name,
      brandName: raw.name,
      domain: raw.domain || (raw.websiteUrl ? new URL(raw.websiteUrl).hostname.replace(/^www\./, '') : ''),
      websiteUrl: raw.websiteUrl || '',
      hasWebsite: Boolean(raw.websiteUrl && raw.websiteUrl.length > 5),
      phone: raw.phone || undefined,
      fullAddress: raw.formattedAddress,
      city: raw.city,
      state: raw.state,
      country: raw.country || 'USA',
      postalCode: raw.postalCode,
      serviceArea: raw.city ? `${raw.city} & surrounding areas` : undefined,
      businessModel: 'commercial',
      ownerVerificationStatus: 'unverified',
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
