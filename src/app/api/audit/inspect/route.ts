import { NextResponse } from 'next/server';
import { safeFetch } from '@/lib/server/ssrfGuard';
import type {
  WebsiteAudit,
  AuditCategoryScore,
  AuditFinding,
  ScoreBand,
  AuditDimensions,
  AdvancedAuditIssue,
  WatechService,
} from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { url, businessId, projectId } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    const origin = parsedUrl.origin;
    const startTime = Date.now();
    let response: Response;
    let html = '';
    let responseTimeMs = 0;
    const hasSsl = targetUrl.startsWith('https://');

    // 1. Fetch Main HTML via safeFetch (SSRF, DNS Rebinding & Payload Cap)
    const fetchResult = await safeFetch(targetUrl, {
      timeoutMs: 10000,
      maxRedirects: 3,
      maxBytes: 2 * 1024 * 1024,
    });

    if (!fetchResult.ok && fetchResult.status !== 200) {
      return NextResponse.json({
        error: `Could not reach ${targetUrl}: ${fetchResult.error || 'Connection failed'}`,
        failedInspection: true,
      }, { status: fetchResult.status === 403 ? 403 : 502 });
    }

    responseTimeMs = fetchResult.durationMs;
    html = fetchResult.text;

    const lowerHtml = html.toLowerCase();
    const isRedirected = fetchResult.redirectCount > 0;

    // 2. Check Robots.txt & Sitemap.xml
    let robotsTxtAvailable = false;
    let sitemapAvailable = false;

    try {
      const robotsRes = await safeFetch(`${origin}/robots.txt`, { method: 'HEAD', timeoutMs: 2500, maxRedirects: 1 });
      robotsTxtAvailable = robotsRes.status === 200;
    } catch {}

    try {
      const sitemapRes = await safeFetch(`${origin}/sitemap.xml`, { method: 'HEAD', timeoutMs: 2500, maxRedirects: 1 });
      sitemapAvailable = sitemapRes.status === 200;
    } catch {}

    // 3. Technical & SEO DOM Inspections
    // Title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    const titleLength = title.length;
    const isTitleOptimal = titleLength >= 30 && titleLength <= 65;

    // Meta Description
    const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) 
      || html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);
    const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';
    const descLength = metaDescription.length;
    const isDescOptimal = descLength >= 120 && descLength <= 165;

    // Viewport
    const hasViewport = /<meta\s+name=["']viewport["']/i.test(html);

    // Canonical
    const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i);
    const canonical = canonicalMatch ? canonicalMatch[1].trim() : '';

    // Robots directive
    const robotsMetaMatch = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']*)["']/i);
    const robotsMeta = robotsMetaMatch ? robotsMetaMatch[1].toLowerCase() : '';
    const isNoIndex = robotsMeta.includes('noindex');

    // Headings
    const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
    const h2Matches = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) || [];
    const h3Matches = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/gi) || [];

    // Images
    const imgMatches = html.match(/<img[^>]*>/gi) || [];
    const totalImages = imgMatches.length;
    let missingAltCount = 0;
    let unoptimizedFormatCount = 0;

    for (const imgTag of imgMatches) {
      if (!/alt=["'][^"']*["']/i.test(imgTag)) {
        missingAltCount++;
      }
      if (/\.(png|jpg|jpeg)\b/i.test(imgTag) && !/\.(webp|avif|svg)\b/i.test(imgTag)) {
        unoptimizedFormatCount++;
      }
    }

    // Links
    const anchorMatches = html.match(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>/gi) || [];
    let internalLinkCount = 0;
    let externalLinkCount = 0;
    const telMatches = html.match(/href=["']tel:([^"']*)["']/gi) || [];
    const mailtoMatches = html.match(/href=["']mailto:([^"']*)["']/gi) || [];

    for (const anchor of anchorMatches) {
      const hrefMatch = anchor.match(/href=["']([^"']*)["']/i);
      const href = hrefMatch ? hrefMatch[1].trim() : '';
      if (href.startsWith('/') || href.includes(parsedUrl.hostname)) {
        internalLinkCount++;
      } else if (href.startsWith('http')) {
        externalLinkCount++;
      }
    }

    // Lead Capture & Forms
    const formMatches = html.match(/<form[\s\S]*?<\/form>/gi) || [];
    const inputMatches = html.match(/<input\s+/gi) || [];
    const hasBookingWidget = /calendly|acuity|housecall|servicetitan|jobber|schedule|book-now/i.test(html);
    const hasChatWidget = /tidio|crisp\.chat|intercom|hubspot|drift|zendesk/i.test(html);

    // Tracking
    const hasGtm = lowerHtml.includes('googletagmanager.com') || lowerHtml.includes('gtm-');
    const hasGa4 = lowerHtml.includes('gtag(') || lowerHtml.includes('google-analytics.com');
    const hasMetaPixel = lowerHtml.includes('fbq(');

    // Trust & Proof
    const hasReviews = /google\.com\/maps|review|testimonial|bbb\.org|yelp\.com|certified|licensed|insured/i.test(html);
    const hasPricingOrFinancing = /financing|payment-options|\$\d+|\/month|estimate/i.test(html);

    // Schema
    const jsonLdMatches = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
    const hasSchema = jsonLdMatches.length > 0;

    // Optional Google PageSpeed check (timeout after 5 seconds to prevent stalling)
    let pageSpeedData = {
      performance: undefined as number | undefined,
      accessibility: undefined as number | undefined,
      bestPractices: undefined as number | undefined,
      seo: undefined as number | undefined,
      lcp: undefined as string | undefined,
      cls: undefined as string | undefined,
      fid: undefined as string | undefined,
      isAvailable: false,
      notice: 'PageSpeed synthetic audit unconfigured or skipped for speed. Direct TTFB measured.',
    };

    try {
      const psRes = await fetch(
        `https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&strategy=mobile`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (psRes.ok) {
        const psJson = await psRes.json();
        const cats = psJson.lighthouseResult?.categories;
        const auditsObj = psJson.lighthouseResult?.audits;

        if (cats) {
          pageSpeedData = {
            performance: cats.performance ? Math.round(cats.performance.score * 100) : undefined,
            accessibility: cats.accessibility ? Math.round(cats.accessibility.score * 100) : undefined,
            bestPractices: cats['best-practices'] ? Math.round(cats['best-practices'].score * 100) : undefined,
            seo: cats.seo ? Math.round(cats.seo.score * 100) : undefined,
            lcp: auditsObj?.['largest-contentful-paint']?.displayValue,
            cls: auditsObj?.['cumulative-layout-shift']?.displayValue,
            fid: auditsObj?.['max-potential-fid']?.displayValue,
            isAvailable: true,
            notice: 'Google PageSpeed Insights Core Web Vitals retrieved live.',
          };
        }
      }
    } catch {}

    // 4. Calculate 6 Separate Transparent Dimension Scores (0-100)
    // 1) Technical Health
    let techScore = 100;
    if (fetchResult.status !== 200) techScore -= 30;
    if (!hasSsl) techScore -= 30;
    if (!hasViewport) techScore -= 20;
    if (!robotsTxtAvailable) techScore -= 10;
    if (!sitemapAvailable) techScore -= 10;
    if (isNoIndex) techScore -= 40;
    techScore = Math.max(0, techScore);

    // 2) SEO Readiness
    let seoScore = 100;
    if (!title) seoScore -= 25;
    else if (!isTitleOptimal) seoScore -= 10;
    if (!metaDescription) seoScore -= 20;
    else if (!isDescOptimal) seoScore -= 5;
    if (h1Matches.length === 0) seoScore -= 20;
    else if (h1Matches.length > 1) seoScore -= 10;
    if (!hasSchema) seoScore -= 20;
    if (totalImages > 0 && missingAltCount / totalImages > 0.4) seoScore -= 15;
    seoScore = Math.max(0, seoScore);

    // 3) Performance
    let perfScore = 95;
    if (pageSpeedData.performance !== undefined) {
      perfScore = pageSpeedData.performance;
    } else {
      if (responseTimeMs > 2000) perfScore -= 40;
      else if (responseTimeMs > 1000) perfScore -= 20;
      if (html.length > 500000) perfScore -= 15;
      if (unoptimizedFormatCount > 5) perfScore -= 15;
    }
    perfScore = Math.max(0, perfScore);

    // 4) Conversion Readiness
    let convScore = 95;
    if (telMatches.length === 0) convScore -= 25;
    if (formMatches.length === 0 && !hasBookingWidget) convScore -= 30;
    if (!hasBookingWidget) convScore -= 10;
    if (!hasPricingOrFinancing) convScore -= 10;
    convScore = Math.max(0, convScore);

    // 5) User Experience (UX)
    let uxScore = 90;
    if (!hasViewport) uxScore -= 35;
    if (internalLinkCount < 3) uxScore -= 15;
    if (h2Matches.length === 0) uxScore -= 15;
    if (html.length < 2000) uxScore -= 20;
    uxScore = Math.max(0, uxScore);

    // 6) Trust & Credibility
    let trustScore = 90;
    if (!hasReviews) trustScore -= 30;
    if (!hasSsl) trustScore -= 30;
    if (mailtoMatches.length === 0 && telMatches.length === 0) trustScore -= 20;
    trustScore = Math.max(0, trustScore);

    const dimensions: AuditDimensions = {
      technicalHealth: techScore,
      seoReadiness: seoScore,
      performance: perfScore,
      conversionReadiness: convScore,
      userExperience: uxScore,
      trustAndCredibility: trustScore,
    };

    const overallScore = Math.round(
      (techScore + seoScore + perfScore + convScore + uxScore + trustScore) / 6
    );

    let grade: ScoreBand = 'Hold';
    if (overallScore >= 80) grade = 'A';
    else if (overallScore >= 60) grade = 'B';
    else if (overallScore >= 40) grade = 'C';

    // 5. Generate Advanced Audit Issues with Watech Service Mapping
    const advancedIssues: AdvancedAuditIssue[] = [];
    const auditId = `audit-${Date.now()}`;

    // Issue: Viewport
    if (!hasViewport) {
      advancedIssues.push({
        id: `adv-1-${Date.now()}`,
        auditId,
        dimension: 'technical',
        severity: 'critical',
        title: 'Missing Mobile Viewport Configuration',
        whatIsWrong: 'HTML lacks a <meta name="viewport"> tag.',
        evidence: '<head> element has no viewport meta declaration',
        whyItMatters: 'Mobile visitors see the full desktop version zoomed out, leading to immediate abandonment.',
        recommendedFix: 'Inject <meta name="viewport" content="width=device-width, initial-scale=1.0"> and audit CSS breakpoints.',
        expectedBusinessImpact: 'Drastically reduces mobile bounce rate and restores eligibility for Google mobile-first indexing.',
        estimatedEffort: 'low',
        confidence: 1.0,
        matchedWatechService: 'website_development',
      });
    }

    // Issue: SSL
    if (!hasSsl) {
      advancedIssues.push({
        id: `adv-2-${Date.now()}`,
        auditId,
        dimension: 'technical',
        severity: 'critical',
        title: 'Unencrypted HTTP Connection',
        whatIsWrong: 'Website serves traffic over unencrypted HTTP.',
        evidence: `URL protocol: ${targetUrl}`,
        whyItMatters: 'Browsers display a prominent "Not Secure" warning in the address bar.',
        recommendedFix: 'Provision SSL/TLS certificate and enforce automatic HTTPS redirection.',
        expectedBusinessImpact: 'Eliminates security warnings and builds trust with corporate buyers.',
        estimatedEffort: 'low',
        confidence: 1.0,
        matchedWatechService: 'website_development',
      });
    }

    // Issue: Schema JSON-LD
    if (!hasSchema) {
      advancedIssues.push({
        id: `adv-3-${Date.now()}`,
        auditId,
        dimension: 'seo',
        severity: 'high',
        title: 'Missing Schema.org LocalBusiness Structured Data',
        whatIsWrong: 'No application/ld+json structured scripts detected.',
        evidence: '0 JSON-LD scripts found in DOM',
        whyItMatters: 'Search engines cannot identify business address, phone, hours, or service areas for local map packs.',
        recommendedFix: 'Implement Schema.org HVACBusiness / ProfessionalService JSON-LD markup.',
        expectedBusinessImpact: 'Improves visibility in Google Local Pack rankings across target service corridors.',
        estimatedEffort: 'low',
        confidence: 0.95,
        matchedWatechService: 'local_seo',
      });
    }

    // Issue: Phone / Click-to-Call
    if (telMatches.length === 0) {
      advancedIssues.push({
        id: `adv-4-${Date.now()}`,
        auditId,
        dimension: 'conversion',
        severity: 'high',
        title: 'Missing Click-to-Call Phone Links',
        whatIsWrong: 'Phone numbers on the page are plain text without href="tel:..." formatting.',
        evidence: '0 tel: links found in anchor tags',
        whyItMatters: 'Mobile users facing emergency breakdowns cannot tap to call immediately.',
        recommendedFix: 'Deploy a prominent tap-to-call sticky header button with dynamic tracking.',
        expectedBusinessImpact: 'Increases inbound phone call conversion from mobile traffic.',
        estimatedEffort: 'low',
        confidence: 0.95,
        matchedWatechService: 'conversion_optimization',
      });
    }

    // Issue: Lead Capture Form
    if (formMatches.length === 0 && !hasBookingWidget) {
      advancedIssues.push({
        id: `adv-5-${Date.now()}`,
        auditId,
        dimension: 'conversion',
        severity: 'critical',
        title: 'No Digital Quote Request or Booking Form',
        whatIsWrong: 'Landing page contains no interactive form or booking scheduler.',
        evidence: '0 <form> elements or scheduling iframes detected',
        whyItMatters: 'Visitors visiting after business hours cannot submit a structured estimate request.',
        recommendedFix: 'Build a high-converting 2-step estimate request form with instant SMS confirmation.',
        expectedBusinessImpact: 'Captures after-hours commercial inquiries that would otherwise be lost.',
        estimatedEffort: 'medium',
        confidence: 0.9,
        matchedWatechService: 'lead_generation',
      });
    }

    // Issue: H1 Tag
    if (h1Matches.length === 0) {
      advancedIssues.push({
        id: `adv-6-${Date.now()}`,
        auditId,
        dimension: 'seo',
        severity: 'medium',
        title: 'Missing Singular <h1> Tag',
        whatIsWrong: 'No <h1> heading found on the page.',
        evidence: '0 <h1> tags identified in HTML',
        whyItMatters: 'Weakens content hierarchy for accessibility screen readers and organic search algorithms.',
        recommendedFix: 'Add a singular descriptive H1 combining primary service and geographic focus.',
        expectedBusinessImpact: 'Clarifies core service relevance for search engine indexation.',
        estimatedEffort: 'low',
        confidence: 0.95,
        matchedWatechService: 'seo',
      });
    } else if (h1Matches.length > 1) {
      advancedIssues.push({
        id: `adv-7-${Date.now()}`,
        auditId,
        dimension: 'seo',
        severity: 'low',
        title: 'Multiple <h1> Headings Detected',
        whatIsWrong: `Page has ${h1Matches.length} <h1> tags.`,
        evidence: `${h1Matches.length} <h1> tags found`,
        whyItMatters: 'Best practices recommend a singular primary H1 per page for clarity.',
        recommendedFix: 'Demote secondary H1 tags to H2 elements.',
        expectedBusinessImpact: 'Cleans up heading hierarchy for SEO and assistive technologies.',
        estimatedEffort: 'low',
        confidence: 0.9,
        matchedWatechService: 'seo',
      });
    }

    // Issue: Image Alt Tags
    if (missingAltCount > 0) {
      advancedIssues.push({
        id: `adv-8-${Date.now()}`,
        auditId,
        dimension: 'seo',
        severity: 'medium',
        title: `Images Missing Alt Attributes (${missingAltCount}/${totalImages})`,
        whatIsWrong: `${missingAltCount} out of ${totalImages} images do not have descriptive alt attributes.`,
        evidence: `${missingAltCount} <img> tags missing alt attribute`,
        whyItMatters: 'Damages image SEO search rankings and violates ADA / WCAG accessibility guidelines.',
        recommendedFix: 'Add descriptive alt text describing the service or equipment depicted in each image.',
        expectedBusinessImpact: 'Improves image search rankings and compliance standards.',
        estimatedEffort: 'low',
        confidence: 0.95,
        matchedWatechService: 'seo',
      });
    }

    // Issue: Performance / TTFB
    if (responseTimeMs > 1500) {
      advancedIssues.push({
        id: `adv-9-${Date.now()}`,
        auditId,
        dimension: 'performance',
        severity: 'high',
        title: `Elevated Server Response Time (${responseTimeMs}ms)`,
        whatIsWrong: `Initial server Time To First Byte (TTFB) is ${responseTimeMs}ms.`,
        evidence: `Measured TTFB: ${responseTimeMs}ms`,
        whyItMatters: 'Page latency over 1.5s triggers immediate drop-off from mobile searchers.',
        recommendedFix: 'Deploy modern edge hosting with CDN caching and server-side optimization.',
        expectedBusinessImpact: 'Drastically improves Core Web Vitals and reduces visitor bounce rates.',
        estimatedEffort: 'medium',
        confidence: 0.9,
        matchedWatechService: 'website_development',
      });
    }

    // Issue: Trust & Reviews
    if (!hasReviews) {
      advancedIssues.push({
        id: `adv-10-${Date.now()}`,
        auditId,
        dimension: 'trust',
        severity: 'medium',
        title: 'Absence of Verified Customer Social Proof',
        whatIsWrong: 'No dynamic customer review badges, testimonials, or ratings found on landing page.',
        evidence: 'No review schema, Google Maps review badges, or testimonials detected',
        whyItMatters: 'Prospects evaluating contractors cannot verify third-party credibility without leaving the site.',
        recommendedFix: 'Embed live Google Review badge and client case studies adjacent to CTAs.',
        expectedBusinessImpact: 'Increases prospect confidence and lifts quote conversion rates.',
        estimatedEffort: 'low',
        confidence: 0.88,
        matchedWatechService: 'conversion_optimization',
      });
    }

    // Traditional 10-categories for backward compatibility
    const categories: AuditCategoryScore[] = [
      { category: 'existence_and_accessibility', categoryName: 'Existence & Accessibility', score: techScore, weight: 10, status: techScore >= 75 ? 'passed' : 'failed', findingsCount: 0, summary: `HTTP ${fetchResult.status}, SSL: ${hasSsl ? 'Active' : 'Missing'}` },
      { category: 'visual_credibility', categoryName: 'Visual Design & Credibility', score: uxScore, weight: 10, status: uxScore >= 70 ? 'passed' : 'warning', findingsCount: 0, summary: `HTML payload: ${(html.length / 1024).toFixed(1)} KB` },
      { category: 'mobile_responsiveness', categoryName: 'Mobile Usability', score: hasViewport ? 85 : 30, weight: 10, status: hasViewport ? 'passed' : 'failed', findingsCount: 0, summary: hasViewport ? 'Viewport meta tag detected' : 'Viewport missing' },
      { category: 'performance_and_speed', categoryName: 'Performance & Speed', score: perfScore, weight: 10, status: perfScore >= 75 ? 'passed' : 'warning', findingsCount: 0, summary: `Server TTFB: ${responseTimeMs}ms` },
      { category: 'technical_seo', categoryName: 'Technical SEO', score: seoScore, weight: 10, status: seoScore >= 70 ? 'passed' : 'warning', findingsCount: 0, summary: `Title (${titleLength} chars), Meta Desc (${descLength} chars), H1: ${h1Matches.length}` },
      { category: 'local_seo', categoryName: 'Local SEO & Schema', score: hasSchema ? 85 : 45, weight: 10, status: hasSchema ? 'passed' : 'failed', findingsCount: 0, summary: hasSchema ? 'JSON-LD Schema detected' : 'Schema missing' },
      { category: 'conversion_focus', categoryName: 'Conversion & CTAs', score: convScore, weight: 10, status: convScore >= 70 ? 'passed' : 'warning', findingsCount: 0, summary: `Click-to-call: ${telMatches.length > 0 ? 'Yes' : 'No'}` },
      { category: 'lead_capture', categoryName: 'Lead Capture Mechanics', score: formMatches.length > 0 ? 80 : 35, weight: 10, status: formMatches.length > 0 ? 'passed' : 'failed', findingsCount: 0, summary: `Forms: ${formMatches.length}, Booking Widget: ${hasBookingWidget ? 'Yes' : 'No'}` },
      { category: 'trust_and_proof', categoryName: 'Trust & Proof Presentation', score: trustScore, weight: 10, status: trustScore >= 70 ? 'passed' : 'warning', findingsCount: 0, summary: hasReviews ? 'Customer proof detected' : 'No review proof visible' },
      { category: 'follow_up_readiness', categoryName: 'Follow-Up Readiness & Tech', score: (hasGtm || hasGa4 || hasChatWidget) ? 80 : 50, weight: 10, status: 'passed', findingsCount: 0, summary: `GTM: ${hasGtm ? 'Yes' : 'No'}, Chat: ${hasChatWidget ? 'Yes' : 'No'}` },
    ];

    // Standard findings
    const findings: AuditFinding[] = advancedIssues.map(issue => ({
      id: issue.id,
      auditId,
      category: issue.dimension === 'technical' ? 'existence_and_accessibility' :
                issue.dimension === 'seo' ? 'technical_seo' :
                issue.dimension === 'performance' ? 'performance_and_speed' :
                issue.dimension === 'conversion' ? 'conversion_focus' :
                issue.dimension === 'ux' ? 'mobile_responsiveness' : 'trust_and_proof',
      observation: issue.whatIsWrong,
      evidenceUrlOrSnippet: issue.evidence,
      severity: issue.severity,
      confidence: issue.confidence,
      customerImpact: issue.whyItMatters,
      recommendedAction: issue.recommendedFix,
      isAutomated: true,
    }));

    const audit: WebsiteAudit = {
      id: auditId,
      businessId: businessId || `biz-${Date.now()}`,
      projectId: projectId || 'default',
      targetUrl,
      totalScore: overallScore,
      grade,
      inspectedAt: new Date().toISOString(),
      responseTimeMs,
      httpStatus: fetchResult.status,
      hasSsl,
      isAutomated: true,
      scoringRulesVersion: 'v2.0-advanced-6-dim',
      dimensions,
      robotsTxtAvailable,
      sitemapAvailable,
      imageStats: {
        total: totalImages,
        missingAlt: missingAltCount,
        unoptimized: unoptimizedFormatCount,
      },
      linkStats: {
        internal: internalLinkCount,
        external: externalLinkCount,
      },
      pageSpeedData,
      categories,
      findings,
      advancedIssues,
    };

    return NextResponse.json({ success: true, audit });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Audit failed' }, { status: 500 });
  }
}
