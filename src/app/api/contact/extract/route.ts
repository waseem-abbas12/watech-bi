import { NextResponse } from 'next/server';
import { safeFetch } from '@/lib/server/ssrfGuard';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { url, businessId } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }

    const fetchResult = await safeFetch(targetUrl, {
      timeoutMs: 10000,
      maxRedirects: 3,
      maxBytes: 2 * 1024 * 1024,
    });

    if (!fetchResult.ok && fetchResult.status !== 200) {
      return NextResponse.json({
        error: `Could not reach ${targetUrl}: ${fetchResult.error || 'Connection failed'}`,
      }, { status: fetchResult.status === 403 ? 403 : 502 });
    }

    const html = fetchResult.text;
    const fetchedUrl = fetchResult.finalUrl;

    // 1. Title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].trim() : '';

    // 2. Email extraction
    const rawEmails = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi) || [];
    const validEmails = Array.from(new Set(
      rawEmails
        .map(e => e.toLowerCase())
        .filter(e => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.webp') && !e.includes('example.com') && !e.includes('sentry.io'))
    ));

    // 3. Phone extraction
    const telMatches = (html.match(/href=["']tel:([^"']*)["']/gi) || []).map(t =>
      t.replace(/href=["']tel:/i, '').replace(/["']/g, '').trim()
    );
    const patternPhones = html.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [];
    const allPhones = Array.from(new Set([...telMatches, ...patternPhones])).slice(0, 5);

    // 4. Contact page links
    const internalLinks = (html.match(/href=["']([^"']*)["']/gi) || []).map(l =>
      l.replace(/href=["']/i, '').replace(/["']/g, '')
    );
    const contactLinks = internalLinks.filter(l =>
      /contact|about|team|leadership|staff|locations/i.test(l)
    ).slice(0, 5);

    // 5. Leadership / staff candidates found in text
    const staffCandidates: { name: string; title: string; excerpt: string }[] = [];
    const leaderPatterns = [
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\s*[-–,]\s*(President|Owner|Founder|CEO|General Manager|Managing Director|Director of Operations|Chief Executive Officer)/g,
      /(President|Owner|Founder|CEO|General Manager)\s*[-–,:]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/g,
    ];

    for (const pat of leaderPatterns) {
      let match;
      while ((match = pat.exec(html)) !== null && staffCandidates.length < 5) {
        if (match[1] && match[2]) {
          const isNameFirst = !/President|Owner|Founder|CEO|General Manager/i.test(match[1]);
          const name = isNameFirst ? match[1].trim() : match[2].trim();
          const title = isNameFirst ? match[2].trim() : match[1].trim();
          if (name.length > 3 && !staffCandidates.some(c => c.name === name)) {
            staffCandidates.push({
              name,
              title,
              excerpt: match[0],
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      url: fetchedUrl,
      pageTitle,
      emails: validEmails,
      phones: allPhones,
      contactPageLinks: contactLinks,
      staffCandidates,
      retrievalDate: new Date().toISOString().split('T')[0],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Contact extraction failed' }, { status: 500 });
  }
}
