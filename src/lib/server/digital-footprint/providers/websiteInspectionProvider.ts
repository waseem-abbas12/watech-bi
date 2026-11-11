import { safeFetch } from '../../ssrfGuard';
import {
  extractSocialMediaProfiles,
  extractSubpages,
  extractBusinessDescription,
  extractServices,
  extractBusinessHours,
  extractContactFormUrl,
} from '../../pipeline/websiteExtractor';
import {
  canonicalizeUrl,
  extractWhatsAppSignal,
  extractBookingSignal,
  extractLiveChatSignal,
  extractTechnologyIndicators,
  verifySocialProfileRelevance,
} from '../verification';
import type {
  FootprintFinding,
  ConversionInfrastructure,
  TechnologyIndicators,
  FootprintVerificationStatus,
} from '../types';
import type { SocialProfiles, DiscoveredSubpages, BusinessHours } from '@/types';

export interface WebsiteInspectionResult {
  status: FootprintVerificationStatus;
  canonicalUrl?: string;
  isHttps: boolean;
  httpStatusCode?: number;
  latencyMs?: number;
  title?: string;
  description?: string;
  coreServices: string[];
  subpages: DiscoveredSubpages;
  socialProfiles: SocialProfiles;
  conversionInfrastructure: ConversionInfrastructure;
  technologyIndicators: TechnologyIndicators;
  businessHours?: BusinessHours;
  findings: FootprintFinding[];
  sourceUrls: string[];
}

export class WebsiteInspectionProvider {
  readonly name = 'website_inspection';
  readonly displayName = 'Official Website Direct Inspection';

  async inspect(
    rawUrl: string,
    businessId: string,
    businessName: string
  ): Promise<WebsiteInspectionResult> {
    const findings: FootprintFinding[] = [];
    const sourceUrls: string[] = [];
    const now = new Date().toISOString();

    const canonicalUrl = canonicalizeUrl(rawUrl);
    if (!canonicalUrl) {
      return this.createNotFoundResult(businessId, 'Invalid or missing website URL');
    }

    sourceUrls.push(canonicalUrl);
    const isHttps = canonicalUrl.toLowerCase().startsWith('https://');

    const start = Date.now();
    try {
      const fetchResult = await safeFetch(canonicalUrl, {
        timeoutMs: 8000,
        maxRedirects: 3,
        maxBytes: 1.5 * 1024 * 1024,
      });

      const latencyMs = Date.now() - start;

      if (!fetchResult.ok || !fetchResult.text) {
        findings.push({
          businessId,
          findingType: 'website_availability',
          extractedValue: `HTTP ${fetchResult.status || 0}`,
          sourceName: this.displayName,
          sourceUrl: canonicalUrl,
          discoveryTimestamp: now,
          verificationStatus: 'UNAVAILABLE',
          confidenceScore: 90,
          limitation: fetchResult.error || `Server returned HTTP status ${fetchResult.status}`,
        });

        return {
          status: 'UNAVAILABLE',
          canonicalUrl,
          isHttps,
          httpStatusCode: fetchResult.status,
          latencyMs,
          coreServices: [],
          subpages: {},
          socialProfiles: {},
          conversionInfrastructure: this.createEmptyConversion(),
          technologyIndicators: {
            isHttps,
            isResponsive: false,
            analyticsOrTracking: [],
          },
          findings,
          sourceUrls,
        };
      }

      const html = fetchResult.text;
      const headers = (fetchResult as any).headers || {};

      // 1. Title Extraction
      const titleMatch = html.match(/<title\b[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : undefined;
      if (title) {
        findings.push({
          businessId,
          findingType: 'website_title',
          extractedValue: title,
          sourceName: this.displayName,
          sourceUrl: canonicalUrl,
          discoveryTimestamp: now,
          verificationStatus: 'VERIFIED',
          confidenceScore: 95,
        });
      }

      // 2. Meta Description
      const description = extractBusinessDescription(html);
      if (description) {
        findings.push({
          businessId,
          findingType: 'website_description',
          extractedValue: description,
          sourceName: this.displayName,
          sourceUrl: canonicalUrl,
          discoveryTimestamp: now,
          verificationStatus: 'VERIFIED',
          confidenceScore: 90,
        });
      }

      // 3. Services
      const coreServices = extractServices(html);
      if (coreServices.length > 0) {
        findings.push({
          businessId,
          findingType: 'core_services',
          extractedValue: coreServices.join(', '),
          sourceName: this.displayName,
          sourceUrl: canonicalUrl,
          discoveryTimestamp: now,
          verificationStatus: 'VERIFIED',
          confidenceScore: 85,
        });
      }

      // 4. Subpages
      const subpages = extractSubpages(html, canonicalUrl);
      if (subpages.contactPageUrl) sourceUrls.push(subpages.contactPageUrl);
      if (subpages.servicesPageUrl) sourceUrls.push(subpages.servicesPageUrl);

      // 5. Social Profiles
      const rawSocials = extractSocialMediaProfiles(html, canonicalUrl);
      const verifiedSocials: SocialProfiles = {};

      for (const [platform, profileUrl] of Object.entries(rawSocials)) {
        if (!profileUrl) continue;
        const rel = verifySocialProfileRelevance(profileUrl, businessName, canonicalUrl);
        if (rel.isVerified) {
          (verifiedSocials as any)[platform] = profileUrl;
          sourceUrls.push(profileUrl);
          findings.push({
            businessId,
            findingType: `social_${platform}`,
            extractedValue: profileUrl,
            sourceName: this.displayName,
            sourceUrl: canonicalUrl,
            discoveryTimestamp: now,
            verificationStatus: 'VERIFIED',
            confidenceScore: rel.confidence,
          });
        }
      }

      // 6. Conversion Infrastructure
      const waSignal = extractWhatsAppSignal(html);
      const bookingSignal = extractBookingSignal(html);
      const chatSignal = extractLiveChatSignal(html);
      const contactFormUrl = extractContactFormUrl(html, canonicalUrl);

      // Tel phone numbers
      const telMatches = (html.match(/href=["']tel:([^"']*)["']/gi) || []).map((t) =>
        t.replace(/href=["']tel:/i, '').replace(/["']/g, '').trim()
      );
      const uniquePhones = Array.from(new Set(telMatches.filter(Boolean)));

      const conversionInfrastructure: ConversionInfrastructure = {
        hasContactForm: Boolean(contactFormUrl || subpages.contactPageUrl),
        contactFormUrl: contactFormUrl || subpages.contactPageUrl,
        hasOnlineBooking: bookingSignal.hasBooking,
        bookingProvider: bookingSignal.provider,
        bookingUrl: bookingSignal.url,
        hasQuoteRequest: html.includes('quote') || html.includes('estimate'),
        quoteUrl: subpages.contactPageUrl,
        hasWhatsAppLink: waSignal.hasWhatsApp,
        whatsAppNumber: waSignal.number,
        hasLiveChat: chatSignal.hasLiveChat,
        liveChatProvider: chatSignal.provider,
        hasClickToCall: uniquePhones.length > 0,
        detectedPhoneNumbers: uniquePhones,
      };

      if (conversionInfrastructure.hasContactForm) {
        findings.push({
          businessId,
          findingType: 'conversion_contact_form',
          extractedValue: conversionInfrastructure.contactFormUrl || 'Detected on page',
          sourceName: this.displayName,
          sourceUrl: canonicalUrl,
          discoveryTimestamp: now,
          verificationStatus: 'VERIFIED',
          confidenceScore: 90,
        });
      }
      if (conversionInfrastructure.hasOnlineBooking) {
        findings.push({
          businessId,
          findingType: 'conversion_online_booking',
          extractedValue: `${conversionInfrastructure.bookingProvider || 'Booking Widget'} (${conversionInfrastructure.bookingUrl || 'embedded'})`,
          sourceName: this.displayName,
          sourceUrl: canonicalUrl,
          discoveryTimestamp: now,
          verificationStatus: 'VERIFIED',
          confidenceScore: 95,
        });
      }
      if (conversionInfrastructure.hasWhatsAppLink) {
        findings.push({
          businessId,
          findingType: 'conversion_whatsapp',
          extractedValue: conversionInfrastructure.whatsAppNumber || 'WhatsApp Chat Link',
          sourceName: this.displayName,
          sourceUrl: canonicalUrl,
          discoveryTimestamp: now,
          verificationStatus: 'VERIFIED',
          confidenceScore: 90,
        });
      }

      // 7. Technology Indicators
      const tech = extractTechnologyIndicators(html, headers);
      const isResponsive = html.includes('name="viewport"') || html.includes("name='viewport'");

      const technologyIndicators: TechnologyIndicators = {
        cmsOrFramework: tech.cmsOrFramework,
        analyticsOrTracking: tech.analyticsOrTracking,
        hostingOrCdn: tech.hostingOrCdn,
        isResponsive,
        isHttps,
      };

      if (tech.cmsOrFramework) {
        findings.push({
          businessId,
          findingType: 'technology_cms',
          extractedValue: tech.cmsOrFramework,
          sourceName: this.displayName,
          sourceUrl: canonicalUrl,
          discoveryTimestamp: now,
          verificationStatus: 'VERIFIED',
          confidenceScore: 85,
        });
      }

      // 8. Hours
      const businessHours = extractBusinessHours(html);

      findings.push({
        businessId,
        findingType: 'website_availability',
        extractedValue: `ONLINE (HTTP ${fetchResult.status}, ${latencyMs}ms)`,
        sourceName: this.displayName,
        sourceUrl: canonicalUrl,
        discoveryTimestamp: now,
        verificationStatus: 'VERIFIED',
        confidenceScore: 100,
      });

      return {
        status: 'VERIFIED',
        canonicalUrl,
        isHttps,
        httpStatusCode: fetchResult.status,
        latencyMs,
        title,
        description,
        coreServices,
        subpages,
        socialProfiles: verifiedSocials,
        conversionInfrastructure,
        technologyIndicators,
        businessHours,
        findings,
        sourceUrls: Array.from(new Set(sourceUrls)),
      };
    } catch (err: any) {
      findings.push({
        businessId,
        findingType: 'website_availability',
        extractedValue: 'ERROR',
        sourceName: this.displayName,
        sourceUrl: canonicalUrl,
        discoveryTimestamp: now,
        verificationStatus: 'UNAVAILABLE',
        confidenceScore: 80,
        limitation: err.message || 'Inspection network failure',
      });

      return {
        status: 'UNAVAILABLE',
        canonicalUrl,
        isHttps,
        coreServices: [],
        subpages: {},
        socialProfiles: {},
        conversionInfrastructure: this.createEmptyConversion(),
        technologyIndicators: {
          isHttps,
          isResponsive: false,
          analyticsOrTracking: [],
        },
        findings,
        sourceUrls,
      };
    }
  }

  private createNotFoundResult(businessId: string, reason: string): WebsiteInspectionResult {
    return {
      status: 'NOT_FOUND',
      isHttps: false,
      coreServices: [],
      subpages: {},
      socialProfiles: {},
      conversionInfrastructure: this.createEmptyConversion(),
      technologyIndicators: {
        isHttps: false,
        isResponsive: false,
        analyticsOrTracking: [],
      },
      findings: [
        {
          businessId,
          findingType: 'website_availability',
          extractedValue: 'NOT_FOUND',
          sourceName: this.displayName,
          discoveryTimestamp: new Date().toISOString(),
          verificationStatus: 'NOT_FOUND',
          confidenceScore: 90,
          limitation: reason,
        },
      ],
      sourceUrls: [],
    };
  }

  private createEmptyConversion(): ConversionInfrastructure {
    return {
      hasContactForm: false,
      hasOnlineBooking: false,
      hasQuoteRequest: false,
      hasWhatsAppLink: false,
      hasLiveChat: false,
      hasClickToCall: false,
      detectedPhoneNumbers: [],
    };
  }
}

export const websiteInspectionProvider = new WebsiteInspectionProvider();
