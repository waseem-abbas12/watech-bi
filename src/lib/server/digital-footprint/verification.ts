import { normalizeText, normalizeDomain, normalizeBusinessName } from '../discovery/discoveryFilter';

const TRACKING_PARAMS = [
  'fbclid',
  'ref',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'igshid',
  'si',
];

const TEMPLATE_PROFILE_BLACKLIST = new Set([
  'wix',
  'squarespace',
  'wordpress',
  'shopify',
  'weebly',
  'webflow',
  'godaddy',
  'facebook',
  'meta',
  'instagram',
  'twitter',
  'x',
  'youtube',
  'linkedin',
  'google',
  'sharer',
  'share',
  'intent',
  'dialog',
  'help',
  'plugins',
  'privacy',
  'terms',
  'policies',
]);

/**
 * Strips tracking query parameters and canonicalizes clean profile or website URL
 */
export function canonicalizeUrl(urlStr: string): string | undefined {
  if (!urlStr) return undefined;
  try {
    let clean = urlStr.trim();
    if (clean.startsWith('//')) {
      clean = `https:${clean}`;
    } else if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }

    const parsed = new URL(clean);
    parsed.hash = '';
    for (const p of TRACKING_PARAMS) {
      parsed.searchParams.delete(p);
    }
    // Remove trailing slash for consistency
    const result = parsed.toString().replace(/\/+$/, '');
    return result;
  } catch {
    return undefined;
  }
}

/**
 * Checks whether an extracted social profile handle genuinely belongs to the business
 * rather than a generic CMS theme link or share intent.
 */
export function verifySocialProfileRelevance(
  profileUrl: string,
  businessName: string,
  domain?: string
): { isVerified: boolean; confidence: number; reason: string } {
  const canonical = canonicalizeUrl(profileUrl);
  if (!canonical) {
    return { isVerified: false, confidence: 0, reason: 'Invalid or malformed URL' };
  }

  try {
    const parsed = new URL(canonical);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const pathParts = parsed.pathname.split('/').filter(Boolean);

    if (pathParts.length === 0) {
      return { isVerified: false, confidence: 0, reason: 'Root social platform homepage, not a business profile' };
    }

    let handle = pathParts[0].toLowerCase();
    if (host.includes('linkedin.com')) {
      if (pathParts[0] === 'company' || pathParts[0] === 'school') {
        handle = pathParts[1]?.toLowerCase() || '';
      }
    } else if (host.includes('youtube.com')) {
      if (pathParts[0] === 'c' || pathParts[0] === 'channel' || pathParts[0] === 'user') {
        handle = pathParts[1]?.toLowerCase() || '';
      } else if (pathParts[0].startsWith('@')) {
        handle = pathParts[0].substring(1).toLowerCase();
      }
    }

    if (!handle || TEMPLATE_PROFILE_BLACKLIST.has(handle) || handle.length < 2) {
      return {
        isVerified: false,
        confidence: 0,
        reason: `Generic platform / template handle detected: "${handle}"`,
      };
    }

    // Token comparison against business name and domain
    const cleanBizName = normalizeBusinessName(businessName).replace(/\s+/g, '');
    const cleanDomain = (domain ? normalizeDomain(domain) : '')?.split('.')[0] || '';
    const cleanHandle = handle.replace(/[^a-z0-9]/g, '');

    const nameMatches = cleanBizName.includes(cleanHandle) || cleanHandle.includes(cleanBizName);
    const domainMatches = cleanDomain && (cleanDomain.includes(cleanHandle) || cleanHandle.includes(cleanDomain));

    if (nameMatches || domainMatches) {
      return {
        isVerified: true,
        confidence: 95,
        reason: `Handle "${handle}" directly matches business identity`,
      };
    }

    // If linked directly from official domain, accept with high confidence
    return {
      isVerified: true,
      confidence: 85,
      reason: `Directly anchored on official business website`,
    };
  } catch {
    return { isVerified: false, confidence: 0, reason: 'Failed to parse social profile URL' };
  }
}

/**
 * Detects WhatsApp click-to-chat links and extracts normalized phone numbers
 */
export function extractWhatsAppSignal(html: string): { hasWhatsApp: boolean; number?: string; url?: string } {
  if (!html) return { hasWhatsApp: false };

  const waPatterns = [
    /href=["'](https?:\/\/(?:api\.whatsapp\.com\/send\?phone=|wa\.me\/)([\d+]+)[^"']*)["']/i,
    /href=["'](whatsapp:\/\/send\?phone=([\d+]+)[^"']*)["']/i,
  ];

  for (const regex of waPatterns) {
    const match = regex.exec(html);
    if (match) {
      const rawNum = match[2]?.replace(/[^\d+]/g, '');
      return {
        hasWhatsApp: true,
        number: rawNum || undefined,
        url: match[1],
      };
    }
  }

  // Look for plain wa.me link without capture group
  if (html.includes('wa.me/') || html.includes('api.whatsapp.com')) {
    return { hasWhatsApp: true };
  }

  return { hasWhatsApp: false };
}

/**
 * Detects third-party online booking / scheduling widgets
 */
export function extractBookingSignal(html: string): { hasBooking: boolean; provider?: string; url?: string } {
  if (!html) return { hasBooking: false };

  const bookingProviders: Array<{ name: string; pattern: RegExp }> = [
    { name: 'Calendly', pattern: /calendly\.com\/[a-zA-Z0-9_-]+/i },
    { name: 'Acuity Scheduling', pattern: /acuityscheduling\.com\/[a-zA-Z0-9_-]+/i },
    { name: 'Booksy', pattern: /booksy\.com\/[a-zA-Z0-9_-]+/i },
    { name: 'Housecall Pro', pattern: /housecallpro\.com\/[a-zA-Z0-9_-]+/i },
    { name: 'Square Appointments', pattern: /square\.site\/book\/[a-zA-Z0-9_-]+/i },
    { name: 'Vagaro', pattern: /vagaro\.com\/[a-zA-Z0-9_-]+/i },
    { name: 'Jane App', pattern: /janeapp\.com/i },
    { name: 'Setmore', pattern: /setmore\.com/i },
  ];

  for (const bp of bookingProviders) {
    const match = bp.pattern.exec(html);
    if (match) {
      return {
        hasBooking: true,
        provider: bp.name,
        url: match[0].startsWith('http') ? match[0] : `https://${match[0]}`,
      };
    }
  }

  // Look for dedicated booking button text or URL paths
  const genericBookingRegex = /href=["']([^"']*(?:book-online|schedule-appointment|book-now|booking)[^"']*)["']/i;
  const genericMatch = genericBookingRegex.exec(html);
  if (genericMatch) {
    return {
      hasBooking: true,
      provider: 'Internal Booking System',
      url: genericMatch[1],
    };
  }

  return { hasBooking: false };
}

/**
 * Detects live chat widgets embedded on website
 */
export function extractLiveChatSignal(html: string): { hasLiveChat: boolean; provider?: string } {
  if (!html) return { hasLiveChat: false };

  const chatSignatures: Array<{ name: string; pattern: RegExp }> = [
    { name: 'Tidio', pattern: /code\.tidio\.co|tidioChat/i },
    { name: 'Intercom', pattern: /widget\.intercom\.io|Intercom\(/i },
    { name: 'Crisp', pattern: /client\.crisp\.chat|\$crisp/i },
    { name: 'Zendesk Chat', pattern: /zopim|static\.zdassets\.com/i },
    { name: 'LiveChat', pattern: /cdn\.livechatinc\.com/i },
    { name: 'Drift', pattern: /js\.driftt\.com/i },
    { name: 'HubSpot Chat', pattern: /js\.hs-scripts\.com|hubspot-messages/i },
    { name: 'Tawk.to', pattern: /embed\.tawk\.to/i },
  ];

  for (const cs of chatSignatures) {
    if (cs.pattern.test(html)) {
      return {
        hasLiveChat: true,
        provider: cs.name,
      };
    }
  }

  return { hasLiveChat: false };
}

/**
 * Detects CMS, framework, and analytics technology signatures
 */
export function extractTechnologyIndicators(html: string, headers?: Record<string, string>): {
  cmsOrFramework?: string;
  analyticsOrTracking: string[];
  hostingOrCdn?: string;
} {
  const analytics: string[] = [];
  let cmsOrFramework: string | undefined = undefined;
  let hostingOrCdn: string | undefined = undefined;

  if (!html) return { analyticsOrTracking: [] };

  // CMS / Framework Detection
  if (html.includes('wp-content') || html.includes('wp-includes')) {
    cmsOrFramework = 'WordPress';
  } else if (html.includes('cdn.shopify.com') || html.includes('Shopify.shop')) {
    cmsOrFramework = 'Shopify';
  } else if (html.includes('assets.squarespace.com')) {
    cmsOrFramework = 'Squarespace';
  } else if (html.includes('static.wixstatic.com') || html.includes('_wix_')) {
    cmsOrFramework = 'Wix';
  } else if (html.includes('assets.website-files.com') || html.includes('webflow.com')) {
    cmsOrFramework = 'Webflow';
  } else if (html.includes('__NEXT_DATA__')) {
    cmsOrFramework = 'Next.js (React)';
  } else if (html.includes('id="__nuxt"')) {
    cmsOrFramework = 'Nuxt.js (Vue)';
  }

  // Analytics & Conversion Tracking
  if (html.includes('googletagmanager.com/gtm.js') || html.includes('GTM-')) {
    analytics.push('Google Tag Manager');
  }
  if (html.includes('google-analytics.com') || html.includes('gtag(') || html.includes('G-')) {
    analytics.push('Google Analytics 4');
  }
  if (html.includes('connect.facebook.net') || html.includes('fbq(')) {
    analytics.push('Meta Pixel');
  }
  if (html.includes('hotjar.com')) {
    analytics.push('Hotjar Heatmaps');
  }

  // Server Headers / CDN
  if (headers) {
    const server = headers['server']?.toLowerCase() || '';
    const via = headers['via']?.toLowerCase() || '';
    if (server.includes('cloudflare') || headers['cf-ray']) {
      hostingOrCdn = 'Cloudflare';
    } else if (server.includes('vercel') || headers['x-vercel-id']) {
      hostingOrCdn = 'Vercel';
    } else if (server.includes('nginx')) {
      hostingOrCdn = 'Nginx';
    } else if (server.includes('apache')) {
      hostingOrCdn = 'Apache';
    }
  }

  return {
    cmsOrFramework,
    analyticsOrTracking: Array.from(new Set(analytics)),
    hostingOrCdn,
  };
}
