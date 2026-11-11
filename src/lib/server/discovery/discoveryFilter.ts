import type { DiscoveredBusinessRaw } from './types';

// Common legal suffixes to strip during name normalization
const LEGAL_SUFFIXES_REGEX =
  /\b(llc|inc|incorporated|corp|corporation|ltd|limited|pvt ltd|private limited|co|company|group|holdings|services|enterprises|gmbh|sa|plc)\b/gi;

// Unrelated negative type map to prevent cross-industry pollution
const UNRELATED_INDUSTRY_TERMS: Record<string, string[]> = {
  hvac: ['restaurant', 'bakery', 'dentist', 'dental', 'hair_salon', 'beauty_salon', 'bar', 'florist', 'jewelry'],
  roofing: ['restaurant', 'bakery', 'dentist', 'dental', 'hair_salon', 'clothing_store', 'grocery'],
  furniture: ['restaurant', 'dentist', 'hospital', 'car_repair', 'gas_station', 'pharmacy'],
  real_estate: ['restaurant', 'car_repair', 'plumbing', 'bakery', 'gas_station'],
  plumbing: ['restaurant', 'bakery', 'dentist', 'hair_salon', 'clothing_store'],
  legal: ['restaurant', 'car_repair', 'plumbing', 'bakery', 'construction'],
};

export interface GeographicTarget {
  country?: string;
  state?: string;
  city?: string;
  area?: string;
  postalCode?: string;
}

export interface IndustryTarget {
  industry: string;
  niche?: string;
  keyword?: string;
}

export interface FilterResult {
  passes: boolean;
  confidence: number;
  reason?: string;
}

/**
 * Normalizes text for case-insensitive, punctuation-free comparison
 */
export function normalizeText(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes business name by removing corporate designations and punctuation
 */
export function normalizeBusinessName(name?: string): string {
  if (!name) return '';
  let clean = name.toLowerCase().replace(/[^\w\s]/g, ' ');
  clean = clean.replace(LEGAL_SUFFIXES_REGEX, ' ');
  return clean.replace(/\s+/g, ' ').trim();
}

/**
 * Normalizes website domain from URL or domain string
 */
export function normalizeDomain(urlOrDomain?: string): string | undefined {
  if (!urlOrDomain) return undefined;
  try {
    let str = urlOrDomain.trim().toLowerCase();
    if (!str.startsWith('http://') && !str.startsWith('https://')) {
      str = `https://${str}`;
    }
    const parsed = new URL(str);
    const host = parsed.hostname.replace(/^www\./, '').trim();
    if (!host || host.includes(' ') || !host.includes('.')) return undefined;

    // Filter out common aggregator/social domains from representing unique company identity
    const genericHosts = ['facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com', 'x.com', 'youtube.com', 'yelp.com'];
    if (genericHosts.includes(host)) return undefined;

    return host;
  } catch {
    return undefined;
  }
}

const US_STATE_MAP: Record<string, string> = {
  texas: 'tx', tx: 'texas',
  california: 'ca', ca: 'california',
  florida: 'fl', fl: 'florida',
  'new york': 'ny', ny: 'new york',
  ohio: 'oh', oh: 'ohio',
  illinois: 'il', il: 'illinois',
  pennsylvania: 'pa', pa: 'pennsylvania',
  georgia: 'ga', ga: 'georgia',
  'north carolina': 'nc', nc: 'north carolina',
  michigan: 'mi', mi: 'michigan',
  arizona: 'az', az: 'arizona',
  colorado: 'co', co: 'colorado',
  washington: 'wa', wa: 'washington',
  virginia: 'va', va: 'virginia',
  'new jersey': 'nj', nj: 'new jersey',
};

/**
 * Strict Geographic Filter
 * Confirms whether candidate business genuinely resides in target boundaries.
 */
export function filterGeographic(
  candidate: DiscoveredBusinessRaw,
  target: GeographicTarget
): FilterResult {
  const reqCountry = normalizeText(target.country);
  const reqState = normalizeText(target.state);
  const reqCity = normalizeText(target.city);
  const reqArea = normalizeText(target.area);
  const reqPostal = normalizeText(target.postalCode);

  const candCountry = normalizeText(candidate.country);
  const candState = normalizeText(candidate.state);
  const candCity = normalizeText(candidate.city);
  const fullAddress = normalizeText(candidate.formattedAddress || candidate.streetAddress);

  // 1. Country Check
  if (reqCountry) {
    const isPk = reqCountry === 'pakistan' || reqCountry === 'pk';
    const isUk = reqCountry === 'united kingdom' || reqCountry === 'uk' || reqCountry === 'gb';
    const isUs = reqCountry === 'united states' || reqCountry === 'usa' || reqCountry === 'us';
    const isCa = reqCountry === 'canada' || reqCountry === 'ca';

    if (candCountry) {
      let matchesCountry = candCountry === reqCountry || candCountry.includes(reqCountry) || reqCountry.includes(candCountry);
      if (isPk && (candCountry === 'pakistan' || candCountry === 'pk')) matchesCountry = true;
      if (isUk && (candCountry === 'united kingdom' || candCountry === 'uk' || candCountry === 'gb')) matchesCountry = true;
      if (isUs && (candCountry === 'united states' || candCountry === 'usa' || candCountry === 'us')) matchesCountry = true;
      if (isCa && (candCountry === 'canada' || candCountry === 'ca')) matchesCountry = true;

      if (!matchesCountry && !fullAddress.includes(reqCountry)) {
        return {
          passes: false,
          confidence: 0,
          reason: `Country mismatch: expected "${target.country}", got "${candidate.country}"`,
        };
      }
    }
  }

  // 2. City Check (Strict Boundary when distinct from State/Country)
  if (reqCity && reqCity !== reqState && reqCity !== reqCountry) {
    const cityMatches =
      !candCity ||
      candCity === reqCity ||
      candCity.includes(reqCity) ||
      reqCity.includes(candCity) ||
      fullAddress.includes(reqCity);

    if (!cityMatches) {
      return {
        passes: false,
        confidence: 0,
        reason: `City boundary mismatch: candidate not found in target city "${target.city}"`,
      };
    }
  }

  // 3. State / Province Check (if provided)
  let stateMatches = true;
  if (reqState && candState) {
    const mappedCandState = US_STATE_MAP[candState] || candState;
    const mappedReqState = US_STATE_MAP[reqState] || reqState;

    stateMatches =
      candState === reqState ||
      mappedCandState === reqState ||
      candState === mappedReqState ||
      mappedCandState === mappedReqState ||
      candState.includes(reqState) ||
      reqState.includes(candState) ||
      fullAddress.includes(reqState) ||
      Boolean(US_STATE_MAP[reqState] && fullAddress.includes(US_STATE_MAP[reqState]));

    if (!stateMatches) {
      return {
        passes: false,
        confidence: 0,
        reason: `State mismatch: expected "${target.state}", got "${candidate.state}"`,
      };
    }
  }

  // Calculate confidence score based on geographic specificity
  let confidence = 75;
  if (candCity && (candCity === reqCity || candCity.includes(reqCity))) confidence += 10;
  if (candState && stateMatches) confidence += 5;
  if (reqArea && fullAddress.includes(reqArea)) confidence += 5;
  if (reqPostal && (candidate.postalCode?.toLowerCase().includes(reqPostal) || fullAddress.includes(reqPostal))) confidence += 5;

  return {
    passes: true,
    confidence: Math.min(confidence, 100),
  };
}

/**
 * Strict Industry / Niche Relevance Filter
 */
export function filterIndustry(
  candidate: DiscoveredBusinessRaw,
  target: IndustryTarget
): FilterResult {
  const targetTokens = [
    ...normalizeText(target.industry).split(' '),
    ...normalizeText(target.niche).split(' '),
    ...normalizeText(target.keyword).split(' '),
  ].filter((t) => t.length > 2);

  const candNameNorm = normalizeText(candidate.name);
  const candTypeNorm = normalizeText(candidate.primaryType);
  const candAddressNorm = normalizeText(candidate.formattedAddress);

  // Check for negative unrelated industry types
  for (const [key, negatives] of Object.entries(UNRELATED_INDUSTRY_TERMS)) {
    if (normalizeText(target.industry).includes(key)) {
      for (const neg of negatives) {
        if (candTypeNorm === neg || candTypeNorm.includes(neg)) {
          return {
            passes: false,
            confidence: 0,
            reason: `Irrelevant business type: "${candidate.primaryType}" conflicts with target industry "${target.industry}"`,
          };
        }
      }
    }
  }

  // Token matching across name, primaryType, or provider description
  let matches = 0;
  for (const token of targetTokens) {
    if (candNameNorm.includes(token) || candTypeNorm.includes(token) || candAddressNorm.includes(token)) {
      matches++;
    }
  }

  // If candidate has a specific primaryType that doesn't conflict, or if business name contains relevant terms
  if (matches > 0 || !candidate.primaryType) {
    const confidence = matches > 0 ? 80 + Math.min(matches * 5, 20) : 65;
    return {
      passes: true,
      confidence,
    };
  }

  // If primaryType is present and zero tokens matched in name
  return {
    passes: true,
    confidence: 60,
    reason: 'Industry inferred from directory query context; flagged for review.',
  };
}

/**
 * Cross-Source Deduplication & Provenance Merging
 */
export function deduplicateAndMergeCandidates(
  candidates: DiscoveredBusinessRaw[]
): { deduplicated: DiscoveredBusinessRaw[]; mergedCount: number } {
  const mergedMap = new Map<string, DiscoveredBusinessRaw>();
  const nameCityMap = new Map<string, string>(); // normName__normCity -> first identityKey
  let mergedCount = 0;

  for (const candidate of candidates) {
    const normName = normalizeBusinessName(candidate.name);
    const normCity = normalizeText(candidate.city);
    const normDomain = normalizeDomain(candidate.websiteUrl || candidate.domain);
    const normStreet = normalizeText(candidate.streetAddress || candidate.formattedAddress?.split(',')[0]);
    const nameCityKey = normName && normCity ? `${normName}__${normCity}` : '';

    // Primary unique identity keys
    let identityKey = '';
    if (normDomain) {
      identityKey = `domain:${normDomain}`;
    } else if (normName && normStreet && normCity) {
      identityKey = `name_street:${normName}_${normStreet}_${normCity}`;
    } else if (normName && normCity) {
      identityKey = `name_city:${normName}_${normCity}`;
    } else if (candidate.providerId) {
      identityKey = `provider:${candidate.providerName}:${candidate.providerId}`;
    } else {
      identityKey = `hash:${candidate.name}_${Math.random()}`;
    }

    // Check if this candidate represents a separate branch location of an already seen business
    let isBranchLocation = false;
    let parentBrandName: string | undefined = undefined;

    if (nameCityKey && nameCityMap.has(nameCityKey)) {
      const existingKey = nameCityMap.get(nameCityKey)!;
      if (existingKey !== identityKey && mergedMap.has(existingKey)) {
        const rootCandidate = mergedMap.get(existingKey)!;
        isBranchLocation = true;
        parentBrandName = rootCandidate.officialName || rootCandidate.name;
      }
    }

    if (mergedMap.has(identityKey)) {
      // Merge with existing record
      const existing = mergedMap.get(identityKey)!;
      mergedCount++;

      // Check if this is a distinct branch location (different street address under same name)
      if (
        normStreet &&
        existing.streetAddress &&
        normStreet !== normalizeText(existing.streetAddress) &&
        normName === normalizeBusinessName(existing.name)
      ) {
        // Preserve separate branch location linked to parent
        const branchKey = `${identityKey}_branch_${mergedCount}`;
        mergedMap.set(branchKey, {
          ...candidate,
          isBranch: true,
          parentBusinessName: existing.officialName || existing.name,
        });
        continue;
      }

      // Merge provider attribution
      const sourcesSet = new Set<string>();
      if (existing.sourceName) sourcesSet.add(existing.sourceName);
      if (candidate.sourceName) sourcesSet.add(candidate.sourceName);
      existing.sourceName = Array.from(sourcesSet).join(' + ');

      // Merge source URLs
      const urlsSet = new Set<string>(existing.sourceUrls || []);
      if (existing.sourceUrl) urlsSet.add(existing.sourceUrl);
      if (candidate.sourceUrl) urlsSet.add(candidate.sourceUrl);
      if (candidate.sourceUrls) candidate.sourceUrls.forEach((u) => urlsSet.add(u));
      existing.sourceUrls = Array.from(urlsSet);

      // Upgrade phone, website, coordinates if existing was missing
      if (!existing.phone && candidate.phone) existing.phone = candidate.phone;
      if (!existing.websiteUrl && candidate.websiteUrl) {
        existing.websiteUrl = candidate.websiteUrl;
        existing.domain = candidate.domain || normalizeDomain(candidate.websiteUrl);
      }
      if (!existing.postalCode && candidate.postalCode) existing.postalCode = candidate.postalCode;
      if (!existing.locationCoordinates && candidate.locationCoordinates) {
        existing.locationCoordinates = candidate.locationCoordinates;
      }
      if (
        typeof candidate.rating === 'number' &&
        (typeof existing.rating !== 'number' || (candidate.userRatingCount || 0) > (existing.userRatingCount || 0))
      ) {
        existing.rating = candidate.rating;
        existing.userRatingCount = candidate.userRatingCount;
      }

      existing.confidenceIndicator = Math.max(
        existing.confidenceIndicator || 70,
        candidate.confidenceIndicator || 70
      );
      if (existing.confidenceIndicator >= 85) {
        existing.verificationStatus = 'verified';
      }
    } else {
      // New distinct business record
      const sourceUrls = candidate.sourceUrls || (candidate.sourceUrl ? [candidate.sourceUrl] : []);
      const domain = candidate.domain || normalizeDomain(candidate.websiteUrl);

      mergedMap.set(identityKey, {
        ...candidate,
        domain,
        sourceUrls,
        isBranch: isBranchLocation || candidate.isBranch,
        parentBusinessName: parentBrandName || candidate.parentBusinessName,
        confidenceIndicator: candidate.confidenceIndicator || 75,
        verificationStatus:
          (candidate.confidenceIndicator || 75) >= 85
            ? 'verified'
            : (candidate.confidenceIndicator || 75) >= 65
            ? 'estimated'
            : 'unverified',
      });

      if (nameCityKey && !nameCityMap.has(nameCityKey)) {
        nameCityMap.set(nameCityKey, identityKey);
      }
    }
  }

  return {
    deduplicated: Array.from(mergedMap.values()),
    mergedCount,
  };
}
