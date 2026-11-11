import type { SocialProfiles, DiscoveredSubpages, BusinessHours } from '@/types';

export type FootprintVerificationStatus = 'VERIFIED' | 'NOT_FOUND' | 'NOT_CHECKED' | 'UNAVAILABLE';

export type ConversionSignalType =
  | 'contact_form'
  | 'online_booking'
  | 'quote_request'
  | 'whatsapp_link'
  | 'live_chat_widget'
  | 'click_to_call'
  | 'phone_number';

export interface ConversionInfrastructure {
  hasContactForm: boolean;
  contactFormUrl?: string;
  hasOnlineBooking: boolean;
  bookingProvider?: string; // e.g. Calendly, Acuity, Booksy, Housecall Pro, Vagaro, Square
  bookingUrl?: string;
  hasQuoteRequest: boolean;
  quoteUrl?: string;
  hasWhatsAppLink: boolean;
  whatsAppNumber?: string;
  hasLiveChat: boolean;
  liveChatProvider?: string; // e.g. Tidio, Intercom, Zendesk, Crisp, LiveChat, Drift
  hasClickToCall: boolean;
  detectedPhoneNumbers: string[];
}

export interface TechnologyIndicators {
  cmsOrFramework?: string; // e.g. WordPress, Shopify, Next.js, Webflow, Squarespace, Wix, Joomla
  analyticsOrTracking: string[]; // e.g. Google Analytics 4, Meta Pixel, GTM
  hostingOrCdn?: string; // e.g. Cloudflare, Vercel, AWS, WP Engine
  isResponsive: boolean;
  isHttps: boolean;
}

export interface DigitalPresenceGap {
  code: string;
  category: 'website' | 'conversion' | 'social' | 'seo' | 'consistency';
  title: string;
  description: string;
  status: FootprintVerificationStatus;
  commercialOpportunity: string;
}

export interface FootprintFinding {
  businessId: string;
  findingType: string;
  extractedValue: string;
  sourceName: string;
  sourceUrl?: string;
  discoveryTimestamp: string;
  verificationStatus: FootprintVerificationStatus;
  confidenceScore: number; // 0 - 100
  limitation?: string;
}

export interface DimensionScore {
  name: string;
  score: number;
  maxScore: number;
  weight: number;
  rationale: string[];
}

export interface DigitalPresenceScoreResult {
  totalScore: number; // 0 - 100
  confidenceLevel: 'high' | 'medium' | 'low';
  dimensionBreakdown: {
    websiteAccessibility: DimensionScore;
    conversionInfrastructure: DimensionScore;
    verifiedSocialPresence: DimensionScore;
    contentAndSearchDepth: DimensionScore;
    informationConsistency: DimensionScore;
  };
  detectedGaps: DigitalPresenceGap[];
  strengths: string[];
  findings: FootprintFinding[];
}

export interface DigitalFootprintResult {
  businessId: string;
  websiteStatus: FootprintVerificationStatus;
  websiteUrl?: string;
  isHttps: boolean;
  latencyMs?: number;
  httpStatusCode?: number;
  title?: string;
  description?: string;
  coreServices: string[];
  subpages: DiscoveredSubpages;
  socialProfiles: SocialProfiles;
  conversionInfrastructure: ConversionInfrastructure;
  technologyIndicators: TechnologyIndicators;
  businessHours?: BusinessHours;
  presenceScore: DigitalPresenceScoreResult;
  findings: FootprintFinding[];
  sourceUrls: string[];
}
