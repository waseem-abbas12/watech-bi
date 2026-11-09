import { NextRequest, NextResponse } from 'next/server';
import { safeFetch } from '@/lib/server/ssrfGuard';
import type { ContentClassification } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, targetType } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Valid URL is required' }, { status: 400 });
    }

    const targetUrl = url.startsWith('http') ? url : `https://${url}`;

    const fetchResult = await safeFetch(targetUrl, {
      timeoutMs: 8000,
      maxRedirects: 3,
      maxBytes: 1024 * 1024,
    });

    if (!fetchResult.ok && fetchResult.status !== 200) {
      return NextResponse.json(
        {
          success: false,
          error: `Could not reach target content URL: ${fetchResult.error || 'Connection failed'}`,
        },
        { status: fetchResult.status === 403 ? 403 : 502 }
      );
    }

    const html = fetchResult.text;
    const httpStatus = fetchResult.status;
    const parsedUrl = new URL(fetchResult.finalUrl);

    // 1. Title Extraction
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : parsedUrl.hostname;

    // 2. Meta Description / Summary
    const metaDescMatch =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i) ||
      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
    const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';

    // Paragraph content summary fallback
    const pMatches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    let bodySummary = metaDescription;
    if (!bodySummary && pMatches && pMatches.length > 0) {
      const cleanP = pMatches
        .slice(0, 3)
        .map(p => p.replace(/<[^>]+>/g, '').trim())
        .filter(p => p.length > 20)
        .join(' ');
      bodySummary = cleanP.slice(0, 250);
    }

    // 3. Publication / Modified Dates
    const pubDateMatch =
      html.match(/<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']*)["']/i) ||
      html.match(/<meta[^>]*name=["']pubdate["'][^>]*content=["']([^"']*)["']/i) ||
      html.match(/<time[^>]*datetime=["']([^"']*)["']/i);
    const publicationDate = pubDateMatch ? pubDateMatch[1].split('T')[0] : undefined;

    const modDateMatch =
      html.match(/<meta[^>]*property=["']article:modified_time["'][^>]*content=["']([^"']*)["']/i) ||
      html.match(/<meta[^>]*name=["']last-modified["'][^>]*content=["']([^"']*)["']/i);
    const lastUpdatedDate = modDateMatch ? modDateMatch[1].split('T')[0] : publicationDate;

    // 4. Headings Extraction
    const headings: string[] = [];
    const hMatches = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi);
    if (hMatches) {
      for (const h of hMatches.slice(0, 10)) {
        const clean = h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (clean && !headings.includes(clean)) {
          headings.push(clean);
        }
      }
    }

    // 5. CTA Extraction
    let callToActionText = '';
    let callToActionQuality: 'strong' | 'weak' | 'missing' = 'missing';

    const ctaMatch =
      html.match(/<a[^>]*class=["'][^"']*(btn|button|cta)[^"']*["'][^>]*>([\s\S]*?)<\/a>/i) ||
      html.match(/<button[^>]*>([\s\S]*?)<\/button>/i) ||
      html.match(/<a[^>]*href=["']tel:[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);

    if (ctaMatch) {
      callToActionText = ctaMatch[2] ? ctaMatch[2].replace(/<[^>]+>/g, '').trim() : '';
      callToActionQuality = callToActionText.length > 2 ? 'strong' : 'weak';
    } else if (html.includes('tel:') || html.includes('mailto:')) {
      callToActionQuality = 'weak';
      callToActionText = 'Contact Link / Phone';
    }

    // 6. Counts
    const imagesCount = (html.match(/<img[^>]*>/gi) || []).length;
    const internalLinksCount = (html.match(/href=["'](?:\/[^"']*|https?:\/\/[^"']*)/gi) || []).length;

    // 7. Heuristic Classification into the 10 Prompt 06 Categories
    const textCorpus = (title + ' ' + metaDescription + ' ' + headings.join(' ')).toLowerCase();
    let classification: ContentClassification = 'service_focused';

    if (textCorpus.includes('case study') || textCorpus.includes('project spotlight') || textCorpus.includes('client success')) {
      classification = 'case_study';
    } else if (textCorpus.includes('faq') || textCorpus.includes('frequently asked') || textCorpus.includes('questions')) {
      classification = 'faq';
    } else if (textCorpus.includes('vs') || textCorpus.includes('comparison') || textCorpus.includes('difference between')) {
      classification = 'comparison';
    } else if (textCorpus.includes('how to') || textCorpus.includes('guide') || textCorpus.includes('what is') || textCorpus.includes('tips')) {
      classification = 'educational';
    } else if (textCorpus.includes('troubleshoot') || textCorpus.includes('repair') || textCorpus.includes('how to fix') || textCorpus.includes('signs your')) {
      classification = 'problem_solving';
    } else if (textCorpus.includes('summer') || textCorpus.includes('winter') || textCorpus.includes('freeze') || textCorpus.includes('season')) {
      classification = 'seasonal';
    } else if (textCorpus.includes('special offer') || textCorpus.includes('discount') || textCorpus.includes('save') || textCorpus.includes('coupon')) {
      classification = 'promotional';
    } else if (textCorpus.includes('community') || textCorpus.includes('dallas charity') || textCorpus.includes('local event')) {
      classification = 'local_community';
    } else if (textCorpus.includes('about us') || textCorpus.includes('our history') || textCorpus.includes('leadership')) {
      classification = 'brand_awareness';
    }

    // Main Topic derivation
    const mainTopic = headings.length > 0 ? headings[0] : title.split('|')[0].split('-')[0].trim();

    return NextResponse.json({
      success: true,
      httpStatus,
      url: parsedUrl.toString(),
      title,
      summary: bodySummary,
      classification,
      mainTopic,
      publicationDate,
      lastUpdatedDate,
      headings,
      callToActionText,
      callToActionQuality,
      imagesCount,
      internalLinksCount,
      retrievalDate: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown server error during content extraction',
      },
      { status: 500 }
    );
  }
}
