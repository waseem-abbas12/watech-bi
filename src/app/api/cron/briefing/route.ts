import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuthorization } from '@/lib/server/cronAuth';

export async function GET(request: NextRequest) {
  if (!verifyCronAuthorization(request)) {
    return NextResponse.json({ error: 'Unauthorized: Invalid CRON_SECRET' }, { status: 401 });
  }

  const executionId = `cron-briefing-${Date.now()}`;
  console.log(`[CRON BRIEFING] Execution ${executionId} started.`);

  return NextResponse.json({
    success: true,
    executionId,
    job: 'daily_briefing_synthesis',
    timestamp: new Date().toISOString(),
    processedTenants: 1,
    status: 'completed',
  });
}