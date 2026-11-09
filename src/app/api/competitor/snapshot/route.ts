import { NextRequest, NextResponse } from 'next/server';
import { parseCompetitorHtml } from '@/lib/engines/competitorChangeEngine';
import { safeFetch } from '@/lib/server/ssrfGuard';
import type { CompetitorSnapshot } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { watchId, url } = body;

    if (!watchId || !url) {
      return NextResponse.json({ error: 'watchId and url are required' }, { status: 400 });
    }

    const fetchResult = await safeFetch(url, {
      timeoutMs: 8000,
      maxRedirects: 3,
      maxBytes: 500000,
    });

    if (!fetchResult.ok && fetchResult.status === 403) {
      return NextResponse.json(
        { error: `URL blocked by SSRF Security Policy: ${fetchResult.error}` },
        { status: 400 }
      );
    }

    const httpStatus = fetchResult.status || 500;
    const htmlContent = fetchResult.text || `<html><head><title>HTTP Error ${httpStatus}</title></head><body><h1>HTTP ${httpStatus}</h1></body></html>`;

    const snapshot: CompetitorSnapshot = parseCompetitorHtml(htmlContent, watchId, httpStatus);

    return NextResponse.json({ success: true, snapshot });
  } catch (error: any) {
    console.error('Competitor snapshot error:', error);
    return NextResponse.json({ error: error.message || 'Snapshot crawl failure' }, { status: 500 });
  }
}
