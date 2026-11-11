import { safeFetch } from '../ssrfGuard';
import type {
  SocialProfiles,
  DiscoveredSubpages,
  BusinessHours,
  Business,
} from '@/types';

// Generic tracking and share intent parameters to strip
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

// Third-party CMS or web builder profiles to filter out
const THIRD_PARTY_BLACKLIST = new Set([
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
 * Extracts and canonicalizes official social media profile URLs from website HTML.
 * Strictly adheres to permitted footprint inspection without external site scraping.
 */
export function extractSocialMediaProfiles(html: string, baseUrl: string): SocialProfiles {
  const profiles: SocialProfiles = {};
  if (!html) return profiles;

  // Extract all href URLs from HTML anchor tags
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  const rawUrls: string[] = [];

  while ((match = hrefRegex.exec(html)) !== null) {
    const raw = match[1]?.trim();
    if (raw && !raw.startsWith('#') && !raw.startsWith('javascript:') && !raw.startsWith('mailto:')) {
      rawUrls.push(raw);
    }
  }

  for (const raw of rawUrls) {
    try {
      // Resolve URL if relative (rare for social links, but handles edge cases)
      let candidate = raw;
      if (candidate.startsWith('//')) {
        candidate = `https:${candidate}`;
      } else if (!candidate.startsWith('http://') && !candidate.startsWith('https://')) {
        continue;
      }

      const parsed = new URL(candidate);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
      const pathname = parsed.pathname.replace(/\/+$/, '');

      // Strip tracking query parameters
      for (const p of TRACKING_PARAMS) {
        parsed.searchParams.delete(p);
      }

      // 1. LinkedIn Company Page
      if (host === 'linkedin.com' || host.endsWith('.linkedin.com')) {
        if (
          !pathname.includes('/shareArticle') &&
          !pathname.includes('/sharing') &&
          !pathname.includes('/help') &&
          !pathname.includes('/search')
        ) {
          const matchCompany = pathname.match(/^\/(?:company|school)\/([^/]+)/i);
          if (matchCompany && !THIRD_PARTY_BLACKLIST.has(matchCompany[1].toLowerCase())) {
            profiles.linkedin = `https://www.linkedin.com/company/${matchCompany[1]}`;
          }
        }
      }

      // 2. Facebook Profile or Page
      else if (host === 'facebook.com' || host === 'fb.me' || host.endsWith('.facebook.com')) {
        if (
          !pathname.includes('/sharer') &&
          !pathname.includes('/share') &&
          !pathname.includes('/dialog') &&
          !pathname.includes('/plugins') &&
          !pathname.includes('/tr') &&
          !pathname.includes('/events')
        ) {
          const parts = pathname.split('/').filter(Boolean);
          const handle = parts[0]?.toLowerCase();
          if (handle && !THIRD_PARTY_BLACKLIST.has(handle) && parts[0].length >= 3) {
            profiles.facebook = `https://www.facebook.com/${parts[0]}`;
          }
        }
      }

      // 3. Instagram Profile
      else if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
        if (
          !pathname.includes('/p/') &&
          !pathname.includes('/explore') &&
          !pathname.includes('/accounts') &&
          !pathname.includes('/reel') &&
          !pathname.includes('/stories')
        ) {
          const parts = pathname.split('/').filter(Boolean);
          const handle = parts[0]?.toLowerCase();
          if (handle && !THIRD_PARTY_BLACKLIST.has(handle) && parts[0].length >= 2) {
            profiles.instagram = `https://www.instagram.com/${parts[0]}`;
          }
        }
      }

      // 4. YouTube Channel or Profile
      else if (host === 'youtube.com' || host === 'youtu.be' || host.endsWith('.youtube.com')) {
        if (
          !pathname.includes('/watch') &&
          !pathname.includes('/embed') &&
          !pathname.includes('/feed') &&
          !pathname.includes('/shorts')
        ) {
          const parts = pathname.split('/').filter(Boolean);
          if (parts.length > 0) {
            const firstPart = parts[0].toLowerCase();
            if (firstPart.startsWith('@')) {
              profiles.youtube = `https://www.youtube.com/${parts[0]}`;
            } else if (
              (firstPart === 'channel' || firstPart === 'c' || firstPart === 'user') &&
              parts[1] &&
              !THIRD_PARTY_BLACKLIST.has(parts[1].toLowerCase())
            ) {
              profiles.youtube = `https://www.youtube.com/${parts[0]}/${parts[1]}`;
            }
          }
        }
      }

      // 5. X / Twitter Profile
      else if (
        host === 'twitter.com' ||
        host === 'x.com' ||
        host.endsWith('.twitter.com') ||
        host.endsWith('.x.com')
      ) {
        if (!pathname.includes('/intent') && !pathname.includes('/share') && !pathname.includes('/i/')) {
          const parts = pathname.split('/').filter(Boolean);
          const handle = parts[0]?.toLowerCase();
          if (handle && !THIRD_PARTY_BLACKLIST.has(handle) && parts[0].length >= 2) {
            profiles.twitter = `https://x.com/${parts[0]}`;
          }
        }
      }

      // 6. TikTok Profile
      else if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
        if (!pathname.includes('/share') && !pathname.includes('/tag') && !pathname.includes('/music')) {
          const parts = pathname.split('/').filter(Boolean);
          if (parts[0] && parts[0].startsWith('@')) {
            profiles.tiktok = `https://www.tiktok.com/${parts[0]}`;
          }
        }
      }

      // 7. Pinterest Profile
      else if (host === 'pinterest.com' || host.endsWith('.pinterest.com')) {
        if (!pathname.includes('/pin') && !pathname.includes('/create')) {
          const parts = pathname.split('/').filter(Boolean);
          const handle = parts[0]?.toLowerCase();
          if (handle && !THIRD_PARTY_BLACKLIST.has(handle) && parts[0].length >= 2) {
            profiles.pinterest = `https://www.pinterest.com/${parts[0]}`;
          }
        }
      }
    } catch {
      // Ignored malformed URL string
    }
  }

  return profiles;
}

/**
 * Discovers internal business subpages (About, Contact, Services, Team) from homepage HTML.
 */
export function extractSubpages(html: string, baseUrl: string): DiscoveredSubpages {
  const subpages: DiscoveredSubpages = {};
  if (!html || !baseUrl) return subpages;

  try {
    const baseObj = new URL(baseUrl);
    const baseHost = baseObj.hostname.toLowerCase();
    const baseOrigin = baseObj.origin;

    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(html)) !== null) {
      const rawHref = match[1]?.trim();
      const anchorText = match[2]?.replace(/<[^>]+>/g, '').trim().toLowerCase() || '';

      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
        continue;
      }

      let resolved: URL;
      try {
        resolved = new URL(rawHref, baseOrigin);
      } catch {
        continue;
      }

      // Restrict crawling strictly to same origin
      if (resolved.hostname.toLowerCase() !== baseHost) {
        continue;
      }

      const path = resolved.pathname.toLowerCase();

      // About page
      if (
        !subpages.aboutPageUrl &&
        (path.match(/\b(about|about-us|company|our-story|who-we-are)\b/i) ||
          anchorText.match(/^(?:about|about us|who we are|our story|company)$/i))
      ) {
        subpages.aboutPageUrl = resolved.toString();
      }

      // Contact page
      if (
        !subpages.contactPageUrl &&
        (path.match(/\b(contact|contact-us|reach-us|get-in-touch)\b/i) ||
          anchorText.match(/^(?:contact|contact us|get in touch|reach us)$/i))
      ) {
        subpages.contactPageUrl = resolved.toString();
      }

      // Services page
      if (
        !subpages.servicesPageUrl &&
        (path.match(/\b(services|our-services|what-we-do|capabilities|solutions)\b/i) ||
          anchorText.match(/^(?:services|our services|what we do|capabilities)$/i))
      ) {
        subpages.servicesPageUrl = resolved.toString();
      }

      // Team / Leadership page
      if (
        !subpages.teamPageUrl &&
        (path.match(/\b(team|our-team|leadership|staff|management)\b/i) ||
          anchorText.match(/^(?:team|our team|leadership|meet the team|our staff)$/i))
      ) {
        subpages.teamPageUrl = resolved.toString();
      }

      // Careers page
      if (
        !subpages.careersPageUrl &&
        (path.match(/\b(careers|jobs|join-our-team)\b/i) ||
          anchorText.match(/^(?:careers|jobs|join our team)$/i))
      ) {
        subpages.careersPageUrl = resolved.toString();
      }

      // Privacy policy
      if (
        !subpages.privacyPolicyUrl &&
        (path.match(/\b(privacy|privacy-policy|terms)\b/i) ||
          anchorText.match(/^(?:privacy policy|terms of service|privacy)$/i))
      ) {
        subpages.privacyPolicyUrl = resolved.toString();
      }
    }
  } catch {
    // URL resolution failed
  }

  return subpages;
}

/**
 * Extracts business description from meta tags or intro paragraph.
 */
export function extractBusinessDescription(html: string): string | undefined {
  if (!html) return undefined;

  // 1. Meta Description
  const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i) ||
    html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);

  if (metaDescMatch && metaDescMatch[1]?.trim().length >= 20) {
    return metaDescMatch[1].trim().replace(/\s+/g, ' ').substring(0, 400);
  }

  // 2. Intro Paragraph
  const pMatch = html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
  if (pMatch) {
    const cleanText = pMatch[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
    if (cleanText.length >= 40 && cleanText.length <= 400) {
      return cleanText;
    }
  }

  return undefined;
}

/**
 * Extracts business operating hours from JSON-LD schema or plain text.
 */
export function extractBusinessHours(html: string): BusinessHours | undefined {
  if (!html) return undefined;

  const hours: string[] = [];

  // 1. JSON-LD schema.org openingHours
  const jsonLdMatches = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const scriptTag of jsonLdMatches) {
    try {
      const content = scriptTag.replace(/<script[^>]*>|<\/script>/gi, '').trim();
      const parsed = JSON.parse(content);
      const candidates = Array.isArray(parsed) ? parsed : [parsed, ...(parsed['@graph'] || [])];

      for (const item of candidates) {
        if (item && (item['@type'] === 'LocalBusiness' || item['@type']?.includes?.('Business') || item['openingHours'])) {
          if (Array.isArray(item.openingHours)) {
            hours.push(...item.openingHours);
          } else if (typeof item.openingHours === 'string') {
            hours.push(item.openingHours);
          }
        }
      }
    } catch {
      // Invalid JSON-LD block
    }
  }

  // 2. Common Text Patterns (e.g. "Mon - Fri: 8:00 AM - 5:00 PM", "24/7 Emergency Service")
  if (hours.length === 0) {
    const textHours = html.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-zA-Z\s,-]*:\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\s*[-–to]\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?/gi);
    if (textHours && textHours.length > 0) {
      hours.push(...Array.from(new Set(textHours.map((t) => t.trim()))).slice(0, 5));
    } else if (/24\s*\/\s*7\s*(?:emergency|service|available)/i.test(html)) {
      hours.push('24/7 Emergency Service Available');
    }
  }

  if (hours.length > 0) {
    return {
      regularHours: hours,
      isOpenNow: undefined,
      rawText: hours.join('; '),
    };
  }

  return undefined;
}

/**
 * Extracts list of services offered from HTML.
 */
export function extractServices(html: string): string[] {
  if (!html) return [];

  const services = new Set<string>();

  // Look for headings in service sections or bullet lists
  const serviceRegex = /<(?:h2|h3|h4|li)\b[^>]*>([\s\S]*?)<\/(?:h2|h3|h4|li)>/gi;
  let match: RegExpExecArray | null;

  while ((match = serviceRegex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
    if (
      text.length >= 4 &&
      text.length <= 45 &&
      !text.includes('&copy;') &&
      !text.includes('Copyright') &&
      !text.includes('Contact Us') &&
      !text.includes('About Us') &&
      !text.includes('Home') &&
      !text.includes('Privacy') &&
      !text.includes('Terms') &&
      /(?:repair|installation|service|maintenance|system|cooling|heating|plumbing|roofing|replacement|contracting|inspection|tuning|cleaning|electric|solar)/i.test(text)
    ) {
      services.add(text);
      if (services.size >= 8) break;
    }
  }

  return Array.from(services);
}

/**
 * Extracts contact form endpoint URL from HTML.
 */
export function extractContactFormUrl(html: string, baseUrl: string): string | undefined {
  if (!html || !baseUrl) return undefined;

  try {
    const baseOrigin = new URL(baseUrl).origin;
    const formMatch = html.match(/<form\b[^>]*?\s+action=["']([^"']+)["'][^>]*>/i);
    if (formMatch && formMatch[1]) {
      const action = formMatch[1].trim();
      if (action && !action.startsWith('javascript:')) {
        return new URL(action, baseOrigin).toString();
      }
    }
  } catch {
    // Ignored
  }

  return undefined;
}

/**
 * Performs complete, SSRF-safe digital footprint discovery for a business:
 * 1. Social profiles (LinkedIn, FB, IG, YouTube, X, TikTok, Pinterest).
 * 2. Subpages (About, Contact, Services, Team).
 * 3. Safely inspects contact/about pages for extra emails, phone numbers, hours, description.
 */
export async function discoverCompleteDigitalFootprint(
  homepageUrl: string,
  homepageHtml: string
): Promise<{
  socialProfiles: SocialProfiles;
  subpages: DiscoveredSubpages;
  additionalEmails: string[];
  additionalPhones: string[];
  contactFormUrl?: string;
  businessHours?: BusinessHours;
  description?: string;
  services: string[];
  sourceUrls: string[];
}> {
  const sourceUrls: string[] = [homepageUrl];
  const socialProfiles = extractSocialMediaProfiles(homepageHtml, homepageUrl);
  const subpages = extractSubpages(homepageHtml, homepageUrl);
  const description = extractBusinessDescription(homepageHtml);
  let businessHours = extractBusinessHours(homepageHtml);
  let contactFormUrl = extractContactFormUrl(homepageHtml, homepageUrl);
  const services = extractServices(homepageHtml);

  const additionalEmails: string[] = [];
  const additionalPhones: string[] = [];

  // If a contact page is detected, safely fetch it (tight 3000ms timeout) to discover contact form, hours, extra phones
  if (subpages.contactPageUrl) {
    try {
      sourceUrls.push(subpages.contactPageUrl);
      const contactRes = await safeFetch(subpages.contactPageUrl, {
        timeoutMs: 3000,
        maxRedirects: 2,
        maxBytes: 1024 * 1024,
      });

      if (contactRes.ok && contactRes.text) {
        const cHtml = contactRes.text;

        // Extra emails
        const emails = (cHtml.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi) || [])
          .map((e) => e.toLowerCase())
          .filter((e) => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.includes('example.com') && !e.includes('sentry.io'));
        additionalEmails.push(...Array.from(new Set(emails)).slice(0, 5));

        // Extra phones
        const telMatches = (cHtml.match(/href=["']tel:([^"']*)["']/gi) || []).map((t) =>
          t.replace(/href=["']tel:/i, '').replace(/["']/g, '').trim()
        );
        const textPhones = cHtml.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [];
        additionalPhones.push(...Array.from(new Set([...telMatches, ...textPhones])).slice(0, 3));

        // Contact form
        if (!contactFormUrl) {
          contactFormUrl = extractContactFormUrl(cHtml, subpages.contactPageUrl) || subpages.contactPageUrl;
        }

        // Hours from contact page if missing from homepage
        if (!businessHours) {
          businessHours = extractBusinessHours(cHtml);
        }
      }
    } catch {
      // Safe fallback: Missing contact page must NEVER fail the audit
    }
  }

  return {
    socialProfiles,
    subpages,
    additionalEmails: Array.from(new Set(additionalEmails)),
    additionalPhones: Array.from(new Set(additionalPhones)),
    contactFormUrl,
    businessHours,
    description,
    services,
    sourceUrls: Array.from(new Set(sourceUrls)),
  };
}
