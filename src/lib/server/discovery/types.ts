export interface DiscoveryParams {
  industry: string;
  niche?: string;
  keyword?: string;
  location?: string;
  country?: string;
  state?: string;
  city?: string;
  area?: string;
  postalCode?: string;
  count?: number;
  pageToken?: string;
}

export type DiscoverySourceType =
  | 'licensed_places_api'
  | 'public_corporate_registry'
  | 'official_government_register'
  | 'authorized_search_api'
  | 'verified_local_directory';

export interface DiscoveredBusinessRaw {
  providerId: string; // e.g. Google Place ID, Company Registration Number, or URL hash
  providerName: string; // 'google_places' | 'opencorporates' | 'companies_house' | 'search_engine'
  sourceName: string; // e.g. 'Google Places (New)', 'OpenCorporates Global Registry', 'Companies House UK'
  sourceUrl?: string;
  sourceUrls?: string[];
  name: string;
  officialName?: string;
  formattedAddress?: string;
  streetAddress?: string;
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
  companyNumber?: string;
  jurisdictionCode?: string;
  incorporationDate?: string;
  confidenceIndicator?: number; // 0 - 100
  verificationStatus?: 'verified' | 'estimated' | 'hypothesis' | 'unverified';
  isBranch?: boolean;
  parentBusinessName?: string;
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
  | 'ZERO_RESULTS'
  | 'TIMEOUT';

export interface DiscoveryResult {
  success: boolean;
  provider: string;
  sourceType?: DiscoverySourceType;
  query: string;
  count: number;
  businesses: DiscoveredBusinessRaw[];
  nextPageToken?: string;
  error?: string;
  errorCode?: DiscoveryErrorCode;
  help?: string;
  durationMs?: number;
}

export interface ProviderStatus {
  name: string;
  displayName: string;
  sourceType: DiscoverySourceType;
  configured: boolean;
  active: boolean;
  lastError?: string;
  lastErrorCode?: DiscoveryErrorCode;
  candidatesReturned?: number;
}

export interface MultiSourceDiscoveryMetrics {
  totalRawDiscovered: number;
  geographicFilteredOut: number;
  industryFilteredOut: number;
  duplicatesMerged: number;
  finalVerifiedCount: number;
}

export interface MultiSourceDiscoveryResult {
  success: boolean;
  query: string;
  requestedCount: number;
  count: number;
  businesses: DiscoveredBusinessRaw[];
  metrics: MultiSourceDiscoveryMetrics;
  providerStatuses: ProviderStatus[];
  error?: string;
  errorCode?: DiscoveryErrorCode;
  help?: string;
}

export interface BusinessDiscoveryProvider {
  readonly name: string;
  readonly displayName: string;
  readonly sourceType: DiscoverySourceType;
  isConfigured(): boolean;
  search(params: DiscoveryParams): Promise<DiscoveryResult>;
}
