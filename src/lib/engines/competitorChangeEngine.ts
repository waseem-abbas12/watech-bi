import type {
  CompetitorWatchItem,
  CompetitorSnapshot,
  CompetitorChange,
  CompetitorChangeType,
} from '@/types';

/**
 * Validates target URL against SSRF and private IP ranges
 */
export function isSafePublicUrl(urlString: string): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: 'Invalid protocol: only HTTP and HTTPS are permitted.' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Loopback & local hosts
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return { safe: false, reason: 'Access to loopback or local hostnames is strictly prohibited.' };
    }

    // Cloud metadata services
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
      return { safe: false, reason: 'Access to cloud metadata IP is blocked.' };
    }

    // IPv4 private ranges
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const p1 = parseInt(ipv4Match[1], 10);
      const p2 = parseInt(ipv4Match[2], 10);

      // 10.0.0.0/8
      if (p1 === 10) return { safe: false, reason: 'Private IP range (10.x.x.x) is blocked.' };
      // 172.16.0.0/12
      if (p1 === 172 && p2 >= 16 && p2 <= 31) return { safe: false, reason: 'Private IP range (172.16-31.x.x) is blocked.' };
      // 192.168.0.0/16
      if (p1 === 192 && p2 === 168) return { safe: false, reason: 'Private IP range (192.168.x.x) is blocked.' };
      // 127.0.0.0/8
      if (p1 === 127) return { safe: false, reason: 'Loopback IP range is blocked.' };
    }

    return { safe: true };
  } catch (err: any) {
    return { safe: false, reason: err.message || 'Malformed URL format' };
  }
}

/**
 * Extracts structured intelligence snapshot from raw HTML string
 */
export function parseCompetitorHtml(
  html: string,
  watchId: string,
  httpStatus: number = 200
): CompetitorSnapshot {
  // Safe regex-based extraction to work in both browser and Node runtime
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : 'No Title Detected';

  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';

  // Extract H1 and H2 headings
  const headings: string[] = [];
  const headingRegex = /<h[1-2][^>]*>([\s\S]*?)<\/h[1-2]>/gi;
  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(html)) !== null) {
    const cleaned = match[1].replace(/<[^>]+>/g, '').trim();
    if (cleaned && cleaned.length > 3 && cleaned.length < 120 && !headings.includes(cleaned)) {
      headings.push(cleaned);
    }
  }

  // Detect common HVAC and home services
  const knownServices = [
    'AC Repair',
    'AC Installation',
    'Air Conditioning',
    'Heating Repair',
    'Furnace Installation',
    'Heat Pump Service',
    'Duct Cleaning',
    'Indoor Air Quality',
    'Commercial HVAC',
    'Emergency HVAC Service',
    'Maintenance Agreements',
    'Plumbing Services',
    'Thermostat Installation',
  ];

  const lowerHtml = html.toLowerCase();
  const servicesDetected = knownServices.filter(s => lowerHtml.includes(s.toLowerCase()));

  // Detect Call to Actions
  const knownCtas = [
    'Book Online',
    'Schedule Service',
    'Request A Quote',
    'Call Now',
    'Get Estimate',
    'Free Inspection',
    'Contact Us Today',
    'Emergency Service',
  ];
  const ctaTexts = knownCtas.filter(c => lowerHtml.includes(c.toLowerCase()));

  // Detect Promotions / Offers
  const publicOffers: string[] = [];
  const offerPatterns = [
    /\$\d+\s*(?:off|discount|tune-up|diagnostic)/gi,
    /\d+%\s*off/gi,
    /free\s+(?:estimate|consultation|inspection|quote)/gi,
    /0%\s*financing/gi,
  ];

  for (const pat of offerPatterns) {
    const matches = html.match(pat);
    if (matches) {
      for (const match of matches) {
        const cleaned = match.trim();
        if (!publicOffers.includes(cleaned)) {
          publicOffers.push(cleaned);
        }
      }
    }
  }

  // Detect primary phone
  const phoneMatch = html.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const phoneDetected = phoneMatch ? phoneMatch[0].trim() : undefined;

  // Internal links count approximation
  const linkMatches = html.match(/<a[^>]*href=["'][^"']+["']/gi);
  const internalLinksCount = linkMatches ? linkMatches.length : 0;

  return {
    id: `snap-${watchId}-${Date.now()}`,
    watchId,
    capturedAt: new Date().toISOString(),
    httpStatus,
    title,
    metaDescription,
    mainHeadings: headings.slice(0, 10),
    servicesDetected,
    ctaTexts,
    publicOffers: publicOffers.slice(0, 5),
    phoneDetected,
    pageAvailability: httpStatus >= 200 && httpStatus < 400,
    internalLinksCount,
  };
}

/**
 * Compares two snapshots and produces discrete competitor change records with strategic AI impact analysis
 */
export function detectSnapshotDifferences(
  watch: CompetitorWatchItem,
  prev: CompetitorSnapshot,
  curr: CompetitorSnapshot
): CompetitorChange[] {
  const changes: CompetitorChange[] = [];
  const now = new Date().toISOString();

  // 1. Availability / Downtime Check
  if (prev.pageAvailability && !curr.pageAvailability) {
    changes.push({
      id: `chg-${watch.id}-${Date.now()}-1`,
      watchId: watch.id,
      changeType: 'downtime',
      title: `${watch.competitorName} Website Outage`,
      description: `Target domain responded with HTTP ${curr.httpStatus} or unreachable status.`,
      previousValue: `HTTP ${prev.httpStatus} (Online)`,
      currentValue: `HTTP ${curr.httpStatus} (Down)`,
      impactSeverity: 'high',
      aiAnalysis: 'High-urgency opportunity: If client runs paid Google Ads or local search in this zone, competitor outage means captured search volume is ripe for conquest.',
      status: 'new',
      detectedAt: now,
    });
  } else if (!prev.pageAvailability && curr.pageAvailability) {
    changes.push({
      id: `chg-${watch.id}-${Date.now()}-2`,
      watchId: watch.id,
      changeType: 'restored',
      title: `${watch.competitorName} Restored Online`,
      description: `Target domain is accessible again (HTTP ${curr.httpStatus}).`,
      previousValue: `HTTP ${prev.httpStatus} (Outage)`,
      currentValue: `HTTP ${curr.httpStatus} (Online)`,
      impactSeverity: 'low',
      aiAnalysis: 'Website restored. Continue routine scheduled surveillance.',
      status: 'new',
      detectedAt: now,
    });
  }

  // 2. Title Change
  if (prev.title && curr.title && prev.title !== curr.title) {
    changes.push({
      id: `chg-${watch.id}-${Date.now()}-3`,
      watchId: watch.id,
      changeType: 'title_change',
      title: `Page Title Updated`,
      description: `Homepage title tag changed.`,
      previousValue: prev.title,
      currentValue: curr.title,
      impactSeverity: 'medium',
      aiAnalysis: `Competitor may be targeting new keywords or undergoing brand repositioning. Check if new geographic terms were added.`,
      status: 'new',
      detectedAt: now,
    });
  }

  // 3. Meta Description Change
  if (prev.metaDescription !== curr.metaDescription && (prev.metaDescription || curr.metaDescription)) {
    changes.push({
      id: `chg-${watch.id}-${Date.now()}-4`,
      watchId: watch.id,
      changeType: 'description_change',
      title: `Meta Description Modified`,
      description: `Search snippet copy updated.`,
      previousValue: prev.metaDescription || 'None',
      currentValue: curr.metaDescription || 'None',
      impactSeverity: 'low',
      aiAnalysis: 'SERP click-through rate optimization in progress by competitor marketing team.',
      status: 'new',
      detectedAt: now,
    });
  }

  // 4. New Services Detected
  const newServices = curr.servicesDetected.filter(s => !prev.servicesDetected.includes(s));
  for (const s of newServices) {
    changes.push({
      id: `chg-${watch.id}-${Date.now()}-srv-new-${s.replace(/\s+/g, '')}`,
      watchId: watch.id,
      changeType: 'new_service',
      title: `New Service Offered: ${s}`,
      description: `${watch.competitorName} has launched or published offering: "${s}".`,
      previousValue: 'Not advertised',
      currentValue: s,
      impactSeverity: 'high',
      aiAnalysis: `Expansion into ${s} represents direct market encroachment. Advise client to review their own ${s} pricing and positioning.`,
      status: 'new',
      detectedAt: now,
    });
  }

  // 5. Removed Services
  const removedServices = prev.servicesDetected.filter(s => !curr.servicesDetected.includes(s));
  for (const s of removedServices) {
    changes.push({
      id: `chg-${watch.id}-${Date.now()}-srv-rem-${s.replace(/\s+/g, '')}`,
      watchId: watch.id,
      changeType: 'removed_service',
      title: `Discontinued Service: ${s}`,
      description: `${watch.competitorName} removed visible reference to: "${s}".`,
      previousValue: s,
      currentValue: 'No longer advertised',
      impactSeverity: 'medium',
      aiAnalysis: `Competitor may have de-emphasized or exited ${s}. Opportunity for client to capture displaced customer inquiries.`,
      status: 'new',
      detectedAt: now,
    });
  }

  // 6. Promotional Offers Change
  const newOffers = curr.publicOffers.filter(o => !prev.publicOffers.includes(o));
  if (newOffers.length > 0) {
    changes.push({
      id: `chg-${watch.id}-${Date.now()}-promo-new`,
      watchId: watch.id,
      changeType: 'new_promotion',
      title: `New Promotional Campaign Detected`,
      description: `New consumer offers observed: ${newOffers.join(', ')}`,
      previousValue: prev.publicOffers.join(', ') || 'No active promos',
      currentValue: curr.publicOffers.join(', '),
      impactSeverity: 'medium',
      aiAnalysis: 'Aggressive seasonal promotion detected. May increase price resistance in prospects during discovery.',
      status: 'new',
      detectedAt: now,
    });
  }

  // 7. CTA / Conversion Path Changes
  const newCtas = curr.ctaTexts.filter(c => !prev.ctaTexts.includes(c));
  if (newCtas.length > 0) {
    changes.push({
      id: `chg-${watch.id}-${Date.now()}-cta`,
      watchId: watch.id,
      changeType: 'cta_change',
      title: `Conversion Funnel Call-to-Action Updated`,
      description: `New conversion action added: ${newCtas.join(', ')}`,
      previousValue: prev.ctaTexts.join(', ') || 'Standard',
      currentValue: curr.ctaTexts.join(', '),
      impactSeverity: 'medium',
      aiAnalysis: 'Competitor is actively testing conversion friction reduction and digital booking.',
      status: 'new',
      detectedAt: now,
    });
  }

  // 8. Contact Info Change
  if (prev.phoneDetected && curr.phoneDetected && prev.phoneDetected !== curr.phoneDetected) {
    changes.push({
      id: `chg-${watch.id}-${Date.now()}-phone`,
      watchId: watch.id,
      changeType: 'contact_change',
      title: `Primary Phone Number Changed`,
      description: `Observed telephone contact updated.`,
      previousValue: prev.phoneDetected,
      currentValue: curr.phoneDetected,
      impactSeverity: 'medium',
      aiAnalysis: 'Competitor may have switched call tracking numbers or undergone agency change.',
      status: 'new',
      detectedAt: now,
    });
  }

  return changes;
}
