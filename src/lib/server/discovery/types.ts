export interface DiscoveryParams {
  industry: string;
  location?: string;
  country?: string;
  state?: string;
  city?: string;
  count?: number;
  pageToken?: string;
}

export interface DiscoveredBusinessRaw {
  providerId: string; // e.g. Google Place ID
  providerName: 'google_places' | 'custom_provider';
  name: string;
  formattedAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  websiteUrl?: string;
  domain?: string;
  phone?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  primaryType?: string;
  locationCoordinates?: {
    latitude: number;
    longitude: number;
  };
}

export type DiscoveryErrorCode =
  | 'PROVIDER_NOT_CONFIGURED'
  | 'INVALID_ARGUMENT'
  | 'RATE_LIMITED'
  | 'REQUEST_FAILED'
  | 'ZERO_RESULTS';

export interface DiscoveryResult {
  success: boolean;
  provider: string;
  query: string;
  count: number;
  businesses: DiscoveredBusinessRaw[];
  nextPageToken?: string;
  error?: string;
  errorCode?: DiscoveryErrorCode;
  help?: string;
}

export interface BusinessDiscoveryProvider {
  readonly name: string;
  isConfigured(): boolean;
  search(params: DiscoveryParams): Promise<DiscoveryResult>;
}
