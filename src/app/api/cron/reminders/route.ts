import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuthorization } from '@/lib/server/cronAuth';
import { FollowUpAutomationEngine } from '@/lib/server/followupAutomation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!verifyCronAuthorization(request)) {
    return NextResponse.json({ error: 'Unauthorized: Invalid CRON_SECRET' }, { status: 401 });
  }

  const executionId = `cron-reminders-${Date.now()}`;
  const tenantId = request.headers.get('x-tenant-id') || 'agency_internal';

  try {
    const report = await FollowUpAutomationEngine.processDueFollowups(tenantId);
    return NextResponse.json({
      success: true,
      executionId,
      job: 'followup_reminder_dispatch',
      timestamp: new Date().toISOString(),
      ...report,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
