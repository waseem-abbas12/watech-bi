import type {
  BusinessDiscoveryProvider,
  DiscoveryParams,
  DiscoveryResult,
  DiscoveredBusinessRaw,
} from './types';

export class GooglePlacesDiscoveryProvider implements BusinessDiscoveryProvider {
  readonly name = 'google_places';

  isConfigured(): boolean {
    const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
    return Boolean(key && key.length > 5);
  }

  async search(params: DiscoveryParams): Promise<DiscoveryResult> {
    const { industry, location, count = 10 } = params;
    const query = `${industry.trim()} in ${location.trim()}`;

    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.name,
        query,
        count: 0,
        businesses: [],
        errorCode: 'PROVIDER_NOT_CONFIGURED',
        error:
          'Google Places API key is not configured. Add GOOGLE_MAPS_API_KEY to your environment variables (.env.local or Vercel).',
        help:
          'Obtain an API key with "Places API (New)" enabled from the Google Cloud Console: https://console.cloud.google.com/google/maps-apis/credentials',
      };
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY!.trim();
    const targetCount = Math.max(1, Math.min(count, 50));
    const accumulated: DiscoveredBusinessRaw[] = [];
    let currentPageToken = params.pageToken;

    try {
      while (accumulated.length < targetCount) {
        const pageSize = Math.min(targetCount - accumulated.length, 20);

        const requestBody: Record<string, any> = {
          textQuery: query,
          pageSize,
        };
        if (currentPageToken) {
          requestBody.pageToken = currentPageToken;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask':
              'places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.internationalPhoneNumber,places.rating,places.userRatingCount,places.businessStatus,places.primaryType,places.location,places.addressComponents,nextPageToken',
          },
          body: JSON.stringify(requestBody),
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || `Google Places API returned HTTP ${response.status}`;
          const isRateLimit = response.status === 429 || errMsg.toLowerCase().includes('quota');
          return {
            success: false,
            provider: this.name,
            query,
            count: accumulated.length,
            businesses: accumulated,
            errorCode: isRateLimit ? 'RATE_LIMITED' : 'REQUEST_FAILED',
            error: `Places API error: ${errMsg}`,
          };
        }

        const data = await response.json();
        const rawPlaces = data.places || [];

        if (rawPlaces.length === 0 && accumulated.length === 0) {
          return {
            success: true,
            provider: this.name,
            query,
            count: 0,
            businesses: [],
            errorCode: 'ZERO_RESULTS',
            error: `No verified businesses found matching "${query}". Try broadening the search location or industry keywords.`,
          };
        }

        for (const place of rawPlaces) {
          const normalized = this.normalizePlace(place);
          if (normalized) {
            accumulated.push(normalized);
          }
          if (accumulated.length >= targetCount) break;
        }

        if (!data.nextPageToken || rawPlaces.length === 0) {
          break;
        }

        currentPageToken = data.nextPageToken;
        // Small delay if fetching next page per Google pagination guideline
        if (accumulated.length < targetCount) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }

      return {
        success: true,
        provider: this.name,
        query,
        count: accumulated.length,
        businesses: accumulated,
        nextPageToken: currentPageToken,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.name,
        query,
        count: accumulated.length,
        businesses: accumulated,
        errorCode: 'REQUEST_FAILED',
        error: `Discovery request failed: ${err.message || 'Unknown network error'}`,
      };
    }
  }

  private normalizePlace(place: any): DiscoveredBusinessRaw | null {
    const name = place.displayName?.text?.trim();
    if (!name) return null;

    let websiteUrl = place.websiteUri?.trim() || undefined;
    let domain: string | undefined = undefined;

    if (websiteUrl) {
      try {
        if (!/^https?:\/\//i.test(websiteUrl)) {
          websiteUrl = `https://${websiteUrl}`;
        }
        const parsed = new URL(websiteUrl);
        domain = parsed.hostname.toLowerCase().replace(/^www\./, '');
      } catch {
        // Invalid URL format from provider
      }
    }

    // Parse Address Components
    let city: string | undefined;
    let state: string | undefined;
    let country: string | undefined;
    let postalCode: string | undefined;

    if (Array.isArray(place.addressComponents)) {
      for (const comp of place.addressComponents) {
        const types: string[] = comp.types || [];
        if (types.includes('locality')) city = comp.longText || comp.shortText;
        if (types.includes('administrative_area_level_1')) state = comp.shortText || comp.longText;
        if (types.includes('country')) country = comp.longText || comp.shortText;
        if (types.includes('postal_code')) postalCode = comp.longText || comp.shortText;
      }
    }

    // Fallback parsing from formatted address
    const fullAddress = place.formattedAddress?.trim() || undefined;
    if (!city && fullAddress) {
      const parts = fullAddress.split(',').map((p: string) => p.trim());
      if (parts.length >= 3) {
        city = parts[parts.length - 3];
      }
    }

    return {
      providerId: place.id,
      providerName: 'google_places',
      name,
      formattedAddress: fullAddress,
      city,
      state,
      country: country || 'USA',
      postalCode,
      websiteUrl,
      domain,
      phone: place.nationalPhoneNumber || place.internationalPhoneNumber || undefined,
      rating: typeof place.rating === 'number' ? place.rating : undefined,
      userRatingCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : undefined,
      businessStatus: place.businessStatus || undefined,
      primaryType: place.primaryType || undefined,
      locationCoordinates: place.location
        ? {
            latitude: place.location.latitude,
            longitude: place.location.longitude,
          }
        : undefined,
    };
  }
}

export const googlePlacesProvider = new GooglePlacesDiscoveryProvider();
