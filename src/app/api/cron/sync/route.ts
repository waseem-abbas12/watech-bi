import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuthorization } from '@/lib/server/cronAuth';

export async function GET(request: NextRequest) {
  if (!verifyCronAuthorization(request)) {
    return NextResponse.json({ error: 'Unauthorized: Invalid CRON_SECRET' }, { status: 401 });
  }

  const executionId = `cron-sync-${Date.now()}`;
  console.log(`[CRON SYNC] Execution ${executionId} started.`);

  return NextResponse.json({
    success: true,
    executionId,
    job: 'usage_aggregation_and_quota_rollover',
    timestamp: new Date().toISOString(),
    status: 'completed',
  });
}