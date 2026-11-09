import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_MARKET_SCORE_WEIGHTS, MarketScoreWeights } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectIds = [], weights = DEFAULT_MARKET_SCORE_WEIGHTS } = body;

    if (!Array.isArray(projectIds)) {
      return NextResponse.json({ error: 'projectIds array is required' }, { status: 400 });
    }

    // Return weights and acknowledgment; computation is executed on client with Dexie IndexedDB
    return NextResponse.json({
      success: true,
      projectIds,
      weights,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Market compare error:', err);
    return NextResponse.json({ error: err.message || 'Market comparison failed' }, { status: 500 });
  }
}
